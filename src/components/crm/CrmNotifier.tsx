import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { ChannelId, Message } from './types';
import { CHANNEL_LABEL, formatPhone } from './util';
import { isConvOpen, requestOpenChat } from './notify';

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

const preview = (message: Message) => (message.text || (message.attachments[0] ? `[${message.attachments[0].label || message.attachments[0].type}]` : 'Новое сообщение')).slice(0, 140);

/* Всплывающие уведомления о новых входящих сообщениях на любой вкладке админки — кроме случая, когда этот чат уже открыт на экране. */
export default function CrmNotifier({ onOpen }: { onOpen: () => void }) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const infoRef = useRef(new Map<string, ConvInfo>());
  const seenRef = useRef(new Set<string>());
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setPopups((list) => list.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;
    const source = new EventSource('/api/admin/crm/stream', { withCredentials: true });
    source.addEventListener('upsert', (event) => {
      try {
        const { coll, entity } = JSON.parse((event as MessageEvent).data);
        if (coll === 'conv') infoRef.current.set(entity.id, { title: entity.title || '', phone: entity.phone || '', channel: entity.channel });
      } catch { /* битое событие */ }
    });
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
    const activeTimers = timers.current;
    return () => { source.close(); activeTimers.forEach((t) => window.clearTimeout(t)); activeTimers.clear(); };
  }, [dismiss]);

  if (!popups.length) return null;
  return (
    <div className="crm-app crm-popups" role="region" aria-label="Новые сообщения" aria-live="polite">
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
