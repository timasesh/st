/* Напоминания и уведомления ученикам в Telegram:
   • за час до урока;
   • вечером в 19:00 накануне урока — напоминание выполнить домашку (если она задана и ещё не сдана);
   • сразу при назначении теста и домашнего задания. */
import fs from 'node:fs/promises';
import path from 'node:path';

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
const addDaysKey = (key, days) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10); };

export function createTelegramNotifier({ getSupabase, dataDir, getAccounts, refreshAccounts, sendToAccount, readSchedule, readTrialLessons, getTrialScheduledAt, nextSlotStart, readHistory, listHomeworkFiles }) {
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
    } catch (error) { console.warn('notify tick failed:', error.message); }
    finally { ticking = false; }
  }

  /* сразу при назначении */
  async function notifyHomework(studentId, entry) {
    if (!entry?.nextHomework || entry.attendance === false) return false;
    return sendToAccount(studentId, `📚 <b>Новое домашнее задание</b>${entry.topic ? ` по теме «${esc(entry.topic)}»` : ''}:\n\n${esc(String(entry.nextHomework).slice(0, 700))}\n\nФото решения можно прикрепить в кабинете.`, { button: 'Открыть кабинет' });
  }
  async function notifyTest(studentId, test) {
    const from = Date.parse(test.availableAt || ''), to = Date.parse(test.deadlineAt || '');
    const when = Number.isFinite(from) && Number.isFinite(to) ? `\nОткроется в <b>${fmtTime(new Date(from))}</b>, сдать до <b>${fmtTime(new Date(to))}</b>${test.durationMinutes ? ` (на тест — ${test.durationMinutes} мин)` : ''}.` : '';
    return sendToAccount(studentId, `📝 <b>Назначен тест</b>: «${esc(test.title || 'Тест')}»${when}\n\nПроходить — в кабинете.`, { button: 'Открыть кабинет' });
  }

  async function start() {
    if (!process.env.TELEGRAM_BOT_TOKEN) return;
    await load();
    timer = setInterval(() => { void tick(); }, TICK_MS);
    void tick();
    console.log('Telegram: напоминания включены (за час до урока, 19:00 накануне — домашка).');
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  return { start, stop, tick, notifyHomework, notifyTest };
}
