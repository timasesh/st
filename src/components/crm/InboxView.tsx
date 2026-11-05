import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, FileText, Mic, Paperclip, Search, Send, Zap } from 'lucide-react';
import { crmApi } from './api';
import { useCrm } from './store';
import type { ChannelId, Contact, Conversation, Lead, Message } from './types';
import { Avatar, Chip, Empty, StatusChip, TypeChip } from './ui';
import { CHANNEL_LABEL, TEMPLATES, displayName, fmtDate, fmtTime, formatPhone, matchesQuery, sameDay, timeAgo } from './util';

const CHANNELS: ChannelId[] = ['telegram', 'whatsapp', 'instagram'];

const SETUP: Record<'whatsapp' | 'instagram', { title: string; steps: string[]; vars: string[]; webhook: string }> = {
  whatsapp: {
    title: 'Подключение WhatsApp Cloud API',
    steps: ['Создайте приложение в Meta for Developers и добавьте продукт WhatsApp, подтвердите бизнес в Meta Business.', 'Привяжите номер к Cloud API (номер из обычного приложения WhatsApp придётся переносить — уточните режим сосуществования в документации Meta).', 'В настройках Webhooks укажите адрес и токен проверки ниже, подпишитесь на поле messages.', 'Задайте переменные окружения на сервере и перезапустите сервис.'],
    vars: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'META_APP_SECRET'], webhook: '/api/crm/webhooks/whatsapp',
  },
  instagram: {
    title: 'Подключение Instagram Direct',
    steps: ['Аккаунт Instagram должен быть бизнес-аккаунтом, привязанным к странице Facebook.', 'В приложении Meta добавьте Instagram Messaging, выдайте разрешения instagram_manage_messages и подтвердите приложение (App Review).', 'В Webhooks укажите адрес и токен проверки ниже, подпишитесь на messages.', 'Задайте переменные окружения на сервере и перезапустите сервис.'],
    vars: ['INSTAGRAM_TOKEN', 'INSTAGRAM_VERIFY_TOKEN', 'META_APP_SECRET'], webhook: '/api/crm/webhooks/instagram',
  },
};

function Bubble({ message, convId, channel }: { message: Message; convId: string; channel: ChannelId }) {
  const fileUrl = `/api/admin/crm/conversations/${convId}/messages/${message.id}/file`;
  return (
    <div className={`crm-msg ${message.dir === 'out' ? 'out' : ''} ${message.auto ? 'auto' : ''}`} title={message.auto ? 'Автоматическое сообщение бота' : undefined}>
      {message.attachments.map((a, i) => {
        const downloadable = channel === 'telegram' && a.fileId;
        if (downloadable && a.type === 'photo') return <a key={i} href={fileUrl} target="_blank" rel="noreferrer"><img className="att" src={fileUrl} alt={a.label || 'Фото'} loading="lazy" /></a>;
        const icon = a.type === 'voice' || a.type === 'audio' ? <Mic size={14} /> : a.type === 'document' ? <FileText size={14} /> : <Paperclip size={14} />;
        return downloadable || a.url
          ? <a key={i} className="crm-att" href={downloadable ? fileUrl : a.url} target="_blank" rel="noreferrer">{icon} {a.label || a.type}</a>
          : <span key={i} className="crm-att">{icon} {a.label || a.type}</span>;
      })}
      {message.text && <div>{message.text}</div>}
      <time>{message.auto ? 'бот · ' : message.dir === 'out' && message.author ? `${message.author} · ` : ''}{fmtTime(message.at)}</time>
    </div>
  );
}

function SidePanel({ conv, contact, leads }: { conv: Conversation; contact?: Contact; leads: Lead[] }) {
  const { contacts, go, upsertConv, toast } = useCrm();
  const [search, setSearch] = useState('');
  const matches = useMemo(() => (search.trim().length >= 2 ? contacts.filter((c) => !c.archived && c.id !== conv.contactId && matchesQuery([c.name, ...c.phones], search)).slice(0, 6) : []), [contacts, search, conv.contactId]);
  const link = async (contactId: string) => {
    try { upsertConv(await crmApi<Conversation>(`/conversations/${conv.id}`, { method: 'PATCH', body: { contactId } })); setSearch(''); toast('Диалог привязан к контакту'); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось привязать', 'bad'); }
  };
  return (
    <div className="crm-pad" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <div className="crm-row"><Avatar contact={contact} name={displayName(contact)} /><div style={{ minWidth: 0 }}><strong style={{ display: 'block' }}>{displayName(contact)}</strong><span className="crm-muted" style={{ fontSize: 12 }}>{contact ? (contact.kind === 'parent' ? 'Родитель' : 'Ученик') : ''}</span></div></div>
      <div className="crm-muted" style={{ display: 'grid', gap: 4 }}>
        {contact?.phones.map((p) => <a key={p} href={`tel:+${p}`} style={{ color: 'inherit' }}>{formatPhone(p)}</a>)}
        {conv.username && <span>@{conv.username}</span>}
        <span>В диалоге с {fmtDate(conv.createdAt)}</span>
      </div>
      {contact && <button type="button" className="crm-btn sm" onClick={() => go({ tab: 'contacts', contactId: contact.id })}><ExternalLink size={14} /> Карточка контакта</button>}
      <div>
        <span className="crm-label">Заявки</span>
        {leads.length ? leads.map((l) => (
          <button key={l.id} type="button" className="crm-item" style={{ borderRadius: 10, padding: '8px 6px' }} onClick={() => go({ tab: 'leads', leadId: l.id })}>
            <strong>№{l.number}</strong><TypeChip type={l.type} /><StatusChip status={l.status} />
          </button>
        )) : <p className="crm-muted" style={{ margin: 0, fontSize: 13 }}>Заявок нет.</p>}
      </div>
      <div>
        <span className="crm-label">Это уже известный контакт?</span>
        <input className="crm-input" placeholder="Найти по имени или телефону…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {matches.map((c) => <button key={c.id} type="button" className="crm-item" onClick={() => void link(c.id)}><Avatar contact={c} name={displayName(c)} /><span><strong>{displayName(c)}</strong><span className="crm-muted" style={{ display: 'block', fontSize: 12 }}>{c.phones.map(formatPhone)[0] || ''}</span></span></button>)}
        <p className="crm-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>Привяжите диалог — и вся история семьи будет в одной карточке.</p>
      </div>
    </div>
  );
}

export function InboxView() {
  const { convs, convMap, contactMap, leads, channels, nav, go, upsertConv, subscribeMessages, toast } = useCrm();
  const channel: ChannelId = nav.channel || (nav.convId && convMap[nav.convId]?.channel) || 'telegram';
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const selectedId = nav.convId && convMap[nav.convId]?.channel === channel ? nav.convId : undefined;
  const selected = selectedId ? convMap[selectedId] : undefined;

  const unreadBy = useMemo(() => Object.fromEntries(CHANNELS.map((c) => [c, convs.filter((x) => x.channel === c).reduce((n, x) => n + (x.unread || 0), 0)])), [convs]);
  const list = useMemo(() => convs.filter((c) => c.channel === channel && !c.archived && matchesQuery([c.title, c.username, c.phone, c.lastText, displayName(contactMap[c.contactId])], query)), [convs, channel, query, contactMap]);

  const markRead = useCallback(async (id: string) => {
    try { upsertConv(await crmApi<Conversation>(`/conversations/${id}/read`, { method: 'POST', body: {} })); } catch { /* не критично */ }
  }, [upsertConv]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return undefined; }
    let alive = true;
    setLoading(true); stickRef.current = true;
    crmApi<{ messages: Message[]; hasMore: boolean }>(`/conversations/${selectedId}/messages?limit=60`)
      .then((data) => { if (alive) { setMessages(data.messages); setHasMore(data.hasMore); } })
      .catch((reason) => toast(reason.message, 'bad'))
      .finally(() => { if (alive) setLoading(false); });
    if (convMap[selectedId]?.unread) void markRead(selectedId);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => subscribeMessages((convId, message) => {
    if (convId !== selectedId) return;
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    if (message.dir === 'in') void markRead(convId);
  }), [subscribeMessages, selectedId, markRead]);

  useEffect(() => {
    const el = threadRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const loadOlder = async () => {
    if (!selectedId || !messages.length) return;
    const el = threadRef.current; const before = el?.scrollHeight || 0;
    try {
      const data = await crmApi<{ messages: Message[]; hasMore: boolean }>(`/conversations/${selectedId}/messages?limit=60&before=${messages[0].seq}`);
      stickRef.current = false;
      setMessages((prev) => [...data.messages, ...prev]); setHasMore(data.hasMore);
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - before; });
    } catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось загрузить', 'bad'); }
  };
  const send = async () => {
    const body = text.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const message = await crmApi<Message>(`/conversations/${selectedId}/messages`, { body: { text: body } });
      stickRef.current = true;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message])); setText('');
    } catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось отправить', 'bad'); } finally { setSending(false); }
  };

  const contact = selected ? contactMap[selected.contactId] : undefined;
  const relatedLeads = selected ? leads.filter((l) => l.contactId === selected.contactId && !l.archived) : [];
  const connected = channels[channel];

  return (
    <div>
      <div className="crm-toolbar">
        <div className="crm-tabs" role="tablist" aria-label="Каналы">
          {CHANNELS.map((c) => (
            <button key={c} type="button" role="tab" className="crm-tab" aria-selected={channel === c} onClick={() => go({ channel: c, convId: undefined })}>
              {CHANNEL_LABEL[c]}{unreadBy[c] > 0 && <span className="crm-badge">{unreadBy[c]}</span>}{!channels[c] && <span className="crm-chip" style={{ fontSize: 10 }}>не подключён</span>}
            </button>
          ))}
        </div>
        <div className="crm-search"><Search size={16} /><input className="crm-input" placeholder="Поиск по диалогам…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>

      {!connected && channel !== 'telegram' && !list.length ? (
        <div className="crm-card crm-setup">
          <h3 style={{ marginBottom: 8 }}>{SETUP[channel as 'whatsapp' | 'instagram'].title}</h3>
          <ol style={{ paddingLeft: 20, margin: '0 0 12px' }}>{SETUP[channel as 'whatsapp' | 'instagram'].steps.map((s) => <li key={s} style={{ marginBottom: 4 }}>{s}</li>)}</ol>
          <p style={{ margin: '0 0 6px' }}>Переменные окружения: {SETUP[channel as 'whatsapp' | 'instagram'].vars.map((v) => <code key={v} style={{ marginRight: 6 }}>{v}</code>)}</p>
          <p style={{ margin: 0 }}>Адрес вебхука: <code>{window.location.origin}{SETUP[channel as 'whatsapp' | 'instagram'].webhook}</code></p>
        </div>
      ) : (
        <div className="crm-card crm-inbox">
          <section>
            <div className="crm-conv-list">
              {list.length ? list.map((c) => {
                const person = contactMap[c.contactId];
                return (
                  <button key={c.id} type="button" className="crm-item" aria-current={selectedId === c.id} onClick={() => go({ convId: c.id, channel })}>
                    <Avatar contact={person} name={person?.name || c.title} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="crm-row" style={{ justifyContent: 'space-between' }}><strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person?.name || c.title}</strong><span className="crm-muted" style={{ fontSize: 11, flex: 'none' }}>{timeAgo(c.lastAt)}</span></span>
                      <span className="crm-muted" style={{ display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastDir === 'out' ? 'Вы: ' : ''}{c.lastText || 'вложение'}</span>
                    </span>
                    {c.unread > 0 && <span className="crm-unread">{c.unread}</span>}
                  </button>
                );
              }) : <Empty title="Диалогов пока нет" text={channel === 'telegram' ? 'Когда кто-то напишет боту, диалог появится здесь.' : 'Сообщения появятся, когда канал начнёт получать их.'} />}
            </div>
          </section>
          <section>
            {selected ? (
              <>
                <div className="crm-row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <strong>{contact?.name || selected.title}</strong><Chip tone={channel === 'telegram' ? 'sky' : channel === 'whatsapp' ? 'ok' : 'violet'}>{CHANNEL_LABEL[channel]}</Chip>
                  {selected.username && <span className="crm-muted">@{selected.username}</span>}
                </div>
                <div className="crm-thread" ref={threadRef} onScroll={(e) => { const el = e.currentTarget; stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
                  {hasMore && <button type="button" className="crm-btn sm" style={{ alignSelf: 'center' }} onClick={() => void loadOlder()}>Показать более ранние</button>}
                  {loading && <p className="crm-muted" style={{ textAlign: 'center' }}>Загружаем…</p>}
                  {messages.map((m, i) => (
                    <div key={m.id} style={{ display: 'contents' }}>
                      {(i === 0 || !sameDay(messages[i - 1].at, m.at)) && <span className="crm-day">{fmtDate(m.at)}</span>}
                      <Bubble message={m} convId={selected.id} channel={channel} />
                    </div>
                  ))}
                </div>
                <div className="crm-composer">
                  <div style={{ position: 'relative' }}>
                    <button type="button" className="crm-btn icon" title="Быстрые ответы" aria-label="Быстрые ответы" onClick={() => setShowTemplates((v) => !v)}><Zap size={16} /></button>
                    {showTemplates && (
                      <div className="crm-card" style={{ position: 'absolute', bottom: 46, left: 0, width: 300, zIndex: 5, padding: 6 }}>
                        {TEMPLATES.map((t) => <button key={t.title} type="button" className="crm-item" onClick={() => { setText(t.text); setShowTemplates(false); }}><span><strong>{t.title}</strong><span className="crm-muted" style={{ display: 'block', fontSize: 12 }}>{t.text.slice(0, 70)}…</span></span></button>)}
                      </div>
                    )}
                  </div>
                  <textarea className="crm-textarea" rows={1} placeholder={connected ? 'Сообщение… (Enter — отправить, Shift+Enter — перенос)' : 'Канал не подключён — отправка недоступна'} value={text} disabled={!connected}
                    onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
                  <button type="button" className="crm-btn primary" disabled={!text.trim() || sending || !connected} onClick={() => void send()}><Send size={16} /> Отправить</button>
                </div>
              </>
            ) : <Empty title="Выберите диалог" text="Слева — переписки этого канала. Они хранятся бессрочно." />}
          </section>
          <section>{selected ? <SidePanel conv={selected} contact={contact} leads={relatedLeads} /> : null}</section>
        </div>
      )}
    </div>
  );
}
