import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { crmApi } from './api';
import type { ChannelId, ChannelState, Contact, Conversation, Lead, Message, Status } from './types';

export type Tab = 'leads' | 'contacts' | 'inbox' | 'duplicates' | 'analytics';
export type Nav = { tab: Tab; leadId?: string; contactId?: string; convId?: string; channel?: ChannelId };

type Bootstrap = { statuses: Status[]; channels: ChannelState; leads: Lead[]; contacts: Contact[]; conversations: Conversation[]; duplicates: number };

type Ctx = {
  ready: boolean; error: string; live: boolean;
  statuses: Status[]; channels: ChannelState;
  leads: Lead[]; leadMap: Record<string, Lead>;
  contacts: Contact[]; contactMap: Record<string, Contact>;
  convs: Conversation[]; convMap: Record<string, Conversation>;
  dupCount: number; setDupCount: (n: number) => void;
  unreadTotal: number;
  nav: Nav; go: (next: Partial<Nav> & { tab?: Tab }) => void;
  upsertLead: (lead: Lead) => void; upsertContact: (contact: Contact) => void; upsertConv: (conv: Conversation) => void;
  reload: () => Promise<void>;
  toast: (text: string, tone?: 'ok' | 'bad') => void;
  subscribeMessages: (fn: (convId: string, message: Message) => void) => () => void;
};

const CrmContext = createContext<Ctx | null>(null);
export const useCrm = (): Ctx => {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('CRM context missing');
  return ctx;
};

const byId = <T extends { id: string }>(list: T[]): Record<string, T> => Object.fromEntries(list.map((item) => [item.id, item]));

export function CrmProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [channels, setChannels] = useState<ChannelState>({ telegram: false, whatsapp: false, instagram: false });
  const [leadMap, setLeadMap] = useState<Record<string, Lead>>({});
  const [contactMap, setContactMap] = useState<Record<string, Contact>>({});
  const [convMap, setConvMap] = useState<Record<string, Conversation>>({});
  const [dupCount, setDupCount] = useState(0);
  const [nav, setNav] = useState<Nav>({ tab: 'leads' });
  const [toastState, setToastState] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  const listeners = useRef(new Set<(convId: string, message: Message) => void>());
  const toastTimer = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    try {
      const data = await crmApi<Bootstrap>('/bootstrap');
      setStatuses(data.statuses); setChannels(data.channels); setDupCount(data.duplicates);
      setLeadMap(byId(data.leads)); setContactMap(byId(data.contacts)); setConvMap(byId(data.conversations));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить CRM.');
    } finally { setReady(true); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  /* живые обновления: сервер присылает изменённые сущности и новые сообщения */
  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;
    let source: EventSource | null = null;
    let wasDown = false;
    let closed = false;
    const connect = () => {
      source = new EventSource('/api/admin/crm/stream', { withCredentials: true });
      source.onopen = () => { setLive(true); if (wasDown) void reload(); wasDown = false; };
      source.onerror = () => { setLive(false); wasDown = true; };
      source.addEventListener('upsert', (event) => {
        const { coll, entity } = JSON.parse((event as MessageEvent).data);
        if (coll === 'lead') setLeadMap((m) => ({ ...m, [entity.id]: entity }));
        else if (coll === 'contact') setContactMap((m) => ({ ...m, [entity.id]: entity }));
        else if (coll === 'conv') setConvMap((m) => ({ ...m, [entity.id]: entity }));
      });
      source.addEventListener('delete', (event) => {
        const { coll, id } = JSON.parse((event as MessageEvent).data);
        const drop = <T,>(m: Record<string, T>) => { const { [id]: _removed, ...rest } = m; return rest; };
        if (coll === 'contact') setContactMap(drop); else if (coll === 'lead') setLeadMap(drop); else if (coll === 'conv') setConvMap(drop);
      });
      source.addEventListener('message', (event) => {
        const { convId, message } = JSON.parse((event as MessageEvent).data);
        listeners.current.forEach((fn) => fn(convId, message));
      });
    };
    connect();
    /* запасной канал: если соединение «молчит» (прокси режет SSE), раз в минуту сверяемся с сервером */
    const poll = window.setInterval(() => { if (!closed) void reload(); }, 60000);
    return () => { closed = true; source?.close(); window.clearInterval(poll); };
  }, [reload]);

  const toast = useCallback((text: string, tone: 'ok' | 'bad' = 'ok') => {
    setToastState({ text, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastState(null), 3500);
  }, []);
  const go = useCallback((next: Partial<Nav> & { tab?: Tab }) => setNav((prev) => (next.tab ? ({ ...next, tab: next.tab } as Nav) : { ...prev, ...next })), []);
  const subscribeMessages = useCallback((fn: (convId: string, message: Message) => void) => {
    listeners.current.add(fn);
    return () => { listeners.current.delete(fn); };
  }, []);

  const leads = useMemo(() => Object.values(leadMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [leadMap]);
  const contacts = useMemo(() => Object.values(contactMap), [contactMap]);
  const convs = useMemo(() => Object.values(convMap).sort((a, b) => b.lastAt.localeCompare(a.lastAt)), [convMap]);
  const unreadTotal = useMemo(() => convs.reduce((sum, c) => sum + (c.unread || 0), 0), [convs]);

  const value: Ctx = {
    ready, error, live, statuses, channels, leads, leadMap, contacts, contactMap, convs, convMap, dupCount, setDupCount, unreadTotal, nav, go,
    upsertLead: (lead) => setLeadMap((m) => ({ ...m, [lead.id]: lead })),
    upsertContact: (contact) => setContactMap((m) => ({ ...m, [contact.id]: contact })),
    upsertConv: (conv) => setConvMap((m) => ({ ...m, [conv.id]: conv })),
    reload, toast, subscribeMessages,
  };

  return (
    <CrmContext.Provider value={value}>
      {children}
      {toastState && <div role="status" className={`crm-toast ${toastState.tone === 'bad' ? 'bad' : ''}`}>{toastState.text}</div>}
    </CrmContext.Provider>
  );
}
