// Клиент общей доски: WebSocket-соединение с комнатой, переподключение, очередь правок на время обрыва.
export interface RoomPage<T = unknown> { id: string; objs: T[] }
export interface CollabUser { id: string; name: string }
export type CollabMsg = { t: string; from?: string; [key: string]: unknown };
export type CollabStatus = 'connecting' | 'open' | 'reconnecting' | 'gone';

export interface CollabHandlers<T> {
  onHello: (h: { id: string; name: string; pages: RoomPage<T>[]; users: CollabUser[] }, queued: CollabMsg[]) => void;
  onMsg: (m: CollabMsg) => void;
  onStatus: (s: CollabStatus) => void;
}

export function boardAuthorId(): string {
  try { return localStorage.getItem('studytask-board-author') || ''; } catch { return ''; }
}

export class BoardCollab<T = unknown> {
  private ws: WebSocket | null = null;
  private queue: CollabMsg[] = [];
  private closed = false;
  private retry = 0;
  private timer: number | undefined;
  private everOpen = false;
  constructor(private token: string, private name: string, private h: CollabHandlers<T>) { this.open(); }

  private open() {
    if (this.closed) return;
    this.h.onStatus(this.everOpen ? 'reconnecting' : 'connecting');
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/board/${this.token}?name=${encodeURIComponent(this.name)}&aid=${encodeURIComponent(boardAuthorId())}`);
    this.ws = ws;
    ws.onmessage = (ev) => {
      let m: CollabMsg; try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (m.t === 'hello') {
        this.retry = 0; this.everOpen = true;
        const queued = this.queue; this.queue = [];
        this.h.onHello(m as unknown as { id: string; name: string; pages: RoomPage<T>[]; users: CollabUser[] }, queued);
        this.h.onStatus('open');
        return;
      }
      if (m.t === 'closed') { this.closed = true; this.h.onStatus('gone'); return; }
      this.h.onMsg(m);
    };
    ws.onclose = (ev) => {
      if (this.closed) return;
      if (ev.code === 4001 || (!this.everOpen && this.retry >= 3)) { this.closed = true; this.h.onStatus('gone'); return; }
      this.h.onStatus('reconnecting');
      this.timer = window.setTimeout(() => this.open(), Math.min(8000, 500 * 2 ** this.retry++));
    };
    ws.onerror = () => { /* onclose сработает следом */ };
  }

  get isOpen() { return this.ws?.readyState === WebSocket.OPEN; }
  /** Правки (ops, страницы) не теряются при обрыве; живые штрихи и курсоры — теряются. */
  send(m: CollabMsg, durable = false) {
    if (this.ws?.readyState === WebSocket.OPEN) { this.ws.send(JSON.stringify(m)); return; }
    if (durable && this.queue.length < 500) this.queue.push(m);
  }
  close() { this.closed = true; window.clearTimeout(this.timer); try { this.ws?.close(); } catch { /* ignore */ } }
}
