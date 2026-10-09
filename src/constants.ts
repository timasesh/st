export const WHATSAPP_E164 = '77000373431';
export const WHATSAPP_DISPLAY = '+7 700 037 34 31';

export const GRADE_OPTIONS = ['5 класс', '6 класс', '7 класс', '8 класс', '9 класс'] as const;

export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}
