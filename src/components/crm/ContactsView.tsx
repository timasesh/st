import { useMemo, useState } from 'react';
import { Link2, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { crmApi } from './api';
import { useCrm } from './store';
import type { Contact } from './types';
import { Avatar, Chip, Empty, Field, Modal, StatusChip, TypeChip } from './ui';
import { CHANNEL_LABEL, displayName, fmtDate, formatPhone, matchesQuery } from './util';

function NewContactDialog({ kind, parent, onClose }: { kind: 'parent' | 'student'; parent?: Contact; onClose: () => void }) {
  const { upsertContact, go, toast } = useCrm();
  const [form, setForm] = useState({ name: '', phone: '', grade: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError('');
    try {
      if (kind === 'student' && parent) {
        const { student } = await crmApi<{ student: Contact }>(`/contacts/${parent.id}/children`, { body: { name: form.name, grade: form.grade ? Number(form.grade) : undefined } });
        upsertContact(student); upsertContact({ ...parent, childIds: [...parent.childIds, student.id] }); toast('Ученик добавлен');
      } else {
        const created = await crmApi<Contact>('/contacts', { body: { kind, ...form, grade: form.grade ? Number(form.grade) : undefined } });
        upsertContact(created); go({ contactId: created.id }); toast('Контакт создан');
      }
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить.'); } finally { setBusy(false); }
  };
  return (
    <Modal title={kind === 'student' ? `Новый ученик${parent ? ` · ${displayName(parent)}` : ''}` : 'Новый родитель'} onClose={onClose} width={420}>
      {error && <p className="crm-error" role="alert">{error}</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        <Field label="Имя и фамилия"><input className="crm-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
        {!(kind === 'student' && parent) && <Field label="Телефон"><input className="crm-input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 700 123 45 67" /></Field>}
        {kind === 'student' && <Field label="Класс"><select className="crm-select" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}><option value="">—</option>{Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} класс</option>)}</select></Field>}
      </div>
      <div className="crm-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="crm-btn" onClick={onClose}>Отмена</button>
        <button type="button" className="crm-btn primary" disabled={busy} onClick={() => void submit()}>Сохранить</button>
      </div>
    </Modal>
  );
}

function ContactDetail({ contact }: { contact: Contact }) {
  const { contactMap, leads, convs, upsertContact, go, toast } = useCrm();
  const [draft, setDraft] = useState({ name: contact.name, notes: contact.notes, phones: contact.phones.map((p) => formatPhone(p)).join(', '), grade: contact.grade ? String(contact.grade) : '' });
  const [adding, setAdding] = useState(false);
  const [lastId, setLastId] = useState(contact.id);
  if (lastId !== contact.id) { setLastId(contact.id); setDraft({ name: contact.name, notes: contact.notes, phones: contact.phones.map((p) => formatPhone(p)).join(', '), grade: contact.grade ? String(contact.grade) : '' }); }

  const save = async (body: Record<string, unknown>) => {
    try { upsertContact(await crmApi<Contact>(`/contacts/${contact.id}`, { method: 'PATCH', body })); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось сохранить', 'bad'); }
  };
  const unlink = async (studentId: string) => {
    try {
      const { parent, student } = await crmApi<{ parent: Contact; student: Contact }>(`/contacts/${contact.id}/children/${studentId}`, { method: 'DELETE' });
      upsertContact(parent); upsertContact(student); toast('Связь убрана');
    } catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось убрать связь', 'bad'); }
  };
  const children = contact.childIds.map((id) => contactMap[id]).filter(Boolean);
  const parents = contact.parentIds.map((id) => contactMap[id]).filter(Boolean);
  const myLeads = leads.filter((l) => l.contactId === contact.id || l.studentId === contact.id);
  const myConvs = convs.filter((c) => c.contactId === contact.id);

  return (
    <div className="crm-card crm-pad" style={{ display: 'grid', gap: 14 }}>
      <div className="crm-row">
        <Avatar contact={contact} name={displayName(contact)} />
        <div style={{ flex: 1, minWidth: 0 }}><h3 style={{ fontSize: 20 }}>{displayName(contact)}</h3><span className="crm-muted">{contact.kind === 'parent' ? 'Родитель' : 'Ученик'} · с {fmtDate(contact.createdAt)}</span></div>
        {contact.accountId && <Chip tone="ok">Есть кабинет</Chip>}
        <button type="button" className={`crm-btn sm ${contact.archived ? 'primary' : ''}`} onClick={() => void save({ archived: !contact.archived })}>{contact.archived ? 'Вернуть' : 'В архив'}</button>
      </div>
      <div className="crm-grid2">
        <Field label="Имя"><input className="crm-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={() => { if (draft.name !== contact.name) void save({ name: draft.name }); }} /></Field>
        {contact.kind === 'student'
          ? <Field label="Класс"><select className="crm-select" value={draft.grade} onChange={(e) => { setDraft({ ...draft, grade: e.target.value }); void save({ grade: e.target.value ? Number(e.target.value) : null }); }}><option value="">—</option>{Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} класс</option>)}</select></Field>
          : <Field label="Телефоны (через запятую)"><input className="crm-input" value={draft.phones} onChange={(e) => setDraft({ ...draft, phones: e.target.value })} onBlur={() => void save({ phones: draft.phones.split(',').map((p) => p.trim()).filter(Boolean) })} /></Field>}
      </div>
      <div className="crm-row crm-wrap">
        {contact.telegram && <Chip tone="sky">Telegram {contact.telegram.username ? `@${contact.telegram.username}` : contact.telegram.id}</Chip>}
        {contact.whatsapp && <Chip tone="ok">WhatsApp +{contact.whatsapp}</Chip>}
        {contact.instagram && <Chip tone="violet">Instagram</Chip>}
        {myConvs.map((c) => <button key={c.id} type="button" className="crm-btn sm" onClick={() => go({ tab: 'inbox', convId: c.id, channel: c.channel })}>Открыть {CHANNEL_LABEL[c.channel]}{c.unread ? ` (${c.unread})` : ''}</button>)}
      </div>

      {contact.kind === 'parent' ? (
        <section>
          <div className="crm-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><h4 className="crm-label" style={{ margin: 0 }}>Дети</h4><button type="button" className="crm-btn sm" onClick={() => setAdding(true)}><UserPlus size={14} /> Добавить ученика</button></div>
          {children.length ? children.map((child) => (
            <div key={child.id} className="crm-row" style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
              <Avatar contact={child} name={child.name} />
              <button type="button" className="crm-btn sm" style={{ border: 0, padding: 0, background: 'none', fontWeight: 800 }} onClick={() => go({ contactId: child.id })}>{child.name}</button>
              {child.grade && <Chip>{child.grade} кл.</Chip>}<span className="crm-spacer" />
              <button type="button" className="crm-btn sm icon" title="Убрать связь" onClick={() => void unlink(child.id)}><Trash2 size={14} /></button>
            </div>
          )) : <p className="crm-muted" style={{ margin: 0 }}>Учеников пока нет.</p>}
        </section>
      ) : (
        <section>
          <h4 className="crm-label">Родители</h4>
          {parents.length ? parents.map((p) => <div key={p.id} className="crm-row" style={{ padding: '6px 0' }}><Link2 size={14} /> <span>{displayName(p)}</span><span className="crm-muted">{p.phones.map(formatPhone).join(', ')}</span></div>) : <p className="crm-muted" style={{ margin: 0 }}>Родитель не привязан.</p>}
        </section>
      )}

      <section>
        <h4 className="crm-label">Заявки</h4>
        {myLeads.length ? myLeads.map((l) => (
          <button key={l.id} type="button" className="crm-item" style={{ borderRadius: 10 }} onClick={() => go({ tab: 'leads', leadId: l.id })}>
            <strong>№{l.number}</strong><TypeChip type={l.type} /><StatusChip status={l.status} /><span className="crm-spacer" /><span className="crm-muted">{fmtDate(l.createdAt)}</span>
          </button>
        )) : <p className="crm-muted" style={{ margin: 0 }}>Заявок нет.</p>}
      </section>

      <Field label="Заметки"><textarea className="crm-textarea" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} onBlur={() => { if (draft.notes !== contact.notes) void save({ notes: draft.notes }); }} /></Field>
      {adding && <NewContactDialog kind="student" parent={contact} onClose={() => setAdding(false)} />}
    </div>
  );

}

export function ContactsView() {
  const { contacts, nav, go } = useCrm();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'parent' | 'student'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const list = useMemo(() => contacts
    .filter((c) => c.archived === showArchived && (kind === 'all' || c.kind === kind) && matchesQuery([c.name, ...c.phones, c.telegram?.username || ''], query))
    .sort((a, b) => displayName(a).localeCompare(displayName(b), 'ru')), [contacts, query, kind, showArchived]);
  const selected = nav.contactId ? contacts.find((c) => c.id === nav.contactId) : undefined;

  return (
    <div>
      <div className="crm-toolbar">
        <div className="crm-search"><Search size={16} /><input className="crm-input" placeholder="Имя или телефон…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="crm-seg" role="group" aria-label="Тип контакта">
          {([['all', 'Все'], ['parent', 'Родители'], ['student', 'Ученики']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)}>{label}</button>)}
        </div>
        <button type="button" className={`crm-btn sm ${showArchived ? 'primary' : ''}`} onClick={() => setShowArchived((v) => !v)}>Архив</button>
        <span className="crm-spacer" />
        <span className="crm-muted">{list.length} контактов</span>
        <button type="button" className="crm-btn primary" onClick={() => setCreating(true)}><Plus size={16} /> Родитель</button>
      </div>
      <div className="crm-split">
        <div className="crm-card" style={{ overflow: 'hidden' }}>
          {list.length ? (
            <div className="crm-list">
              {list.map((c) => (
                <button key={c.id} type="button" className="crm-item" aria-current={selected?.id === c.id} onClick={() => go({ contactId: c.id })}>
                  <Avatar contact={c} name={displayName(c)} />
                  <span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(c)}</strong><span className="crm-muted" style={{ fontSize: 12 }}>{c.kind === 'student' ? `Ученик${c.grade ? `, ${c.grade} кл.` : ''}` : `${c.phones.map(formatPhone)[0] || 'без телефона'}${c.childIds.length ? ` · детей: ${c.childIds.length}` : ''}`}</span></span>
                </button>
              ))}
            </div>
          ) : <Empty title="Контактов нет" text="Контакты создаются сами из заявок и сообщений." />}
        </div>
        {selected ? <ContactDetail key={selected.id} contact={selected} /> : <div className="crm-card"><Empty title="Выберите контакт" text="Справа появятся дети, заявки и переписки." /></div>}
      </div>
      {creating && <NewContactDialog kind="parent" onClose={() => setCreating(false)} />}
    </div>
  );
}
