// Единый источник правды по уровням StudyTask (сервер и оба клиента: сайт и мини-приложение).
// Уровень считается по ВСЕМ заработанным звёздам: баланс + потраченное на призы,
// поэтому покупка набора уровень не снижает.

export const RANKS = [
  { id: 'earth', name: 'Земля', from: 1, color: '#16A34A' },
  { id: 'takeoff', name: 'Взлёт', from: 6, color: '#F97316' },
  { id: 'sky', name: 'Небо', from: 11, color: '#0EA5E9' },
  { id: 'strato', name: 'Стратосфера', from: 16, color: '#6366F1' },
  { id: 'orbit', name: 'Орбита', from: 21, color: '#1649E8' },
  { id: 'moon', name: 'Луна', from: 26, color: '#64748B' },
  { id: 'planets', name: 'Планеты', from: 31, color: '#E5484D' },
  { id: 'stars', name: 'Звёзды', from: 36, color: '#F59E0B' },
  { id: 'galaxy', name: 'Галактика', from: 41, color: '#9333EA' },
  { id: 'universe', name: 'Вселенная', from: 46, color: '#12266F' },
];

export const LEVEL_NAMES = [
  'Новичок', 'Следопыт', 'Счётчик', 'Задачник', 'Юный математик',
  'Стартёр', 'Разгон', 'Отрыв', 'Набор высоты', 'Первый полёт',
  'Облачный бегун', 'Ветер в крыльях', 'Высотник', 'Пилот', 'Ас неба',
  'Покоритель высот', 'Грозовой', 'Ледяной ум', 'Стратонавт', 'Командир звена',
  'Спутник', 'Навигатор', 'Штурман', 'Космонавт', 'Капитан орбиты',
  'Лунный следопыт', 'Исследователь кратеров', 'Лунный инженер', 'Селенолог', 'Хозяин Луны',
  'Марсианин', 'Гроза астероидов', 'Покоритель Юпитера', 'Повелитель колец', 'Властелин планет',
  'Искра', 'Звёздочка', 'Светило', 'Сверхновая', 'Созвездие',
  'Звёздный странник', 'Хранитель Млечного Пути', 'Архитектор галактик', 'Тёмная материя', 'Мастер галактики',
  'Квант', 'Чёрная дыра', 'Бесконечность', 'Математический гений', 'Легенда StudyTask',
];

export const MAX_LEVEL = 50;

// Сколько звёзд нужно, чтобы перейти с уровня n на n+1: 1 + floor(n / 5).
// Уровни 1–5: по 1 звезде, 5–9: по 2, ... 45–49: по 10. Итого уровень 50 = 274 звезды.
const stepFrom = (n) => 1 + Math.floor(n / 5);

// LEVEL_STARS[n - 1] = сколько всего звёзд нужно для уровня n.
export const LEVEL_STARS = (() => {
  const out = [0];
  for (let n = 1; n < MAX_LEVEL; n += 1) out.push(out[n - 1] + stepFrom(n));
  return out;
})();

export const levelImage = (n) => `/static/levels/level_${String(n).padStart(2, '0')}.webp`;
export const isMilestone = (n) => n % 10 === 0;
export const rankOf = (n) => [...RANKS].reverse().find((r) => n >= r.from) || RANKS[0];

/** Все заработанные звёзды из объекта progress (баланс + потрачено на призы). */
export function earnedStars(progress) {
  const orders = Array.isArray(progress?.prizeOrders) ? progress.prizeOrders : [];
  const spent = orders.reduce((s, o) => s + (Number(o?.cost) || 0), 0);
  return Math.max(0, (Number(progress?.stars) || 0) + spent);
}

/** Уровень и прогресс по числу заработанных звёзд. */
export function levelFor(earned) {
  const total = Math.max(0, Math.floor(Number(earned) || 0));
  let level = 1;
  while (level < MAX_LEVEL && total >= LEVEL_STARS[level]) level += 1;
  const isMax = level >= MAX_LEVEL;
  const base = LEVEL_STARS[level - 1];
  const nextAt = isMax ? base : LEVEL_STARS[level];
  const span = Math.max(1, nextAt - base);
  return {
    level, name: LEVEL_NAMES[level - 1], rank: rankOf(level), earned: total, isMax,
    base, nextAt, into: isMax ? span : total - base, span, left: isMax ? 0 : nextAt - total,
    pct: isMax ? 100 : Math.min(100, Math.round(((total - base) / span) * 100)),
    nextName: isMax ? null : LEVEL_NAMES[level],
  };
}
