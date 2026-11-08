import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ListChecks, MessageCircle, X } from 'lucide-react';
import type { ChannelId, Message } from './types';
import { CHANNEL_LABEL, formatPhone } from './util';
import { isConvOpen, requestOpenChat, requestOpenTab } from './notify';
import { CRM_UNLOCKED_EVENT } from './api';
import { almatyNow, applyTask, endsIn, loadTasks, patchTask, removeTask, startsIn, tasksLoaded, timeLabel, useTasks } from './tasksStore';

type Popup = { id: string; convId: string; channel: ChannelId; title: string; phone: string; text: string };
type ConvInfo = { title: string; phone: string; channel: ChannelId };

/* Короткий мягкий сигнал: без файлов, через WebAudio. Если браузер не разрешил звук — просто тишина. */
function beep() {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const play = (freq: number, at: number) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.22);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + at); osc.stop(ctx.currentTime + at + 0.24);
    };
    play(880, 0); play(1174, 0.14);
    window.setTimeout(() => { void ctx.close(); }, 700);
  } catch { /* звук не критичен */ }
}

type TaskPopup = { id: string; kind: 'start' | 'end'; taskId: string; text: string; range: string };
const NOTIFIED_KEY = 'crm.task.notified';
function readNotified(): Record<string, number> { try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}'); } catch { return {}; } }
function markNotified(key: string) {
  try {
    const all = readNotified(); all[key] = Date.now();
    for (const k of Object.keys(all)) if (Date.now() - all[k] > 4 * 86400000) delete all[k];
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(all));
  } catch { /* без памяти уведомления могут повториться — не страшно */ }
}

const preview = (message: Message) => (message.text || (message.attachments[0] ? `[${message.attachments[0].label || message.attachments[0].type}]` : 'Новое сообщение')).slice(0, 140);

/* Всплывающие уведомления о новых входящих сообщениях на любой вкладке админки — кроме случая, когда этот чат уже открыт на экране. */
export default function CrmNotifier({ onOpen }: { onOpen: () => void }) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const infoRef = useRef(new Map<string, ConvInfo>());
  const seenRef = useRef(new Set<string>());
  const timers = useRef(new Map<string, number>());
  const [taskPopups, setTaskPopups] = useState<TaskPopup[]>([]);
  const tasks = useTasks();
  const dismissTask = useCallback((id: string) => setTaskPopups((list) => list.filter((p) => p.id !== id)), []);

  const dismiss = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setPopups((list) => list.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;
    /* CRM закрыта PIN-кодом: пока сеанса нет, поток отвечает 423 и браузер сам не переподключается — пробуем раз в 20 секунд и сразу после ввода PIN */
    let stopped = false; let retry: number | undefined; let source: EventSource | null = null;
    const connect = () => {
      source = new EventSource('/api/admin/crm/stream', { withCredentials: true });
      source.addEventListener('upsert', (event) => {
        try {
          const { coll, entity } = JSON.parse((event as MessageEvent).data);
          if (coll === 'conv') infoRef.current.set(entity.id, { title: entity.title || '', phone: entity.phone || '', channel: entity.channel });
          else if (coll === 'task') applyTask(entity);
        } catch { /* битое событие */ }
      });
      source.addEventListener('delete', (event) => {
        try { const { coll, id } = JSON.parse((event as MessageEvent).data); if (coll === 'task') removeTask(id); } catch { /* битое событие */ }
      });
      source.onopen = () => { void loadTasks().catch(() => {}); };
      source.addEventListener('message', (event) => {
        try {
          const { convId, message, conv } = JSON.parse((event as MessageEvent).data) as { convId: string; message: Message; conv?: { title?: string; phone?: string; channel?: ChannelId } };
          if (!message || message.dir !== 'in' || message.auto) return;
          if (seenRef.current.has(message.id)) return;
          seenRef.current.add(message.id);
          if (seenRef.current.size > 200) seenRef.current = new Set([...seenRef.current].slice(-100));
          if (isConvOpen(convId)) return;
          const known = infoRef.current.get(convId);
          const channel = (conv?.channel || known?.channel || 'whatsapp') as ChannelId;
          const phone = conv?.phone || known?.phone || '';
          const popup: Popup = { id: message.id, convId, channel, title: conv?.title || known?.title || (phone ? formatPhone(phone) : 'Новое сообщение'), phone, text: preview(message) };
          setPopups((list) => [popup, ...list.filter((p) => p.id !== popup.id)].slice(0, 4));
          timers.current.set(popup.id, window.setTimeout(() => dismiss(popup.id), 10000));
          beep();
        } catch { /* битое событие */ }
      });
      source.onerror = () => { if (source && source.readyState === 2 && !stopped) retry = window.setTimeout(connect, 20000); };
    };
    const reconnect = () => { window.clearTimeout(retry); source?.close(); if (!stopped) connect(); };
    connect();
    window.addEventListener(CRM_UNLOCKED_EVENT, reconnect);
    const activeTimers = timers.current;
    return () => { stopped = true; window.clearTimeout(retry); window.removeEventListener(CRM_UNLOCKED_EVENT, reconnect); source?.close(); activeTimers.forEach((t) => window.clearTimeout(t)); activeTimers.clear(); };
  }, [dismiss]);

  /* Задачи: раз в 15 секунд сверяем часы с расписанием. Уведомление о начале — синее, о конце (если не отмечена) — красное и не исчезает само. */
  useEffect(() => {
    const check = () => {
      if (!tasksLoaded()) return;
      const now = almatyNow();
      const done = readNotified();
      const fresh: TaskPopup[] = [];
      for (const t of tasks) {
        if (t.status !== 'open') continue;
        const range = `${timeLabel(t.start)} – ${timeLabel(t.end)}`;
        const toStart = startsIn(t, now); const toEnd = endsIn(t, now);
        if (toEnd <= 0 && toEnd > -90 && !done[`${t.id}:end:${t.date}${t.end}`]) { fresh.push({ id: `${t.id}:end`, kind: 'end', taskId: t.id, text: t.text, range }); markNotified(`${t.id}:end:${t.date}${t.end}`); }
        else if (toStart <= 0 && toEnd > 0 && toStart > -30 && !done[`${t.id}:start:${t.date}${t.start}`]) { fresh.push({ id: `${t.id}:start`, kind: 'start', taskId: t.id, text: t.text, range }); markNotified(`${t.id}:start:${t.date}${t.start}`); }
      }
      if (fresh.length) {
        setTaskPopups((list) => [...fresh, ...list.filter((p) => !fresh.some((f) => f.id === p.id))].slice(0, 5));
        beep();
        fresh.filter((f) => f.kind === 'start').forEach((f) => window.setTimeout(() => dismissTask(f.id), 20000));
      }
    };
    check();
    const timer = window.setInterval(check, 15000);
    return () => window.clearInterval(timer);
  }, [tasks, dismissTask]);
  /* если задачу отметили (в том числе с другого устройства) — убираем её напоминания */
  useEffect(() => { setTaskPopups((list) => list.filter((p) => tasks.some((t) => t.id === p.taskId && t.status === 'open'))); }, [tasks]);

  if (!popups.length && !taskPopups.length) return null;
  return (
    <div className="crm-app crm-popups" role="region" aria-label="Уведомления CRM" aria-live="polite">
      {taskPopups.map((p) => (
        <div key={p.id} className={`crm-popup task ${p.kind}`}>
          <button type="button" className="crm-popup-main" onClick={() => { requestOpenTab('tasks'); onOpen(); dismissTask(p.id); }} title="Открыть задачи">
            <span className="ico"><ListChecks size={20} /></span>
            <span className="txt">
              <span className="head"><strong>{p.kind === 'start' ? 'Задача началась' : 'Время задачи вышло'}</strong><span className="crm-chip">{p.range}</span></span>
              <span className="body">{p.text}</span>
            </span>
          </button>
          {p.kind === 'end' && <button type="button" className="crm-popup-done" onClick={() => { void patchTask(p.taskId, { status: 'done' }).catch(() => {}); dismissTask(p.id); }}><Check size={14} /> Выполнено</button>}
          <button type="button" className="crm-popup-x" aria-label="Закрыть" onClick={() => dismissTask(p.id)}><X size={15} /></button>
        </div>
      ))}
      {popups.map((p) => (
        <div key={p.id} className={`crm-popup ${p.channel}`}>
          <button type="button" className="crm-popup-main" onClick={() => { requestOpenChat({ convId: p.convId, channel: p.channel }); onOpen(); dismiss(p.id); }} title="Открыть чат в CRM">
            <span className="ico"><MessageCircle size={20} /></span>
            <span className="txt">
              <span className="head"><strong>{p.title}</strong><span className="crm-chip">{CHANNEL_LABEL[p.channel]}</span></span>
              <span className="body">{p.text}</span>
            </span>
          </button>
          <button type="button" className="crm-popup-x" aria-label="Закрыть" onClick={() => dismiss(p.id)}><X size={15} /></button>
        </div>
      ))}
    </div>
  );
}
