import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { CalendarClock, LayoutGrid, List, MessageCircle, Plus, Search } from 'lucide-react';
import { crmApi } from './api';
import { useCrm } from './store';
import type { Lead, StatusId } from './types';
import { Chip, Empty, Field, Modal, SourceChip, StatusChip, TypeChip } from './ui';
import { LeadDrawer } from './LeadDrawer';
import { LOST_REASONS, STATUS_COLOR, TYPE_LABEL, fmtDateTime, formatPhone, leadTitle, matchesQuery, sourceLabel, timeAgo, trialLabel } from './util';

const PERIODS = [['all', 'Всё время'], ['7', '7 дней'], ['30', '30 дней']] as const;

export function LostDialog({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const [custom, setCustom] = useState('');
  return (
    <Modal title="Почему заявка потеряна?" onClose={onClose} width={420}>
      <div className="crm-steps" style={{ marginBottom: 12 }}>
        {LOST_REASONS.map((item) => <button key={item} type="button" className="crm-step" aria-current={reason === item} onClick={() => setReason(item)}>{item}</button>)}
      </div>
      {reason === 'Другое' && <Field label="Причина"><input className="crm-input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Коротко опишите" autoFocus /></Field>}
      <div className="crm-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="crm-btn" onClick={onClose}>Отмена</button>
        <button type="button" className="crm-btn primary" onClick={() => onConfirm(reason === 'Другое' ? custom.trim() || 'Другое' : reason)}>Перенести в «Потерян»</button>
      </div>
    </Modal>
  );
}

function NewLeadDialog({ onClose }: { onClose: () => void }) {
  const { upsertLead, go, toast } = useCrm();
  const [form, setForm] = useState({ parentName: '', studentName: '', phone: '', grade: '', source: 'звонок', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const lead = await crmApi<Lead>('/leads', { body: { ...form, grade: form.grade ? Number(form.grade) : undefined } });
      upsertLead(lead); toast(`Заявка №${lead.number} создана`); onClose(); go({ leadId: lead.id });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось создать заявку.'); } finally { setBusy(false); }
  };
  return (
    <Modal title="Новая заявка" onClose={onClose}>
      {error && <p className="crm-error" role="alert">{error}</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        <Field label="Телефон родителя"><input className="crm-input" inputMode="tel" placeholder="+7 700 123 45 67" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoFocus /></Field>
        <div className="crm-grid2">
          <Field label="Имя родителя"><input className="crm-input" value={form.parentName} onChange={(e) => set('parentName', e.target.value)} /></Field>
          <Field label="Имя ученика"><input className="crm-input" value={form.studentName} onChange={(e) => set('studentName', e.target.value)} /></Field>
        </div>
        <div className="crm-grid2">
          <Field label="Класс"><select className="crm-select" value={form.grade} onChange={(e) => set('grade', e.target.value)}><option value="">—</option>{Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} класс</option>)}</select></Field>
          <Field label="Откуда обращение">
            <select className="crm-select" value={form.source} onChange={(e) => set('source', e.target.value)}>
              {['звонок', 'whatsapp', 'instagram', 'telegram', 'рекомендация', 'офлайн', 'другое'].map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Заметка"><textarea className="crm-textarea" value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
      </div>
      <div className="crm-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="crm-btn" onClick={onClose}>Отмена</button>
        <button type="button" className="crm-btn primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Создаём…' : 'Создать'}</button>
      </div>
    </Modal>
  );
}

function LeadCard({ lead, unread, dragging, onDragStart, onDragEnd, onOpen }: { lead: Lead; unread: boolean; dragging: boolean; onDragStart: (e: DragEvent) => void; onDragEnd: () => void; onOpen: () => void }) {
  return (
    <button type="button" className={`crm-lead ${dragging ? 'dragging' : ''}`} draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onOpen}>
      <div className="name">#{lead.number} · {leadTitle(lead)}{unread && <span className="crm-new-dot" title="Есть непрочитанное сообщение" />}</div>
      {lead.parentName && lead.studentName && <div className="crm-muted" style={{ fontSize: 12 }}>Родитель: {lead.parentName}</div>}
      <div className="meta">
        <TypeChip type={lead.type} />
        {lead.grade && <Chip>{lead.grade} кл.</Chip>}
        <SourceChip source={lead.source} />
        {lead.test?.score != null && <Chip tone="sky">Тест {lead.test.score}/{lead.test.total}</Chip>}
      </div>
      {lead.trial && !lead.trial.removed && <div className="crm-row" style={{ marginTop: 8, fontSize: 12, color: 'var(--violet)', fontWeight: 700 }}><CalendarClock size={13} /> {trialLabel(lead.trial)}{lead.trial.teacherName ? ` · ${lead.trial.teacherName}` : ''}</div>}
      {lead.status === 'lost' && lead.lostReason && <div className="crm-muted" style={{ marginTop: 6, fontSize: 12 }}>Причина: {lead.lostReason}</div>}
      <div className="foot"><span>{lead.phone ? formatPhone(lead.phone) : 'без телефона'}</span><span title={fmtDateTime(lead.createdAt)}>{timeAgo(lead.createdAt)}</span></div>
    </button>
  );
}

export function LeadsView() {
  const { leads, statuses, convs, nav, go, upsertLead, toast } = useCrm();
  const [mode, setMode] = useState<'board' | 'list'>(() => { try { return localStorage.getItem('crm.mode') === 'list' ? 'list' : 'board'; } catch { return 'board'; } });
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>('all');
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [lostFor, setLostFor] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);

  useEffect(() => { try { localStorage.setItem('crm.mode', mode); } catch { /* не критично */ } }, [mode]);

  const unreadByContact = useMemo(() => new Set(convs.filter((c) => c.unread > 0).map((c) => c.contactId)), [convs]);
  const sources = useMemo(() => [...new Set(leads.map((l) => l.source))].sort(), [leads]);
  const filtered = useMemo(() => {
    const since = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
    return leads.filter((l) => l.archived === archived
      && (!type || l.type === type) && (!source || l.source === source) && Date.parse(l.createdAt) >= since
      && matchesQuery([l.studentName, l.parentName, l.phone, String(l.number), l.campaign, l.note], query));
  }, [leads, archived, type, source, period, query]);

  const moveTo = async (id: string, status: StatusId, reason?: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === status) return;
    upsertLead({ ...lead, status });
    try { upsertLead(await crmApi<Lead>(`/leads/${id}`, { method: 'PATCH', body: { status, reason } })); }
    catch (reason2) { upsertLead(lead); toast(reason2 instanceof Error ? reason2.message : 'Не удалось сменить статус', 'bad'); }
  };
  const drop = (status: StatusId) => {
    const id = dragRef.current; setOverCol(null); setDragId(null); dragRef.current = null;
    if (!id) return;
    if (status === 'lost') setLostFor(id); else void moveTo(id, status);
  };
  const openLead = nav.leadId ? leads.find((l) => l.id === nav.leadId) : undefined;

  return (
    <div>
      <div className="crm-toolbar">
        <div className="crm-search"><Search size={16} /><input className="crm-input" placeholder="Имя, телефон, №, кампания…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <select className="crm-select" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Тип заявки">
          <option value="">Все типы</option>{Object.entries(TYPE_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select className="crm-select" style={{ width: 'auto' }} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Источник">
          <option value="">Все источники</option>{sources.map((s) => <option key={s} value={s}>{sourceLabel(s)}</option>)}
        </select>
        <div className="crm-seg" role="group" aria-label="Период">{PERIODS.map(([id, label]) => <button key={id} type="button" aria-pressed={period === id} onClick={() => setPeriod(id)}>{label}</button>)}</div>
        <button type="button" className={`crm-btn sm ${archived ? 'primary' : ''}`} onClick={() => setArchived((a) => !a)}>Архив</button>
        <span className="crm-spacer" />
        <div className="crm-seg" role="group" aria-label="Вид">
          <button type="button" aria-pressed={mode === 'board'} onClick={() => setMode('board')}><LayoutGrid size={14} style={{ verticalAlign: -2 }} /> Доска</button>
          <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}><List size={14} style={{ verticalAlign: -2 }} /> Список</button>
        </div>
        <button type="button" className="crm-btn primary" onClick={() => setCreating(true)}><Plus size={16} /> Заявка</button>
      </div>

      {!filtered.length && mode === 'list' ? <Empty title={archived ? 'Архив пуст' : 'Заявок не найдено'} text="Новые заявки с форм сайта, из мессенджеров и созданные вручную появятся здесь." /> : mode === 'board' ? (
        <div className="crm-board">
          {statuses.map((status) => {
            const items = filtered.filter((l) => l.status === status.id);
            return (
              <section key={status.id} className={`crm-col ${overCol === status.id ? 'over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); if (overCol !== status.id) setOverCol(status.id); }} onDragLeave={() => setOverCol((c) => (c === status.id ? null : c))} onDrop={(e) => { e.preventDefault(); drop(status.id); }}>
                <div className="crm-col-head"><span><i className="dot" style={{ background: STATUS_COLOR[status.id] }} />{status.label}</span><Chip>{items.length}</Chip></div>
                {items.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} unread={unreadByContact.has(lead.contactId)} dragging={dragId === lead.id}
                    onDragStart={(e) => { dragRef.current = lead.id; setDragId(lead.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', lead.id); }}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }} onOpen={() => go({ leadId: lead.id })} />
                ))}
                {!items.length && <div className="crm-muted" style={{ padding: '18px 6px', textAlign: 'center', fontSize: 13 }}>Пусто</div>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead><tr><th>№</th><th>Ученик / родитель</th><th>Телефон</th><th>Тип</th><th>Источник</th><th>Статус</th><th>Пробный</th><th>Создана</th></tr></thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} onClick={() => go({ leadId: l.id })}>
                  <td>{l.number}</td>
                  <td><strong>{leadTitle(l)}</strong>{l.parentName && l.studentName && <div className="crm-muted" style={{ fontSize: 12 }}>{l.parentName}</div>}</td>
                  <td>{formatPhone(l.phone)}</td><td><TypeChip type={l.type} /></td>
                  <td><SourceChip source={l.source} />{l.campaign && <div className="crm-muted" style={{ fontSize: 12 }}>{l.campaign}</div>}</td>
                  <td><StatusChip status={l.status} /></td>
                  <td>{l.trial && !l.trial.removed ? trialLabel(l.trial) : '—'}</td>
                  <td title={fmtDateTime(l.createdAt)}>{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mode === 'board' && !leads.length && <p className="crm-muted" style={{ textAlign: 'center', marginTop: 24 }}><MessageCircle size={16} style={{ verticalAlign: -3 }} /> Заявок пока нет — они появятся автоматически после первой отправки формы на сайте.</p>}

      {creating && <NewLeadDialog onClose={() => setCreating(false)} />}
      {lostFor && <LostDialog onClose={() => setLostFor(null)} onConfirm={(reason) => { const id = lostFor; setLostFor(null); void moveTo(id, 'lost', reason); }} />}
      {openLead && <LeadDrawer lead={openLead} onClose={() => go({ leadId: undefined })} />}
    </div>
  );
}
