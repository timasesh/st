/* Ядро CRM: контакты (родитель → ученики), заявки, диалоги и сообщения.
   Данные живут в памяти и пишутся «сквозным» способом в kv (app_settings), поэтому чтение мгновенное,
   а каждая сущность хранится отдельной строкой. Все изменения идут через очередь (exclusive) —
   два одновременных запроса не затрут друг друга. */
import crypto from 'node:crypto';
import {
  STATUS_IDS, STATUS_RANK, STATUSES, LEAD_TYPES, now, clip, normalizePhone, nameKey, namesCompatible, cleanAttribution, HttpError,
} from './util.js';

const CHUNK = 200;
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const TZ = 'Asia/Almaty';
const dayKey = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

export async function createCrmCore({ kv, emit = () => {} }) {
  const maps = { contact: new Map(), lead: new Map(), conv: new Map(), task: new Map() };
  let meta = { leadSeq: 0, dismissed: [], importedAt: null };
  const chunkCache = new Map();
  let queue = Promise.resolve();
  const exclusive = (fn) => { const run = queue.then(fn); queue = run.catch(() => {}); return run; };

  /* ───── загрузка и сохранение ───── */
  async function init() {
    for (const coll of Object.keys(maps)) {
      for (const { value } of await kv.list(`crm:${coll}:`)) if (value?.id) maps[coll].set(value.id, value);
    }
    const saved = await kv.get('crm:meta');
    if (saved && typeof saved === 'object') meta = { ...meta, ...saved };
    const maxSeq = Math.max(0, ...[...maps.lead.values()].map((l) => l.number || 0));
    if (maxSeq > meta.leadSeq) meta.leadSeq = maxSeq;
  }
  const saveMeta = () => kv.set('crm:meta', meta);
  /* pending — список «фоновых» записей: сначала шлём событие клиентам, а запись в базу идёт параллельно */
  async function put(coll, entity, pending) {
    entity.updatedAt = now();
    maps[coll].set(entity.id, entity);
    if (pending) {
      pending.push(kv.set(`crm:${coll}:${entity.id}`, entity));
      emit('upsert', { coll, entity: view(coll, entity) });
      return entity;
    }
    await kv.set(`crm:${coll}:${entity.id}`, entity);
    emit('upsert', { coll, entity: view(coll, entity) });
    return entity;
  }
  async function drop(coll, id) {
    if (!maps[coll].delete(id)) return false;
    await kv.del(`crm:${coll}:${id}`);
    emit('delete', { coll, id });
    return true;
  }
  function view(coll, entity) {
    if (coll === 'conv') { const { recentExt, ...rest } = entity; return rest; }
    return entity;
  }
  const uuid = () => crypto.randomUUID();

  /* ───── сообщения (чанки по 200 штук, хранятся бессрочно) ───── */
  const chunkKey = (convId, n) => `crm:msg:${convId}:${String(n).padStart(5, '0')}`;
  async function readChunk(convId, n) {
    const key = chunkKey(convId, n);
    if (chunkCache.has(key)) return chunkCache.get(key);
    const data = (await kv.get(key)) || [];
    chunkCache.set(key, data);
    if (chunkCache.size > 60) chunkCache.delete(chunkCache.keys().next().value);
    return data;
  }
  async function appendMessage(conv, message, pending) {
    let n = conv.msgChunk || 0;
    let chunk = await readChunk(conv.id, n);
    if (chunk.length >= CHUNK) { n += 1; chunk = []; conv.msgChunk = n; chunkCache.set(chunkKey(conv.id, n), chunk); }
    message.seq = (conv.msgSeq = (conv.msgSeq || 0) + 1);
    chunk.push(message);
    const write = kv.set(chunkKey(conv.id, n), [...chunk]);
    if (pending) pending.push(write); else await write;
    return message;
  }
  async function getMessages(convId, { before = Infinity, limit = 80 } = {}) {
    const conv = maps.conv.get(convId);
    if (!conv) throw new HttpError(404, 'Диалог не найден.');
    const out = [];
    let n = conv.msgChunk || 0;
    let more = false;
    while (n >= 0 && out.length < limit) {
      const chunk = await readChunk(convId, n);
      for (let i = chunk.length - 1; i >= 0; i -= 1) {
        if (chunk[i].seq >= before) continue;
        if (out.length >= limit) { more = true; break; }
        out.push(chunk[i]);
      }
      if (more) break;
      n -= 1;
    }
    if (!more && n >= 0) more = true;
    return { messages: out.reverse(), hasMore: more && out.length >= limit };
  }

  async function findMessage(convId, messageId) {
    const conv = maps.conv.get(convId);
    if (!conv) return null;
    for (let n = conv.msgChunk || 0; n >= 0; n -= 1) {
      const hit = (await readChunk(convId, n)).find((m) => m.id === messageId);
      if (hit) return hit;
    }
    return null;
  }

  /* ───── контакты ───── */
  function blankContact(fields) {
    const t = now();
    return {
      id: uuid(), kind: 'parent', name: '', phones: [], telegram: null, whatsapp: '', instagram: '',
      parentIds: [], childIds: [], grade: null, notes: '', tags: [], accountId: '', archived: false,
      createdAt: t, updatedAt: t, history: [], ...fields,
    };
  }
  const contactList = () => [...maps.contact.values()];
  const findParentByPhone = (phone) => (phone ? contactList().find((c) => !c.archived && c.kind === 'parent' && c.phones.includes(phone)) : null);
  const findAnyByPhone = (phone) => (phone ? contactList().find((c) => !c.archived && c.phones.includes(phone)) : null);

  async function resolveContacts({ parentName = '', studentName = '', phone = '', grade = null }) {
    let parent = findParentByPhone(phone);
    if (!parent) parent = await put('contact', blankContact({ kind: 'parent', name: clip(parentName, 80), phones: phone ? [phone] : [] }));
    else if (parentName && !parent.name) { parent.name = clip(parentName, 80); await put('contact', parent); }
    let student = null;
    if (studentName) {
      const key = nameKey(studentName);
      student = parent.childIds.map((id) => maps.contact.get(id)).find((c) => c && !c.archived && nameKey(c.name) === key) || null;
      if (!student) {
        student = await put('contact', blankContact({ kind: 'student', name: clip(studentName, 80), grade, parentIds: [parent.id] }));
        parent.childIds = [...parent.childIds, student.id];
        await put('contact', parent);
      } else if (grade && student.grade !== grade) { student.grade = grade; await put('contact', student); }
    }
    return { parent, student };
  }

  /* ───── заявки ───── */
  function timeline(lead, type, text, extra = {}) {
    lead.timeline = [...(lead.timeline || []), { at: now(), type, text, ...extra }].slice(-300);
  }
  async function newLead(input) {
    const phone = normalizePhone(input.phone);
    const grade = Number.isInteger(Number(input.grade)) && Number(input.grade) >= 1 && Number(input.grade) <= 11 ? Number(input.grade) : null;
    const existing = input.contactId ? maps.contact.get(input.contactId) : null;
    const { parent, student } = existing
      ? { parent: existing, student: input.studentId ? maps.contact.get(input.studentId) || null : null }
      : await resolveContacts({ parentName: input.parentName, studentName: input.studentName, phone, grade });
    const attribution = cleanAttribution(input.attribution);
    const t = input.createdAt || now();
    meta.leadSeq += 1;
    await saveMeta();
    const lead = {
      id: uuid(), number: meta.leadSeq,
      type: LEAD_TYPES.includes(input.type) ? input.type : 'manual',
      status: STATUS_IDS.includes(input.status) ? input.status : 'new',
      contactId: parent.id, studentId: student?.id || '',
      parentName: parent.name || clip(input.parentName, 80), studentName: student?.name || clip(input.studentName, 80),
      phone, grade, topic: clip(input.topic, 120),
      channel: input.channel || 'site',
      source: input.source !== undefined ? clip(input.source, 60) : (attribution.source || 'direct'),
      medium: attribution.medium || '', campaign: attribution.campaign || '', content: attribution.content || '', term: attribution.term || '',
      click: Object.fromEntries(['fbclid', 'gclid', 'ttclid', 'yclid'].filter((k) => attribution[k]).map((k) => [k, attribution[k]])),
      firstTouch: attribution.first || null, referrer: attribution.referrer || '', landing: attribution.landing || '',
      legacy: input.legacy || null, note: clip(input.note, 2000), trial: null, trialLessonId: '', test: input.test || null,
      conversationId: input.conversationId || '', lostReason: '', archived: false,
      createdAt: t, updatedAt: t, statusChangedAt: t, timeline: [],
    };
    timeline(lead, 'created', input.createdText || 'Заявка создана');
    lead.timeline[0].at = t;
    await put('lead', lead);
    return lead;
  }
  function getLead(id) {
    const lead = maps.lead.get(id);
    if (!lead) throw new HttpError(404, 'Заявка не найдена.');
    return lead;
  }
  async function applyStatus(lead, status, { reason = '', text = '' } = {}) {
    if (!STATUS_IDS.includes(status)) throw new HttpError(400, 'Неизвестный статус.');
    if (lead.status === status) return false;
    const from = lead.status;
    lead.status = status;
    lead.statusChangedAt = now();
    lead.lostReason = status === 'lost' ? clip(reason, 300) : '';
    const label = (id) => STATUSES.find((s) => s.id === id)?.label || id;
    timeline(lead, 'status', text || `${label(from)} → ${label(status)}${status === 'lost' && lead.lostReason ? ` (${lead.lostReason})` : ''}`, { from, to: status });
    return true;
  }

  /* ───── дубли и объединение ───── */
  const pairKey = (a, b) => [a, b].sort().join('|');
  function findDuplicates() {
    const live = contactList().filter((c) => !c.archived);
    const groups = new Map();
    const add = (key, reason, contact) => {
      if (!key) return;
      const k = `${reason}:${key}`;
      if (!groups.has(k)) groups.set(k, { reason, items: [] });
      groups.get(k).items.push(contact);
    };
    for (const c of live) {
      for (const p of c.phones) add(`${c.kind}:${p}`, 'phone', c);
      if (c.telegram?.id) add(`${c.kind}:${c.telegram.id}`, 'telegram', c);
      if (c.instagram) add(`${c.kind}:${c.instagram}`, 'instagram', c);
      const nk = nameKey(c.name);
      if (nk && nk.split(' ').length >= 2) add(`${c.kind}:${nk}`, 'name', c);
    }
    const pairs = new Map();
    const dismissed = new Set(meta.dismissed);
    for (const group of groups.values()) {
      if (group.items.length < 2) continue;
      for (let i = 0; i < group.items.length; i += 1) {
        for (let j = i + 1; j < group.items.length; j += 1) {
          const a = group.items[i]; const b = group.items[j];
          const key = pairKey(a.id, b.id);
          if (dismissed.has(key)) continue;
          const entry = pairs.get(key) || { key, a: a.id, b: b.id, reasons: [] };
          if (!entry.reasons.includes(group.reason)) entry.reasons.push(group.reason);
          pairs.set(key, entry);
        }
      }
    }
    const weight = { phone: 3, telegram: 3, instagram: 3, name: 1 };
    return [...pairs.values()]
      .map((p) => ({ ...p, score: p.reasons.reduce((s, r) => s + weight[r], 0) }))
      .sort((x, y) => y.score - x.score);
  }
  async function mergeContacts(keepId, dropId) {
    const keep = maps.contact.get(keepId); const drop = maps.contact.get(dropId);
    if (!keep || !drop || keepId === dropId) throw new HttpError(404, 'Контакт не найден.');
    if (keep.kind !== drop.kind) throw new HttpError(400, 'Объединять можно только контакты одного типа (родитель с родителем, ученик с учеником).');
    keep.phones = [...new Set([...keep.phones, ...drop.phones])];
    keep.telegram = keep.telegram || drop.telegram;
    keep.whatsapp = keep.whatsapp || drop.whatsapp;
    keep.instagram = keep.instagram || drop.instagram;
    keep.accountId = keep.accountId || drop.accountId;
    keep.grade = keep.grade || drop.grade;
    keep.name = keep.name || drop.name;
    keep.notes = [keep.notes, drop.notes].filter(Boolean).join('\n');
    keep.tags = [...new Set([...keep.tags, ...drop.tags])];
    const swap = (list) => [...new Set(list.map((id) => (id === dropId ? keepId : id)))];
    keep.parentIds = [...new Set([...keep.parentIds, ...drop.parentIds])].filter((id) => id !== keepId && id !== dropId);
    keep.childIds = [...new Set([...keep.childIds, ...drop.childIds])].filter((id) => id !== keepId && id !== dropId);
    keep.history = [...(keep.history || []), { at: now(), text: `Объединён с «${drop.name || 'без имени'}»` }].slice(-100);
    for (const other of contactList()) {
      if (other.id === keepId || other.id === dropId) continue;
      if (other.parentIds.includes(dropId) || other.childIds.includes(dropId)) {
        other.parentIds = swap(other.parentIds); other.childIds = swap(other.childIds);
        await put('contact', other);
      }
    }
    for (const lead of maps.lead.values()) {
      if (lead.contactId === dropId || lead.studentId === dropId) {
        if (lead.contactId === dropId) lead.contactId = keepId;
        if (lead.studentId === dropId) lead.studentId = keepId;
        timeline(lead, 'merge', 'Контакт объединён с дублем');
        await put('lead', lead);
      }
    }
    for (const conv of maps.conv.values()) if (conv.contactId === dropId) { conv.contactId = keepId; await put('conv', conv); }
    await put('contact', keep);
    maps.contact.delete(dropId);
    await kv.del(`crm:contact:${dropId}`);
    emit('delete', { coll: 'contact', id: dropId });
    return keep;
  }

  /* ───── синхронизация пробных уроков (сайт → CRM) ───── */
  function trialLeadStatus(trialStatus) {
    switch (trialStatus) {
      case 'attended': return 'trial_done';
      case 'enrolled': return 'paid';
      case 'declined': return 'lost';
      case 'no_show': return 'contacted';
      default: return 'trial_booked';
    }
  }
  const slotLabel = (t) => `${DAYS[t.day] ?? ''} ${String(t.hour ?? '').padStart(2, '0')}:00`;
  async function syncTrials(trials, teacherName = () => '') {
    let changed = 0;
    const seen = new Set();
    for (const trial of trials) {
      if (!trial?.id) continue;
      seen.add(trial.id);
      const phone = normalizePhone(trial.parentPhone);
      let lead = [...maps.lead.values()].find((l) => l.trialLessonId === trial.id);
      let fresh = false;
      const studentName = `${trial.firstName || ''} ${trial.lastName || ''}`.trim();
      if (!lead && phone) {
        /* Один телефон = одна семья: выбираем заявку того же ребёнка, заявке на пробный отдаём приоритет. */
        const typeScore = { trial: 2, manual: 1, message: 1, level_test: 0, intensive: 0, career: 0 };
        const wanted = nameKey(studentName);
        lead = [...maps.lead.values()]
          .filter((l) => !l.archived && !l.trialLessonId && l.phone === phone && (!l.studentName || namesCompatible(l.studentName, studentName)))
          .map((l) => ({ l, score: (wanted && nameKey(l.studentName) === wanted ? 4 : 0) + (typeScore[l.type] ?? 0) }))
          .sort((a, b) => b.score - a.score || String(b.l.createdAt).localeCompare(String(a.l.createdAt)))[0]?.l;
      }
      const grade = parseInt(trial.studentClass, 10) || null;
      if (!lead) {
        lead = await newLead({ type: 'trial', channel: 'admin', source: 'admin', phone, studentName, grade, createdAt: trial.createdAt, createdText: 'Пробный урок создан в админ-панели' });
        fresh = true;
      }
      const snapshot = {
        id: trial.id, status: trial.status || 'scheduled', scheduledAt: trial.scheduledAt || '', day: trial.day, hour: trial.hour,
        teacherId: trial.teacherId || '', teacherName: teacherName(trial.teacherId) || '', lessonLink: trial.lessonLink || '',
        declineReason: trial.declineReason || '', removed: false,
      };
      const before = lead.trial;
      const linkedNow = lead.trialLessonId !== trial.id;
      const same = before && JSON.stringify(before) === JSON.stringify(snapshot);
      if (same && !linkedNow) continue;
      lead.trialLessonId = trial.id;
      lead.trial = snapshot;
      if (trial.studentId && lead.studentId) {
        const sc = maps.contact.get(lead.studentId);
        if (sc && sc.accountId !== trial.studentId) { sc.accountId = trial.studentId; await put('contact', sc); }
      }
      if (linkedNow || before?.status !== snapshot.status || before?.scheduledAt !== snapshot.scheduledAt || before?.day !== snapshot.day || before?.hour !== snapshot.hour) {
        const text = snapshot.status === 'no_show' ? `Пробный урок (${slotLabel(snapshot)}): ученик не пришёл`
          : snapshot.status === 'attended' ? 'Пробный урок проведён'
          : snapshot.status === 'enrolled' ? 'Ученик записался на занятия'
          : snapshot.status === 'declined' ? `Отказ после пробного${snapshot.declineReason ? `: ${snapshot.declineReason}` : ''}`
          : `Пробный урок: ${slotLabel(snapshot)}${snapshot.teacherName ? ` · ${snapshot.teacherName}` : ''}`;
        timeline(lead, 'trial', text);
        if (lead.status !== 'paid' || snapshot.status === 'enrolled') await applyStatus(lead, trialLeadStatus(snapshot.status), { reason: snapshot.declineReason });
      }
      await put('lead', lead);
      if (!fresh) changed += 1;
    }
    for (const lead of maps.lead.values()) {
      if (lead.trialLessonId && lead.trial && !lead.trial.removed && !seen.has(lead.trialLessonId)) {
        lead.trial = { ...lead.trial, removed: true };
        timeline(lead, 'trial', 'Пробный урок удалён из расписания');
        if (lead.status === 'trial_booked') await applyStatus(lead, 'contacted');
        await put('lead', lead);
        changed += 1;
      }
    }
    return changed;
  }

  /* ───── диалоги ───── */
  const convByExternal = (channel, externalId) => [...maps.conv.values()].find((c) => c.channel === channel && c.externalId === String(externalId));
  async function ingest({ channel, externalId, profile = {}, linked = null, dir = 'in', message, auto = false, author = '', createLead = true, fast = false }) {
    const pending = [];
    externalId = String(externalId);
    let conv = convByExternal(channel, externalId);
    let isNewConv = false; let isNewLead = false;
    if (!conv) {
      if (dir === 'out') return null;
      isNewConv = true;
      const phone = normalizePhone(profile.phone || linked?.phone);
      let contact = null;
      if (channel === 'telegram') contact = contactList().find((c) => !c.archived && c.telegram?.id === externalId) || null;
      if (channel === 'instagram') contact = contactList().find((c) => !c.archived && c.instagram === externalId) || null;
      if (!contact && phone) contact = findAnyByPhone(phone);
      if (!contact) {
        contact = await put('contact', blankContact({
          kind: linked?.role === 'student' ? 'student' : 'parent',
          name: clip(profile.name || linked && `${linked.firstName || ''} ${linked.lastName || ''}`, 80),
          phones: phone ? [phone] : [], accountId: linked?.id || '',
        }));
      }
      let touched = false;
      if (channel === 'telegram' && !contact.telegram?.id) { contact.telegram = { id: externalId, username: clip(profile.username, 60) }; touched = true; }
      if (channel === 'instagram' && !contact.instagram) { contact.instagram = externalId; touched = true; }
      if (channel === 'whatsapp' && !contact.whatsapp) { contact.whatsapp = externalId; touched = true; }
      if (phone && !contact.phones.includes(phone)) { contact.phones = [...contact.phones, phone]; touched = true; }
      if (linked?.id && !contact.accountId) { contact.accountId = linked.id; touched = true; }
      if (touched) await put('contact', contact);
      const t = now();
      conv = {
        id: uuid(), channel, externalId, contactId: contact.id,
        title: clip(profile.name, 80) || (profile.username ? `@${profile.username}` : contact.name) || externalId,
        username: clip(profile.username, 60), phone, lastAt: t, lastText: '', lastDir: dir, unread: 0,
        msgChunk: 0, msgSeq: 0, recentExt: [], archived: false, createdAt: t, updatedAt: t,
      };
      const recent = [...maps.lead.values()].some((l) => l.contactId === contact.id && !l.archived && Date.now() - Date.parse(l.createdAt) < 60 * 86400000);
      if (createLead && !linked && !recent) {
        await newLead({
          type: 'message', channel, source: channel, contactId: contact.id, phone: phone || contact.phones[0] || '',
          createdText: `Первое сообщение в ${channel === 'telegram' ? 'Telegram' : channel === 'whatsapp' ? 'WhatsApp' : 'Instagram'}`, conversationId: conv.id,
        });
        isNewLead = true;
      }
    }
    if (message.externalId && conv.recentExt.includes(String(message.externalId))) return { conv, duplicate: true };
    const saved = await appendMessage(conv, {
      id: uuid(), dir, text: String(message.text ?? '').slice(0, 4000), attachments: message.attachments || [],
      externalId: message.externalId ? String(message.externalId) : '', at: message.at || now(), auto, author,
    }, pending);
    if (saved.externalId) conv.recentExt = [...conv.recentExt, saved.externalId].slice(-60);
    conv.lastAt = saved.at; conv.lastDir = dir; conv.lastAuto = auto;
    conv.lastText = saved.text || (saved.attachments[0] ? `[${saved.attachments[0].label || saved.attachments[0].type}]` : '');
    if (dir === 'in') conv.unread = (conv.unread || 0) + 1; else if (!auto) conv.unread = 0;
    if (profile.username && !conv.username) conv.username = clip(profile.username, 60);
    await put('conv', conv, pending);
    emit('message', { convId: conv.id, message: saved, conv: { id: conv.id, channel: conv.channel, title: conv.title, phone: conv.phone || '', username: conv.username || '' } });
    const persisted = Promise.all(pending);
    if (fast) persisted.catch((error) => console.warn('CRM: не удалось сохранить сообщение:', error.message)); else await persisted;
    return { conv, message: saved, isNewConv, isNewLead };
  }

  /* ───── аналитика ───── */
  function analytics({ from, to, groupBy = 'source' } = {}) {
    const fromMs = from ? Date.parse(from) : 0;
    const toMs = to ? Date.parse(to) : Date.now();
    const keyOf = {
      source: (l) => l.source || 'не определён',
      medium: (l) => l.medium || '—',
      campaign: (l) => `${l.source || 'не определён'} / ${l.campaign || '—'}`,
      content: (l) => `${l.campaign || '—'} / ${l.content || '—'}`,
      type: (l) => l.type,
      channel: (l) => l.channel,
      grade: (l) => (l.grade ? `${l.grade} класс` : '—'),
    }[groupBy] || ((l) => l.source || 'не определён');
    const leads = [...maps.lead.values()].filter((l) => !l.archived && Date.parse(l.createdAt) >= fromMs && Date.parse(l.createdAt) <= toMs);
    const blank = () => ({ leads: 0, booked: 0, done: 0, paid: 0, lost: 0 });
    const add = (row, l) => {
      row.leads += 1;
      const rank = STATUS_RANK[l.status];
      if (rank >= 2 || (l.status === 'lost' && l.trial)) row.booked += 1;
      if (rank >= 3 || ['attended', 'enrolled'].includes(l.trial?.status)) row.done += 1;
      if (l.status === 'paid') row.paid += 1;
      if (l.status === 'lost') row.lost += 1;
    };
    const rows = new Map(); const total = blank(); const days = new Map();
    for (const l of leads) {
      const key = keyOf(l);
      if (!rows.has(key)) rows.set(key, blank());
      add(rows.get(key), l); add(total, l);
      const d = dayKey(l.createdAt); days.set(d, (days.get(d) || 0) + 1);
    }
    const series = [];
    const start = new Date(Math.max(fromMs || Date.now() - 29 * 86400000, Date.now() - 119 * 86400000));
    for (let t = start.getTime(); t <= toMs && series.length < 120; t += 86400000) { const d = dayKey(new Date(t).toISOString()); if (!series.length || series[series.length - 1].day !== d) series.push({ day: d, leads: days.get(d) || 0 }); }
    const withRate = (r) => ({ ...r, conversion: r.leads ? Math.round((r.paid / r.leads) * 1000) / 10 : 0 });
    return {
      groupBy, total: withRate(total), series,
      rows: [...rows.entries()].map(([key, r]) => ({ key, ...withRate(r) })).sort((a, b) => b.leads - a.leads),
    };
  }

  return {
    init, exclusive, put, drop, maps, meta: () => meta, saveMeta, view,
    blankContact, resolveContacts, findParentByPhone, findAnyByPhone,
    newLead, getLead, applyStatus, timeline,
    findDuplicates, mergeContacts, pairKey, syncTrials, ingest, appendMessage, getMessages, findMessage, convByExternal, analytics,
    uuid, kv,
  };
}
