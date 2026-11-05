/* Связь между админкой и CRM: какой чат открыт сейчас и «открой этот чат» от всплывающего уведомления. */
import type { ChannelId } from './types';

export type OpenChat = { convId: string; channel: ChannelId };
export const OPEN_CHAT_EVENT = 'crm:open-chat';

let openConv: string | null = null;
let pending: OpenChat | null = null;

export const setOpenConv = (id: string | null) => { openConv = id; };
/* Чат считается «открытым», только если он выбран в CRM и вкладка браузера видна. */
export const isConvOpen = (id: string) => openConv === id && document.visibilityState === 'visible';

export function requestOpenChat(target: OpenChat) {
  pending = target;
  window.dispatchEvent(new CustomEvent<OpenChat>(OPEN_CHAT_EVENT, { detail: target }));
}
export function takePendingChat(): OpenChat | null { const target = pending; pending = null; return target; }
