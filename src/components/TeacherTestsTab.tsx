import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileQuestion, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import MathText, { QuestionFigure } from '../shared/MathText';

/* Вкладка «Тесты» преподавателя:
   ученики → тесты выбранного ученика → «Создать новый тест» (тип → занятие в недельной сетке или дедлайн → форма генерации). */

export type TestsPerson = { id: string; firstName: string; lastName: string; studentClass?: string };
export type TestsLesson = { id: string; studentId?: string; day: number; hour: number; title: string; trial?: boolean; student?: TestsPerson | null };
export type StartTestArgs = { student: TestsPerson; kind: 'lesson_quiz' | 'quiz'; lesson?: TestsLesson; lessonDate?: string; deadlineAt?: string };

type TeacherTest = {
  id: string; kind: 'lesson_quiz' | 'quiz'; title: string; state: 'upcoming' | 'open' | 'completed' | 'expired' | 'skipped';
  createdAt?: string; lessonId?: string | null; lessonDate?: string | null; lessonHour?: number | null; availableAt?: string; deadlineAt?: string;
  durationMinutes?: number; reason?: string; score?: number; total: number; submittedAt?: string; answers?: number[];
  questions: Array<{ question: string; choices: string[]; correctIndex?: number; figure?: string }>;
};
type Summary = Record<string, { total: number; completed: number; open: number; expired: number; lastAt: string | null }>;

const TZ = 'Asia/Almaty';
const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const KIND_LABEL = { lesson_quiz: 'Проверочный квиз', quiz: 'Квиз' } as const;
const STATE_LABEL: Record<TeacherTest['state'], { text: string; cls: string }> = {
  upcoming: { text: 'Ждёт начала', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  open: { text: 'Идёт сейчас', cls: 'bg-violet-50 text-violet-800 border-violet-200' },
  completed: { text: 'Сдан', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  expired: { text: 'Просрочен', cls: 'bg-orange-50 text-orange-800 border-orange-200' },
  skipped: { text: 'Пропущен', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const dateKeyOf = (date: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
};
const addDays = (key: string, days: number) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10); };
const weekdayOf = (key: string) => (new Date(`${key}T12:00:00+05:00`).getUTCDay() + 6) % 7;
const startOf = (key: string, hour: number) => new Date(`${key}T${String(hour).padStart(2, '0')}:00:00+05:00`);
const hhmm = (d: Date | string | number) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d));
const dayLong = (key: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00+05:00`));
const dayShort = (key: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(`${key}T12:00:00+05:00`));
const dateTime = (iso?: string) => iso ? new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)) : '—';
const pad = (n: number) => String(n).padStart(2, '0');
const toAstanaIso = (local: string) => (local ? `${local}:00+05:00` : '');
const astanaLocalInput = (offsetMs: number, hour?: number) => {
  const d = new Date(Date.now() + offsetMs);
  const key = dateKeyOf(d);
  const time = hour !== undefined ? `${pad(hour)}:00` : hhmm(d);
  return `${key}T${time}`;
};

async function patchTest(url: string, body: unknown) {
  const response = await fetch(url, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await response.text();
  let data: any = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || 'Не удалось сохранить изменения.');
  return data;
}
type EditQuestion = { question: string; choices: string[]; correctIndex: number; figure?: string };
type Editing = { id: string; kind: 'lesson_quiz' | 'quiz'; title: string; questions: EditQuestion[]; deadline: string; deadlineOrig: string };
const isoToAstanaInput = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return `${dateKeyOf(d)}T${hhmm(d)}`; };

async function api(url: string) {
  const response = await fetch(url, { credentials: 'same-origin' });
  const text = await response.text();
  let data: any = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || 'Не удалось загрузить данные.');
  return data;
}

export default function TeacherTestsTab({ students, lessons, refreshKey, onStartTest }: { students: TestsPerson[]; lessons: TestsLesson[]; refreshKey: number; onStartTest: (args: StartTestArgs) => void }) {
  const [summary, setSummary] = useState<Summary>({});
  const [query, setQuery] = useState('');
  const [student, setStudent] = useState<TestsPerson | null>(null);
  const [tests, setTests] = useState<TeacherTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [wizard, setWizard] = useState<null | 'type' | 'grid' | 'deadline'>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [picked, setPicked] = useState<{ lesson: TestsLesson; date: string } | null>(null);
  const [deadline, setDeadline] = useState(() => astanaLocalInput(24 * 3600 * 1000, 20));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(t); }, []);
  useEffect(() => { if (student) return; api('/api/teacher/tests/summary').then((r) => setSummary(r.summary || {})).catch(() => undefined); }, [student, refreshKey]);
  useEffect(() => {
    if (!student) return;
    let alive = true;
    setLoading(true); setError('');
    api(`/api/teacher/students/${student.id}/tests`).then((r) => { if (alive) setTests(Array.isArray(r.tests) ? r.tests : []); }).catch((e) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [student?.id, refreshKey]);

  const filtered = useMemo(() => students.filter((s) => `${s.firstName} ${s.lastName} ${s.studentClass || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [students, query]);
  const sortedTests = useMemo(() => [...tests].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), [tests]);

  const todayKey = dateKeyOf(new Date(now));
  const monday = addDays(todayKey, -weekdayOf(todayKey) + weekOffset * 7);
  const studentLessons = useMemo(() => student ? lessons.filter((l) => !l.trial && (l.studentId === student.id || l.student?.id === student.id)) : [], [lessons, student?.id]);
  const hours = useMemo(() => {
    if (!studentLessons.length) return [] as number[];
    const lo = Math.min(...studentLessons.map((l) => l.hour)), hi = Math.max(...studentLessons.map((l) => l.hour));
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [studentLessons]);
  const occupied = useMemo(() => new Set(tests.filter((t) => t.kind === 'lesson_quiz' && t.lessonId && t.lessonDate && t.state !== 'skipped').map((t) => `${t.lessonId}|${t.lessonDate}`)), [tests]);

  const closeWizard = () => { setWizard(null); setPicked(null); setWeekOffset(0); };
  const deadlineIso = toAstanaIso(deadline);
  const deadlineOk = Boolean(deadline) && Date.parse(deadlineIso) >= now + 10 * 60000 && Date.parse(deadlineIso) <= now + 90 * 86400000;

  const next = () => {
    if (!student) return;
    if (wizard === 'grid' && picked) { onStartTest({ student, kind: 'lesson_quiz', lesson: picked.lesson, lessonDate: picked.date }); closeWizard(); }
    if (wizard === 'deadline' && deadlineOk) { onStartTest({ student, kind: 'quiz', deadlineAt: deadlineIso }); closeWizard(); }
  };

  /* ───────── список учеников ───────── */
  if (!student) {
    return (
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-extrabold">Тесты</h2>
            <p className="text-sm text-muted">Выберите ученика, чтобы увидеть все его тесты и создать новый.</p>
          </div>
          <label className="relative block w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти ученика" className="w-full rounded-xl border border-border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" /></label>
        </div>
        {filtered.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((s) => {
          const sm = summary[s.id];
          return <button key={s.id} type="button" onClick={() => { setStudent(s); setOpenId(''); }} className="rounded-xl border border-border p-4 text-left transition hover:border-primary hover:bg-primary-light">
            <strong className="block font-display text-base">{s.firstName} {s.lastName}</strong>
            <span className="text-xs text-muted">{s.studentClass || 'Класс не указан'}</span>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold">
              <span className="rounded-full bg-primary-light px-2.5 py-1 text-primary">Тестов: {sm?.total ?? 0}</span>
              {!!sm?.completed && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">Сдано: {sm.completed}</span>}
              {!!sm?.open && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-800">Ждут: {sm.open}</span>}
              {!!sm?.expired && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-800">Просрочено: {sm.expired}</span>}
            </div>
          </button>;
        })}</div> : <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">{students.length ? 'Никого не нашли.' : 'У вас пока нет учеников.'}</p>}
      </section>
    );
  }

  const startEdit = (t: TeacherTest) => { setEditError(''); setEditing({ id: t.id, kind: t.kind, title: t.title, questions: t.questions.map((q) => ({ question: q.question, choices: [...q.choices], correctIndex: q.correctIndex ?? 0, ...(q.figure ? { figure: q.figure } : {}) })), deadline: isoToAstanaInput(t.deadlineAt), deadlineOrig: isoToAstanaInput(t.deadlineAt) }); };
  const updateQuestion = (index: number, patch: Partial<EditQuestion>) => setEditing((cur) => cur ? { ...cur, questions: cur.questions.map((q, i) => i === index ? { ...q, ...patch } : q) } : cur);
  const saveEdit = async () => {
    if (!editing || !student) return;
    const bad = editing.questions.findIndex((q) => !q.question.trim() || q.choices.some((c) => !c.trim()));
    if (editing.questions.length < 5) { setEditError('В тесте должно быть не меньше 5 вопросов.'); return; }
    if (bad >= 0) { setEditError(`Заполните вопрос ${bad + 1} и все четыре варианта ответа.`); return; }
    setEditSaving(true); setEditError('');
    try {
      const body: Record<string, unknown> = { title: editing.title.trim() || 'Тест', questions: editing.questions.map((q) => ({ question: q.question.trim(), choices: q.choices.map((c) => c.trim()), correctIndex: q.correctIndex, ...(q.figure ? { figure: q.figure } : {}) })) };
      if (editing.kind === 'quiz' && editing.deadline && editing.deadline !== editing.deadlineOrig) body.deadlineAt = toAstanaIso(editing.deadline);
      const result = await patchTest(`/api/teacher/students/${student.id}/tests/${editing.id}`, body);
      setTests((cur) => cur.map((t) => t.id === editing.id ? { ...t, ...result.test } : t));
      setEditing(null);
    } catch (reason) { setEditError(reason instanceof Error ? reason.message : 'Не удалось сохранить изменения.'); }
    finally { setEditSaving(false); }
  };

  /* ───────── тесты ученика ───────── */
  const pickedStart = picked ? startOf(picked.date, picked.lesson.hour) : null;
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <button type="button" onClick={() => { setStudent(null); setTests([]); setOpenId(''); }} className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Все ученики</button>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">{student.firstName} {student.lastName}</h2>
          <p className="text-sm text-muted">{student.studentClass || 'Класс не указан'} · всего тестов: {tests.filter((t) => t.state !== 'skipped').length}</p>
        </div>
        <button type="button" onClick={() => { setWizard('type'); setPicked(null); setWeekOffset(0); setDeadline(astanaLocalInput(24 * 3600 * 1000, 20)); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-dark"><Plus className="h-4 w-4" />Создать новый тест</button>
      </div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      {loading ? <p className="py-8 text-center text-sm text-muted">Загружаем тесты…</p> : sortedTests.length ? <div className="space-y-3">{sortedTests.map((t) => {
        const st = STATE_LABEL[t.state];
        const open = openId === t.id;
        return <article key={t.id} className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${t.kind === 'quiz' ? 'bg-amber-100 text-amber-900' : 'bg-primary-light text-primary'}`}>{KIND_LABEL[t.kind]}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.text}</span>
              </div>
              <strong className="block break-words">{t.title}</strong>
              {t.state === 'skipped' ? <p className="mt-1 text-sm text-muted">Причина: {t.reason}</p> : <>
                <p className="mt-1 text-sm text-muted">
                  {t.kind === 'quiz' ? <>Дедлайн: <b>{dateTime(t.deadlineAt)}</b></> : <>Занятие: <b>{t.lessonDate ? `${dayShort(t.lessonDate)}, ${pad(t.lessonHour ?? 0)}:00` : '—'}</b> · окно: {t.availableAt ? hhmm(t.availableAt) : '—'}–{t.deadlineAt ? hhmm(t.deadlineAt) : '—'}</>}
                  {' · '}{t.total} вопросов
                </p>
                {t.state === 'completed' && <p className="mt-1 text-sm font-bold text-emerald-700">Результат: {t.score ?? 0} из {t.total} ({t.total ? Math.round(((t.score ?? 0) / t.total) * 100) : 0}%) · сдан {dateTime(t.submittedAt)}</p>}
              </>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
            {t.state !== 'skipped' && t.state !== 'completed' && <button type="button" onClick={() => startEdit(t)} className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary-light px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"><Pencil className="h-3.5 w-3.5" />Редактировать</button>}
            {t.state !== 'skipped' && <button type="button" onClick={() => setOpenId(open ? '' : t.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted hover:bg-primary-light">{t.state === 'completed' ? 'Разбор' : 'Вопросы'}<ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} /></button>}
            </div>
          </div>
          {open && <ol className="mt-3 space-y-2 border-t border-border pt-3">{t.questions.map((q, qi) => {
            const mine = t.answers?.[qi];
            return <li key={qi} className="rounded-lg bg-primary-light/50 p-3 text-sm">
              <div className="font-bold"><span className="text-primary">{qi + 1}.</span> <MathText text={q.question} /></div>
              <QuestionFigure figure={q.figure} />
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{q.choices.map((c, ci) => {
                const right = q.correctIndex === ci, wrong = t.state === 'completed' && mine === ci && !right;
                return <div key={ci} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${right ? 'border-emerald-300 bg-emerald-50' : wrong ? 'border-rose-300 bg-rose-50' : 'border-border bg-white'}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${right ? 'bg-emerald-600 text-white' : wrong ? 'bg-rose-600 text-white' : 'border border-border text-muted'}`}>{String.fromCharCode(65 + ci)}</span>
                  <span className="min-w-0 break-words"><MathText text={c} /></span>
                  {t.state === 'completed' && mine === ci && <span className="ml-auto text-[10px] font-bold text-muted">ответ ученика</span>}
                </div>;
              })}</div>
            </li>;
          })}</ol>}
        </article>;
      })}</div> : <div className="rounded-xl border border-dashed border-border py-10 text-center"><FileQuestion className="mx-auto mb-2 h-8 w-8 text-muted" /><p className="text-sm text-muted">Тестов у этого ученика пока нет. Нажмите «Создать новый тест».</p></div>}

      {/* ───────── редактирование теста ───────── */}
      {editing && <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !editSaving) setEditing(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="edit-test-title" className="my-auto w-full max-w-3xl rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-primary">{KIND_LABEL[editing.kind]} · {student.firstName} {student.lastName}</p><h3 id="edit-test-title" className="font-display text-2xl font-extrabold">Редактировать тест</h3></div>
            <button type="button" onClick={() => setEditing(null)} disabled={editSaving} aria-label="Закрыть" className="rounded-lg p-2 text-muted hover:bg-primary-light"><X className="h-5 w-5" /></button>
          </div>
          <label className="mb-3 block text-sm font-bold">Название
            <input value={editing.title} maxLength={120} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-primary" />
          </label>
          {editing.kind === 'quiz' && <label className="mb-3 block text-sm font-bold">Дедлайн (время Астаны)
            <input type="datetime-local" value={editing.deadline} min={astanaLocalInput(10 * 60000)} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-primary sm:w-72" />
          </label>}
          <ol className="space-y-3">{editing.questions.map((q, qi) => <li key={qi} className="rounded-xl border border-border bg-primary-light/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><span className="text-sm font-extrabold text-primary">Вопрос {qi + 1}</span>
              <button type="button" onClick={() => setEditing({ ...editing, questions: editing.questions.filter((_, i) => i !== qi) })} disabled={editing.questions.length <= 5} title={editing.questions.length <= 5 ? 'Минимум 5 вопросов' : 'Удалить вопрос'} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Удалить</button></div>
            <textarea value={q.question} rows={2} maxLength={700} onChange={(e) => updateQuestion(qi, { question: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
            {q.figure && <div className="mt-2 flex items-center gap-3"><div className="max-w-[160px] overflow-hidden rounded-lg border border-border bg-white p-1"><QuestionFigure figure={q.figure} /></div><button type="button" onClick={() => updateQuestion(qi, { figure: undefined })} className="text-xs font-bold text-rose-700 hover:underline">Убрать рисунок</button></div>}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{q.choices.map((c, ci) => <label key={ci} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${q.correctIndex === ci ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-white'}`}>
              <input type="radio" name={`correct-${qi}`} checked={q.correctIndex === ci} onChange={() => updateQuestion(qi, { correctIndex: ci })} aria-label={`Правильный ответ: вариант ${String.fromCharCode(65 + ci)}`} className="h-4 w-4 shrink-0 accent-emerald-600" />
              <span className="text-[11px] font-extrabold text-muted">{String.fromCharCode(65 + ci)}</span>
              <input value={c} maxLength={300} onChange={(e) => updateQuestion(qi, { choices: q.choices.map((x, i) => i === ci ? e.target.value : x) })} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>)}</div>
            <p className="mt-1 text-[11px] text-muted">Отметьте кружком правильный ответ. Формулы можно писать в LaTeX, как в сгенерированном тесте.</p>
          </li>)}</ol>
          <button type="button" onClick={() => setEditing({ ...editing, questions: [...editing.questions, { question: '', choices: ['', '', '', ''], correctIndex: 0 }] })} disabled={editing.questions.length >= 30} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-4 py-2 text-sm font-bold text-primary hover:bg-primary-light disabled:opacity-40"><Plus className="h-4 w-4" />Добавить вопрос</button>
          {editError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{editError}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={editSaving} className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-muted hover:bg-primary-light">Отмена</button>
            <button type="button" onClick={() => void saveEdit()} disabled={editSaving} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{editSaving ? 'Сохраняем…' : 'Сохранить изменения'}</button>
          </div>
        </section>
      </div>}

      {/* ───────── мастер создания ───────── */}
      {wizard && <div className="fixed inset-0 z-[135] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeWizard(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="new-test-title" className="my-auto w-full max-w-4xl rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">{student.firstName} {student.lastName}</p>
              <h3 id="new-test-title" className="font-display text-2xl font-extrabold">{wizard === 'type' ? 'Какой тест создать?' : wizard === 'grid' ? 'Выберите занятие' : 'Дедлайн квиза'}</h3>
            </div>
            <button type="button" onClick={closeWizard} aria-label="Закрыть" className="rounded-lg p-2 text-muted hover:bg-primary-light"><X className="h-5 w-5" /></button>
          </div>

          {wizard === 'type' && <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setWizard('grid')} className="rounded-2xl border-2 border-border p-5 text-left transition hover:border-primary hover:bg-primary-light">
              <CalendarDays className="mb-3 h-7 w-7 text-primary" />
              <strong className="block font-display text-lg">Проверочный квиз</strong>
              <p className="mt-2 text-sm text-muted">Привязан к конкретному занятию. Появится у ученика за 10 минут до конца урока и будет доступен ещё 10 минут после урока, потом станет просроченным.</p>
              <p className="mt-3 text-xs font-bold text-primary">Дальше: выберите занятие в недельной сетке</p>
            </button>
            <button type="button" onClick={() => setWizard('deadline')} className="rounded-2xl border-2 border-border p-5 text-left transition hover:border-primary hover:bg-primary-light">
              <Clock3 className="mb-3 h-7 w-7 text-amber-600" />
              <strong className="block font-display text-lg">Квиз</strong>
              <p className="mt-2 text-sm text-muted">Не привязан к уроку. Ученик получает его сразу и может пройти в любое время до дедлайна, который задаёте вы. Бот напомнит за сутки и за час.</p>
              <p className="mt-3 text-xs font-bold text-primary">Дальше: укажите дедлайн</p>
            </button>
          </div>}

          {wizard === 'grid' && <div>
            <ol className="mb-4 space-y-1 rounded-xl bg-primary-light p-3 text-sm text-slate-700">
              <li><b>1.</b> Выберите неделю стрелками.</li>
              <li><b>2.</b> Нажмите на занятие ученика — оно подсвечено синим. Серые занятия уже прошли, зелёные — тест на них уже назначен.</li>
              <li><b>3.</b> Нажмите «Далее» и создайте тест: загрузите фото, вставьте текст или опишите тему.</li>
            </ol>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1">
                <button type="button" onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} disabled={weekOffset === 0} aria-label="Предыдущая неделя" className="rounded-lg border border-border p-2 hover:bg-primary-light disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => setWeekOffset((w) => Math.min(3, w + 1))} disabled={weekOffset >= 3} aria-label="Следующая неделя" className="rounded-lg border border-border p-2 hover:bg-primary-light disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <strong className="text-sm">{weekOffset === 0 ? 'Эта неделя' : weekOffset === 1 ? 'Следующая неделя' : `Через ${weekOffset} нед.`}: {dayShort(monday)} — {dayShort(addDays(monday, 6))}</strong>
            </div>
            {studentLessons.length ? <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[640px] table-fixed border-collapse text-left text-xs">
              <thead className="bg-primary-light text-[11px] uppercase tracking-wide text-muted"><tr><th className="w-16 px-2 py-2">Время</th>{DAYS.map((d, i) => <th key={d} className="px-2 py-2"><span className="hidden lg:inline">{d}</span><span className="lg:hidden">{DAYS_SHORT[i]}</span><span className="block font-normal normal-case text-[10px]">{dayShort(addDays(monday, i))}</span></th>)}</tr></thead>
              <tbody>{hours.map((h) => <tr key={h} className="border-t border-border">
                <th className="px-2 py-2 text-muted">{pad(h)}:00</th>
                {DAYS.map((_, di) => {
                  const lesson = studentLessons.find((l) => l.day === di && l.hour === h);
                  if (!lesson) return <td key={di} className="h-14 bg-slate-50/40 p-1" />;
                  const date = addDays(monday, di);
                  const over = now >= startOf(date, h).getTime() + 70 * 60000;
                  const has = occupied.has(`${lesson.id}|${date}`);
                  const sel = picked?.lesson.id === lesson.id && picked.date === date;
                  const status = over ? 'прошло' : has ? 'тест назначен' : sel ? 'выбрано' : 'выбрать';
                  return <td key={di} className="h-14 p-1"><button type="button" disabled={over || has} onClick={() => setPicked({ lesson, date })} title={over ? 'Занятие уже закончилось' : has ? 'На это занятие уже назначен проверочный квиз' : `Создать проверочный квиз к занятию ${dayShort(date)}, ${pad(h)}:00`} className={`flex h-full w-full flex-col items-start justify-center rounded-lg border px-2 text-left font-bold transition ${sel ? 'border-primary bg-primary text-white shadow' : over ? 'border-slate-200 bg-slate-100 text-slate-400' : has ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-blue-200 bg-blue-50 text-primary hover:border-primary hover:bg-blue-100'}`}><span className="truncate">{lesson.title}</span><span className="text-[10px] font-semibold opacity-80">{has && <Check className="mr-0.5 inline h-3 w-3" />}{status}</span></button></td>;
                })}
              </tr>)}</tbody>
            </table></div> : <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">У ученика нет занятий в расписании. Создайте обычный «Квиз» с дедлайном.</p>}
            {picked && pickedStart && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <b>Выбрано: {dayLong(picked.date)}, {hhmm(pickedStart)}–{hhmm(pickedStart.getTime() + 3600000)}.</b>
              <p className="mt-1">Проверочный квиз появится у ученика в <b>{hhmm(pickedStart.getTime() + 50 * 60000)}</b> (за 10 минут до конца урока) и будет доступен до <b>{hhmm(pickedStart.getTime() + 70 * 60000)}</b>. После этого он станет просроченным. Ученик получит уведомление в Telegram сразу после назначения и когда квиз откроется.</p>
            </div>}
          </div>}

          {wizard === 'deadline' && <div className="space-y-4">
            <p className="rounded-xl bg-primary-light p-3 text-sm text-slate-700">Ученик увидит квиз сразу после назначения. После дедлайна квиз станет просроченным. Бот напомнит за 24 часа, за 1 час и сообщит, когда дедлайн прошёл. Время — по Астане (UTC+5).</p>
            <label className="block space-y-2 text-sm font-bold">Дедлайн
              <input type="datetime-local" value={deadline} min={astanaLocalInput(10 * 60000)} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-primary sm:w-72" />
            </label>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {[['Сегодня 21:00', 0, 21], ['Завтра 20:00', 1, 20], ['Через 3 дня', 3, 20], ['Через неделю', 7, 20]].map(([label, days, hr]) => <button key={String(label)} type="button" onClick={() => setDeadline(astanaLocalInput(Number(days) * 86400000, Number(hr)))} className="rounded-full border border-border px-3 py-1.5 text-muted hover:bg-primary-light">{label}</button>)}
            </div>
            {deadline && <p className={`text-sm font-semibold ${deadlineOk ? 'text-emerald-700' : 'text-rose-700'}`}>{deadlineOk ? `Ученик сможет сдать квиз до ${dateTime(deadlineIso)}.` : 'Дедлайн должен быть не раньше чем через 10 минут и не позже чем через 90 дней.'}</p>}
          </div>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            {wizard !== 'type' ? <button type="button" onClick={() => setWizard('type')} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-primary-light"><ArrowLeft className="h-4 w-4" />Назад</button> : <span />}
            {wizard !== 'type' && <button type="button" onClick={next} disabled={wizard === 'grid' ? !picked : !deadlineOk} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">Далее — создать тест<ArrowRight className="h-4 w-4" /></button>}
          </div>
        </section>
      </div>}
    </section>
  );
}
