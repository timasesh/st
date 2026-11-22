import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import ProfitHistoryModal from './ProfitHistoryModal';
import { AlertTriangle, BarChart3, CalendarDays, CircleDollarSign, Gauge, Pencil, Plus, RotateCcw, Search, Trash2, TrendingUp, Wallet, X } from 'lucide-react';

export type PayStudent = { id: string; firstName: string; lastName: string; studentClass?: string; status?: 'active' | 'withdrawn'; teacher?: { firstName: string; lastName: string } | null };
export type PayLesson = { id: string; kind?: 'block'; studentId?: string; teacherId: string; day: number; hour: number };
type Payment = { id: string; studentId: string; lessons: number; amount: number; perLesson: number; paidAt: string; note: string; createdAt: string };
type Field = 'lessons' | 'amount' | 'per';
type Level = 'over' | 'soon' | 'ok' | 'none' | 'noschedule';

const TZ = 'Asia/Almaty';
const DAY_MS = 86400000;
const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const SLOTS_PER_DAY = 14; // 08:00–22:00
const SOON_LESSONS = 2; // «скоро оплата»: осталось не больше N занятий…
const SOON_DAYS = 7; // …или баланс закончится в ближайшие N дней

const parseDay = (value: string) => { const [y, m, d] = value.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const formatDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const weekdayOf = (ms: number) => (new Date(ms).getUTCDay() + 6) % 7;
const shortDate = (value: string) => `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`;
const round2 = (value: number) => Math.round(value * 100) / 100;
const money = (value: number) => `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₸`;
const plural = (n: number, one: string, few: string, many: string) => { const a = Math.abs(n) % 100; const b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; };

function nowInAlmaty() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '0';
  return { today: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) + Number(get('minute')) / 60 };
}

type Slots = number[][]; // slots[weekday] = часы начала занятий

/** Сколько занятий по недельному расписанию уже закончилось с даты `from` (включительно) до сейчас. */
function countHeld(slots: Slots, from: string, today: string, hourNow: number) {
  const start = parseDay(from); const end = parseDay(today);
  let held = 0;
  for (let ms = start; ms <= end; ms += DAY_MS) {
    for (const hour of slots[weekdayOf(ms)]) if (ms < end || hour + 1 <= hourNow) held += 1;
  }
  return held;
}

/** Дата, когда закончится последнее оплаченное занятие (по текущему расписанию). */
function exhaustDate(slots: Slots, remaining: number, today: string, hourNow: number) {
  if (remaining <= 0) return today;
  if (!slots.some((list) => list.length)) return null;
  let left = remaining;
  const start = parseDay(today);
  for (let offset = 0; offset < 800; offset += 1) {
    const ms = start + offset * DAY_MS;
    for (const hour of slots[weekdayOf(ms)]) {
      if (offset === 0 && hour + 1 <= hourNow) continue;
      left -= 1;
      if (left === 0) return formatDay(ms);
    }
  }
  return null;
}

const toNumber = (value: string) => { const n = Number(value.replace(/\s/g, '').replace(',', '.')); return value.trim() && Number.isFinite(n) ? n : NaN; };
const toText = (value: number) => String(round2(value));

/** Из двух последних изменённых полей считает третье. */
function derive(values: Record<Field, string>, order: Field[]) {
  const last = order.slice(-2);
  if (last.length < 2) return { values, auto: null as Field | null, warn: '' };
  const auto = (['lessons', 'amount', 'per'] as Field[]).find((field) => !last.includes(field)) as Field;
  const l = toNumber(values.lessons); const a = toNumber(values.amount); const p = toNumber(values.per);
  const next = { ...values }; let warn = '';
  if (auto === 'per') next.per = l > 0 && a > 0 ? toText(a / l) : '';
  if (auto === 'amount') next.amount = l > 0 && p > 0 ? toText(l * p) : '';
  if (auto === 'lessons') {
    if (a > 0 && p > 0) {
      const raw = a / p;
      if (Math.abs(raw - Math.round(raw)) < 0.005) next.lessons = String(Math.round(raw));
      else { next.lessons = ''; warn = 'Сумма не делится на стоимость занятия нацело — проверьте цифры.'; }
    } else next.lessons = '';
  }
  return { values: next, auto, warn };
}

const LEVEL_UI: Record<Level, { label: string; badge: string; bar: string; row: string }> = {
  over: { label: 'Нужна оплата', badge: 'bg-rose-100 text-rose-700', bar: 'border-l-rose-500', row: 'bg-rose-500/10' },
  soon: { label: 'Скоро оплата', badge: 'bg-amber-100 text-amber-800', bar: 'border-l-amber-500', row: 'bg-amber-500/10' },
  ok: { label: 'Оплачено', badge: 'bg-emerald-100 text-emerald-700', bar: 'border-l-emerald-500', row: '' },
  none: { label: 'Нет оплат', badge: 'bg-slate-200 text-slate-700', bar: 'border-l-slate-300', row: '' },
  noschedule: { label: 'Нет в расписании', badge: 'bg-slate-200 text-slate-700', bar: 'border-l-slate-300', row: '' },
};

async function readJson(response: Response) { try { return await response.json(); } catch { return {}; } }

export default function AdminPayments({ students, lessons, teachersCount }: { students: PayStudent[]; lessons: PayLesson[]; teachersCount: number }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [onlyDue, setOnlyDue] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [profitOpen, setProfitOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStudent, setFormStudent] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [values, setValues] = useState<Record<Field, string>>({ lessons: '', amount: '', per: '' });
  const [order, setOrder] = useState<Field[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tick, setTick] = useState(0);
  const [adjust, setAdjust] = useState<Record<string, number>>({});
  const [cancels, setCancels] = useState<Record<string, { date: string; time: string; reason: string }[]>>({});
  const [editHeld, setEditHeld] = useState<{ id: string; value: string; auto: number } | null>(null);

  useEffect(() => { const timer = window.setInterval(() => setTick((value) => value + 1), 60000); return () => window.clearInterval(timer); }, []);

  const load = async () => {
    try {
      const response = await fetch('/api/admin/payments', { credentials: 'same-origin' });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось загрузить оплаты.');
      setPayments(Array.isArray(result) ? result : []);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить оплаты.'); }
    finally { setLoading(false); }
    try {
      const response = await fetch('/api/admin/payment-adjustments', { credentials: 'same-origin' });
      const result = await readJson(response);
      if (response.ok && result && typeof result === 'object') setAdjust(result as Record<string, number>);
    } catch { /* без корректировок расчёт идёт по расписанию */ }
    try {
      const response = await fetch('/api/admin/payment-cancellations', { credentials: 'same-origin' });
      const result = await readJson(response);
      if (response.ok && result && typeof result === 'object') setCancels(result as Record<string, { date: string; time: string; reason: string }[]>);
    } catch { /* без учёта отмен расчёт идёт по расписанию */ }
  };
  const saveHeld = async (studentId: string, auto: number, wanted: string) => {
    const value = toNumber(wanted);
    if (!Number.isInteger(value) || value < 0) { setError('Проведённых занятий — целое число, не меньше 0.'); return; }
    try {
      const response = await fetch(`/api/admin/payment-adjustments/${studentId}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: value - auto }) });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось сохранить число проведённых занятий.');
      setAdjust((current) => { const next = { ...current }; if (value - auto === 0) delete next[studentId]; else next[studentId] = value - auto; return next; });
      setEditHeld(null); setError(''); setNotice('Число проведённых занятий обновлено.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить число проведённых занятий.'); }
  };
  useEffect(() => { void load(); }, []);

  const model = useMemo(() => {
    void tick;
    const now = nowInAlmaty();
    const studentIds = new Set(students.map((student) => student.id));
    const slotsOf = (list: PayLesson[]): Slots => { const slots: Slots = [[], [], [], [], [], [], []]; for (const lesson of list) if (lesson.day >= 0 && lesson.day <= 6) slots[lesson.day].push(lesson.hour); slots.forEach((hours) => hours.sort((a, b) => a - b)); return slots; };
    const regular = lessons.filter((lesson) => lesson.kind !== 'block' && lesson.studentId && studentIds.has(lesson.studentId));
    const byStudent = new Map<string, PayLesson[]>();
    for (const lesson of regular) byStudent.set(lesson.studentId as string, [...(byStudent.get(lesson.studentId as string) || []), lesson]);
    const payByStudent = new Map<string, Payment[]>();
    for (const payment of payments) payByStudent.set(payment.studentId, [...(payByStudent.get(payment.studentId) || []), payment]);

    const used = new Map<string, number>(); // оплата → сколько занятий из неё уже проведено (по очереди)
    const rows = students.map((student) => {
      const slots = slotsOf(byStudent.get(student.id) || []);
      const perWeek = slots.reduce((sum, list) => sum + list.length, 0);
      const list = [...(payByStudent.get(student.id) || [])].sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.createdAt.localeCompare(b.createdAt));
      const paid = list.reduce((sum, payment) => sum + payment.lessons, 0);
      /* отменённые занятия (✗ + причина у преподавателя) не считаются проведёнными */
      const cancelled = list.length ? (cancels[student.id] || []).filter((entry) => {
        if (entry.date < list[0].paidAt || entry.date > now.today) return false;
        const hour = Number(entry.time.slice(0, 2));
        if (!slots[weekdayOf(parseDay(entry.date))].includes(hour)) return false;
        return entry.date < now.today || hour + 1 <= now.hour;
      }).length : 0;
      const auto = list.length ? Math.max(0, countHeld(slots, list[0].paidAt, now.today, now.hour) - cancelled) : 0;
      const delta = adjust[student.id] || 0;
      const held = list.length ? Math.max(0, auto + delta) : 0;
      const remaining = paid - held;
      let left = held;
      for (const payment of list) { const take = Math.min(payment.lessons, Math.max(0, left)); used.set(payment.id, take); left -= take; }
      const ends = list.length && perWeek ? exhaustDate(slots, remaining, now.today, now.hour) : null;
      const daysLeft = ends ? Math.round((parseDay(ends) - parseDay(now.today)) / DAY_MS) : null;
      let level: Level = 'ok';
      if (!list.length) level = 'none';
      else if (remaining <= 0) level = 'over';
      else if (!perWeek) level = 'noschedule';
      else if (remaining <= SOON_LESSONS || (daysLeft !== null && daysLeft <= SOON_DAYS)) level = 'soon';
      return { student, perWeek, paid, held, auto, cancelled, delta, remaining, ends, level, last: list.length ? list[list.length - 1] : null };
    });
    const rank: Record<Level, number> = { over: 0, soon: 1, none: 2, noschedule: 3, ok: 4 };
    rows.sort((a, b) => rank[a.level] - rank[b.level] || a.remaining - b.remaining || `${a.student.firstName} ${a.student.lastName}`.localeCompare(`${b.student.firstName} ${b.student.lastName}`, 'ru'));

    const todayMs = parseDay(now.today);
    const weekStart = todayMs - weekdayOf(todayMs) * DAY_MS; const weekEnd = weekStart + 6 * DAY_MS;
    const monthDate = new Date(todayMs); const monthStart = Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1);
    const daysInMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
    const monthEnd = monthStart + (daysInMonth - 1) * DAY_MS;
    const sum = (from: number, to: number) => { const part = payments.filter((payment) => payment.paidAt >= formatDay(from) && payment.paidAt <= formatDay(to)); return { amount: part.reduce((s, p) => s + p.amount, 0), lessons: part.reduce((s, p) => s + p.lessons, 0), count: part.length }; };
    const week = sum(weekStart, weekEnd); const month = sum(monthStart, monthEnd);
    const all = { amount: payments.reduce((s, p) => s + p.amount, 0), lessons: payments.reduce((s, p) => s + p.lessons, 0) };

    const allSlots = slotsOf(regular);
    const weekLessons = regular.length;
    let monthLessons = 0; let monthHeld = 0;
    for (let ms = monthStart; ms <= monthEnd; ms += DAY_MS) for (const hour of allSlots[weekdayOf(ms)]) { monthLessons += 1; if (ms < todayMs || (ms === todayMs && hour + 1 <= now.hour)) monthHeld += 1; }
    const weekCap = teachersCount * SLOTS_PER_DAY * 7; const monthCap = teachersCount * SLOTS_PER_DAY * daysInMonth;
    return {
      now, rows, used, week, month, all, weekLessons, monthLessons, monthHeld,
      weekPct: weekCap ? (weekLessons / weekCap) * 100 : null, monthPct: monthCap ? (monthLessons / monthCap) * 100 : null,
      weekRange: `${shortDate(formatDay(weekStart)).slice(0, 5)}–${shortDate(formatDay(weekEnd)).slice(0, 5)}`,
      monthLabel: `${MONTHS[monthDate.getUTCMonth()]} ${monthDate.getUTCFullYear()}`,
      due: rows.filter((row) => row.level === 'over' || row.level === 'soon').length,
    };
  }, [students, lessons, payments, teachersCount, tick, adjust, cancels]);

  const studentName = (id: string) => { const student = students.find((item) => item.id === id); return student ? `${student.firstName} ${student.lastName}` : 'Ученик удалён или выбыл'; };
  const sortedStudents = useMemo(() => [...students].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'ru')), [students]);

  const openForm = (payment?: Payment, studentId?: string) => {
    setFormError(''); setNotice('');
    setEditingId(payment?.id || null);
    setFormStudent(payment?.studentId || studentId || '');
    setFormDate(payment?.paidAt || nowInAlmaty().today);
    setFormNote(payment?.note || '');
    setValues(payment ? { lessons: String(payment.lessons), amount: toText(payment.amount), per: toText(payment.perLesson) } : { lessons: '', amount: '', per: '' });
    setOrder(payment ? ['lessons', 'amount'] : []);
    setFormOpen(true);
  };
  const setField = (field: Field, value: string) => {
    const nextOrder = [...order.filter((item) => item !== field), field];
    setOrder(nextOrder);
    setValues(derive({ ...values, [field]: value }, nextOrder).values);
  };
  const derived = derive(values, order);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const lessonsCount = toNumber(values.lessons); const amount = toNumber(values.amount);
    if (!formStudent) return setFormError('Выберите ученика.');
    if (!Number.isInteger(lessonsCount) || lessonsCount < 1) return setFormError('Укажите целое количество занятий.');
    if (!(amount > 0)) return setFormError('Укажите сумму оплаты.');
    if (!formDate) return setFormError('Укажите дату оплаты.');
    setSaving(true); setFormError('');
    try {
      const response = await fetch(editingId ? `/api/admin/payments/${editingId}` : '/api/admin/payments', {
        method: editingId ? 'PUT' : 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: formStudent, lessons: lessonsCount, amount, paidAt: formDate, note: formNote }),
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось сохранить оплату.');
      setFormOpen(false); setNotice(editingId ? 'Оплата изменена.' : 'Оплата добавлена.');
      await load();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Не удалось сохранить оплату.'); }
    finally { setSaving(false); }
  };
  const remove = async (payment: Payment) => {
    if (!window.confirm(`Удалить оплату ${studentName(payment.studentId)} от ${shortDate(payment.paidAt)} на ${money(payment.amount)}?`)) return;
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}`, { method: 'DELETE', credentials: 'same-origin' });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось удалить оплату.');
      setNotice('Оплата удалена.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удалить оплату.'); }
  };

  const query = search.trim().toLowerCase();
  const rows = model.rows.filter((row) => (!onlyDue || row.level === 'over' || row.level === 'soon') && (!query || `${row.student.firstName} ${row.student.lastName}`.toLowerCase().includes(query)));
  const journal = payments.filter((payment) => !query || studentName(payment.studentId).toLowerCase().includes(query));
  const avg = (amount: number, count: number) => (count ? money(amount / count) : '—');
  const fieldClass = 'admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 text-sm focus:border-primary focus:outline-none';

  const metric = (icon: ReactNode, title: string, main: string, sub: string) => (
    <article className="admin-card rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">{icon}{title}</div>
      <p className="font-display text-2xl font-extrabold">{main}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </article>
  );

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metric(<TrendingUp className="h-4 w-4 text-primary" />, 'Прибыль за неделю', money(model.week.amount), `${model.week.count} ${plural(model.week.count, 'оплата', 'оплаты', 'оплат')} · ${model.week.lessons} зан. · ${model.weekRange}`)}
        {metric(<Wallet className="h-4 w-4 text-primary" />, 'Прибыль за месяц', money(model.month.amount), `${model.month.count} ${plural(model.month.count, 'оплата', 'оплаты', 'оплат')} · ${model.month.lessons} зан. · ${model.monthLabel}`)}
        {metric(<CircleDollarSign className="h-4 w-4 text-primary" />, 'Средняя стоимость занятия', avg(model.month.amount, model.month.lessons), `за неделю: ${avg(model.week.amount, model.week.lessons)} · за всё время: ${avg(model.all.amount, model.all.lessons)}`)}
        {metric(<Gauge className="h-4 w-4 text-primary" />, 'Нагруженность за неделю', `${model.weekLessons} зан.${model.weekPct === null ? '' : ` · ${Math.round(model.weekPct)}%`}`, `занято слотов у ${teachersCount} ${plural(teachersCount, 'преподавателя', 'преподавателей', 'преподавателей')}, 08:00–22:00, 7 дней`)}
        {metric(<CalendarDays className="h-4 w-4 text-primary" />, 'Нагруженность за месяц', `${model.monthLessons} зан.${model.monthPct === null ? '' : ` · ${Math.round(model.monthPct)}%`}`, `${model.monthLabel}: проведено ${model.monthHeld}, осталось ${model.monthLessons - model.monthHeld}`)}
        {metric(<AlertTriangle className="h-4 w-4 text-amber-600" />, 'Требуют оплаты', String(model.due), model.due ? 'закончились занятия или остаётся мало — подсвечены ниже' : 'всё оплачено с запасом')}
      </div>
      <p className="text-xs text-muted">«Прибыль» — сумма поступивших оплат за период (по дате оплаты), без вычета расходов. Нагрузка считается по недельному расписанию, пробные уроки не учитываются.</p>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}

      <section className="admin-card rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-extrabold">Баланс занятий учеников</h2><p className="text-sm text-muted">Занятия списываются по расписанию, начиная с даты первой оплаты; если занятие отменили или перенесли, поправьте «Проведено» карандашом. Осталось ≤ {SOON_LESSONS} занятий или хватит меньше чем на {SOON_DAYS} дней — «Скоро оплата».</p></div>
          <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setProfitOpen(true)} className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary-light"><BarChart3 className="h-4 w-4" />История прибыли</button>
          <button type="button" onClick={() => openForm()} className="clay-btn flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"><Plus className="h-4 w-4" />Добавить оплату</button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по имени ученика" className={`${fieldClass} pl-9`} /></div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={onlyDue} onChange={(event) => setOnlyDue(event.target.checked)} className="accent-primary" />Только требующие оплаты</label>
        </div>
        {loading ? <p className="py-10 text-center text-sm text-muted">Загружаем оплаты…</p> : rows.length ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-primary-light text-[11px] uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Ученик</th><th className="px-3 py-3">Занятий в неделю</th><th className="px-3 py-3">Оплачено</th><th className="px-3 py-3">Проведено</th><th className="px-3 py-3">Осталось</th><th className="px-3 py-3">Закончится</th><th className="px-3 py-3">Последняя оплата</th><th className="px-3 py-3">Статус</th><th className="px-3 py-3" /></tr></thead>
              <tbody>{rows.map((row) => { const ui = LEVEL_UI[row.level]; return (
                <tr key={row.student.id} className={`border-t border-border border-l-4 ${ui.bar} ${ui.row}`}>
                  <td className="px-3 py-3"><strong className="block">{row.student.firstName} {row.student.lastName}</strong><span className="text-xs text-muted">{row.student.studentClass || '—'}{row.student.teacher ? ` · ${row.student.teacher.firstName} ${row.student.teacher.lastName}` : ''}</span></td>
                  <td className="px-3 py-3">{row.perWeek || '—'}</td>
                  <td className="px-3 py-3">{row.last ? row.paid : '—'}</td>
                  <td className="px-3 py-3">{row.last ? (editHeld?.id === row.student.id ? (
                    <span className="inline-flex items-center gap-1"><input autoFocus inputMode="numeric" value={editHeld.value} onChange={(event) => setEditHeld({ ...editHeld, value: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') void saveHeld(row.student.id, row.auto, editHeld.value); if (event.key === 'Escape') setEditHeld(null); }} className="admin-input w-16 rounded-lg border-2 border-border bg-primary-light px-2 py-1 text-sm focus:border-primary focus:outline-none" /><button type="button" onClick={() => void saveHeld(row.student.id, row.auto, editHeld.value)} className="rounded-lg bg-primary px-2 py-1 text-xs font-bold text-white">OK</button><button type="button" onClick={() => setEditHeld(null)} aria-label="Отмена" className="rounded-lg p-1 text-muted hover:bg-primary-light"><X className="h-4 w-4" /></button></span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">{row.held}{row.cancelled > 0 && <span title="Отменённые занятия (✗ у преподавателя) не считаются" className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">отмен: {row.cancelled}</span>}{row.delta !== 0 && <span title={`По расписанию ${row.auto}, вручную ${row.delta > 0 ? '+' : ''}${row.delta}`} className="rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary">{row.delta > 0 ? '+' : ''}{row.delta}</span>}<button type="button" onClick={() => setEditHeld({ id: row.student.id, value: String(row.held), auto: row.auto })} title="Изменить число проведённых занятий (отмены и переносы)" aria-label="Изменить число проведённых занятий" className="rounded-lg p-1 text-muted hover:bg-primary-light hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>{row.delta !== 0 && <button type="button" onClick={() => void saveHeld(row.student.id, row.auto, String(row.auto))} title="Вернуть расчёт по расписанию" aria-label="Сбросить корректировку" className="rounded-lg p-1 text-muted hover:bg-primary-light hover:text-primary"><RotateCcw className="h-3.5 w-3.5" /></button>}</span>
                  )) : '—'}</td>
                  <td className="px-3 py-3 font-bold">{row.last ? (row.remaining < 0 ? `долг ${-row.remaining}` : row.remaining) : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3">{row.last && row.ends ? (row.remaining <= 0 ? 'уже закончилось' : shortDate(row.ends)) : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">{row.last ? `${shortDate(row.last.paidAt)} · ${money(row.last.amount)}` : '—'}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ui.badge}`}>{ui.label}</span></td>
                  <td className="px-3 py-3 text-right"><button type="button" onClick={() => openForm(undefined, row.student.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary-light"><Plus className="mr-1 inline h-3.5 w-3.5" />Оплата</button></td>
                </tr>); })}</tbody>
            </table>
          </div>
        ) : <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">{onlyDue ? 'Сейчас никому не нужна оплата.' : 'Учеников не найдено.'}</p>}
      </section>

      <section className="admin-card rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-extrabold">Журнал оплат</h2><span className="rounded-full bg-primary-light px-3 py-1 text-sm font-bold text-primary">{journal.length}</span></div>
        {journal.length ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-primary-light text-[11px] uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Дата</th><th className="px-3 py-3">Ученик</th><th className="px-3 py-3">Занятий</th><th className="px-3 py-3">Сумма</th><th className="px-3 py-3">За занятие</th><th className="px-3 py-3">Использовано</th><th className="px-3 py-3">Комментарий</th><th className="px-3 py-3" /></tr></thead>
              <tbody>{journal.map((payment) => { const used = model.used.get(payment.id); return (
                <tr key={payment.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-3">{shortDate(payment.paidAt)}</td>
                  <td className="px-3 py-3 font-bold">{studentName(payment.studentId)}</td>
                  <td className="px-3 py-3">{payment.lessons}</td>
                  <td className="whitespace-nowrap px-3 py-3">{money(payment.amount)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{money(payment.perLesson)}</td>
                  <td className="px-3 py-3">{used === undefined ? '—' : `${used} из ${payment.lessons}`}</td>
                  <td className="max-w-56 px-3 py-3 text-xs text-muted">{payment.note || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right"><button type="button" onClick={() => openForm(payment)} aria-label="Изменить оплату" className="rounded-lg p-2 text-muted hover:bg-primary-light hover:text-primary"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void remove(payment)} aria-label="Удалить оплату" className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></td>
                </tr>); })}</tbody>
            </table>
          </div>
        ) : <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">{loading ? 'Загружаем…' : 'Оплат пока нет. Нажмите «Добавить оплату».'}</p>}
      </section>

      {profitOpen && <ProfitHistoryModal payments={payments} today={nowInAlmaty().today} onClose={() => setProfitOpen(false)} />}

      {formOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="payment-form-title" className="my-auto w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-primary">Оплаты</p><h2 id="payment-form-title" className="font-display text-xl font-extrabold">{editingId ? 'Изменить оплату' : 'Новая оплата'}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Закрыть" className="rounded-lg p-2 text-muted hover:bg-primary-light"><X className="h-5 w-5" /></button></div>
            <div className="space-y-4">
              <label className="block text-sm font-bold">Ученик
                <select value={formStudent} onChange={(event) => setFormStudent(event.target.value)} className={`${fieldClass} mt-1`}>
                  <option value="">— выберите ученика —</option>
                  {sortedStudents.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}{student.studentClass ? ` · ${student.studentClass}` : ''}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold">Дата оплаты
                <input type="date" value={formDate} onChange={(event) => setFormDate(event.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <div>
                <p className="mb-2 text-xs text-muted">Заполните любые два поля — третье посчитается само.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([['lessons', 'Занятий', 'шт'], ['amount', 'Сумма', '₸'], ['per', 'За 1 занятие', '₸']] as Array<[Field, string, string]>).map(([field, label, unit]) => (
                    <label key={field} className="block text-sm font-bold">{label}{derived.auto === field && <span className="ml-1 rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary">авто</span>}
                      <div className="relative mt-1"><input inputMode="decimal" value={values[field]} onChange={(event) => setField(field, event.target.value)} className={`${fieldClass} pr-8 ${derived.auto === field ? 'border-primary/40' : ''}`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span></div>
                    </label>
                  ))}
                </div>
                {derived.warn && <p className="mt-2 text-xs font-semibold text-amber-700">{derived.warn}</p>}
              </div>
              <label className="block text-sm font-bold">Комментарий <span className="font-normal text-muted">(необязательно)</span>
                <input value={formNote} maxLength={300} onChange={(event) => setFormNote(event.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              {formError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted">Отмена</button><button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50">{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
