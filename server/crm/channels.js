/* Каналы переписки: Telegram (существующий бот), WhatsApp Cloud API, Instagram Messaging API.
   WhatsApp и Instagram включаются переменными окружения — пока их нет, вкладки в CRM показывают инструкцию. */
import crypto from 'node:crypto';
import { HttpError } from './util.js';

export function createChannels({ env = process.env, telegram, fetchImpl = (...args) => fetch(...args) }) {
  const version = env.META_GRAPH_VERSION || 'v21.0';
  const wa = { token: env.WHATSAPP_TOKEN || '', phoneId: env.WHATSAPP_PHONE_NUMBER_ID || '', verify: env.WHATSAPP_VERIFY_TOKEN || '' };
  const ig = { token: env.INSTAGRAM_TOKEN || '', host: env.INSTAGRAM_GRAPH_HOST || 'graph.facebook.com', verify: env.INSTAGRAM_VERIFY_TOKEN || env.WHATSAPP_VERIFY_TOKEN || '' };
  const appSecret = env.META_APP_SECRET || '';

  const status = () => ({
    telegram: Boolean(telegram?.enabled?.()),
    whatsapp: Boolean(wa.token && wa.phoneId && appSecret && wa.verify),
    instagram: Boolean(ig.token && appSecret && ig.verify),
  });

  /* Подпись вебхука Meta: X-Hub-Signature-256 = sha256=HMAC(app_secret, raw body). Без секрета вебхук закрыт. */
  function verifySignature(rawBody, header) {
    if (!appSecret || !rawBody || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
    const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest();
    let given; try { given = Buffer.from(header.slice(7), 'hex'); } catch { return false; }
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  }
  const verifyChallenge = (query, expected) => (query['hub.mode'] === 'subscribe' && expected && query['hub.verify_token'] === expected ? String(query['hub.challenge'] ?? '') : null);

  async function graph(url, token, body) {
    const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new HttpError(502, `Meta: ${data?.error?.message || response.status}`);
    return data;
  }

  /* ───── входящие ───── */
  const waLabel = { image: 'Фото', video: 'Видео', audio: 'Аудио', voice: 'Голосовое', document: 'Документ', sticker: 'Стикер', location: 'Геопозиция', contacts: 'Контакт' };
  function parseWhatsApp(body) {
    const out = [];
    for (const entry of body?.entry || []) for (const change of entry.changes || []) {
      const value = change.value || {};
      const names = Object.fromEntries((value.contacts || []).map((c) => [c.wa_id, c.profile?.name || '']));
      for (const m of value.messages || []) {
        const media = m[m.type] || {};
        const text = m.type === 'text' ? m.text?.body || '' : media.caption || '';
        out.push({
          externalId: m.from, name: names[m.from] || '', phone: m.from, messageId: m.id,
          text, at: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : undefined,
          attachments: m.type === 'text' ? [] : [{ type: m.type, label: waLabel[m.type] || m.type, mediaId: media.id || '' }],
        });
      }
    }
    return out;
  }
  function parseInstagram(body) {
    const out = [];
    if (body?.object !== 'instagram') return out;
    for (const entry of body.entry || []) for (const ev of entry.messaging || []) {
      const m = ev.message; if (!m) continue;
      const echo = Boolean(m.is_echo);
      out.push({
        echo, externalId: String(echo ? ev.recipient?.id : ev.sender?.id || ''), messageId: m.mid, text: m.text || '',
        at: ev.timestamp ? new Date(Number(ev.timestamp)).toISOString() : undefined,
        attachments: (m.attachments || []).map((a) => ({ type: a.type, label: a.type === 'image' ? 'Фото' : a.type === 'video' ? 'Видео' : a.type === 'audio' ? 'Аудио' : 'Вложение', url: a.payload?.url || '' })),
      });
    }
    return out.filter((m) => m.externalId);
  }

  /* ───── отправка ───── */
  async function send(conv, text) {
    if (conv.channel === 'telegram') {
      if (!telegram?.enabled?.()) throw new HttpError(400, 'Telegram-бот не подключён (нет TELEGRAM_BOT_TOKEN).');
      try { return { externalId: String(await telegram.sendPlain(conv.externalId, text)) }; }
      catch (error) { throw new HttpError(502, `Telegram: ${error.message}`); }
    }
    if (conv.channel === 'whatsapp') {
      if (!status().whatsapp) throw new HttpError(400, 'WhatsApp не подключён: задайте WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN и META_APP_SECRET.');
      const data = await graph(`https://graph.facebook.com/${version}/${wa.phoneId}/messages`, wa.token, { messaging_product: 'whatsapp', to: conv.externalId, type: 'text', text: { body: text, preview_url: true } });
      return { externalId: data?.messages?.[0]?.id || '' };
    }
    if (conv.channel === 'instagram') {
      if (!status().instagram) throw new HttpError(400, 'Instagram не подключён: задайте INSTAGRAM_TOKEN, INSTAGRAM_VERIFY_TOKEN и META_APP_SECRET.');
      const data = await graph(`https://${ig.host}/${version}/me/messages`, ig.token, { recipient: { id: conv.externalId }, message: { text } });
      return { externalId: data?.message_id || '' };
    }
    throw new HttpError(400, 'Неизвестный канал.');
  }

  /* Какие переменные заданы — для диагностики (значения не раскрываются). */
  const diagnose = () => ({
    WHATSAPP_TOKEN: Boolean(wa.token), WHATSAPP_PHONE_NUMBER_ID: wa.phoneId || false, WHATSAPP_VERIFY_TOKEN: Boolean(wa.verify), META_APP_SECRET: Boolean(appSecret),
    WHATSAPP_WABA_ID: env.WHATSAPP_WABA_ID || false,
    INSTAGRAM_TOKEN: Boolean(ig.token), graphVersion: version,
    webhookUrl: '/api/crm/webhooks/whatsapp',
  });
  const hasAppSecret = () => Boolean(appSecret);
  async function checkMeta() {
    const response = await fetchImpl(`https://graph.facebook.com/${version}/${wa.phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`, { headers: { Authorization: `Bearer ${wa.token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
    return data;
  }

  /* WABA: список номеров и подписка приложения на аккаунт (без подписки сообщения на вебхук не идут). */
  const wabaId = env.WHATSAPP_WABA_ID || '';
  async function graphGet(path) {
    const response = await fetchImpl(`https://graph.facebook.com/${version}/${path}`, { headers: { Authorization: `Bearer ${wa.token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
    return data;
  }
  async function wabaInfo(id = wabaId) {
    if (!id) throw new Error('Не задан WHATSAPP_WABA_ID');
    const [numbers, apps] = await Promise.all([
      graphGet(`${id}/phone_numbers?fields=id,display_phone_number,verified_name,status,quality_rating`),
      graphGet(`${id}/subscribed_apps`),
    ]);
    return { wabaId: id, phoneNumbers: numbers.data || [], subscribedApps: (apps.data || []).map((a) => a.whatsapp_business_api_data?.name || a.name || a.id) };
  }
  async function subscribeWaba(id = wabaId) {
    if (!id) throw new Error('Не задан WHATSAPP_WABA_ID');
    return graph(`https://graph.facebook.com/${version}/${id}/subscribed_apps`, wa.token, {});
  }

  return { wabaInfo, subscribeWaba, diagnose, hasAppSecret, checkMeta, status, verifySignature, verifyChallenge, parseWhatsApp, parseInstagram, send, waVerify: wa.verify, igVerify: ig.verify };
}
