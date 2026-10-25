// STID (персональный цифровой код ученика) + привязка Telegram + бот (webhook) + вход в Mini App по подписи Telegram.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STID_LENGTH = 6; // сколько цифр в коде

export function createTelegramIdentity({ getSupabase, dataDir, getAccounts, refreshAccounts, setUserSessionCookie, clearUserSessionCookie, requireAdmin, recordAudit }) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const publicUrl = (process.env.PUBLIC_URL || 'https://study-task.kz').replace(/\/+$/, '');
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || (token ? crypto.createHash('sha256').update(`${token}:study-task-webhook`).digest('hex').slice(0, 40) : '');
  const storePath = path.join(dataDir, 'identity-links.json');
  const STORE_KEY = 'identity_links';
  let store = { stids: {}, telegram: {}, accountTg: {}, exited: {} };
  let saveChain = Promise.resolve();

  /* ───── хранилище ───── */
  async function load() {
    const supabase = getSupabase();
    let raw = null;
    try {
      if (supabase) {
        const r = await supabase.from('app_settings').select('value').eq('key', STORE_KEY).maybeSingle();
        if (!r.error && r.data?.value) raw = typeof r.data.value === 'string' ? JSON.parse(r.data.value) : r.data.value;
      } else {
        raw = JSON.parse(await fs.readFile(storePath, 'utf8'));
      }
    } catch { /* пусто — создадим */ }
    if (raw && typeof raw === 'object') store = { stids: raw.stids || {}, telegram: raw.telegram || {}, accountTg: raw.accountTg || {}, exited: raw.exited || {} };
  }
  function save() {
    const snapshot = JSON.stringify(store);
    saveChain = saveChain.then(async () => {
      const supabase = getSupabase();
      if (supabase) {
        const r = await supabase.from('app_settings').upsert({ key: STORE_KEY, value: snapshot }, { onConflict: 'key' });
        if (r.error) throw new Error(`Не удалось сохранить STID в Supabase: ${r.error.message}`);
      } else {
        await fs.mkdir(dataDir, { recursive: true });
        const tmp = `${storePath}.tmp`;
        await fs.writeFile(tmp, snapshot, { mode: 0o600 });
        await fs.rename(tmp, storePath);
      }
    }).catch((error) => { console.error('STID save failed:', error.message); });
    return saveChain;
  }

  /* ───── STID ───── */
  const used = () => new Set(Object.values(store.stids));
  function newStid() {
    const taken = used();
    const min = 10 ** (STID_LENGTH - 1), max = 10 ** STID_LENGTH;
    for (let i = 0; i < 1000; i += 1) {
      const code = String(crypto.randomInt(min, max));
      if (!taken.has(code)) return code;
    }
    throw new Error('Не удалось сгенерировать уникальный STID.');
  }
  const stidOf = (accountId) => store.stids[accountId] || '';
  const isLinked = (accountId) => Boolean(store.accountTg[accountId]);
  async function ensureStid(accountId) {
    if (!store.stids[accountId]) { store.stids[accountId] = newStid(); await save(); }
    return store.stids[accountId];
  }
  async function ensureAll() {
    const students = getAccounts().filter((a) => a.role === 'student');
    const ids = new Set(students.map((a) => a.id));
    let changed = false;
    for (const a of students) if (!store.stids[a.id]) { store.stids[a.id] = newStid(); changed = true; }
    for (const id of Object.keys(store.stids)) if (!ids.has(id) && getAccounts().length) { delete store.stids[id]; if (store.accountTg[id]) { delete store.telegram[store.accountTg[id]]; delete store.accountTg[id]; } changed = true; }
    if (changed) await save();
  }
  const accountByStid = (code) => {
    const id = Object.keys(store.stids).find((k) => store.stids[k] === code);
    return id ? getAccounts().find((a) => a.id === id && a.role === 'student' && a.status !== 'withdrawn') : null;
  };
  async function unlink(accountId) {
    const tg = store.accountTg[accountId];
    if (!tg) return false;
    delete store.accountTg[accountId];
    if (store.telegram[tg] === accountId) delete store.telegram[tg];
    await save();
    return true;
  }
  async function link(tgId, account) {
    const id = String(tgId);
    const current = store.accountTg[account.id];
    if (current && current !== id) return 'taken';
    const previous = store.telegram[id];
    if (previous && previous !== account.id) delete store.accountTg[previous];
    store.telegram[id] = account.id;
    store.accountTg[account.id] = id;
    delete store.exited[id];
    await save();
    return 'ok';
  }

  /* ───── Telegram API ───── */
  async function tgCall(method, body) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || response.status}`);
    return data.result;
  }
  const webAppUrl = `${publicUrl}/tg`;
  const openButton = (text = 'Открыть кабинет') => ({ inline_keyboard: [[{ text, web_app: { url: webAppUrl } }]] });
  const say = (chatId, text, extra = {}) => tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });


  /* ───── приветственное видео для /start ───── */
  const WELCOME_VIDEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bot_images', 'welcome.mp4');
  const fileIdPath = path.join(dataDir, 'welcome-video-file-id.json');
  let welcomeFileId = null;
  let welcomeLoaded = false;
  const welcomeCaption = `Привет! 👋 Это <b>StudyTask</b> — математический центр для 5–9 классов.\n\n📚 Живые уроки с учителем, тесты и домашка по фото\n⭐ Звёзды, рейтинг и призы\n\nЧтобы начать, отправьте сюда <b>код ученика</b> (${STID_LENGTH} цифр) — его выдаёт администратор. Мы привяжем кабинет к вашему Telegram, и входить заново не придётся.`;
  async function sendWelcome(chatId) {
    try {
      if (!welcomeLoaded) {
        welcomeLoaded = true;
        try { welcomeFileId = JSON.parse(await fs.readFile(fileIdPath, 'utf8')).fileId || null; } catch { /* нет сохранённого file_id */ }
      }
      const base = { chat_id: chatId, caption: welcomeCaption, parse_mode: 'HTML', supports_streaming: true, width: 540, height: 960, duration: 27 };
      let result;
      if (welcomeFileId) {
        try { result = await tgCall('sendVideo', { ...base, video: welcomeFileId }); } catch (error) { console.warn('welcome file_id:', error.message); welcomeFileId = null; }
      }
      if (!result) {
        const form = new FormData();
        for (const [k, v] of Object.entries(base)) form.append(k, String(v));
        form.append('video', new Blob([await fs.readFile(WELCOME_VIDEO)], { type: 'video/mp4' }), 'welcome.mp4');
        const response = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, { method: 'POST', body: form });
        const data = await response.json().catch(() => ({}));
        if (!data.ok) throw new Error(data.description || response.status);
        result = data.result;
        welcomeFileId = result?.video?.file_id || null;
        if (welcomeFileId) { try { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(fileIdPath, JSON.stringify({ fileId: welcomeFileId })); } catch { /* не критично */ } }
      }
      return true;
    } catch (error) {
      console.warn('welcome video:', error.message);
      return false;
    }
  }

  /* ───── защита от подбора кода ───── */
  const failsByTg = new Map();
  let globalFails = [];
  const recent = (list, ms) => list.filter((t) => Date.now() - t < ms);
  function blocked(tgId) {
    const mine = recent(failsByTg.get(tgId) || [], 15 * 60 * 1000);
    failsByTg.set(tgId, mine);
    globalFails = recent(globalFails, 60 * 60 * 1000);
    return mine.length >= 5 || globalFails.length >= 150;
  }
  function registerFail(tgId) { failsByTg.set(tgId, [...(failsByTg.get(tgId) || []), Date.now()]); globalFails.push(Date.now()); }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  async function handleMessage(message) {
    if (!message || message.chat?.type !== 'private' || !message.from || message.from.is_bot) return;
    const chatId = message.chat.id;
    const tgId = String(message.from.id);
    const text = String(message.text || '').trim();
    await refreshAccounts();
    const linkedId = store.telegram[tgId];
    const linkedAccount = linkedId ? getAccounts().find((a) => a.id === linkedId && a.status !== 'withdrawn') : null;
    // /restart — бот начинает с нуля: выход из аккаунта + приветствие с видео и просьбой прислать код
    if (/^\/restart(@\w+)?$/i.test(text)) {
      if (linkedId) { delete store.accountTg[linkedId]; delete store.telegram[tgId]; }
      store.exited[tgId] = true;
      failsByTg.delete(tgId);
      await save();
      try { await tgCall('setChatMenuButton', { chat_id: chatId, menu_button: { type: 'default' } }); } catch { /* не критично */ }
      if (await sendWelcome(chatId)) return;
      return say(chatId, `Привет! 👋 Это бот <b>StudyTask</b> — математический центр для 5–9 классов.\n\nОтправьте <b>код ученика (STID)</b> — ${STID_LENGTH} цифр. Его выдал администратор.`, { reply_markup: { remove_keyboard: true } });
    }
    // /exit — выход из аккаунта: снимаем привязку Telegram, при следующем открытии мини-приложения сессия сбрасывается
    if (/^\/exit(@\w+)?$/i.test(text)) {
      if (linkedId) { delete store.accountTg[linkedId]; delete store.telegram[tgId]; }
      store.exited[tgId] = true;
      await save();
      try { await tgCall('setChatMenuButton', { chat_id: chatId, menu_button: { type: 'default' } }); } catch { /* не критично */ }
      return say(chatId, 'Вы вышли из аккаунта. 👋\nЧтобы войти снова, отправьте код ученика (STID).', { reply_markup: { remove_keyboard: true } });
    }
    const digits = text.replace(/\D/g, '');
    const looksLikeCode = digits.length === STID_LENGTH && /^[\s\d\-–—:]+$/.test(text.replace(/stid/ig, ''));

    if (!looksLikeCode) {
      if (linkedAccount) {
        return say(chatId, text.startsWith('/start') ? `С возвращением, <b>${esc(linkedAccount.firstName)}</b>! 👋\nНажмите кнопку, чтобы открыть кабинет — входить заново не нужно.` : 'Кабинет ученика — по кнопке ниже 👇\nЕсли нужно привязать другого ученика, отправьте его код.', { reply_markup: openButton() });
      }
      if (text.startsWith('/start') && await sendWelcome(chatId)) return;
      return say(chatId, `Привет! 👋 Это бот <b>StudyTask</b> — математический центр для 5–9 классов.\n\nОтправьте <b>код ученика (STID)</b> — ${STID_LENGTH} цифр. Его выдал администратор.`);
    }
    if (blocked(tgId)) return say(chatId, 'Слишком много неверных попыток. Попробуйте через 15 минут или напишите администратору.');
    const account = accountByStid(digits);
    if (!account) {
      registerFail(tgId);
      return say(chatId, 'Код не найден 🤔 Проверьте цифры и отправьте ещё раз. Если не получается — уточните код у администратора.');
    }
    const result = await link(tgId, account);
    if (result === 'taken') {
      registerFail(tgId);
      return say(chatId, 'Этот код уже привязан к другому Telegram-аккаунту. Попросите администратора сбросить привязку.');
    }
    try { await tgCall('setChatMenuButton', { chat_id: chatId, menu_button: { type: 'web_app', text: 'Кабинет', web_app: { url: webAppUrl } } }); } catch (error) { console.warn(error.message); }
    return say(chatId, `Готово, <b>${esc(account.firstName)}</b>! ✅\nАккаунт привязан к этому Telegram. Теперь кабинет открывается в один клик — повторно входить не нужно.`, { reply_markup: openButton() });
  }

  /* отправка сообщения привязанному ученику (для напоминаний); true — доставлено */
  async function sendToAccount(accountId, text, opt = {}) {
    const tgId = store.accountTg[accountId];
    if (!token || !tgId) return false;
    try {
      await say(tgId, text, opt.button ? { reply_markup: openButton(opt.button) } : {});
      return true;
    } catch (error) { console.warn(`Telegram notify failed (${accountId}):`, error.message); return false; }
  }

  /* ───── проверка initData Mini App ───── */
  function verifyInitData(initData) {
    if (!token || typeof initData !== 'string' || initData.length > 4096) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheck = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const calc = crypto.createHmac('sha256', secret).update(dataCheck).digest();
    let given; try { given = Buffer.from(hash, 'hex'); } catch { return null; }
    if (given.length !== calc.length || !crypto.timingSafeEqual(given, calc)) return null;
    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > 24 * 3600) return null;
    try { return JSON.parse(params.get('user') || 'null'); } catch { return null; }
  }

  function register(app) {
    app.post('/api/telegram/webhook', (req, res) => {
      if (!token || req.get('x-telegram-bot-api-secret-token') !== webhookSecret) return res.sendStatus(403);
      res.sendStatus(200);
      handleMessage(req.body?.message).catch((error) => console.error('Telegram handler:', error.message));
    });

    app.post('/api/tg/auth', async (req, res) => {
      const user = verifyInitData(req.body?.initData);
      if (!user?.id) return res.status(401).json({ error: 'Не удалось подтвердить Telegram.' });
      await refreshAccounts();
      const accountId = store.telegram[String(user.id)];
      const account = accountId ? getAccounts().find((a) => a.id === accountId && a.role === 'student' && a.status !== 'withdrawn') : null;
      if (!account) {
        if (store.exited[String(user.id)]) { delete store.exited[String(user.id)]; await save(); if (clearUserSessionCookie) clearUserSessionCookie(res); }
        return res.status(404).json({ linked: false });
      }
      setUserSessionCookie(res, account);
      return res.json({ ok: true, linked: true });
    });

    app.post('/api/admin/accounts/:id/telegram/unlink', requireAdmin, async (req, res) => {
      const done = await unlink(req.params.id);
      if (done && recordAudit) await recordAudit(req.adminSession.sub, 'Сброшена привязка Telegram', req.params.id);
      return res.json({ ok: true, unlinked: done });
    });
  }

  async function setupWebhook() {
    if (!token) { console.log('Telegram: TELEGRAM_BOT_TOKEN не задан — бот выключен (STID работает, привязка через бота — нет).'); return; }
    try {
      await tgCall('setWebhook', { url: `${publicUrl}/api/telegram/webhook`, secret_token: webhookSecret, allowed_updates: ['message'], drop_pending_updates: false });
      await tgCall('setMyCommands', { commands: [{ command: 'start', description: 'Привязать аккаунт / открыть кабинет' }] });
      console.log(`Telegram: webhook установлен на ${publicUrl}/api/telegram/webhook`);
    } catch (error) { console.warn('Telegram setup failed:', error.message); }
  }

  return { load, ensureStid, ensureAll, stidOf, isLinked, register, setupWebhook, sendToAccount };
}
