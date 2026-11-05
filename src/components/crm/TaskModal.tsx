import { useMemo, useState } from 'react';
import { Modal } from './ui';
import { TimeButton, TimePanel } from './TimePicker';
import { addDays, almatyNow, createTask, patchTask, toMin } from './tasksStore';
import type { Task } from './types';

/* Окно «Добавить задачу» / «Перенести задачу». Без task — новая, с task — перенос и правка. */
export function TaskModal({ task, onClose, onDone }: { task?: Task; onClose: () => void; onDone?: (message: string) => void }) {
  const today = useMemo(() => almatyNow().day, []);
  const [text, setText] = useState(task?.text || '');
  const [date, setDate] = useState(task?.date && task.date >= today ? task.date : today);
  const [start, setStart] = useState(task?.start || '09:00');
  const [end, setEnd] = useState(task?.end || '09:30');
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setStartSafe = (v: string) => { setStart(v); if (toMin(end) <= toMin(v)) setEnd(toMin(v) + 30 >= 1440 ? '24:00' : `${String(Math.floor((toMin(v) + 30) / 60)).padStart(2, '0')}:${String((toMin(v) + 30) % 60).padStart(2, '0')}`); };
  const save = async () => {
    if (!text.trim()) { setError('Напишите, что нужно сделать.'); return; }
    setBusy(true); setError('');
    try {
      if (task) await patchTask(task.id, { text: text.trim(), date, start, end });
      else await createTask({ text: text.trim(), date, start, end });
      onDone?.(task ? 'Задача перенесена' : 'Задача добавлена');
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить'); setBusy(false); }
  };

  return (
    <Modal title={task ? 'Перенести задачу' : 'Новая задача'} onClose={onClose} width={480}>
      <div style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'block' }}>
          <span className="crm-label">Что нужно сделать</span>
          <textarea className="crm-textarea" rows={2} maxLength={300} autoFocus value={text} placeholder="Например: перезвонить Галине по пробному уроку" onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void save(); }} />
        </label>
        <div>
          <span className="crm-label">День</span>
          <div className="crm-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="crm-btn sm" aria-pressed={date === today} onClick={() => setDate(today)} style={date === today ? { borderColor: 'var(--task)', color: 'var(--task)' } : undefined}>Сегодня</button>
            <button type="button" className="crm-btn sm" onClick={() => setDate(addDays(today, 1))} style={date === addDays(today, 1) ? { borderColor: 'var(--task)', color: 'var(--task)' } : undefined}>Завтра</button>
            <input type="date" className="crm-input" style={{ width: 'auto' }} min={today} max={addDays(today, 31)} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
        </div>
        <div className="crm-tp-pair">
          <TimeButton label="С" value={start} open={picker === 'start'} onToggle={() => setPicker(picker === 'start' ? null : 'start')} />
          <TimeButton label="До" value={end} open={picker === 'end'} onToggle={() => setPicker(picker === 'end' ? null : 'end')} />
        </div>
        {picker === 'start' && <TimePanel label="Начало" value={start} onChange={setStartSafe} onClose={() => setPicker(null)} />}
        {picker === 'end' && <TimePanel label="Конец" value={end} onChange={setEnd} onClose={() => setPicker(null)} min={start} allowMidnight />}
        {error && <p style={{ margin: 0, color: 'var(--bad)', fontWeight: 700 }}>{error}</p>}
        <div className="crm-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="crm-btn" onClick={onClose}>Отмена</button>
          <button type="button" className="crm-btn task" disabled={busy} onClick={() => void save()}>{task ? 'Сохранить' : 'Добавить задачу'}</button>
        </div>
      </div>
    </Modal>
  );
}
