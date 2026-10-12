import { useState } from 'react';
import { BookOpen, CalendarDays, Check, CircleAlert, Clock3, Gift, History, Star, X } from 'lucide-react';
import { KIT_1 } from './GiftKit';

type Child = { id: string; firstName: string; lastName: string; studentClass?: string; progress?: { stars?: number } | null };
type LessonEntry = { id: string; date: string; time: string; topic: string; homeworkGrade: string; testGrade: string; nextHomework: string; attendance?: boolean; attendanceReason?: string; attachment?: { filename: string } | null };

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ru-KZ', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long', year: 'numeric' });
}

export function ParentChildrenView({ children }: { children: Child[] }) {
  const [selected, setSelected] = useState<Child | null>(null);
  const [history, setHistory] = useState<LessonEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openHistory = async (child: Child) => {
    setSelected(child); setHistory([]); setError(''); setLoading(true);
    try {
      const response = await fetch(`/api/parent/students/${child.id}/lesson-history`, { credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось загрузить историю уроков.');
      setHistory(Array.isArray(result.history) ? result.history : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить историю уроков.'); }
    finally { setLoading(false); }
  };

  return <>
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-display text-lg font-extrabold">Мои дети</h2><p className="text-sm text-muted">Откройте карточку ребёнка, чтобы посмотреть занятия и оценки.</p></div>{children.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children.map((child) => <article key={child.id} className="rounded-xl border border-border bg-primary-light p-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 text-primary"><BookOpen className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-bold">{child.firstName} {child.lastName}</p><p className="text-sm text-muted">{child.studentClass || 'Класс не указан'}</p></div></div><button type="button" onClick={() => void openHistory(child)} className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-white px-3 text-sm font-bold text-primary transition hover:bg-blue-50"><History className="h-4 w-4" />Уроки и оценки</button></article>)}</div> : <p className="text-sm text-muted">Пока нет прикреплённых учеников.</p>}</section>
    {selected && <div className="fixed inset-0 z-[170] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="parent-history-title" className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-primary">Успеваемость ученика</p><h2 id="parent-history-title" className="font-display text-2xl font-extrabold">{selected.firstName} {selected.lastName}</h2><p className="text-sm text-muted">{selected.studentClass || 'Класс не указан'} · история занятий</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Закрыть историю" className="rounded-lg p-2 text-muted hover:bg-primary-light"><X className="h-5 w-5" /></button></div>{error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}{loading ? <div className="py-12 text-center text-sm text-muted">Загружаем историю занятий…</div> : history.length ? <div className="space-y-3">{history.map((entry) => <article key={entry.id} className="rounded-xl border border-border bg-primary-light/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 text-primary" />{formatDate(entry.date)}</div><span className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><Clock3 className="h-4 w-4" />{entry.time}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-white p-3 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wide text-muted">Тема урока</span><p className="mt-1 whitespace-pre-wrap font-semibold">{entry.topic || 'Не указана'}</p></div><div className="rounded-lg bg-white p-3"><span className="text-xs font-bold uppercase tracking-wide text-muted">Домашнее задание</span><p className="mt-1 font-semibold">{entry.homeworkGrade || 'Оценка не указана'}</p></div><div className="rounded-lg bg-white p-3"><span className="text-xs font-bold uppercase tracking-wide text-muted">Тест в конце урока</span><p className="mt-1 font-semibold">{entry.testGrade || 'Оценка не указана'}</p></div><div className="rounded-lg bg-white p-3 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wide text-muted">Задание на следующий урок</span><p className="mt-1 whitespace-pre-wrap">{entry.nextHomework || 'Не задано'}</p>{entry.attachment && <a href={`/api/parent/students/${selected.id}/lesson-history/${entry.id}/attachment`} className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">📎 {entry.attachment.filename}</a>}</div></div>{entry.attendance !== undefined && <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${entry.attendance ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{entry.attendance ? 'Ученик присутствовал' : `Ученик отсутствовал${entry.attendanceReason ? ` · ${entry.attendanceReason}` : ''}`}</p>}</article>)}</div> : <div className="rounded-xl border border-dashed border-border py-12 text-center"><History className="mx-auto mb-2 h-8 w-8 text-muted/50" /><p className="text-sm text-muted">Записей об уроках пока нет.</p></div>}</section></div>}
  </>;
}

export function ParentPrizesView({ children, onBalanceUpdate }: { children: Child[]; onBalanceUpdate: (childId: string, stars: number) => void }) {
  const [selectedId, setSelectedId] = useState(children[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; success: boolean } | null>(null);
  const child = children.find((entry) => entry.id === selectedId) || children[0];
  const kitStars = KIT_1.reduce((total, item) => total + item.stars, 0);
  const stars = Number(child?.progress?.stars) || 0;

  const selectChild = (id: string) => { setSelectedId(id); setNotice(null); };
  const orderKit = async () => {
    if (!child || stars < kitStars || busy) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/api/parent/students/${child.id}/prize-kit`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemIds: KIT_1.map((item) => item.id) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось оформить набор.');
      onBalanceUpdate(child.id, result.stars);
      setNotice({ text: `Полный набор оформлен. Списано ${kitStars} звёзд.`, success: true });
    } catch (reason) { setNotice({ text: reason instanceof Error ? reason.message : 'Не удалось оформить набор.', success: false }); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-600">Магазин наград</p><h2 className="mt-1 font-display text-2xl font-extrabold">Призы</h2><p className="mt-1 text-sm text-muted">Комплект можно получить целиком, оплатив звёздами одного выбранного ученика.</p></div>
    {children.length > 1 && <div className="mb-5 grid gap-2 sm:grid-cols-2" aria-label="Выберите ученика">{children.map((entry) => <button key={entry.id} type="button" aria-pressed={entry.id === child?.id} onClick={() => selectChild(entry.id)} className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left ${entry.id === child?.id ? 'border-primary bg-blue-50 text-primary' : 'border-border hover:bg-primary-light'}`}><span className="min-w-0"><strong className="block truncate">{entry.firstName} {entry.lastName}</strong><span className="text-xs text-muted">Баланс этого ученика</span></span><span className="inline-flex shrink-0 items-center gap-1 font-extrabold"><Star className="h-4 w-4 fill-amber-400 text-amber-500" />{Number(entry.progress?.stars) || 0}</span></button>)}</div>}
    {children.length ? <><div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Баланс выбранного ученика</p><p className="mt-1 font-display text-lg font-extrabold text-amber-900">{child?.firstName} {child?.lastName}</p></div><span className="inline-flex items-center gap-2 text-2xl font-extrabold text-amber-800"><Star className="h-6 w-6 fill-amber-400 text-amber-500" />{stars}</span></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{KIT_1.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-white"><div className="grid aspect-square min-h-40 place-items-center bg-primary-light p-4 sm:p-5">{item.images[0] ? <img src={item.images[0]} alt={item.name} className="h-full w-full object-contain" /> : <Gift className="h-14 w-14 text-muted" />}</div><div className="min-h-16 px-4 py-3 text-center"><strong className="text-sm leading-5">{item.name}</strong></div></article>)}</div>
      <div className="mt-5 rounded-xl border border-border bg-primary-light/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>Полный набор из {KIT_1.length} призов</strong><p className="mt-1 text-sm text-muted">Звёзды спишутся с баланса: {child?.firstName} {child?.lastName}.</p></div><span className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-lg font-extrabold text-amber-700">Цена комплекта: {kitStars} ★</span></div>{stars < kitStars && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-800"><CircleAlert className="h-4 w-4 shrink-0" />На балансе этого ученика не хватает {kitStars - stars} звёзд.</p>}<button type="button" disabled={stars < kitStars || busy} onClick={() => void orderKit()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Оформляем…' : <><Check className="h-4 w-4" />Оформить полный набор · {kitStars} ★</>}</button>{notice && <p role={notice.success ? 'status' : 'alert'} className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${notice.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{notice.text}</p>}</div></> : <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">Добавьте ученика в родительский аккаунт, чтобы видеть его звёзды и призы.</p>}
  </section>;
}
