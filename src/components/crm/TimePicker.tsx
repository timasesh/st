import { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { timeLabel, toMin } from './tasksStore';

/* Выбор времени «по часам»: слева час, справа четыре кнопки (:00 :15 :30 :45) — вместо длинного списка из сотни строк. */
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const pad = (n: number) => String(n).padStart(2, '0');

export function TimeButton({ label, value, open, onToggle }: { label: string; value: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="crm-tp">
      <span className="crm-label">{label}</span>
      <button type="button" className={`crm-tp-btn ${open ? 'open' : ''}`} aria-expanded={open} onClick={onToggle}>
        <Clock size={16} /> <strong>{timeLabel(value)}</strong>{value === '24:00' && <small>полночь</small>}
      </button>
    </div>
  );
}

export function TimePanel({ label, value, onChange, onClose, min, allowMidnight = false }: {
  label: string; value: string; onChange: (v: string) => void; onClose: () => void; min?: string; allowMidnight?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panel.current) return;
    const row = panel.current.querySelector<HTMLElement>('[data-sel="1"]') || panel.current.querySelector<HTMLElement>('[data-h="8"]');
    if (row) panel.current.scrollTop = Math.max(0, row.offsetTop - panel.current.offsetTop - 40);
  }, []);
  const minM = min ? toMin(min) : -1;
  const pick = (v: string) => { onChange(v); onClose(); };
  return (
    <div className="crm-tp-panel" ref={panel} role="listbox" aria-label={label}>
      {HOURS.map((h) => (
        <div key={h} className="crm-tp-row" data-h={h} data-sel={Number(value.slice(0, 2)) === h && value !== '24:00' ? 1 : undefined}>
          <span className="crm-tp-h">{pad(h)}</span>
          {[0, 15, 30, 45].map((m) => {
            const v = `${pad(h)}:${pad(m)}`;
            return <button type="button" key={v} role="option" aria-selected={value === v} disabled={h * 60 + m <= minM} className={value === v ? 'on' : ''} onClick={() => pick(v)}>:{pad(m)}</button>;
          })}
        </div>
      ))}
      {allowMidnight && (
        <div className="crm-tp-row" data-sel={value === '24:00' ? 1 : undefined}>
          <span className="crm-tp-h">00</span>
          <button type="button" role="option" aria-selected={value === '24:00'} disabled={24 * 60 <= minM} className={`wide ${value === '24:00' ? 'on' : ''}`} onClick={() => pick('24:00')}>:00 — до конца дня</button>
        </div>
      )}
    </div>
  );
}
