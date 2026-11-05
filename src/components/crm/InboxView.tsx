import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCheck, ExternalLink, FileText, MessageCircle, Mic, Paperclip, Search, Send, Zap } from 'lucide-react';
import { crmApi } from './api';
import { useCrm } from './store';
import type { ChannelId, Contact, Conversation, Lead, Message } from './types';
import { Avatar, Chip, PhoneLink, StatusChip, TypeChip } from './ui';
import { CHANNEL_LABEL, TEMPLATES, displayName, fmtDate, fmtTime, formatPhone, matchesQuery, sameDay, waUrl } from './util';

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

/* «14:05» сегодня, «вчера», иначе «05.11» — как в мессенджерах. */
function shortTime(iso: string): string {
  const now = new Date();
  if (sameDay(iso, now.toISOString())) return fmtTime(iso);
  if (sameDay(iso, new Date(now.getTime() - 864e5).toISOString())) return 'вчера';
  return new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit' });
}

/* Ссылки в тексте сообщений становятся кликабельными. */
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g;
function Linkified({ text }: { text: string }) {
  return <>{text.split(URL_RE).map((part, i) => (i % 2 ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a> : part))}</>;
}

function Bubble({ message, convId, channel, cont }: { message: Message; convId: string; channel: ChannelId; cont: boolean }) {
  const fileUrl = `/api/admin/crm/conversations/${convId}/messages/${message.id}/file`;
  const out = message.dir === 'out';
  return (
    <div className={`crm-msg ${out ? 'out' : 'in'} ${message.auto ? 'auto' : ''} ${cont ? 'cont' : ''}`} title={message.auto ? 'Автоматическое сообщение бота' : undefined}>
      {message.attachments.map((a, i) => {
        const downloadable = channel === 'telegram' && a.fileId;
        if (downloadable && a.type === 'photo') return <a key={i} href={fileUrl} target="_blank" rel="noreferrer"><img className="att" src={fileUrl} alt={a.label || 'Фото'} loading="lazy" /></a>;
        const icon = a.type === 'voice' || a.type === 'audio' ? <Mic size={14} /> : a.type === 'document' ? <FileText size={14} /> : <Paperclip size={14} />;
        return downloadable || a.url
          ? <a key={i} className="crm-att" href={downloadable ? fileUrl : a.url} target="_blank" rel="noreferrer">{icon} {a.label || a.type}</a>
          : <span key={i} className="crm-att">{icon} {a.label || a.type}</span>;
      })}
      {message.text && <span className="txt"><Linkified text={message.text} /></span>}
      <time>
        {message.auto ? 'бот · ' : out && message.author ? `${message.author} · ` : ''}{fmtTime(message.at)}
        {out && <CheckCheck size={13} aria-hidden />}
      </time>
    </div>
  );
}

function SidePanel({ conv, contact, leads, phone }: { conv: Conversation; contact?: Contact; leads: Lead[]; phone: string }) {
  const { contacts, go, upsertConv, toast } = useCrm();
  const [search, setSearch] = useState('');
  const matches = useMemo(() => (search.trim().length >= 2 ? contacts.filter((c) => !c.archived && c.id !== conv.contactId && matchesQuery([c.name, ...c.phones], search)).slice(0, 6) : []), [contacts, search, conv.contactId]);
  const link = async (contactId: string) => {
    try { upsertConv(await crmApi<Conversation>(`/conversations/${conv.id}`, { method: 'PATCH', body: { contactId } })); setSearch(''); toast('Диалог привязан к контакту'); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось привязать', 'bad'); }
  };
  const phones = contact?.phones.length ? contact.phones : phone ? [phone] : [];
  return (
    <div className="crm-side">
      <div className="crm-side-hero">
        <Avatar contact={contact} name={displayName(contact)} />
        <strong>{displayName(contact)}</strong>
        <span className="crm-muted">{contact ? (contact.kind === 'parent' ? 'Родитель' : 'Ученик') : 'Новый контакт'}{conv.username ? ` · @${conv.username}` : ''}</span>
        <div className="crm-side-phones">{phones.map((p) => <PhoneLink key={p} phone={p} className="pill" />)}</div>
        {phones[0] && waUrl(phones[0]) && <a className="crm-btn wa" href={waUrl(phones[0])} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Открыть в WhatsApp</a>}
        {contact && <button type="button" className="crm-btn sm" onClick={() => go({ tab: 'contacts', contactId: contact.id })}><ExternalLink size={14} /> Карточка контакта</button>}
        <span className="crm-muted" style={{ fontSize: 12 }}>В диалоге с {fmtDate(conv.createdAt)}</span>
      </div>
      <div className="crm-side-block">
        <span className="crm-label">Заявки</span>
        {leads.length ? leads.map((l) => (
          <button key={l.id} type="button" className="crm-lead-row" onClick={() => go({ tab: 'leads', leadId: l.id })}>
            <strong>№{l.number}</strong><TypeChip type={l.type} /><StatusChip status={l.status} />
          </button>
        )) : <p className="crm-muted" style={{ margin: 0, fontSize: 13 }}>Заявок нет.</p>}
      </div>
      <div className="crm-side-block">
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
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickRef = useRef(true);
  const selectedId = nav.convId && convMap[nav.convId]?.channel === channel ? nav.convId : undefined;
  const selected = selectedId ? convMap[selectedId] : undefined;

  const unreadBy = useMemo(() => Object.fromEntries(CHANNELS.map((c) => [c, convs.filter((x) => x.channel === c).reduce((n, x) => n + (x.unread || 0), 0)])), [convs]);
  const list = useMemo(() => convs.filter((c) => c.channel === channel && !c.archived && (!unreadOnly || c.unread > 0) && matchesQuery([c.title, c.username, c.phone, c.lastText, displayName(contactMap[c.contactId])], query)), [convs, channel, query, unreadOnly, contactMap]);

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

  /* поле ввода растёт вместе с текстом (до 160px) */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text, selectedId]);

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
  const phone = selected ? (selected.phone || contact?.phones[0] || (channel === 'whatsapp' ? selected.externalId : '')) : '';
  const totalUnread = unreadBy[channel] || 0;

  return (
    <div>
      <div className="crm-toolbar">
        <div className="crm-tabs" role="tablist" aria-label="Каналы">
          {CHANNELS.map((c) => (
            <button key={c} type="button" role="tab" className="crm-tab" aria-selected={channel === c} onClick={() => go({ channel: c, convId: undefined })}>
              <i className={`crm-dot ${c}`} />{CHANNEL_LABEL[c]}{unreadBy[c] > 0 && <span className="crm-badge">{unreadBy[c]}</span>}{!channels[c] && <span className="crm-chip" style={{ fontSize: 10 }}>не подключён</span>}
            </button>
          ))}
        </div>
      </div>

      {!connected && channel !== 'telegram' && !convs.some((c) => c.channel === channel) ? (
        <div className="crm-card crm-setup">
          <h3 style={{ marginBottom: 8 }}>{SETUP[channel as 'whatsapp' | 'instagram'].title}</h3>
          <ol style={{ paddingLeft: 20, margin: '0 0 12px' }}>{SETUP[channel as 'whatsapp' | 'instagram'].steps.map((s) => <li key={s} style={{ marginBottom: 4 }}>{s}</li>)}</ol>
          <p style={{ margin: '0 0 6px' }}>Переменные окружения: {SETUP[channel as 'whatsapp' | 'instagram'].vars.map((v) => <code key={v} style={{ marginRight: 6 }}>{v}</code>)}</p>
          <p style={{ margin: 0 }}>Адрес вебхука: <code>{window.location.origin}{SETUP[channel as 'whatsapp' | 'instagram'].webhook}</code></p>
        </div>
      ) : (
        <div className="crm-card crm-inbox" data-ch={channel} data-sel={selected ? '1' : '0'}>
          <section className="crm-conv-col">
            <div className="crm-conv-head">
              <div className="crm-row" style={{ justifyContent: 'space-between' }}>
                <h3>Диалоги</h3>
                <div className="crm-seg" role="group" aria-label="Фильтр">
                  <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>Все</button>
                  <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Новые{totalUnread > 0 ? ` · ${totalUnread}` : ''}</button>
                </div>
              </div>
              <div className="crm-search" style={{ maxWidth: 'none' }}><Search size={16} /><input className="crm-input" placeholder="Имя, номер или текст…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            </div>
            <div className="crm-conv-list">
              {list.length ? list.map((c) => {
                const person = contactMap[c.contactId];
                const name = person?.name || c.title;
                return (
                  <button key={c.id} type="button" className="crm-conv" aria-current={selectedId === c.id} onClick={() => go({ convId: c.id, channel })}>
                    <span className="crm-av"><Avatar contact={person} name={name} /><i className={`dot ${c.channel}`} /></span>
                    <span className="body">
                      <span className="top"><strong>{name}</strong><time className={c.unread > 0 ? 'new' : ''}>{shortTime(c.lastAt)}</time></span>
                      <span className="bot">
                        <span className="preview">{c.lastDir === 'out' && <CheckCheck size={14} aria-label="Вы" />}{c.lastText || 'вложение'}</span>
                        {c.unread > 0 && <span className="crm-unread">{c.unread}</span>}
                      </span>
                    </span>
                  </button>
                );
              }) : (
                <div className="crm-empty">
                  <MessageCircle size={34} strokeWidth={1.6} />
                  <h3>{unreadOnly ? 'Новых сообщений нет' : 'Диалогов пока нет'}</h3>
                  <p style={{ margin: 0 }}>{channel === 'telegram' ? 'Когда кто-то напишет боту, диалог появится здесь.' : 'Сообщения появятся, когда канал начнёт получать их.'}</p>
                </div>
              )}
            </div>
          </section>

          <section className="crm-chat-col">
            {selected ? (
              <>
                <header className="crm-chat-head">
                  <button type="button" className="crm-btn icon sm crm-back" aria-label="К списку диалогов" onClick={() => go({ convId: undefined })}><ArrowLeft size={16} /></button>
                  <span className="crm-av"><Avatar contact={contact} name={contact?.name || selected.title} /><i className={`dot ${channel}`} /></span>
                  <div className="who">
                    <strong>{contact?.name || selected.title}</strong>
                    <span className="sub">
                      <Chip tone={channel === 'telegram' ? 'sky' : channel === 'whatsapp' ? 'ok' : 'violet'}>{CHANNEL_LABEL[channel]}</Chip>
                      {phone && <PhoneLink phone={phone} />}
                      {selected.username && <span className="crm-muted">@{selected.username}</span>}
                    </span>
                  </div>
                  <span className="crm-spacer" />
                  {phone && waUrl(phone) && <a className="crm-btn wa sm" href={waUrl(phone)} target="_blank" rel="noreferrer" title="Открыть этот чат в приложении WhatsApp"><MessageCircle size={15} /> <span className="lbl">WhatsApp</span></a>}
                  {contact && <button type="button" className="crm-btn icon sm" title="Карточка контакта" aria-label="Карточка контакта" onClick={() => go({ tab: 'contacts', contactId: contact.id })}><ExternalLink size={15} /></button>}
                </header>
                <div className="crm-thread" ref={threadRef} onScroll={(e) => { const el = e.currentTarget; stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
                  {hasMore && <button type="button" className="crm-btn sm" style={{ alignSelf: 'center' }} onClick={() => void loadOlder()}>Показать более ранние</button>}
                  {loading && <p className="crm-muted" style={{ textAlign: 'center' }}>Загружаем…</p>}
                  {messages.map((m, i) => {
                    const prev = messages[i - 1];
                    const newDay = i === 0 || !sameDay(prev.at, m.at);
                    const cont = !newDay && prev.dir === m.dir && Date.parse(m.at) - Date.parse(prev.at) < 5 * 60000;
                    return (
                      <div key={m.id} style={{ display: 'contents' }}>
                        {newDay && <span className="crm-day">{fmtDate(m.at)}</span>}
                        <Bubble message={m} convId={selected.id} channel={channel} cont={cont} />
                      </div>
                    );
                  })}
                </div>
                <div className="crm-composer">
                  <div style={{ position: 'relative' }}>
                    <button type="button" className="crm-quick" title="Быстрые ответы" aria-label="Быстрые ответы" onClick={() => setShowTemplates((v) => !v)}><Zap size={18} /></button>
                    {showTemplates && (
                      <div className="crm-card crm-templates">
                        {TEMPLATES.map((t) => <button key={t.title} type="button" className="crm-item" onClick={() => { setText(t.text); setShowTemplates(false); inputRef.current?.focus(); }}><span><strong>{t.title}</strong><span className="crm-muted" style={{ display: 'block', fontSize: 12 }}>{t.text.slice(0, 70)}…</span></span></button>)}
                      </div>
                    )}
                  </div>
                  <div className="field">
                    <textarea ref={inputRef} rows={1} placeholder={connected ? 'Сообщение…' : 'Канал не подключён — отправка недоступна'} value={text} disabled={!connected}
                      onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
                  </div>
                  <button type="button" className="crm-send" aria-label="Отправить" title="Отправить (Enter)" disabled={!text.trim() || sending || !connected} onClick={() => void send()}><Send size={18} /></button>
                </div>
              </>
            ) : (
              <div className="crm-empty crm-chat-empty">
                <MessageCircle size={46} strokeWidth={1.4} />
                <h3>Выберите диалог</h3>
                <p style={{ margin: 0 }}>Слева — переписки этого канала.<br />Они хранятся бессрочно.</p>
              </div>
            )}
          </section>

          <section className="crm-side-col">{selected ? <SidePanel conv={selected} contact={contact} leads={relatedLeads} phone={phone} /> : null}</section>
        </div>
      )}
    </div>
  );
}
