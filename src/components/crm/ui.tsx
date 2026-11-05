import { useEffect, type ReactNode } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { ChannelId, Contact, Lead, StatusId } from './types';
import { CHANNEL_LABEL, STATUS_COLOR, TYPE_LABEL, TYPE_TONE, formatPhone, initials, sourceLabel, waDigits, waUrl } from './util';
import { useCrm } from './store';

export function Chip({ tone = '', children, title }: { tone?: string; children: ReactNode; title?: string }) {
  return <span className={`crm-chip ${tone}`} title={title}>{children}</span>;
}
export const TypeChip = ({ type }: { type: Lead['type'] }) => <Chip tone={TYPE_TONE[type]}>{TYPE_LABEL[type]}</Chip>;
export const SourceChip = ({ source }: { source: string }) => <Chip>{sourceLabel(source)}</Chip>;
export const ChannelChip = ({ channel }: { channel: ChannelId }) => <Chip tone={channel === 'telegram' ? 'sky' : channel === 'whatsapp' ? 'ok' : 'violet'}>{CHANNEL_LABEL[channel]}</Chip>;

export function StatusChip({ status }: { status: StatusId }) {
  const { statuses } = useCrm();
  const label = statuses.find((s) => s.id === status)?.label || status;
  return <span className="crm-chip" style={{ background: `${STATUS_COLOR[status]}1f`, color: STATUS_COLOR[status] }}>{label}</span>;
}

export function Avatar({ contact, name }: { contact?: Pick<Contact, 'kind'>; name: string }) {
  return <span className={`crm-avatar ${contact?.kind === 'student' ? 'student' : ''}`}>{initials(name)}</span>;
}

export function Modal({ title, onClose, children, width = 460 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="crm-overlay" style={{ display: 'grid', placeItems: 'center', zIndex: 70 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="crm-card crm-pad" role="dialog" aria-modal="true" aria-label={title} style={{ width: `min(${width}px, 94vw)`, maxHeight: '90vh', overflowY: 'auto', background: 'var(--card)' }}>
        <div className="crm-row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 18 }}>{title}</h3>
          <button type="button" className="crm-btn icon sm" onClick={onClose} aria-label="Закрыть"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: 'block' }}><span className="crm-label">{label}</span>{children}</label>;
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return <div className="crm-empty"><h3>{title}</h3>{text && <p style={{ margin: '0 0 12px' }}>{text}</p>}{action}</div>;
}

export function Drawer({ onClose, header, children }: { onClose: () => void; header: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="crm-overlay" onClick={onClose} />
      <aside className="crm-drawer" role="dialog" aria-modal="true">
        <div className="crm-drawer-head">
          <div style={{ minWidth: 0, flex: 1 }}>{header}</div>
          <button type="button" className="crm-btn icon sm" onClick={onClose} aria-label="Закрыть"><X size={16} /></button>
        </div>
        <div className="crm-drawer-body">{children}</div>
      </aside>
    </>
  );
}

/* Открыть чат с номером внутри CRM (WhatsApp-диалог). Если переписки с этим номером ещё нет — откроется приложение WhatsApp. */
export function useOpenChat() {
  const { convs, contactMap, go, toast } = useCrm();
  return (phone: string | undefined | null) => {
    const d = waDigits(phone || '');
    if (!d) return;
    const conv = convs.find((c) => c.channel === 'whatsapp' && !c.archived && waDigits(c.phone || c.externalId) === d)
      || convs.find((c) => c.channel === 'whatsapp' && !c.archived && contactMap[c.contactId]?.phones.some((p) => waDigits(p) === d));
    if (conv) { go({ tab: 'inbox', convId: conv.id, channel: 'whatsapp' }); return; }
    toast('Переписки с этим номером в CRM пока нет — открываем WhatsApp');
    window.open(waUrl(d), '_blank', 'noopener,noreferrer');
  };
}

/* Номер телефона: клик открывает чат с клиентом в CRM. Работает и внутри кнопок/строк таблицы — клик не всплывает. */
export function PhoneLink({ phone, className = '', icon = true, empty = 'без телефона' }: { phone?: string | null; className?: string; icon?: boolean; empty?: string }) {
  const openChat = useOpenChat();
  const text = formatPhone(phone || '');
  if (!text) return empty ? <span className="crm-muted">{empty}</span> : null;
  if (!waUrl(phone || '')) return <span>{text}</span>;
  const open = (event: { stopPropagation: () => void; preventDefault: () => void }) => { event.stopPropagation(); event.preventDefault(); openChat(phone); };
  return (
    <span role="link" tabIndex={0} className={`crm-phone ${className}`} title="Открыть чат с клиентом" aria-label={`Открыть чат с ${text}`}
      onClick={open} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') open(event); }}>
      {icon && <MessageCircle size={13} aria-hidden />}{text}
    </span>
  );
}
