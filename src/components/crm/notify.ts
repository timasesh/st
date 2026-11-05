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

/* «Открой вкладку CRM» (например, задачи) от всплывающего уведомления */
export const OPEN_TAB_EVENT = 'crm:open-tab';
let pendingTab: string | null = null;
export function requestOpenTab(tab: string) { pendingTab = tab; window.dispatchEvent(new CustomEvent<string>(OPEN_TAB_EVENT, { detail: tab })); }
export function takePendingTab(): string | null { const tab = pendingTab; pendingTab = null; return tab; }
