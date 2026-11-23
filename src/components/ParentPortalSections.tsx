import { useState } from 'react';
import { BookOpen, CalendarDays, Check, CircleAlert, Clock3, History, X } from 'lucide-react';

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
