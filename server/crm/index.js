/* CRM Study Task: сборка ядра, каналов и HTTP-маршрутов. Подключается из server.js одним вызовом createCrm(...).
   Все маршруты /api/admin/crm/* защищены админ-сессией; вебхуки Meta — проверкой подписи. */
import express from 'express';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import { createKv } from './kv.js';
import { buildXlsx } from './xlsx.js';
import { createCrmCore } from './core.js';
import { createChannels } from './channels.js';
import {
  STATUSES, STATUS_IDS, LEAD_TYPES, CHANNELS, HttpError, clip, normalizePhone, splitName, stripHtml, now,
} from './util.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CHANNEL_NAME = { telegram: 'Telegram', whatsapp: 'WhatsApp', instagram: 'Instagram' };

export function createCrm(deps) {
  const { requireAdmin, requireCrmAccess } = deps;
  const clients = new Set();
  const emit = (type, payload) => {
    const chunk = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of clients) { try { res.write(chunk); } catch { clients.delete(res); } }
  };
  const kv = createKv({ getSupabase: deps.getSupabase, dataDir: deps.dataDir });
  const channels = createChannels({ env: deps.env || process.env, telegram: deps.telegram });
  channels.warm();
  let core = null;
  let initError = null;
  let readyResolve;
  const ready = new Promise((resolve) => { readyResolve = resolve; });
  const whenReady = () => ready;

  /* ───── инициализация ───── */
  async function init() {
    try {
      core = await createCrmCore({ kv, emit });
      await core.init();
      readyResolve();
      if (!core.meta().importedAt) await runImport().catch((e) => console.warn('CRM import:', e.message));
      await syncNow().catch((e) => console.warn('CRM trial sync:', e.message));
      setInterval(() => { for (const res of clients) { try { res.write(': ping\n\n'); } catch { clients.delete(res); } } }, 25000).unref();
      console.log(`CRM: загружено заявок ${core.maps.lead.size}, контактов ${core.maps.contact.size}, диалогов ${core.maps.conv.size}`);
      const d = channels.diagnose();
      console.log(`[CRM:whatsapp] переменные: TOKEN=${d.WHATSAPP_TOKEN ? 'ok' : 'НЕТ'}, PHONE_NUMBER_ID=${d.WHATSAPP_PHONE_NUMBER_ID || 'НЕТ'}, VERIFY_TOKEN=${d.WHATSAPP_VERIFY_TOKEN ? 'ok' : 'НЕТ'}, APP_SECRET=${d.META_APP_SECRET ? 'ok' : 'НЕТ'}; вебхук: ${d.webhookUrl}`);
    } catch (error) {
      initError = error;
      console.error('CRM не запустилась:', error.message);
      readyResolve();
    }
  }
  const safe = async (label, fn) => { try { return await fn(); } catch (error) { console.warn(`CRM ${label}:`, error.message); return null; } };

  /* ───── синхронизация пробных уроков ───── */
  let lastSync = 0; let syncTimer = null;
  async function syncNow() {
    await whenReady();
    if (!core) return;
    const trials = await deps.readTrialLessons();
    const names = new Map(deps.getTeachers().map((t) => [t.id, t.name]));
    await core.exclusive(() => core.syncTrials(trials, (id) => names.get(id) || ''));
    lastSync = Date.now();
  }
  const ensureFresh = async () => { if (Date.now() - lastSync > 8000) await syncNow(); };
  function scheduleTrialSync(delay = 1200) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { void safe('trial sync', syncNow); }, delay);
  }

  /* ───── заявки с форм сайта ───── */
  async function captureForm(form) {
    await whenReady();
    if (!core) return null;
    return core.exclusive(async () => {
      const legacyKey = `${form.kind}:${form.legacyId}`;
      if ([...core.maps.lead.values()].some((l) => l.legacy && `${l.legacy.kind}:${l.legacy.id}` === legacyKey)) return null;
      if (core.meta().deleted?.legacy?.includes(legacyKey)) return null;
      const label = { trial: 'Заявка на пробный урок', intensive: 'Запись на интенсив', level_test: 'Начал тест уровня', career: 'Прошёл профориентацию' }[form.kind] || 'Заявка с сайта';
      return core.newLead({
        type: form.kind, channel: 'site', studentName: form.studentName, parentName: form.parentName, phone: form.phone, grade: form.grade,
        topic: form.topic, attribution: form.attribution, createdAt: form.createdAt, legacy: { kind: form.kind, id: form.legacyId }, createdText: label, test: form.test || null,
      });
    });
  }
  async function updateTestResult(legacyId, result) {
    await whenReady();
    if (!core) return;
    await core.exclusive(async () => {
      const lead = [...core.maps.lead.values()].find((l) => l.legacy?.kind === 'level_test' && l.legacy.id === legacyId);
      if (!lead) return;
      lead.test = { status: 'finished', score: result.score, total: result.total, missedTopics: result.missedTopics || [], finishedAt: result.finishedAt || now() };
      core.timeline(lead, 'test', `Тест уровня завершён: ${result.score} из ${result.total}`);
      await core.put('lead', lead);
    });
  }

  /* ───── импорт старых данных ───── */
  async function runImport() {
    await whenReady();
    return core.exclusive(async () => {
      const legacy = await deps.readLegacy();
      const have = new Set([...core.maps.lead.values()].filter((l) => l.legacy).map((l) => `${l.legacy.kind}:${l.legacy.id}`));
      for (const key of core.meta().deleted?.legacy || []) have.add(key);
      const byDate = (list) => [...(list || [])].sort((a, b) => String(a.createdAt || a.startedAt).localeCompare(String(b.createdAt || b.startedAt)));
      let created = 0;
      const requestStatus = { new: 'new', contacted: 'contacted', done: 'contacted' };
      for (const item of byDate(legacy.trialRequests)) {
        if (have.has(`trial:${item.id}`)) continue;
        await core.newLead({ type: 'trial', status: requestStatus[item.status] || 'new', source: '', channel: 'site', studentName: item.studentName, parentName: item.parentName, phone: item.phone, grade: item.grade, createdAt: item.createdAt, legacy: { kind: 'trial', id: item.id }, createdText: 'Импорт: заявка на пробный урок' });
        created += 1;
      }
      for (const item of byDate(legacy.intensiveRequests)) {
        if (have.has(`intensive:${item.id}`)) continue;
        await core.newLead({ type: 'intensive', status: requestStatus[item.status] || 'new', source: '', channel: 'site', studentName: item.studentName, parentName: item.parentName, phone: item.phone, grade: item.grade, topic: deps.intensiveTopic?.(item.grade) || '', createdAt: item.createdAt, legacy: { kind: 'intensive', id: item.id }, createdText: 'Импорт: запись на интенсив' });
        created += 1;
      }
      for (const item of byDate(legacy.testLeads)) {
        if (have.has(`level_test:${item.id}`)) continue;
        const finished = item.status === 'finished';
        await core.newLead({
          type: 'level_test', source: '', channel: 'site', studentName: item.name, phone: item.phone, grade: item.grade, createdAt: item.startedAt, legacy: { kind: 'level_test', id: item.id },
          createdText: 'Импорт: тест уровня', test: { status: item.status, score: item.score, total: item.total, missedTopics: item.missedTopics || [], finishedAt: item.finishedAt },
        });
        created += 1;
        void finished;
      }
      core.meta().importedAt = now();
      await core.saveMeta();
      return { created };
    });
  }

  /* ───── Telegram: входящие и исходящие сообщения бота ───── */
  const tgAttachments = (m) => {
    const out = [];
    if (m.photo?.length) out.push({ type: 'photo', label: 'Фото', fileId: m.photo[m.photo.length - 1].file_id });
    if (m.document) out.push({ type: 'document', label: m.document.file_name || 'Документ', fileId: m.document.file_id, mime: m.document.mime_type || '', size: m.document.file_size || 0 });
    if (m.voice) out.push({ type: 'voice', label: 'Голосовое', fileId: m.voice.file_id, mime: m.voice.mime_type || '' });
    if (m.audio) out.push({ type: 'audio', label: m.audio.title || 'Аудио', fileId: m.audio.file_id, mime: m.audio.mime_type || '' });
    if (m.video) out.push({ type: 'video', label: 'Видео', fileId: m.video.file_id, mime: m.video.mime_type || '' });
    if (m.video_note) out.push({ type: 'video', label: 'Видеосообщение', fileId: m.video_note.file_id });
    if (m.sticker) out.push({ type: 'sticker', label: `Стикер ${m.sticker.emoji || ''}`.trim() });
    if (m.location) out.push({ type: 'location', label: `Геопозиция ${m.location.latitude}, ${m.location.longitude}` });
    if (m.contact) out.push({ type: 'contact', label: `Контакт ${m.contact.first_name || ''} ${m.contact.phone_number || ''}`.trim() });
    return out;
  };
  async function notifyNew(channel, name, text) {
    const body = `💬 <b>Новое обращение · ${CHANNEL_NAME[channel]}</b>\n👤 ${esc(name || 'Без имени')}${text ? `\n«${esc(String(text).slice(0, 300))}»` : ''}`;
    await safe('notify', () => deps.notifyAdmins?.(body));
  }
  async function telegramIncoming(message, linkedAccount) {
    await whenReady();
    if (!core || !message?.chat) return;
    const from = message.from || {};
    const text = String(message.text || message.caption || '').slice(0, 4000);
    const attachments = tgAttachments(message);
    if (!text && !attachments.length) return;
    const name = [from.first_name, from.last_name].filter(Boolean).join(' ');
    const result = await core.exclusive(() => core.ingest({
      channel: 'telegram', externalId: message.chat.id,
      profile: { name, username: from.username || '', phone: message.contact?.phone_number || '' }, linked: linkedAccount || null,
      message: { text, attachments, externalId: message.message_id, at: message.date ? new Date(message.date * 1000).toISOString() : undefined },
    }));
    if (result?.isNewConv && !linkedAccount) void notifyNew('telegram', name || (from.username && `@${from.username}`), text);
  }
  async function telegramOutgoing(chatId, html) {
    await whenReady();
    if (!core) return;
    const text = stripHtml(html).trim();
    if (!text) return;
    await core.exclusive(() => core.ingest({ channel: 'telegram', externalId: chatId, dir: 'out', auto: true, author: 'бот', message: { text } }));
  }

  /* ───── Meta-вебхуки ───── */
  async function handleInbound(channel, items) {
    await whenReady();
    if (!core) return;
    for (const item of items) {
      const result = await core.exclusive(() => core.ingest({
        channel, externalId: item.externalId, dir: item.echo ? 'out' : 'in', author: item.echo ? 'Instagram' : '',
        profile: { name: item.name || '', phone: item.phone || '' },
        message: { text: item.text, attachments: item.attachments, externalId: item.messageId, at: item.at }, fast: true,
      }));
      if (result?.isNewConv && !item.echo) void notifyNew(channel, item.name || item.phone || item.externalId, item.text);
    }
  }

  /* ───── операции для API ───── */
  const err = (status, message) => new HttpError(status, message);
  async function sendMessage(convId, rawText, actor) {
    const conv = core.maps.conv.get(convId);
    if (!conv) throw err(404, 'Диалог не найден.');
    const text = String(rawText ?? '').trim();
    if (!text) throw err(400, 'Введите сообщение.');
    if (text.length > 4000) throw err(400, 'Сообщение длиннее 4000 символов.');
    const sent = await channels.send(conv, text);
    const result = await core.exclusive(() => core.ingest({ channel: conv.channel, externalId: conv.externalId, dir: 'out', author: actor, message: { text, externalId: sent.externalId }, fast: true }));
    /* статус заявки обновляем уже после ответа менеджеру */
    void core.exclusive(async () => {
      const lead = [...core.maps.lead.values()].find((l) => l.contactId === conv.contactId && !l.archived && l.status === 'new');
      if (lead) {
        await core.applyStatus(lead, 'contacted', { text: `Ответили в ${CHANNEL_NAME[conv.channel]}` });
        await core.put('lead', lead);
      }
    }).catch((error) => console.warn('CRM: статус заявки:', error.message));
    return result?.message;
  }

  async function updateLead(id, patch) {
    return core.exclusive(async () => {
      const lead = core.getLead(id);
      if (patch.status !== undefined) await core.applyStatus(lead, patch.status, { reason: patch.reason });
      if (typeof patch.note === 'string') lead.note = clip(patch.note, 2000);
      if (typeof patch.archived === 'boolean' && patch.archived !== lead.archived) {
        lead.archived = patch.archived; core.timeline(lead, 'archive', patch.archived ? 'Заявка в архиве' : 'Заявка возвращена из архива');
      }
      if (patch.grade !== undefined) { const g = Number(patch.grade); lead.grade = Number.isInteger(g) && g >= 1 && g <= 11 ? g : null; }
      if (typeof patch.parentName === 'string') {
        lead.parentName = clip(patch.parentName, 80);
        const parent = core.maps.contact.get(lead.contactId);
        if (parent && lead.parentName) { parent.name = lead.parentName; await core.put('contact', parent); }
      }
      if (typeof patch.studentName === 'string') {
        lead.studentName = clip(patch.studentName, 80);
        const student = core.maps.contact.get(lead.studentId);
        if (student && lead.studentName) { student.name = lead.studentName; await core.put('contact', student); }
      }
      return core.put('lead', lead);
    });
  }

  async function createManualLead(body) {
    const phone = normalizePhone(body.phone);
    const studentName = clip(body.studentName, 80); const parentName = clip(body.parentName, 80);
    if (!phone && !parentName && !studentName) throw err(400, 'Укажите телефон или имя.');
    if (body.phone && !phone) throw err(400, 'Номер телефона указан неверно.');
    return core.exclusive(() => core.newLead({
      type: 'manual', channel: 'manual', source: clip(body.source, 60).toLowerCase() || 'manual', phone, studentName, parentName,
      grade: body.grade, note: body.note, topic: body.topic, createdText: 'Создана вручную',
      status: STATUS_IDS.includes(body.status) ? body.status : 'new',
    }));
  }

  async function bookTrial(leadId, body, actor) {
    const lead = core.getLead(leadId);
    const { firstName, lastName } = splitName(body.studentName || lead.studentName || lead.parentName);
    if (!firstName) throw err(400, 'Укажите имя ученика в заявке.');
    if (!lead.phone) throw err(400, 'В заявке нет телефона родителя.');
    const studentClass = body.studentClass || (lead.grade ? `${lead.grade} класс` : '');
    const trial = await deps.createTrialLesson({
      firstName, lastName, studentClass, parentPhone: lead.phone, teacherId: body.teacherId, day: body.day, hour: body.hour,
      lessonLink: body.lessonLink || '', lessonDescription: body.lessonDescription || '',
    }, actor);
    await core.exclusive(async () => {
      const fresh = core.getLead(leadId);
      fresh.trialLessonId = trial.id;
      await core.put('lead', fresh);
    });
    await syncNow();
    return core.getLead(leadId);
  }

  async function updateContact(id, patch) {
    return core.exclusive(async () => {
      const contact = core.maps.contact.get(id);
      if (!contact) throw err(404, 'Контакт не найден.');
      if (typeof patch.name === 'string') contact.name = clip(patch.name, 80);
      if (Array.isArray(patch.phones)) {
        const phones = [...new Set(patch.phones.map(normalizePhone).filter(Boolean))].slice(0, 6);
        for (const p of phones) {
          const other = [...core.maps.contact.values()].find((c) => c.id !== id && !c.archived && c.kind === contact.kind && c.phones.includes(p));
          if (other) throw err(409, `Номер +${p} уже есть у контакта «${other.name || 'без имени'}». Откройте вкладку «Дубли», чтобы их объединить.`);
        }
        contact.phones = phones;
      }
      if (patch.grade !== undefined) { const g = Number(patch.grade); contact.grade = Number.isInteger(g) && g >= 1 && g <= 11 ? g : null; }
      if (typeof patch.notes === 'string') contact.notes = patch.notes.slice(0, 4000);
      if (Array.isArray(patch.tags)) contact.tags = [...new Set(patch.tags.map((t) => clip(t, 30)).filter(Boolean))].slice(0, 12);
      if (typeof patch.archived === 'boolean') contact.archived = patch.archived;
      return core.put('contact', contact);
    });
  }
  async function createContact(body) {
    const kind = body.kind === 'student' ? 'student' : 'parent';
    const name = clip(body.name, 80); const phone = normalizePhone(body.phone);
    if (!name && !phone) throw err(400, 'Укажите имя или телефон.');
    return core.exclusive(async () => {
      if (phone) {
        const dup = [...core.maps.contact.values()].find((c) => !c.archived && c.kind === kind && c.phones.includes(phone));
        if (dup) throw err(409, `Контакт с номером +${phone} уже есть: «${dup.name || 'без имени'}».`);
      }
      const parent = kind === 'student' && body.parentId ? core.maps.contact.get(body.parentId) : null;
      const contact = await core.put('contact', core.blankContact({ kind, name, phones: phone ? [phone] : [], grade: Number(body.grade) || null, notes: clip(body.notes, 4000), parentIds: parent ? [parent.id] : [] }));
      if (parent) { parent.childIds = [...parent.childIds, contact.id]; await core.put('contact', parent); }
      return contact;
    });
  }
  async function linkChild(parentId, studentId, link = true) {
    return core.exclusive(async () => {
      const parent = core.maps.contact.get(parentId); const student = core.maps.contact.get(studentId);
      if (!parent || !student) throw err(404, 'Контакт не найден.');
      if (parent.kind !== 'parent' || student.kind !== 'student') throw err(400, 'Связать можно родителя и ученика.');
      parent.childIds = link ? [...new Set([...parent.childIds, studentId])] : parent.childIds.filter((id) => id !== studentId);
      student.parentIds = link ? [...new Set([...student.parentIds, parentId])] : student.parentIds.filter((id) => id !== parentId);
      await core.put('contact', parent); await core.put('contact', student);
      return { parent, student };
    });
  }

  /* ───── HTTP ───── */
  const wrap = (fn) => async (req, res) => {
    try {
      await whenReady();
      if (!core) return res.status(503).json({ error: `CRM недоступна: ${initError?.message || 'ошибка запуска'}` });
      return await fn(req, res);
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
      console.error('[CRM]', req.method, req.path, error);
      return res.status(500).json({ error: error.message || 'Ошибка CRM.' });
    }
  };
  const actorOf = (req) => String(req.adminSession?.sub || 'admin');
  const sortedLeads = () => [...core.maps.lead.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));


  /* ───── задачи: проверка полей и срок хранения (архив живёт 30 дней) ───── */
  const TASK_TZ = 'Asia/Almaty';
  const todayKey = (offsetDays = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: TASK_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offsetDays * 86400000));
  const slotOk = (v, allow24) => { const m = /^(\d{2}):(\d{2})$/.exec(String(v)); if (!m) return false; const h = +m[1]; const mi = +m[2]; if (mi % 15) return false; return allow24 && h === 24 ? mi === 0 : h <= 23; };
  const toMin = (v) => { const [h, m] = String(v).split(':').map(Number); return h * 60 + m; };
  function cleanTask(body, existing) {
    const text = clip(body.text, 300);
    if (!text) throw err(400, 'Напишите, что нужно сделать.');
    const date = String(body.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw err(400, 'Укажите дату задачи.');
    if (!existing && date < todayKey()) throw err(400, 'Дата задачи уже прошла.');
    if (date > todayKey(31)) throw err(400, 'Задачу можно поставить не дальше чем на месяц вперёд.');
    if (!slotOk(body.start, false) || !slotOk(body.end, true)) throw err(400, 'Время выбирается с шагом 15 минут.');
    if (toMin(body.end) <= toMin(body.start)) throw err(400, 'Конец задачи должен быть позже начала.');
    return { text, date, start: body.start, end: body.end };
  }
  async function purgeTasks() {
    const limit = todayKey(-31);
    const old = [...core.maps.task.values()].filter((t) => t.date < limit);
    for (const t of old) await core.exclusive(() => core.drop('task', t.id));
  }

  function register(app) {
    const r = express.Router();
    r.use(requireAdmin);
    /* ещё и PIN-код: без него вся CRM (заявки, чаты, задачи, живой поток) отвечает 423 */
    if (requireCrmAccess) r.use(requireCrmAccess);

    r.get('/bootstrap', wrap(async (_req, res) => {
      await ensureFresh();
      res.json({
        statuses: STATUSES, channels: channels.status(), serverTime: now(),
        leads: sortedLeads(), contacts: [...core.maps.contact.values()],
        conversations: [...core.maps.conv.values()].map((c) => core.view('conv', c)).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt))),
        duplicates: core.findDuplicates().length,
      });
    }));
    /* Диагностика WhatsApp: открыть в браузере под админом → /api/admin/crm/whatsapp-check */
    r.get('/whatsapp-check', requireAdmin, wrap(async (_req, res) => {
      const d = channels.diagnose();
      const out = { variables: d, problems: [], meta: null };
      if (!d.WHATSAPP_TOKEN) out.problems.push('Не задан WHATSAPP_TOKEN');
      if (!d.WHATSAPP_PHONE_NUMBER_ID) out.problems.push('Не задан WHATSAPP_PHONE_NUMBER_ID');
      if (!d.WHATSAPP_VERIFY_TOKEN) out.problems.push('Не задан WHATSAPP_VERIFY_TOKEN');
      if (!d.META_APP_SECRET) out.problems.push('Не задан META_APP_SECRET — вебхук будет отвечать 403');
      if (d.WHATSAPP_TOKEN && d.WHATSAPP_PHONE_NUMBER_ID) {
        try { out.meta = await channels.checkMeta(); }
        catch (error) { out.problems.push(`Meta не принимает токен/ID номера: ${error.message}`); }
      }
      if (d.WHATSAPP_TOKEN && d.WHATSAPP_WABA_ID) {
        try {
          out.waba = await channels.wabaInfo();
          if (!out.waba.subscribedApps.length) out.problems.push('Приложение не подписано на этот WhatsApp-аккаунт: откройте /api/admin/crm/whatsapp-subscribe (POST) или нажмите подписку в Meta');
          if (d.WHATSAPP_PHONE_NUMBER_ID && !out.waba.phoneNumbers.some((n) => n.id === d.WHATSAPP_PHONE_NUMBER_ID)) out.problems.push(`WHATSAPP_PHONE_NUMBER_ID=${d.WHATSAPP_PHONE_NUMBER_ID} не относится к аккаунту ${d.WHATSAPP_WABA_ID}. Нужный ID — в списке waba.phoneNumbers`);
        } catch (error) { out.problems.push(`Не удалось прочитать аккаунт WhatsApp ${d.WHATSAPP_WABA_ID}: ${error.message} (токен должен иметь доступ к этому аккаунту)`); }
      } else out.problems.push('Не задан WHATSAPP_WABA_ID — задайте ID рабочего аккаунта WhatsApp, и проверка покажет его номера и подписку');
      out.hint = 'Если проблем нет, а сообщения не приходят: в Meta → Сценарии использования → Конфигурация проверьте Callback URL (https://study-task.kz/api/crm/webhooks/whatsapp), совпадение Verify token и подписку на поле messages. Затем смотрите логи Render по метке [CRM:whatsapp].';
      res.json(out);
    }));
    r.post('/whatsapp-subscribe', wrap(async (_req, res) => {
      try { const out = await channels.subscribeWaba(); console.log('[CRM:whatsapp] приложение подписано на WABA', out); res.json({ ok: true, result: out, waba: await channels.wabaInfo() }); }
      catch (error) { console.warn('[CRM:whatsapp] подписка на WABA не удалась:', error.message); res.status(502).json({ ok: false, error: error.message }); }
    }));
    /* Диагностика Instagram: /api/admin/crm/instagram-check ; с ?subscribe=1 ещё и подписывает аккаунт на сообщения */
    r.get('/instagram-check', requireAdmin, wrap(async (req, res) => {
      const d = channels.igDiagnose();
      const out = { variables: d, problems: [] };
      if (!d.INSTAGRAM_TOKEN) out.problems.push('Не задан INSTAGRAM_TOKEN');
      if (!d.INSTAGRAM_ACCOUNT_ID) out.problems.push('Не задан INSTAGRAM_ACCOUNT_ID');
      if (!d.INSTAGRAM_VERIFY_TOKEN) out.problems.push('Не задан токен проверки (INSTAGRAM_VERIFY_TOKEN или WHATSAPP_VERIFY_TOKEN)');
      if (!d.secrets) out.problems.push('Не задан META_APP_SECRET — вебхук будет отвечать 403');
      if (d.INSTAGRAM_TOKEN) {
        if (req.query.subscribe) {
          try { out.subscribed = await channels.igSubscribe(); } catch (error) { out.problems.push(`Подписка аккаунта на сообщения не удалась: ${error.message}`); }
        }
        try {
          out.meta = await channels.igInfo();
          if (out.meta.subscribedApps?.error) out.problems.push(`Не удалось прочитать подписки аккаунта: ${out.meta.subscribedApps.error}`);
          else if (!(out.meta.subscribedApps?.data || []).length) out.problems.push('Приложение не подписано на сообщения аккаунта: откройте эту же ссылку с ?subscribe=1 в конце');
        } catch (error) { out.problems.push(`Meta не принимает токен или ID аккаунта: ${error.message}`); }
      }
      out.hint = 'Если проблем нет, а сообщения не приходят: в Instagram (приложение) включите «Разрешить доступ к сообщениям» (Настройки → Сообщения и ответы на истории → Подключённые инструменты); пока приложение Meta в режиме разработки, писать должен аккаунт с ролью в приложении. Логи Render ищите по метке [CRM:instagram].';
      res.json(out);
    }));
    r.get('/stream', requireAdmin, (req, res) => {
      res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.flushHeaders?.();
      res.write('retry: 3000\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
    });

    /* ───── задачи ───── */
    r.get('/tasks', wrap(async (_req, res) => {
      await ensureFresh();
      await purgeTasks();
      res.json({ tasks: [...core.maps.task.values()].sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)), serverTime: now() });
    }));
    r.post('/tasks', wrap(async (req, res) => res.status(201).json(await core.exclusive(async () => {
      const f = cleanTask(req.body || {});
      const t = now();
      return core.put('task', { id: crypto.randomUUID(), ...f, status: 'open', doneAt: null, createdBy: actorOf(req), createdAt: t, updatedAt: t });
    }))));
    r.patch('/tasks/:id', wrap(async (req, res) => res.json(await core.exclusive(async () => {
      const task = core.maps.task.get(req.params.id);
      if (!task) throw err(404, 'Задача не найдена.');
      const body = req.body || {};
      const f = cleanTask({ text: task.text, date: task.date, start: task.start, end: task.end, ...body }, task);
      Object.assign(task, f);
      if (body.status !== undefined) {
        if (!['open', 'done', 'failed'].includes(body.status)) throw err(400, 'Неизвестный статус задачи.');
        task.status = body.status; task.doneAt = body.status === 'open' ? null : now();
      } else if (body.date !== undefined || body.start !== undefined || body.end !== undefined) { task.status = 'open'; task.doneAt = null; }
      return core.put('task', task);
    }))));
    r.delete('/tasks/:id', wrap(async (req, res) => {
      await core.exclusive(() => core.drop('task', req.params.id));
      res.json({ ok: true });
    }));


    /* ───── массовые действия с заявками: сначала выбор, потом действие ───── */
    const MAX_BULK = 1000;
    const idsOf = (body) => {
      const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.filter((x) => typeof x === 'string' && x))] : [];
      if (!ids.length) throw err(400, 'Выберите хотя бы одну заявку.');
      if (ids.length > MAX_BULK) throw err(400, `За один раз можно обработать не больше ${MAX_BULK} заявок.`);
      return ids;
    };
    r.post('/leads/bulk-delete', wrap(async (req, res) => {
      const ids = idsOf(req.body);
      if (req.body?.confirm !== 'delete all') throw err(400, 'Для удаления введите подтверждение «delete all».');
      const out = await core.exclusive(() => core.deleteLeads(ids));
      console.log(`[CRM] ${actorOf(req)} удалил заявок: ${out.deleted} (запрошено ${ids.length})`);
      res.json(out);
    }));
    r.post('/leads/export', wrap(async (req, res) => {
      const ids = idsOf(req.body);
      const TYPES = { trial: 'Пробный урок', intensive: 'Интенсив', level_test: 'Тест уровня', career: 'Профориентация', message: 'Сообщение', manual: 'Вручную' };
      const SOURCES = { instagram: 'Instagram', facebook: 'Facebook', telegram: 'Telegram', whatsapp: 'WhatsApp', google: 'Google', tiktok: 'TikTok', youtube: 'YouTube', yandex: 'Яндекс', direct: 'Прямой заход', admin: 'Админ-панель', manual: 'Вручную', '': 'Не определён' };
      const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const statusLabel = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
      const fmt = (iso) => (iso ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '');
      const leads = ids.map((id) => core.maps.lead.get(id)).filter(Boolean).sort((a, b) => (a.number || 0) - (b.number || 0));
      if (!leads.length) throw err(404, 'Выбранные заявки уже удалены.');
      const rows = leads.map((l) => [
        l.number, fmt(l.createdAt), TYPES[l.type] || l.type, statusLabel[l.status] || l.status, SOURCES[l.source] ?? l.source, l.campaign || '',
        l.studentName || '', l.parentName || '', l.phone ? `+${String(l.phone).replace(/^\+/, '')}` : '', l.grade ? Number(l.grade) : '', l.topic || '',
        l.trial && !l.trial.removed ? `${DAYS[l.trial.day] ?? ''} ${String(l.trial.hour ?? '').padStart(2, '0')}:00${l.trial.teacherName ? ` · ${l.trial.teacherName}` : ''}` : '',
        l.test && l.test.score != null ? `${l.test.score} из ${l.test.total}` : '', l.lostReason || '', l.note || '', l.archived ? 'да' : '',
      ]);
      const file = buildXlsx({
        sheetName: 'Заявки',
        headers: ['№', 'Создана', 'Тип', 'Статус', 'Источник', 'Кампания', 'Ученик', 'Родитель', 'Телефон', 'Класс', 'Тема', 'Пробный урок', 'Тест уровня', 'Причина отказа', 'Заметка', 'В архиве'],
        rows,
      });
      const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date());
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leads-${stamp}.xlsx"; filename*=UTF-8''${encodeURIComponent(`Заявки ${stamp}.xlsx`)}`,
        'Cache-Control': 'no-store',
      });
      res.send(file);
    }));

    r.post('/leads', wrap(async (req, res) => res.status(201).json(await createManualLead(req.body || {}))));
    r.patch('/leads/:id', wrap(async (req, res) => res.json(await updateLead(req.params.id, req.body || {}))));
    r.post('/leads/:id/notes', wrap(async (req, res) => {
      const text = clip(req.body?.text, 2000);
      if (!text) throw err(400, 'Введите текст заметки.');
      res.json(await core.exclusive(async () => { const lead = core.getLead(req.params.id); core.timeline(lead, 'note', text, { by: actorOf(req) }); return core.put('lead', lead); }));
    }));
    r.post('/leads/:id/trial', wrap(async (req, res) => res.status(201).json(await bookTrial(req.params.id, req.body || {}, actorOf(req)))));
    r.get('/trial-slots', wrap(async (_req, res) => res.json(await deps.getTrialSlots())));

    r.post('/contacts', wrap(async (req, res) => res.status(201).json(await createContact(req.body || {}))));
    r.patch('/contacts/:id', wrap(async (req, res) => res.json(await updateContact(req.params.id, req.body || {}))));
    r.post('/contacts/:id/children', wrap(async (req, res) => {
      let studentId = req.body?.studentId;
      if (!studentId) {
        const student = await createContact({ kind: 'student', name: req.body?.name, grade: req.body?.grade, parentId: req.params.id });
        return res.status(201).json({ student });
      }
      return res.json(await linkChild(req.params.id, studentId, true));
    }));
    r.delete('/contacts/:id/children/:studentId', wrap(async (req, res) => res.json(await linkChild(req.params.id, req.params.studentId, false))));

    r.get('/conversations/:id/messages', wrap(async (req, res) => {
      const before = Number(req.query.before) || Infinity;
      res.json(await core.getMessages(req.params.id, { before, limit: Math.min(Number(req.query.limit) || 80, 200) }));
    }));
    r.post('/conversations/:id/messages', wrap(async (req, res) => res.status(201).json(await sendMessage(req.params.id, req.body?.text, actorOf(req)))));
    r.post('/conversations/:id/read', wrap(async (req, res) => res.json(await core.exclusive(async () => {
      const conv = core.maps.conv.get(req.params.id);
      if (!conv) throw err(404, 'Диалог не найден.');
      if (conv.unread) { conv.unread = 0; await core.put('conv', conv); }
      return core.view('conv', conv);
    }))));
    r.patch('/conversations/:id', wrap(async (req, res) => res.json(await core.exclusive(async () => {
      const conv = core.maps.conv.get(req.params.id);
      if (!conv) throw err(404, 'Диалог не найден.');
      if (req.body?.contactId) {
        if (!core.maps.contact.get(req.body.contactId)) throw err(404, 'Контакт не найден.');
        conv.contactId = req.body.contactId;
      }
      if (typeof req.body?.archived === 'boolean') conv.archived = req.body.archived;
      await core.put('conv', conv);
      return core.view('conv', conv);
    }))));
    r.get('/conversations/:id/messages/:messageId/file', wrap(async (req, res) => {
      const message = await core.findMessage(req.params.id, req.params.messageId);
      const attachment = message?.attachments?.find((a) => a.fileId);
      const conv = core.maps.conv.get(req.params.id);
      if (!attachment || conv?.channel !== 'telegram') throw err(404, 'Файл не найден.');
      const url = await deps.telegram.fileUrl(attachment.fileId);
      const upstream = await fetch(url);
      if (!upstream.ok || !upstream.body) throw err(502, 'Telegram не отдал файл.');
      const type = upstream.headers.get('content-type') || 'application/octet-stream';
      const inline = /^(image\/(png|jpe?g|webp|gif)|audio\/|video\/)/.test(type);
      res.set({ 'Content-Type': type, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(attachment.label || 'file')}` });
      Readable.fromWeb(upstream.body).pipe(res);
    }));

    r.get('/duplicates', wrap(async (_req, res) => {
      const pairs = core.findDuplicates().map((p) => ({ ...p, a: core.maps.contact.get(p.a), b: core.maps.contact.get(p.b) }));
      res.json(pairs);
    }));
    r.post('/duplicates/merge', wrap(async (req, res) => {
      const { keepId, dropId } = req.body || {};
      const kept = await core.exclusive(() => core.mergeContacts(keepId, dropId));
      res.json({ contact: kept });
    }));
    r.post('/duplicates/dismiss', wrap(async (req, res) => {
      const { a, b } = req.body || {};
      if (!a || !b) throw err(400, 'Укажите пару контактов.');
      await core.exclusive(async () => { const m = core.meta(); m.dismissed = [...new Set([...m.dismissed, core.pairKey(a, b)])]; await core.saveMeta(); });
      res.json({ ok: true });
    }));

    r.get('/analytics', wrap(async (req, res) => {
      const days = req.query.days === 'all' ? 0 : Math.min(Math.max(Number(req.query.days) || 30, 1), 730);
      const groupBy = ['source', 'medium', 'campaign', 'content', 'type', 'channel', 'grade'].includes(req.query.groupBy) ? req.query.groupBy : 'source';
      res.json(core.analytics({ from: days ? new Date(Date.now() - days * 86400000).toISOString() : '', groupBy }));
    }));
    r.post('/import', wrap(async (_req, res) => { const out = await runImport(); await syncNow(); res.json(out); }));

    app.use('/api/admin/crm', r);

    /* вебхуки Meta (без админ-сессии — только подпись Meta) */
    const hook = (channel, parse, verifyToken) => {
      const tag = `[CRM:${channel}]`;
      app.get(`/api/crm/webhooks/${channel}`, (req, res) => {
        const expected = verifyToken();
        const challenge = channels.verifyChallenge(req.query, expected);
        if (challenge === null) {
          const why = !expected ? `не задан verify-токен (${channel === 'whatsapp' ? 'WHATSAPP_VERIFY_TOKEN' : 'INSTAGRAM_VERIFY_TOKEN'})`
            : req.query['hub.mode'] !== 'subscribe' ? `hub.mode=${req.query['hub.mode']}, ожидалось subscribe`
            : 'verify-токен в Meta не совпадает с переменной на сервере';
          console.warn(`${tag} проверка вебхука ОТКЛОНЕНА: ${why}`);
          return res.sendStatus(403);
        }
        console.log(`${tag} проверка вебхука пройдена — Meta подтвердила адрес`);
        return res.status(200).type('text/plain').send(challenge);
      });
      app.post(`/api/crm/webhooks/${channel}`, (req, res) => {
        const sig = req.get('x-hub-signature-256');
        console.log(`${tag} POST от Meta: ${req.rawBody ? req.rawBody.length : 0} байт, подпись ${sig ? 'есть' : 'ОТСУТСТВУЕТ'}, object=${req.body?.object || '?'}`);
        if (!channels.verifySignature(req.rawBody, sig)) {
          const why = !channels.hasAppSecret() ? 'не задан META_APP_SECRET'
            : !req.rawBody ? 'нет тела запроса'
            : !sig ? 'нет заголовка X-Hub-Signature-256 (запрос не от Meta)'
            : 'подпись не совпала: META_APP_SECRET не от того приложения или с лишним пробелом';
          console.warn(`${tag} запрос ОТКЛОНЁН (403): ${why}`);
          return res.sendStatus(403);
        }
        res.sendStatus(200);
        let items;
        try { items = parse(req.body); } catch (error) { console.error(`${tag} не удалось разобрать тело:`, error.message); return; }
        if (!items.length) {
          const kinds = (req.body?.entry || []).flatMap((e) => (e.changes || []).map((c) => c.field + (c.value?.statuses ? ':statuses' : '')));
          console.log(`${tag} сообщений в запросе нет (${kinds.join(', ') || 'пусто'}) — например, статусы доставки`);
          return;
        }
        console.log(`${tag} входящих сообщений: ${items.length}, от ${items.map((i) => i.phone || i.externalId).join(', ')}`);
        void handleInbound(channel, items)
          .then(() => console.log(`${tag} сохранено в CRM: ${items.length}`))
          .catch((error) => console.error(`${tag} ошибка сохранения в CRM:`, error.message));
      });
    };
    hook('whatsapp', (body) => channels.parseWhatsApp(body), () => channels.waVerify);
    hook('instagram', (body) => channels.parseInstagram(body), () => channels.igVerify);
  }

  return { register, init, captureForm, updateTestResult, scheduleTrialSync, telegramIncoming, telegramOutgoing, syncNow, runImport, get core() { return core; }, channels, kv };
}
