import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

type P = { amount: number; paidAt: string };
type Mode = 'day' | 'week' | 'month';

const DAY_MS = 86400000;
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const parseDay = (v: string) => { const [y, m, d] = v.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fmtDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dm = (v: string) => `${v.slice(8, 10)}.${v.slice(5, 7)}`;
const weekStart = (v: string) => { const ms = parseDay(v); return fmtDay(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS); };
const num = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `${num(n).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₸`;
const plural = (n: number, a: string, b: string, c: string) => { const x = n % 100; const y = x % 10; return x > 10 && x < 20 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; };

type Bucket = { key: string; label: string; range: string; amount: number; count: number; current: boolean };

function build(payments: P[], mode: Mode, today: string): Bucket[] {
  const keyOf = (v: string) => (mode === 'day' ? v : mode === 'week' ? weekStart(v) : v.slice(0, 7));
  const sums = new Map<string, { amount: number; count: number }>();
  for (const p of payments) { const k = keyOf(p.paidAt); const s = sums.get(k) || { amount: 0, count: 0 }; s.amount += p.amount; s.count += 1; sums.set(k, s); }
  const curKey = keyOf(today);
  const first = [...sums.keys()].sort()[0] || curKey;
  const start = first < curKey ? first : curKey;
  const out: Bucket[] = [];
  const push = (k: string, label: string, range: string) => { const s = sums.get(k); out.push({ key: k, label, range, amount: s?.amount || 0, count: s?.count || 0, current: k === curKey }); };
  if (mode === 'month') {
    let y = Number(start.slice(0, 4)); let m = Number(start.slice(5, 7));
    for (let i = 0; i < 600; i += 1) {
      const k = `${y}-${String(m).padStart(2, '0')}`;
      if (k > curKey) break;
      push(k, `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`, `${MONTHS_SHORT[m - 1]} ${y}`);
      m += 1; if (m > 12) { m = 1; y += 1; }
    }
  } else {
    const step = mode === 'day' ? DAY_MS : 7 * DAY_MS;
    for (let ms = parseDay(start); fmtDay(ms) <= curKey && out.length < 2000; ms += step) {
      const k = fmtDay(ms);
      if (mode === 'day') push(k, dm(k), `${dm(k)}.${k.slice(0, 4)}`);
      else push(k, dm(k), `${dm(k)} – ${dm(fmtDay(ms + 6 * DAY_MS))}.${fmtDay(ms + 6 * DAY_MS).slice(0, 4)}`);
    }
  }
  return out;
}

export default function ProfitHistoryModal({ payments, today, onClose }: { payments: P[]; today: string; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('week');
  const [hover, setHover] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const buckets = useMemo(() => build(payments, mode, today), [payments, mode, today]);
  const max = Math.max(1, ...buckets.map((b) => b.amount));
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  const count = buckets.reduce((s, b) => s + b.count, 0);
  const colW = mode === 'month' ? 84 : 72;
  const H = 260;

  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  useEffect(() => { setHover(null); const el = scroller.current; if (el) el.scrollLeft = el.scrollWidth; }, [mode, buckets.length]);

  const hb = hover === null ? null : buckets[hover];
  const modes: [Mode, string][] = [['day', 'Дни'], ['week', 'Недели'], ['month', 'Месяцы']];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="profit-title" className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6">
        <button type="button" onClick={onClose} aria-label="Закрыть" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-primary-light hover:text-primary"><X className="h-5 w-5" /></button>
        <p className="text-sm font-bold text-primary">Оплаты</p>
        <h2 id="profit-title" className="font-display text-xl font-extrabold">История прибыли</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-border bg-bg p-1" role="group" aria-label="Период">
            {modes.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${mode === id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'}`}>{label}</button>
            ))}
          </div>
          <p className="text-sm text-muted">Всего: <b className="text-slate-900">{money(total)}</b> · {count} {plural(count, 'оплата', 'оплаты', 'оплат')}</p>
        </div>

        <div className="mt-2 h-12 text-sm" aria-live="polite">
          {hb ? (
            <p className="pt-2"><b>{hb.range}{hb.current ? ' (текущая)' : ''}</b>: <b className="text-primary">{money(hb.amount)}</b> · {hb.count} {plural(hb.count, 'оплата', 'оплаты', 'оплат')}</p>
          ) : <p className="pt-2 text-muted">Наведите курсор на столбец, чтобы увидеть точную сумму и количество оплат.</p>}
        </div>

        {payments.length === 0 && <p className="rounded-xl border border-dashed border-border py-3 text-center text-sm text-muted">Оплат пока нет — показана только текущая неделя.</p>}
        <div ref={scroller} className="mt-1 overflow-x-auto pb-2">
          <div className="flex items-end" style={{ width: Math.max(buckets.length * colW, 0), minWidth: '100%', height: H + 56 }} onMouseLeave={() => setHover(null)}>
            {buckets.map((b, i) => {
              const h = b.amount > 0 ? Math.max(4, Math.round((b.amount / max) * H)) : 0;
              return (
                <div key={b.key} className="flex h-full shrink-0 flex-col justify-end" style={{ width: colW }} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
                  <div className="mb-1 text-center text-[11px] font-bold leading-tight text-slate-700">{b.amount > 0 ? num(b.amount).toLocaleString('ru-RU') : <span className="text-muted/60">0</span>}</div>
                  <div className="flex items-end justify-center" style={{ height: H }}>
                    <div className={`w-[60%] rounded-t-md transition ${b.current ? 'bg-emerald-500' : 'bg-primary'} ${hover === i ? 'opacity-100 ring-2 ring-primary/30' : 'opacity-85'}`} style={{ height: h }} />
                  </div>
                  <div className={`mt-1 border-t border-border pt-1 text-center text-[11px] font-semibold ${b.current ? 'text-emerald-700' : 'text-muted'}`}>{b.label}{b.current && <span className="block text-[10px] font-extrabold">сейчас</span>}</div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">Слева — первый период с оплатой, справа — текущий (зелёный). Сумма — по дате оплаты, недели с понедельника. Периоды без оплат показаны нулём.</p>
      </div>
    </div>
  );
}
