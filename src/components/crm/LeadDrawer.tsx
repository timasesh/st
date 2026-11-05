import { useEffect, useMemo, useState } from 'react';
import { Archive, CalendarCheck, ExternalLink, MessageCircle, Phone, Send, User } from 'lucide-react';
import { crmApi } from './api';
import { useCrm } from './store';
import type { Lead, StatusId, TrialSlots } from './types';
import { Chip, Drawer, Field, PhoneLink, SourceChip, StatusChip, TypeChip, useOpenChat } from './ui';
import { LostDialog } from './LeadsView';
import { DAYS, TYPE_LABEL, fmtDateTime, formatPhone, leadTitle, sourceLabel, trialLabel, waDigits, waUrl } from './util';

const TRIAL_STATUS: Record<string, string> = { scheduled: 'Запланирован', trial: 'Запланирован', attended: 'Проведён', no_show: 'Не пришёл', enrolled: 'Записался на занятия', declined: 'Отказ' };

function TrialBooker({ lead }: { lead: Lead }) {
  const { upsertLead, toast } = useCrm();
  const [slots, setSlots] = useState<TrialSlots | null>(null);
  const [teacherId, setTeacherId] = useState('');
  const [pick, setPick] = useState<{ day: number; hour: number } | null>(null);
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [klass, setKlass] = useState(lead.grade && lead.grade >= 5 && lead.grade <= 9 ? `${lead.grade} класс` : '5 класс');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    crmApi<TrialSlots>('/trial-slots').then((data) => { if (alive) { setSlots(data); setTeacherId((id) => id || data.teachers[0]?.id || ''); } }).catch((reason) => { if (alive) setError(reason.message); });
    return () => { alive = false; };
  }, []);

  const taken = (day: number, hour: number) => Boolean(slots?.occupied.some((o) => o.teacherId === teacherId && o.day === day && o.hour === hour));
  const submit = async () => {
    if (!pick) { setError('Выберите свободное время.'); return; }
    setBusy(true); setError('');
    try {
      const updated = await crmApi<Lead>(`/leads/${lead.id}/trial`, { body: { teacherId, day: pick.day, hour: pick.hour, lessonLink: link.trim(), lessonDescription: description.trim(), studentClass: klass } });
      upsertLead(updated); toast('Пробный урок записан — он уже в расписании');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось записать.'); } finally { setBusy(false); }
  };

  if (!slots) return <p className="crm-muted">Загружаем расписание…</p>;
  if (!slots.teachers.length) return <p className="crm-muted">Нет преподавателей — добавьте их в разделе «Преподаватели».</p>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {error && <p className="crm-error" role="alert">{error}</p>}
      <div className="crm-grid2">
        <Field label="Преподаватель"><select className="crm-select" value={teacherId} onChange={(e) => { setTeacherId(e.target.value); setPick(null); }}>{slots.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Класс ученика"><select className="crm-select" value={klass} onChange={(e) => setKlass(e.target.value)}>{[5, 6, 7, 8, 9].map((g) => <option key={g}>{g} класс</option>)}</select></Field>
      </div>
      <div>
        <span className="crm-label">Свободное время (серое — занято)</span>
        <div className="crm-slots">
          <span />{DAYS.map((d) => <span key={d} className="h">{d}</span>)}
          {slots.hours.map((hour) => (
            <FragmentRow key={hour} hour={hour}>
              {DAYS.map((_, day) => <button key={day} type="button" className="crm-slot" disabled={taken(day, hour)} aria-pressed={pick?.day === day && pick.hour === hour} onClick={() => setPick({ day, hour })} aria-label={`${DAYS[day]} ${hour}:00`}>{hour}</button>)}
            </FragmentRow>
          ))}
        </div>
      </div>
      <Field label="Ссылка на занятие (Zoom / Meet)"><input className="crm-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></Field>
      <Field label="Описание (необязательно)"><input className="crm-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Тема, что подготовить" /></Field>
      <button type="button" className="crm-btn primary" disabled={busy || !pick} onClick={() => void submit()}><CalendarCheck size={16} /> {pick ? `Записать на ${DAYS[pick.day]} ${pick.hour}:00` : 'Выберите время'}</button>
    </div>
  );
}
const FragmentRow = ({ hour, children }: { hour: number; children: React.ReactNode }) => (<><span className="r">{hour}:00</span>{children}</>);

export function LeadDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { statuses, contactMap, convs, upsertLead, go, toast } = useCrm();
  const openChat = useOpenChat();
  const [lostOpen, setLostOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [draft, setDraft] = useState({ studentName: lead.studentName, parentName: lead.parentName, grade: lead.grade ? String(lead.grade) : '', note: lead.note });
  useEffect(() => { setDraft({ studentName: lead.studentName, parentName: lead.parentName, grade: lead.grade ? String(lead.grade) : '', note: lead.note }); }, [lead.id, lead.studentName, lead.parentName, lead.grade, lead.note]);

  const parent = contactMap[lead.contactId];
  const children = useMemo(() => (parent?.childIds || []).map((id) => contactMap[id]).filter(Boolean), [parent, contactMap]);
  const conv = convs.find((c) => c.contactId === lead.contactId);
  const tgUser = parent?.telegram?.username;

  const patch = async (body: Record<string, unknown>, okText?: string) => {
    try { upsertLead(await crmApi<Lead>(`/leads/${lead.id}`, { method: 'PATCH', body })); if (okText) toast(okText); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось сохранить', 'bad'); }
  };
  const addNote = async () => {
    const text = noteText.trim(); if (!text) return;
    try { upsertLead(await crmApi<Lead>(`/leads/${lead.id}/notes`, { body: { text } })); setNoteText(''); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось добавить заметку', 'bad'); }
  };
  const saveDraft = (key: 'studentName' | 'parentName' | 'grade' | 'note') => {
    const value = draft[key];
    const current = key === 'grade' ? (lead.grade ? String(lead.grade) : '') : lead[key];
    if (value !== current) void patch({ [key]: key === 'grade' ? (value ? Number(value) : null) : value });
  };
  const showTrial = lead.trial && !lead.trial.removed;
  const utmRows: [string, string][] = [['Источник', lead.source ? sourceLabel(lead.source) : ''], ['Канал', lead.medium], ['Кампания', lead.campaign], ['Объявление', lead.content], ['Ключ', lead.term], ['Страница входа', lead.landing], ['Реферрер', lead.referrer], ...Object.entries(lead.click || {}).map(([k, v]): [string, string] => [k, v])];

  return (
    <Drawer onClose={onClose} header={
      <>
        <div className="crm-muted" style={{ fontSize: 12 }}>Заявка №{lead.number} · {fmtDateTime(lead.createdAt)}</div>
        <h3 style={{ fontSize: 20, margin: '2px 0 8px' }}>{leadTitle(lead)}</h3>
        {lead.phone && <div style={{ margin: '0 0 8px' }}><PhoneLink phone={lead.phone} className="pill" /></div>}
        <div className="crm-row crm-wrap"><TypeChip type={lead.type} /><StatusChip status={lead.status} /><SourceChip source={lead.source} />{lead.archived && <Chip tone="warn">В архиве</Chip>}</div>
      </>
    }>
      <section className="crm-sec">
        <h4>Статус</h4>
        <div className="crm-steps">
          {statuses.map((s) => (
            <button key={s.id} type="button" className={`crm-step ${s.id === 'lost' ? 'lost' : ''}`} aria-current={lead.status === s.id}
              onClick={() => { if (s.id === lead.status) return; if (s.id === 'lost') setLostOpen(true); else void patch({ status: s.id as StatusId }); }}>{s.label}</button>
          ))}
        </div>
        {lead.status === 'lost' && lead.lostReason && <p className="crm-muted" style={{ margin: '10px 0 0' }}>Причина: {lead.lostReason}</p>}
      </section>

      <section className="crm-sec">
        <h4>Связаться</h4>
        <div className="crm-row crm-wrap">
          {lead.phone && waUrl(lead.phone) && <button type="button" className="crm-btn wa" title="Открыть чат с клиентом в CRM" onClick={() => openChat(lead.phone)}><MessageCircle size={16} /> {formatPhone(lead.phone)}</button>}
          {lead.phone && <a className="crm-btn" href={`tel:+${waDigits(lead.phone)}`}><Phone size={16} /> Позвонить</a>}
          {lead.phone && waUrl(lead.phone) && <a className="crm-btn" href={waUrl(lead.phone)} target="_blank" rel="noreferrer" title="Открыть в приложении WhatsApp">В приложении WhatsApp</a>}
          {tgUser && <a className="crm-btn" href={`https://t.me/${tgUser}`} target="_blank" rel="noreferrer"><Send size={16} /> @{tgUser}</a>}
          {conv && <button type="button" className="crm-btn" onClick={() => { onClose(); go({ tab: 'inbox', convId: conv.id, channel: conv.channel }); }}><MessageCircle size={16} /> Переписка{conv.unread ? ` (${conv.unread})` : ''}</button>}
          {lead.phone && <button type="button" className="crm-btn" onClick={() => { void navigator.clipboard?.writeText(`+${lead.phone}`); toast('Номер скопирован'); }}>Копировать</button>}
        </div>
      </section>

      <section className="crm-sec">
        <h4>Семья</h4>
        <div className="crm-grid2" style={{ marginBottom: 10 }}>
          <Field label="Ученик"><input className="crm-input" value={draft.studentName} onChange={(e) => setDraft({ ...draft, studentName: e.target.value })} onBlur={() => saveDraft('studentName')} /></Field>
          <Field label="Класс"><select className="crm-select" value={draft.grade} onChange={(e) => { setDraft({ ...draft, grade: e.target.value }); void patch({ grade: e.target.value ? Number(e.target.value) : null }); }}><option value="">—</option>{Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} класс</option>)}</select></Field>
        </div>
        <Field label="Родитель"><input className="crm-input" value={draft.parentName} onChange={(e) => setDraft({ ...draft, parentName: e.target.value })} onBlur={() => saveDraft('parentName')} /></Field>
        {lead.topic && <p className="crm-muted" style={{ margin: '10px 0 0' }}>Тема интенсива: {lead.topic}</p>}
        {children.length > 1 && <p className="crm-muted" style={{ margin: '10px 0 0' }}>Другие дети в семье: {children.filter((c) => c.id !== lead.studentId).map((c) => c.name).join(', ')}</p>}
        {parent && <button type="button" className="crm-btn sm" style={{ marginTop: 10 }} onClick={() => { onClose(); go({ tab: 'contacts', contactId: parent.id }); }}><User size={14} /> Открыть карточку контакта</button>}
      </section>

      {lead.test && (
        <section className="crm-sec">
          <h4>Тест уровня</h4>
          {lead.test.score != null ? <p style={{ margin: 0 }}><strong>{lead.test.score} из {lead.test.total}</strong>{lead.test.missedTopics?.length ? <span className="crm-muted"> · пробелы: {lead.test.missedTopics.join(', ')}</span> : null}</p> : <p className="crm-muted" style={{ margin: 0 }}>Начал тест, но не завершил — повод позвонить.</p>}
        </section>
      )}

      <section className="crm-sec">
        <h4>Пробный урок</h4>
        {showTrial && lead.trial ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <div className="crm-row crm-wrap"><Chip tone="violet">{trialLabel(lead.trial)}</Chip><Chip tone={lead.trial.status === 'enrolled' ? 'ok' : lead.trial.status === 'declined' || lead.trial.status === 'no_show' ? 'bad' : 'brand'}>{TRIAL_STATUS[lead.trial.status] || lead.trial.status}</Chip></div>
            {lead.trial.teacherName && <div>Преподаватель: <strong>{lead.trial.teacherName}</strong></div>}
            {lead.trial.scheduledAt && <div className="crm-muted">Ближайшее занятие: {fmtDateTime(lead.trial.scheduledAt)}</div>}
            {lead.trial.lessonLink && <a href={lead.trial.lessonLink} target="_blank" rel="noreferrer" className="crm-row" style={{ color: 'var(--brand)', fontWeight: 700 }}><ExternalLink size={14} /> Ссылка на занятие</a>}
            <p className="crm-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>Перенос и отметка посещаемости — в разделе «Пробные занятия», CRM подхватит изменения сама.</p>
          </div>
        ) : (
          <>
            {lead.trial?.removed && <p className="crm-muted">Прежний пробный удалён из расписания. Можно записать заново.</p>}
            {lead.phone && (lead.studentName || lead.parentName) ? <TrialBooker lead={lead} /> : <p className="crm-muted">Чтобы записать на пробный, укажите имя ученика и телефон родителя.</p>}
          </>
        )}
      </section>

      <section className="crm-sec">
        <h4>Откуда пришёл</h4>
        <dl className="crm-kv" style={{ margin: 0 }}>
          <dt>Тип</dt><dd>{TYPE_LABEL[lead.type]}</dd>
          {utmRows.filter(([, v]) => v).map(([k, v]) => <><dt key={`${k}-t`}>{k}</dt><dd key={`${k}-d`}>{v}</dd></>)}
        </dl>
        {!lead.campaign && !lead.medium && <p className="crm-muted" style={{ margin: '8px 0 0', fontSize: 12 }}>UTM-меток нет: добавляйте их к ссылкам в рекламе и в био (например <code>?utm_source=instagram&amp;utm_campaign=sept</code>).</p>}
      </section>

      <section className="crm-sec">
        <h4>Заметка</h4>
        <textarea className="crm-textarea" value={draft.note} placeholder="О чём договорились, что важно помнить" onChange={(e) => setDraft({ ...draft, note: e.target.value })} onBlur={() => saveDraft('note')} />
      </section>

      <section className="crm-sec">
        <h4>История</h4>
        <div className="crm-row" style={{ marginBottom: 12 }}>
          <input className="crm-input" placeholder="Добавить запись в историю…" value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void addNote(); }} />
          <button type="button" className="crm-btn" onClick={() => void addNote()}>Добавить</button>
        </div>
        <ul className="crm-timeline">
          {[...lead.timeline].reverse().map((entry, index) => (
            <li key={`${entry.at}-${index}`} className={entry.type}><span>{entry.text}</span><small>{fmtDateTime(entry.at)}{entry.by ? ` · ${entry.by}` : ''}</small></li>
          ))}
        </ul>
      </section>

      <button type="button" className="crm-btn" onClick={() => void patch({ archived: !lead.archived }, lead.archived ? 'Заявка возвращена' : 'Заявка в архиве')}><Archive size={16} /> {lead.archived ? 'Вернуть из архива' : 'В архив'}</button>
      {lostOpen && <LostDialog onClose={() => setLostOpen(false)} onConfirm={(reason) => { setLostOpen(false); void patch({ status: 'lost', reason }); }} />}
    </Drawer>
  );
}
