import type { ChannelId, Contact, Lead, LeadType, StatusId } from './types';

export const TYPE_LABEL: Record<LeadType, string> = { trial: 'Пробный урок', intensive: 'Интенсив', level_test: 'Тест уровня', career: 'Профориентация', message: 'Сообщение', manual: 'Вручную' };
export const TYPE_TONE: Record<LeadType, string> = { trial: 'brand', intensive: 'violet', level_test: 'sky', career: 'warn', message: 'ok', manual: '' };
export const STATUS_COLOR: Record<StatusId, string> = { new: '#2563eb', contacted: '#0891b2', trial_booked: '#7c3aed', trial_done: '#d97706', paid: '#059669', lost: '#e11d48' };
export const CHANNEL_LABEL: Record<ChannelId, string> = { telegram: 'Telegram', whatsapp: 'WhatsApp', instagram: 'Instagram' };
export const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const LOST_REASONS = ['Дорого', 'Не отвечает', 'Передумали', 'Выбрали другой центр', 'Не подошло время', 'Другое'];
export const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', telegram: 'Telegram', whatsapp: 'WhatsApp', google: 'Google', tiktok: 'TikTok', youtube: 'YouTube',
  yandex: 'Яндекс', direct: 'Прямой заход', admin: 'Админ-панель', manual: 'Вручную', '': 'Не определён',
};
export const sourceLabel = (source: string) => SOURCE_LABEL[source] ?? source;

export const TEMPLATES = [
  { title: 'Приветствие', text: 'Здравствуйте! 😊 Это математический центр StudyTask 💙 Подскажите, пожалуйста, в каком классе учится ребёнок и какая цель — подтянуть оценки или подготовиться к экзамену?' },
  { title: 'Запись на пробный', text: 'Предлагаем бесплатный пробный урок 💙 Подскажите, пожалуйста, какой день и время вам удобны? 😊' },
  { title: 'Напоминание о пробном', text: 'Напоминаем 😊 завтра пробный урок в StudyTask 💙 Ссылку на занятие пришлём за час до начала.' },
  { title: 'После пробного', text: 'Спасибо, что пришли на пробный урок! 💙 Как впечатления? 😊 Могу рассказать про формат занятий и стоимость.' },
  { title: 'Спасибо', text: 'Спасибо, что выбрали StudyTask! 💙 Будем рады видеть вас на занятиях 😊' },
];

export const digits = (value: string) => value.replace(/\D/g, '');
export function formatPhone(value: string): string {
  const d = digits(value || '');
  return d.length === 11 ? `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : d ? `+${d}` : '';
}
/* Номер для ссылки wa.me: только цифры, 8XXXXXXXXXX → 7XXXXXXXXXX, 10 цифр → +7. */
export function waDigits(value: string): string {
  let d = digits(value || '');
  if (d.length === 11 && d.startsWith('8')) d = `7${d.slice(1)}`;
  else if (d.length === 10) d = `7${d}`;
  return d;
}
export const waUrl = (value: string): string => { const d = waDigits(value); return d.length >= 10 ? `https://wa.me/${d}` : ''; };
export const displayName = (c: Pick<Contact, 'name' | 'phones'> | undefined): string => c?.name || (c?.phones?.[0] ? `Родитель ${formatPhone(c.phones[0])}` : 'Без имени');
export const leadTitle = (lead: Lead): string => lead.studentName || lead.parentName || (lead.phone ? formatPhone(lead.phone) : `Заявка №${lead.number}`);
export const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const TZ = 'Asia/Almaty';
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - Date.parse(iso));
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн назад`;
  return fmtDate(iso);
}
export const sameDay = (a: string, b: string) => new Date(a).toLocaleDateString('ru-RU', { timeZone: TZ }) === new Date(b).toLocaleDateString('ru-RU', { timeZone: TZ });
export const trialLabel = (t: { day: number; hour: number }) => `${DAYS[t.day] ?? ''} ${String(t.hour).padStart(2, '0')}:00`;

export function matchesQuery(text: string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qd = digits(q);
  return text.some((t) => t.toLowerCase().includes(q) || (qd.length >= 3 && digits(t).includes(qd.replace(/^8/, '7'))));
}
