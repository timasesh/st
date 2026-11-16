/* Напоминания и уведомления ученикам в Telegram:
   • за час до урока;
   • вечером в 19:00 накануне урока — напоминание выполнить домашку (если она задана и ещё не сдана);
   • сразу при назначении теста и домашнего задания;
   • «Проверочный квиз» (привязан к уроку): открылся → осталось 5 минут → время вышло;
   • «Квиз» (с дедлайном): за 24 часа → за 1 час → дедлайн прошёл. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { isActiveTrial } from '../src/shared/trials.js';

const TZ = 'Asia/Almaty';
const TICK_MS = 60 * 1000;
const REMIND_BEFORE_MIN = 60;
const HW_REMINDER_HOUR = 19;
const KEEP_MS = 4 * 24 * 3600 * 1000;
const STORE_KEY = 'notify_sent';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const WEEKDAYS = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function localParts(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(({ type, value }) => [type, value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute), weekday: WEEKDAYS[p.weekday] };
}
const fmtTime = (date) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
const fmtDay = (date) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(date);
const fmtDayTime = (date) => `${fmtDay(date)}, ${fmtTime(date)}`;
const addDaysKey = (key, days) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10); };

export function createTelegramNotifier({ getSupabase, dataDir, getAccounts, refreshAccounts, sendToAccount, readSchedule, readTrialLessons, getTrialScheduledAt, nextSlotStart, readHistory, listHomeworkFiles, readAllTests, getTestWindow, getAdminTeacherId, sendToAdmins }) {
  const storePath = path.join(dataDir, 'notify-sent.json');
  let sent = {};
  let saveChain = Promise.resolve();
  let timer = null, ticking = false;

  async function load() {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const r = await supabase.from('app_settings').select('value').eq('key', STORE_KEY).maybeSingle();
        if (!r.error && r.data?.value) sent = typeof r.data.value === 'string' ? JSON.parse(r.data.value) : r.data.value;
      } else sent = JSON.parse(await fs.readFile(storePath, 'utf8'));
    } catch { sent = {}; }
    if (!sent || typeof sent !== 'object') sent = {};
  }
  function save() {
    const cutoff = Date.now() - KEEP_MS;
    for (const k of Object.keys(sent)) if (sent[k] < cutoff) delete sent[k];
    const snapshot = JSON.stringify(sent);
    saveChain = saveChain.then(async () => {
      const supabase = getSupabase();
      if (supabase) await supabase.from('app_settings').upsert({ key: STORE_KEY, value: snapshot }, { onConflict: 'key' });
      else { await fs.mkdir(dataDir, { recursive: true }); const tmp = `${storePath}.tmp`; await fs.writeFile(tmp, snapshot, { mode: 0o600 }); await fs.rename(tmp, storePath); }
    }).catch((error) => console.warn('notify save failed:', error.message));
    return saveChain;
  }
  /* помечаем «отправлено» только если сообщение реально доставлено (ученик привязан) */
  async function once(key, accountId, text, opt) {
    if (sent[key]) return false;
    const ok = await sendToAccount(accountId, text, opt);
    if (ok) { sent[key] = Date.now(); await save(); }
    return ok;
  }

  /* ближайшие занятия: { key, studentId, start, title, link } */
  async function upcomingLessons(now) {
    const out = [];
    const accounts = getAccounts();
    const schedule = await readSchedule();
    for (const lesson of schedule.lessons || []) {
      if (lesson.kind === 'block' || !lesson.studentId) continue;
      const first = new Date(nextSlotStart(lesson.day, lesson.hour, now));
      for (const start of [new Date(first.getTime() - 7 * 86400000), first, new Date(first.getTime() + 7 * 86400000)]) {
        if (start.getTime() < now.getTime() - 60000 || start.getTime() > now.getTime() + 2 * 86400000) continue;
        out.push({ key: `l:${lesson.id}:${start.toISOString()}`, studentId: lesson.studentId, start, title: lesson.title, link: accounts.find((a) => a.id === lesson.studentId)?.lessonLink || '' });
      }
    }
    for (const trial of await readTrialLessons()) {
      if (!['scheduled', 'trial', undefined].includes(trial.status) || !trial.studentId) continue;
      const start = new Date(getTrialScheduledAt(trial));
      if (!Number.isFinite(start.getTime()) || start.getTime() < now.getTime() - 60000 || start.getTime() > now.getTime() + 2 * 86400000) continue;
      out.push({ key: `t:${trial.id}:${start.toISOString()}`, studentId: trial.studentId, start, title: 'Пробный урок', link: trial.lessonLink || '' });
    }
    return out;
  }

  async function pendingHomework(studentId) {
    const history = await readHistory(studentId);
    const last = (history || []).find((e) => e.attendance !== false && e.nextHomework && String(e.nextHomework).trim());
    if (!last) return null;
    const files = await listHomeworkFiles(studentId).catch(() => ({}));
    if (files && files[last.id]) return null; // уже сдано
    return last;
  }

  async function tick() {
    if (ticking) return; ticking = true;
    try {
      await refreshAccounts();
      const now = new Date();
      const lessons = await upcomingLessons(now);
      const lp = localParts(now);
      for (const l of lessons) {
        const minutes = Math.round((l.start.getTime() - now.getTime()) / 60000);
        // 1) за час до урока
        if (minutes > 0 && minutes <= REMIND_BEFORE_MIN) {
          const when = minutes >= 55 ? 'Через час' : `Через ${minutes} мин`;
          await once(`1h:${l.key}`, l.studentId, `⏰ <b>${when} урок!</b>\n«${esc(l.title)}» — сегодня в <b>${fmtTime(l.start)}</b>.${l.link ? `\n\nСсылка на урок: ${esc(l.link)}` : ''}\n\nПодготовьте тетрадь и ручку 📝`, { button: 'Открыть кабинет' });
        }
        // 2) накануне в 19:00 — домашка
        const tomorrow = addDaysKey(lp.date, 1);
        if (lp.hour >= HW_REMINDER_HOUR && lp.hour < 23 && localParts(l.start).date === tomorrow && !sent[`hw:${l.key}`]) {
          const hw = await pendingHomework(l.studentId);
          if (hw) await once(`hw:${l.key}`, l.studentId, `📚 <b>Завтра урок</b> (${fmtDay(l.start)}, ${fmtTime(l.start)}).\nНе забудьте выполнить домашнее задание:\n\n${esc(String(hw.nextHomework).slice(0, 700))}\n\nФото решения можно прикрепить в кабинете.`, { button: 'Открыть кабинет' });
        }
      }
      await testReminders(now);
      await teacherReminders(now);
    } catch (error) { console.warn('notify tick failed:', error.message); }
    finally { ticking = false; }
  }

  /* напоминания по тестам: «Проверочный квиз» (по окну урока) и «Квиз» (по дедлайну) */
  async function testReminders(now) {
    if (!readAllTests) return;
    const accountIds = new Set(getAccounts().filter((a) => a.role === 'student' && a.status !== 'withdrawn').map((a) => a.id));
    let all;
    try { all = await readAllTests(); } catch (error) { console.warn('notify tests read failed:', error.message); return; }
    const nowMs = now.getTime();
    for (const [studentId, tests] of Object.entries(all || {})) {
      if (!accountIds.has(studentId) || !Array.isArray(tests)) continue;
      for (const test of tests) {
        if (!Array.isArray(test.questions) || test.status !== 'assigned') continue;
        const win = getTestWindow ? getTestWindow(test) : { availableAt: test.availableAt, deadlineAt: test.deadlineAt };
        const from = Date.parse(win.availableAt || ''), to = Date.parse(win.deadlineAt || '');
        if (!Number.isFinite(to)) continue;
        const title = esc(test.title || 'Тест');
        const left = to - nowMs;
        const btn = { button: 'Открыть кабинет' };
        if (test.kind === 'quiz') {
          if (left > 0 && left <= 3600000) await once(`tq-1h:${test.id}`, studentId, `⏳ <b>Остался час до дедлайна квиза</b>\n«${title}» — сдать до <b>${fmtTime(new Date(to))}</b>.\n\nПройдите его в кабинете.`, btn);
          else if (left > 3600000 && left <= 24 * 3600000) await once(`tq-24h:${test.id}`, studentId, `📝 <b>Напоминание о квизе</b>\n«${title}» — дедлайн <b>${fmtDayTime(new Date(to))}</b>.\n\nНе откладывайте: на прохождение нужно около ${test.durationMinutes || 5} мин.`, btn);
          else if (left <= 0 && left > -6 * 3600000) await once(`tq-end:${test.id}`, studentId, `⌛ <b>Дедлайн прошёл</b>\nКвиз «${title}» не был сдан вовремя и закрыт. Если нужен ещё один шанс — напишите преподавателю.`, btn);
        } else {
          if (!Number.isFinite(from)) continue;
          if (nowMs >= from && left > 5 * 60000) await once(`tq-open:${test.id}`, studentId, `🔔 <b>Проверочный квиз открыт!</b>\n«${title}» — до конца урока осталось 10 минут. Сдайте до <b>${fmtTime(new Date(to))}</b> (на тест — около ${test.durationMinutes || 5} мин).`, btn);
          else if (nowMs >= from && left > 0 && left <= 5 * 60000) await once(`tq-5m:${test.id}`, studentId, `⚠️ <b>Осталось ${Math.max(1, Math.ceil(left / 60000))} мин</b> на проверочный квиз «${title}». Сдайте до <b>${fmtTime(new Date(to))}</b>!`, btn);
          else if (left <= 0 && left > -30 * 60000) await once(`tq-end:${test.id}`, studentId, `⌛ <b>Время вышло</b>\nПроверочный квиз «${title}» закрыт: сдать его можно было до ${fmtTime(new Date(to))}.`, btn);
        }
      }
    }
  }

  /* ───── преподаватель, привязанный к админу: утреннее расписание, «за час», пробные ───── */
  const personName = (id) => { const a = getAccounts().find((x) => x.id === id); return a ? `${a.firstName} ${a.lastName}`.trim() : 'Ученик'; };
  async function onceAdmin(key, text) {
    if (sent[key]) return false;
    const delivered = await sendToAdmins(text);
    if (delivered > 0) { sent[key] = Date.now(); await save(); return true; }
    return false;
  }
  /* занятия преподавателя на конкретную дату: [{ hour, minute, label, trial }] по времени */
  async function teacherDay(teacherId, dateKey) {
    const weekday = localParts(new Date(`${dateKey}T12:00:00+05:00`)).weekday;
    const accounts = getAccounts();
    const items = [];
    for (const lesson of (await readSchedule()).lessons || []) {
      if (lesson.kind === 'block' || !lesson.studentId || lesson.teacherId !== teacherId || lesson.day !== weekday) continue;
      const student = accounts.find((a) => a.id === lesson.studentId);
      if (!student || student.status === 'withdrawn') continue;
      items.push({ hour: lesson.hour, minute: 0, label: `${esc(personName(lesson.studentId))}${lesson.title ? ` — ${esc(lesson.title)}` : ''}`, trial: false });
    }
    for (const trial of await readTrialLessons()) {
      if (!isActiveTrial(trial) || trial.teacherId !== teacherId) continue;
      const start = new Date(getTrialScheduledAt(trial));
      if (!Number.isFinite(start.getTime()) || localParts(start).date !== dateKey) continue;
      const parts = localParts(start);
      items.push({ hour: parts.hour, minute: parts.minute, label: `${esc(`${trial.firstName || ''} ${trial.lastName || ''}`.trim() || 'Ученик')}${trial.studentClass ? `, ${esc(trial.studentClass)}` : ''}`, trial: true });
    }
    return items.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  async function dayScheduleText(teacherId, dateKey, title) {
    const items = await teacherDay(teacherId, dateKey);
    const head = `${title} (${fmtDay(new Date(`${dateKey}T12:00:00+05:00`))})`;
    if (!items.length) return `${head}

Занятий нет 🎉`;
    const lines = items.map((it, i) => `${i + 1}. <b>${pad2(it.hour)}:${pad2(it.minute)}</b> — ${it.label}${it.trial ? ' 🆕 пробный урок' : ''}`);
    return `${head}

${lines.join('\n')}

Всего занятий: <b>${items.length}</b>`;
  }
  async function teacherReminders(now) {
    const teacherId = getAdminTeacherId && getAdminTeacherId();
    if (!teacherId || !sendToAdmins) return;
    const teacher = getAccounts().find((a) => a.id === teacherId && a.role === 'teacher' && a.status !== 'withdrawn');
    if (!teacher) return;
    const lp = localParts(now);
    // 1) каждый день с 6:00 — расписание на день
    if (lp.hour >= 6 && lp.hour < 12 && !sent[`tday:${lp.date}`]) await onceAdmin(`tday:${lp.date}`, await dayScheduleText(teacherId, lp.date, '☀️ <b>Расписание на сегодня</b>'));
    // 2) за час до каждого занятия
    const upcoming = [];
    for (const lesson of (await readSchedule()).lessons || []) {
      if (lesson.kind === 'block' || !lesson.studentId || lesson.teacherId !== teacherId) continue;
      const student = getAccounts().find((a) => a.id === lesson.studentId);
      if (!student || student.status === 'withdrawn') continue;
      const first = new Date(nextSlotStart(lesson.day, lesson.hour, now));
      for (const start of [new Date(first.getTime() - 7 * 86400000), first]) upcoming.push({ key: `th1:l:${lesson.id}:${start.toISOString()}`, start, text: `${esc(personName(lesson.studentId))}${lesson.title ? ` — ${esc(lesson.title)}` : ''}`, link: student.lessonLink || '' });
    }
    for (const trial of await readTrialLessons()) {
      if (!isActiveTrial(trial) || trial.teacherId !== teacherId) continue;
      const start = new Date(getTrialScheduledAt(trial));
      if (Number.isFinite(start.getTime())) upcoming.push({ key: `th1:t:${trial.id}:${start.toISOString()}`, start, text: `${esc(`${trial.firstName || ''} ${trial.lastName || ''}`.trim())} — пробный урок 🆕`, link: trial.lessonLink || '' });
    }
    for (const item of upcoming) {
      const minutes = Math.round((item.start.getTime() - now.getTime()) / 60000);
      if (minutes > 0 && minutes <= REMIND_BEFORE_MIN) await onceAdmin(item.key, `⏰ <b>${minutes >= 55 ? 'Через час' : `Через ${minutes} мин`} занятие</b> в <b>${fmtTime(item.start)}</b>\n${item.text}${item.link ? `\n\nСсылка: ${esc(item.link)}` : ''}`);
    }
  }
  /* назначили/перенесли пробный урок этому преподавателю: уведомление + новое расписание на этот день */
  async function notifyTeacherTrial(trial) {
    const teacherId = getAdminTeacherId && getAdminTeacherId();
    if (!teacherId || !sendToAdmins || !trial || trial.teacherId !== teacherId) return false;
    const start = new Date(getTrialScheduledAt(trial));
    if (!Number.isFinite(start.getTime())) return false;
    await sendToAdmins(`🆕 <b>Назначен пробный урок</b>\n${esc(`${trial.firstName || ''} ${trial.lastName || ''}`.trim())}${trial.studentClass ? `, ${esc(trial.studentClass)}` : ''}\n${fmtDayTime(start)}${trial.lessonLink ? `\n\nСсылка: ${esc(trial.lessonLink)}` : ''}`);
    await sendToAdmins(await dayScheduleText(teacherId, localParts(start).date, '📅 <b>Новое расписание</b>'));
    return true;
  }

  /* сразу при назначении */
  async function notifyHomework(studentId, entry) {
    if (!entry?.nextHomework || entry.attendance === false) return false;
    return sendToAccount(studentId, `📚 <b>Новое домашнее задание</b>${entry.topic ? ` по теме «${esc(entry.topic)}»` : ''}:\n\n${esc(String(entry.nextHomework).slice(0, 700))}\n\nФото решения можно прикрепить в кабинете.`, { button: 'Открыть кабинет' });
  }
  async function notifyTest(studentId, test) {
    const from = Date.parse(test.availableAt || ''), to = Date.parse(test.deadlineAt || '');
    const title = esc(test.title || 'Тест');
    const dur = test.durationMinutes ? ` (на прохождение — около ${test.durationMinutes} мин)` : '';
    if (test.kind === 'quiz') {
      const dl = Number.isFinite(to) ? `\nДедлайн: <b>${fmtDayTime(new Date(to))}</b>${dur}.` : '';
      return sendToAccount(studentId, `📝 <b>Назначен квиз</b>: «${title}»${dl}\n\nПроходить можно в любое время до дедлайна — в кабинете. Я напомню заранее.`, { button: 'Открыть кабинет' });
    }
    const win = Number.isFinite(from) && Number.isFinite(to) ? `\nЗанятие: <b>${fmtDayTime(new Date(from - 50 * 60000))}</b>. За 10 минут до конца урока (с <b>${fmtTime(new Date(from))}</b>) откроется квиз, сдать нужно до <b>${fmtTime(new Date(to))}</b>${dur}.` : '';
    return sendToAccount(studentId, `📝 <b>Назначен проверочный квиз</b>: «${title}»${win}\n\nПроходить — в кабинете. Я напомню, когда он откроется.`, { button: 'Открыть кабинет' });
  }

  async function start() {
    if (!process.env.TELEGRAM_BOT_TOKEN) return;
    await load();
    timer = setInterval(() => { void tick(); }, TICK_MS);
    void tick();
    console.log('Telegram: напоминания включены (урок за час, домашка в 19:00 накануне, квизы: открытие/дедлайн).');
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  return { start, stop, tick, notifyHomework, notifyTest, notifyTeacherTrial };
}
