/* Общие константы и чистые функции CRM (без побочных эффектов — легко тестировать). */

export const STATUSES = [
  { id: 'new', label: 'Новая' },
  { id: 'contacted', label: 'Связались' },
  { id: 'trial_booked', label: 'Пробный записан' },
  { id: 'trial_done', label: 'Пробный проведён' },
  { id: 'paid', label: 'Оплатил' },
  { id: 'lost', label: 'Потерян' },
];
export const STATUS_IDS = STATUSES.map((s) => s.id);
export const STATUS_RANK = { new: 0, contacted: 1, trial_booked: 2, trial_done: 3, paid: 4, lost: -1 };
export const LEAD_TYPES = ['trial', 'intensive', 'level_test', 'message', 'manual'];
export const CHANNELS = ['telegram', 'whatsapp', 'instagram'];
export const UTM_FIELDS = ['source', 'medium', 'campaign', 'content', 'term'];
export const CLICK_IDS = ['fbclid', 'gclid', 'ttclid', 'yclid'];

export const now = () => new Date().toISOString();
export const clip = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');

/* Телефон → только цифры; 8XXXXXXXXXX и 10 цифр приводятся к 7XXXXXXXXXX. */
export function normalizePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

/* Имя для сравнения дублей: регистр, ё/е, порядок слов, лишние символы. */
export function nameKey(value) {
  const words = String(value ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-яәіңғүұқөһ\s]/gi, ' ').split(/\s+/).filter(Boolean);
  return words.sort().join(' ');
}

/* «Дана» и «Дана Ким» — вероятно один ребёнок: слова одного имени входят в другое. */
export function namesCompatible(a, b) {
  const x = nameKey(a).split(' ').filter(Boolean);
  const y = nameKey(b).split(' ').filter(Boolean);
  if (!x.length || !y.length) return false;
  const [small, big] = x.length <= y.length ? [x, y] : [y, x];
  return small.every((word) => big.includes(word));
}

export function splitName(full) {
  const parts = clip(full, 120).split(' ').filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

/* Источник по реферреру, когда UTM-меток нет (ссылка в био Instagram, переход из Google и т.п.). */
export function sourceFromReferrer(referrer) {
  let host = '';
  try { host = new URL(referrer).hostname.replace(/^www\./, '').replace(/^m\./, ''); } catch { return ''; }
  if (!host) return '';
  if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
  if (/(^|\.)(facebook|fb)\.com$/.test(host)) return 'facebook';
  if (/(^|\.)(t\.me|telegram\.org)$/.test(host)) return 'telegram';
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return 'youtube';
  if (/(^|\.)google\./.test(host)) return 'google';
  if (/(^|\.)yandex\./.test(host)) return 'yandex';
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(host)) return 'whatsapp';
  return host;
}

/* Приводит присланную клиентом атрибуцию к безопасному виду. */
export function cleanAttribution(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const touch = (value) => {
    const t = value && typeof value === 'object' ? value : {};
    const out = {};
    for (const key of UTM_FIELDS) { const v = clip(t[key], 120).toLowerCase(); if (v) out[key] = v; }
    for (const key of CLICK_IDS) { const v = clip(t[key], 200); if (v) out[key] = v; }
    return out;
  };
  const last = touch(input.last);
  const first = touch(input.first);
  const referrer = clip(input.referrer, 300);
  const landing = clip(input.landing, 300);
  const primary = Object.keys(last).length ? last : first;
  const source = primary.source || sourceFromReferrer(referrer) || '';
  return { ...primary, source, first: Object.keys(first).length ? first : undefined, referrer, landing };
}

export function formatPhone(digits) {
  const d = String(digits ?? '').replace(/\D/g, '');
  return d.length === 11 ? `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : d ? `+${d}` : '';
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function stripHtml(text) {
  return String(text ?? '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
