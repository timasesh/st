/* Казахстанские мобильные номера: +7 (XXX) XXX XX XX, где XXX — только из списка ниже. */
export const ALLOWED_CODES = ['700', '701', '702', '703', '704', '705', '706', '707', '708', '709', '747', '771', '775', '776', '777', '778'] as const;
export const CODES_HINT = '700–709, 747, 771, 775, 776, 777, 778';

const SLOTS = '+7 (___) ___ __ __';
const SLOT_INDEXES = SLOTS.split('').map((ch, i) => (ch === '_' ? i : -1)).filter((i) => i >= 0);

/** Приводит любой ввод/вставку к 10 цифрам после +7. */
export function nationalDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length >= 11 && (d.startsWith('7') || d.startsWith('8'))) d = d.slice(1);
  return d.slice(0, 10);
}

/** 10 цифр -> "+7 (700) 123 45 67" с подчёркиваниями на пустых местах и позицией курсора. */
export function renderPhone(digits: string): { text: string; caret: number } {
  const chars = SLOTS.split('');
  [...digits].forEach((d, i) => { chars[SLOT_INDEXES[i]] = d; });
  const caret = digits.length >= 10 ? SLOTS.length : SLOT_INDEXES[digits.length];
  return { text: chars.join(''), caret };
}

/** Код (первые 3 цифры) может ещё превратиться в допустимый? */
export function prefixOk(digits: string): boolean {
  const p = digits.slice(0, 3);
  return !p || ALLOWED_CODES.some((code) => code.startsWith(p));
}

/** Текст ошибки либо '' если номер полный и верный. `final` — требовать все 10 цифр. */
export function phoneProblem(digits: string, final = true): string {
  if (!prefixOk(digits)) return `Номер должен начинаться с +7 и кода ${CODES_HINT}.`;
  if (final && digits.length < 10) return 'Введите номер телефона полностью.';
  if (digits.length === 10 && !ALLOWED_CODES.includes(digits.slice(0, 3) as (typeof ALLOWED_CODES)[number])) return `Номер должен начинаться с +7 и кода ${CODES_HINT}.`;
  return '';
}

/** Для отправки на сервер: 11 цифр вида 77001234567. */
export const fullPhone = (digits: string) => `7${digits}`;
