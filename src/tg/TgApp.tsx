import MathText, { QuestionFigure } from '../shared/MathText';
import { levelFor, earnedStars, LEVEL_NAMES, LEVEL_STARS, RANKS, MAX_LEVEL, levelImage, isMilestone, rankOf } from '../shared/levels.js';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, CalendarDays, Camera, Check, CheckCircle2, ChevronLeft, Clock3, FileQuestion, Gift, Lock, LogOut, MessageCircle,
  Paperclip, Play, RefreshCw, Rocket, Settings, Sparkles, Star, Trophy, X,
} from 'lucide-react';

/* ───────── Telegram ───────── */
type TgWebApp = {
  ready: () => void; expand: () => void; close: () => void; disableVerticalSwipes?: () => void;
  setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void; enableClosingConfirmation?: () => void; disableClosingConfirmation?: () => void;
  openLink: (url: string) => void;
  BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void; selectionChanged: () => void };
  initData?: string;
  initDataUnsafe?: { user?: { first_name?: string } };
};
const tg: TgWebApp | undefined = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
const tap = (kind: 'light' | 'medium' = 'light') => { try { tg?.HapticFeedback?.impactOccurred(kind); } catch { /* ignore */ } };
const notify = (kind: 'success' | 'error' | 'warning') => { try { tg?.HapticFeedback?.notificationOccurred(kind); } catch { /* ignore */ } };
const openExternal = (url: string) => { if (tg) tg.openLink(url); else window.open(url, '_blank', 'noopener'); };

/* ───────── Типы ───────── */
type Tab = 'home' | 'plan' | 'tests' | 'hw' | 'levels' | 'sky';
type PTab = 'kids' | 'plan' | 'hist' | 'prizes';
type Lesson = { id: string; day: number; hour: number; title: string; lessonLink?: string; lessonDescription?: string; attendance?: boolean; studentId?: string; student?: { firstName?: string } | null };
type Child = { id: string; firstName: string; lastName: string; studentClass?: string; teacher?: { firstName: string; lastName: string } | null; progress?: { stars?: number } };
type HistoryEntry = { id: string; date: string; time: string; topic?: string; homeworkGrade?: string; testGrade?: string; nextHomework?: string; attendance?: boolean; attendanceReason?: string; attachment?: { filename: string } | null };
type Question = { question: string; choices: string[]; figure?: string };
type Test = { id: string; title: string; studentClass: string; lessonHour?: number; deadlineAt?: string; durationMinutes: number; questions: Question[]; status: 'assigned' | 'completed' | 'expired'; score?: number };
type Homework = { id: string; date: string; time: string; topic: string; nextHomework: string; attachment?: { filename: string; mimeType?: string } | null };
type Message = { id: string; at: string; sender: string; body: string; read: boolean };
type Portal = {
  account: { firstName: string; lastName: string; studentClass?: string; trialAccount?: boolean; role: string; teacher?: { firstName: string; lastName: string } | null };
  progress: { stars?: number; xp?: number; level?: number; earnedStars?: number; prizeOrders?: { cost?: number }[] } | null;
  relatedAccounts?: Child[];
  lessons: Lesson[]; studentTests?: Test[]; studentHomework?: Homework[]; messages: Message[];
};

/* ───────── Утилиты ───────── */
const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const KIT = [
  { id: 'stickers', name: 'Стикерпак', stars: 5, img: '/static/gifts/stickers.webp' },
  { id: 'notebook', name: 'Блокнот', stars: 7, img: '/static/gifts/notebook.webp' },
  { id: 'tshirt', name: 'Фирменная футболка', stars: 10, img: '/static/gifts/tshirt.webp' },
  { id: 'backpack', name: 'Фирменный рюкзак', stars: 12, img: '/static/gifts/backpack.webp' },
];
const KIT_COST = KIT.reduce((s, i) => s + i.stars, 0);
const pad = (n: number) => String(n).padStart(2, '0');
const hh = (h: number) => `${pad(h)}:00–${pad(h + 1)}:00`;

function clockOf(now: Date) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Almaty', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return { day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')), hour: Number(get('hour')), minute: Number(get('minute')) };
}
function offsetOf(l: Lesson, now: Date) {
  const c = clockOf(now);
  let d = (l.day - c.day + 7) % 7;
  if (d === 0 && (l.hour + 1) * 60 <= c.hour * 60 + c.minute) d = 7;
  return d;
}
function dateOf(now: Date, days: number) {
  return new Intl.DateTimeFormat('ru-KZ', { timeZone: 'Asia/Almaty', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(now.getTime() + days * 86400000));
}
function greeting(now: Date) { const h = clockOf(now).hour; return h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'; }
const timeOf = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('ru-KZ', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit' }) : '—';
const plural = (n: number, a: string, b: string, c: string) => { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };

async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers || {}) } });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* not json */ }
  if (!res.ok) { const e: Error & { status?: number } = new Error(data.error || 'Что-то пошло не так. Попробуйте ещё раз.'); e.status = res.status; throw e; }
  return data as T;
}
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/* сжимаем фото с телефона, чтобы влезть в лимит 5 МБ */
async function prepareFile(file: File): Promise<{ filename: string; mimeType: string; data: string }> {
  const toB64 = (blob: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onerror = () => no(new Error('Не удалось прочитать файл.')); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
  if (file.type === 'application/pdf') {
    if (file.size > 5 * 1024 * 1024) throw new Error('PDF должен быть не больше 5 МБ.');
    return { filename: file.name.replace(/\.[^.]+$/, '') + '.pdf', mimeType: 'application/pdf', data: await toB64(file) };
  }
  if (!file.type.startsWith('image/')) throw new Error('Выберите фото или PDF.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Не удалось открыть изображение. Попробуйте JPG или PNG.')); i.src = url; });
    const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const q of [0.85, 0.7, 0.55]) { blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q)); if (blob && blob.size < 4.5 * 1024 * 1024) break; }
    if (!blob || blob.size >= 5 * 1024 * 1024) throw new Error('Фото слишком большое. Сделайте снимок поменьше.');
    return { filename: (file.name.replace(/\.[^.]+$/, '') || 'homework') + '.jpg', mimeType: 'image/jpeg', data: await toB64(blob) };
  } finally { URL.revokeObjectURL(url); }
}

/* ───────── Мелкие компоненты ───────── */
function Empty({ icon: Icon, title, text }: { icon: typeof BookOpen; title: string; text: string }) {
  return <div className="card flat empty"><Icon size={34} /><h3>{title}</h3><p className="muted small" style={{ marginTop: 6 }}>{text}</p></div>;
}
function Head({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return <div style={{ margin: '4px 2px 14px' }}><p className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 1.4 }}>{kicker}</p><h2><span className="hl">{title}</span></h2>{sub && <p className="muted small" style={{ marginTop: 6 }}>{sub}</p>}</div>;
}
function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => { tg?.BackButton.show(); tg?.BackButton.onClick(onClose); return () => { tg?.BackButton.offClick(onClose); tg?.BackButton.hide(); }; }, [onClose]);
  return <div className="sheet-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="sheet" role="dialog" aria-modal="true">{children}</div></div>;
}
function Toast({ text, kind, onDone }: { text: string; kind: 'ok' | 'bad'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3600); return () => clearTimeout(t); }, [text, onDone]);
  return <div className="toast"><div className={`card ${kind}`} role="status" onClick={onDone}><span className="small">{text}</span></div></div>;
}

/* ───────── Вход ───────── */
function Login({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('+7 ');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }); notify('success'); onDone(); }
    catch (x) { notify('error'); setError(errText(x, 'Не удалось войти.')); }
    finally { setBusy(false); }
  };
  return <div className="login">
    <div className="row" style={{ marginBottom: 18 }}><img src="/static/ST.webp" alt="" className="logo" /><div><h3 style={{ lineHeight: 1 }}>StudyTask</h3><p className="muted small">Кабинет ученика</p></div></div>
    <h1>Привет! <span className="hl">Заходи</span> учиться</h1>
    <p className="muted" style={{ margin: '10px 0 18px' }}>Телефон и пароль — те же, что на сайте. Если пароля нет, напиши преподавателю.</p>
    <form onSubmit={submit} className="stack card">
      <label className="field"><span>Номер телефона</span><input className="input" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
      <label className="field"><span>Пароль</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn block gold" disabled={busy || password.length < 1}>{busy ? 'Входим…' : 'Войти'}</button>
    </form>
    <p className="muted small" style={{ marginTop: 14 }}>💡 Проще: отправь боту <b>@studytaskkzbot</b> код ученика (STID) от администратора — и входить больше не придётся.</p>
  </div>;
}

/* ───────── Главная ───────── */
function Home({ portal, now, go, openHw, startTest }: { portal: Portal; now: Date; go: (t: Tab) => void; openHw: (h: Homework) => void; startTest: (t: Test) => void }) {
  const lessons = useMemo(() => portal.lessons.map((l) => ({ ...l, d: offsetOf(l, now) })).sort((a, b) => a.d - b.d || a.hour - b.hour), [portal.lessons, now]);
  const c = clockOf(now);
  const next = lessons[0];
  const live = Boolean(next && next.d === 0 && c.hour * 60 + c.minute >= next.hour * 60 && c.hour * 60 + c.minute < (next.hour + 1) * 60 + 10);
  const tests = (portal.studentTests || []).filter((t) => t.status === 'assigned');
  const hw = (portal.studentHomework || []).filter((h) => !h.attachment);
  const stars = portal.progress?.stars ?? 0;
  const lv = levelFor(portal.progress?.earnedStars ?? earnedStars(portal.progress));
  return <div className="stack">
    <div><p className="muted small">{greeting(now)},</p><h1><span className="hl">{portal.account.firstName}</span>!</h1></div>

    <button type="button" className="card tap" onClick={() => { tap(); go('levels'); }}>
      <div className="row" style={{ gap: 12 }}>
        <img src={levelImage(lv.level)} alt="" width={64} height={64} style={{ borderRadius: 12, flex: 'none' }} />
        <div className="grow"><span className="tiny muted">{lv.rank.name} · уровень {lv.level} из {MAX_LEVEL}</span><div className="hand" style={{ fontSize: 26 }}>{lv.name}</div></div>
        <span className="pill gold"><Star size={15} fill="currentColor" /> {stars}</span>
      </div>
      <div className="xp" style={{ margin: '8px 0 4px' }}><i style={{ width: `${lv.pct}%` }} /></div>
      <p className="tiny muted">{lv.isMax ? 'Максимальный уровень!' : `${lv.into} / ${lv.span} ★ · до уровня ${lv.level + 1} «${lv.nextName}» ещё ${lv.left} ★`}</p>
    </button>

    {next ? <div className="card blue">
      <p className="small" style={{ opacity: .85 }}>{live ? 'Занятие идёт прямо сейчас' : next.d === 0 ? 'Сегодня' : 'Следующее занятие'}</p>
      <h2 style={{ margin: '4px 0 6px' }}>{next.title}</h2>
      <p className="row small" style={{ gap: 6 }}><Clock3 size={16} /> {next.d === 0 ? 'Сегодня' : dateOf(now, next.d)} · {hh(next.hour)}</p>
      {next.lessonDescription && <p className="small muted" style={{ marginTop: 6 }}>{next.lessonDescription}</p>}
      {next.lessonLink && <button className="btn gold block" style={{ marginTop: 12 }} onClick={() => { tap('medium'); openExternal(next.lessonLink!); }}><Play size={18} fill="currentColor" /> {live ? 'Подключиться' : 'Открыть ссылку на занятие'}</button>}
    </div> : <Empty icon={CalendarDays} title="Занятий пока нет" text={portal.account.trialAccount ? 'После пробного урока появится расписание.' : 'Когда преподаватель добавит занятие, оно появится здесь.'} />}

    {(tests.length > 0 || hw.length > 0) && <div className="stack">
      {tests[0] && <button className="card warn tap" onClick={() => startTest(tests[0])}><div className="row"><FileQuestion size={26} /><div className="grow"><h3>Новый тест</h3><p className="small muted">{tests[0].title} · {tests[0].questions.length} {plural(tests[0].questions.length, 'вопрос', 'вопроса', 'вопросов')}</p></div><ArrowRight size={20} /></div></button>}
      {hw[0] && <button className="card tap" onClick={() => openHw(hw[0])}><div className="row"><Paperclip size={26} /><div className="grow"><h3>Домашнее задание</h3><p className="small muted">{hw[0].topic || 'Задание от преподавателя'} — ждёт выполнения</p></div><ArrowRight size={20} /></div></button>}
    </div>}

    {lessons.length > 1 && <>
      <h3 style={{ marginTop: 6 }}>Ближайшие занятия</h3>
      {lessons.slice(1, 4).map((l) => <div key={l.id} className="slot"><span className="time">{pad(l.hour)}:00</span><div className="grow"><p>{l.title}</p><p className="tiny muted">{l.d === 0 ? 'Сегодня' : dateOf(now, l.d)}</p></div>{l.lessonLink && <button className="iconbtn" style={{ width: 40, height: 40 }} aria-label="Открыть занятие" onClick={() => openExternal(l.lessonLink!)}><Play size={16} fill="currentColor" /></button>}</div>)}
      <button className="btn ghost block small" onClick={() => go('plan')}>Всё расписание</button>
    </>}
  </div>;
}

/* ───────── Расписание ───────── */
function Plan({ portal, now }: { portal: Portal; now: Date }) {
  const c = clockOf(now);
  const any = portal.lessons.length > 0;
  return <div>
    <Head kicker="План на неделю" title="Расписание" sub="Время указано по Алматы." />
    {!any ? <Empty icon={CalendarDays} title="Расписание пока пустое" text="Как только появятся занятия, они распределятся по дням недели." /> :
      DAYS.map((name, di) => {
        const list = portal.lessons.filter((l) => l.day === di).sort((a, b) => a.hour - b.hour);
        if (!list.length) return null;
        return <section key={name}>
          <div className="day-title"><h3>{name}</h3>{c.day === di && <span className="pill blue">сегодня</span>}</div>
          <div className="stack">{list.map((l) => {
            const isLive = c.day === di && l.hour === c.hour; const abs = l.attendance === false;
            return <div key={l.id} className={`slot ${isLive ? 'live' : abs ? 'abs' : ''}`}>
              <span className="time">{pad(l.hour)}:00</span>
              <div className="grow"><p>{l.title}{portal.account.role === 'parent' && l.student?.firstName ? ` · ${l.student.firstName}` : ''}</p><p className="tiny muted">{hh(l.hour)}{abs ? ' · не посещено' : isLive ? ' · идёт сейчас' : ''}</p></div>
              {l.lessonLink && <button className="btn small" onClick={() => { tap(); openExternal(l.lessonLink!); }}><Play size={14} fill="currentColor" /></button>}
            </div>;
          })}</div>
        </section>;
      })}
  </div>;
}

/* ───────── Тесты ───────── */
function Tests({ portal, start }: { portal: Portal; start: (t: Test) => void }) {
  const tests = [...(portal.studentTests || [])].sort((a, b) => (a.status === b.status ? 0 : a.status === 'assigned' ? -1 : 1));
  const waiting = tests.filter((t) => t.status === 'assigned').length;
  return <div>
    <Head kicker="Проверка знаний" title="Тесты" sub={waiting ? `${waiting} ${plural(waiting, 'тест ждёт', 'теста ждут', 'тестов ждут')} выполнения` : 'Сначала новые, потом результаты.'} />
    {!tests.length ? <Empty icon={FileQuestion} title="Пока нет тестов" text="После занятия преподаватель может добавить тест — он появится здесь." /> :
      <div className="stack">{tests.map((t) => <div key={t.id} className={`card ${t.status === 'assigned' ? 'warn' : t.status === 'completed' ? 'ok' : 'flat'}`}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          {t.status === 'expired' ? <Lock size={24} /> : t.status === 'completed' ? <CheckCircle2 size={24} /> : <FileQuestion size={24} />}
          <div className="grow"><h3>{t.title}</h3><p className="small muted">{t.studentClass} · {t.questions.length} {plural(t.questions.length, 'вопрос', 'вопроса', 'вопросов')} · ≈{t.durationMinutes} мин</p>
            {t.status === 'assigned' && <p className="small" style={{ marginTop: 4 }}>{t.deadlineAt ? `Сдать до ${timeOf(t.deadlineAt)}` : t.lessonHour !== undefined ? `Открывается в ${pad(t.lessonHour)}:50` : 'Время уточнит преподаватель'}</p>}
            {t.status === 'expired' && <p className="small" style={{ marginTop: 4 }}>Тест закрылся в {timeOf(t.deadlineAt)}</p>}
            {t.status === 'completed' && <p className="small" style={{ marginTop: 4 }}>Результат: <b>{t.score ?? 0} из {t.questions.length}</b></p>}
          </div></div>
        {t.status === 'assigned' && <button className="btn gold block" style={{ marginTop: 12 }} onClick={() => { tap('medium'); start(t); }}>Начать тест <ArrowRight size={18} /></button>}
      </div>)}</div>}
  </div>;
}

function TestRunner({ test, onExit, onDone }: { test: Test; onExit: () => void; onDone: (score: number, total: number) => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => test.questions.map(() => -1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = test.questions.length;
  const q = test.questions[i];
  const confirmExit = useCallback(() => { if (answers.some((a) => a >= 0) && !window.confirm('Выйти из теста? Ответы не сохранятся.')) return; onExit(); }, [answers, onExit]);
  useEffect(() => { tg?.BackButton.show(); tg?.BackButton.onClick(confirmExit); tg?.enableClosingConfirmation?.(); return () => { tg?.BackButton.offClick(confirmExit); tg?.BackButton.hide(); tg?.disableClosingConfirmation?.(); }; }, [confirmExit]);
  const pick = (k: number) => { tap(); setAnswers((a) => a.map((v, idx) => (idx === i ? k : v))); };
  const finish = async () => {
    setBusy(true); setError('');
    try { const r = await api<{ score: number; total: number }>(`/api/student/tests/${test.id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }); notify('success'); onDone(r.score, r.total); }
    catch (x) { notify('error'); setError(errText(x, 'Не удалось отправить ответы.')); setBusy(false); }
  };
  return <div className="stack">
    <div className="row"><button className="iconbtn" onClick={confirmExit} aria-label="Выйти"><X size={20} /></button><div className="grow"><div className="q-progress"><i style={{ width: `${((i + (answers[i] >= 0 ? 1 : 0)) / total) * 100}%` }} /></div></div><span className="hand" style={{ fontSize: 24 }}>{i + 1}/{total}</span></div>
    <p className="tiny muted">{test.title}</p>
    <div className="card" key={i}><h2 style={{ fontSize: 30, lineHeight: 1.1, whiteSpace: 'pre-wrap' }}><MathText text={q.question} /></h2><QuestionFigure figure={q.figure} /></div>
    <div className="stack">{q.choices.map((c, k) => <button key={k} className={`choice ${answers[i] === k ? 'on' : ''}`} onClick={() => pick(k)}><span className="k">{'АБВГДЕ'[k]}</span><span><MathText text={c} /></span></button>)}</div>
    {error && <p className="err" role="alert">{error}</p>}
    <div className="row">
      <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft size={18} /></button>
      {i < total - 1
        ? <button className="btn block gold" disabled={answers[i] < 0} onClick={() => { tap(); setI(i + 1); }}>Дальше <ArrowRight size={18} /></button>
        : <button className="btn block" disabled={busy || answers.some((a) => a < 0)} onClick={() => void finish()}>{busy ? 'Отправляем…' : 'Завершить тест'}</button>}
    </div>
    {i === total - 1 && answers.some((a) => a < 0) && <p className="tiny muted" style={{ textAlign: 'center' }}>Ответь на все вопросы — вернись назад к пропущенным.</p>}
  </div>;
}

/* ───────── Домашние задания ───────── */
function HomeworkList({ portal, open }: { portal: Portal; open: (h: Homework) => void }) {
  const list = [...(portal.studentHomework || [])].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  return <div>
    <Head kicker="Задания от преподавателя" title="Домашка" sub="Открой задание, прочитай и прикрепи решение." />
    {!list.length ? <Empty icon={Paperclip} title="Заданий пока нет" text="Новое задание появится после того, как преподаватель добавит его к занятию." /> :
      <div className="stack">{list.map((h) => <button key={h.id} className="card tap" onClick={() => open(h)}>
        <div className="row between" style={{ alignItems: 'flex-start' }}><span className="tiny muted">{h.date} · {h.time}</span><span className={`pill ${h.attachment ? 'green' : 'gold'}`}>{h.attachment ? 'файл отправлен' : 'ждёт решения'}</span></div>
        <h3 style={{ marginTop: 6 }}>{h.topic || 'Домашнее задание'}</h3>
        {h.nextHomework && <p className="small muted" style={{ marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{h.nextHomework}</p>}
      </button>)}</div>}
  </div>;
}

function HomeworkSheet({ hw, onClose, onSaved, say }: { hw: Homework; onClose: () => void; onSaved: () => Promise<void>; say: (t: string, k: 'ok' | 'bad') => void }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; image: boolean } | null>(null);
  const [pickedName, setPickedName] = useState('');
  const [sent, setSent] = useState(hw.attachment || null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true); setPickedName(file.name);
    try {
      const payload = await prepareFile(file);
      await api(`/api/student/homework/${hw.id}/attachment`, { method: 'POST', body: JSON.stringify(payload) });
      setSent({ filename: payload.filename, mimeType: payload.mimeType }); notify('success'); say('Решение отправлено преподавателю!', 'ok'); await onSaved();
    } catch (x) { notify('error'); say(errText(x, 'Не удалось отправить файл.'), 'bad'); }
    finally { setBusy(false); }
  };
  const view = async () => {
    try {
      const res = await fetch(`/api/student/homework/${hw.id}/attachment`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Не удалось открыть файл.');
      const blob = await res.blob();
      setPreview({ url: URL.createObjectURL(blob), image: blob.type.startsWith('image/') });
    } catch (x) { say(errText(x, 'Не удалось открыть файл.'), 'bad'); }
  };
  return <Sheet onClose={onClose}>
    <div className="row between" style={{ alignItems: 'flex-start' }}><div><p className="tiny muted">Занятие · {hw.date} {hw.time}</p><h2 style={{ fontSize: 30 }}>{hw.topic || 'Домашнее задание'}</h2></div><button className="iconbtn" onClick={onClose} aria-label="Закрыть"><X size={20} /></button></div>
    <div className="hw-text" style={{ margin: '12px 0' }}>{hw.nextHomework || 'Текст задания не указан.'}</div>
    {sent && <div className="card ok" style={{ marginBottom: 12 }}><div className="row"><CheckCircle2 size={22} /><div className="grow"><p className="small">Отправлено: <b>{sent.filename}</b></p></div><button className="btn small ghost" onClick={() => void view()}>Смотреть</button></div>
      {preview && (preview.image ? <img src={preview.url} alt="Мой файл" className="preview" style={{ marginTop: 10 }} /> : <a className="btn small ghost block" style={{ marginTop: 10 }} href={preview.url} download={sent.filename}>Скачать PDF</a>)}</div>}
    <label className="btn gold block" style={{ cursor: 'pointer', opacity: busy ? .6 : 1 }}>
      <Camera size={20} /> {busy ? 'Отправляем…' : sent ? 'Заменить решение' : 'Прикрепить решение'}
      <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} disabled={busy} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
    </label>
    <p className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>Сфотографируй тетрадь или выбери PDF. Фото сожмём сами. {pickedName && busy ? `(${pickedName})` : ''}</p>
  </Sheet>;
}

/* ───────── Уровни ───────── */
function Levels({ portal, refresh, say }: { portal: Portal; refresh: () => Promise<void>; say: (t: string, k: 'ok' | 'bad') => void }) {
  const lv = levelFor(portal.progress?.earnedStars ?? earnedStars(portal.progress));
  const [sel, setSel] = useState(lv.level);
  const n = sel, reached = n <= lv.level, rank = rankOf(n);
  return <div>
    <Head kicker="Твой путь" title="Уровни" sub="Звёзды за тесты и домашки поднимают тебя от Земли до Вселенной. Потраченные на призы звёзды уровень не снижают." />
    <div className="stack">
      <div className="card" style={{ textAlign: 'center' }}>
        <img src={levelImage(lv.level)} alt={lv.name} width={150} height={150} style={{ borderRadius: 18, margin: '0 auto' }} />
        <p className="tiny muted" style={{ marginTop: 6 }}>{lv.rank.name} · уровень {lv.level} из {MAX_LEVEL}</p>
        <div className="hand" style={{ fontSize: 34 }}>{lv.name}</div>
        <div className="xp" style={{ margin: '10px 0 4px' }}><i style={{ width: `${lv.pct}%` }} /></div>
        <p className="tiny muted">{lv.isMax ? 'Ты на вершине — Легенда StudyTask!' : `${lv.into} / ${lv.span} ★ · до уровня ${lv.level + 1} «${lv.nextName}» ещё ${lv.left} ★`}</p>
        <p className="tiny muted">Всего заработано: {lv.earned} ★</p>
      </div>
      <div className={`card flat row ${reached ? '' : 'muted'}`} style={{ gap: 12 }}>
        <img src={levelImage(n)} alt="" width={56} height={56} style={{ borderRadius: 10, flex: 'none', filter: reached ? 'none' : 'grayscale(1)', opacity: reached ? 1 : .6 }} />
        <div className="grow"><span className="tiny muted">{rank.name} · уровень {n}{isMilestone(n) ? ' · веха' : ''}</span><div className="hand" style={{ fontSize: 24 }}>{LEVEL_NAMES[n - 1]}</div></div>
        <span className={`pill ${reached ? 'green' : 'gray'}`}>{reached ? 'Открыт' : `${LEVEL_STARS[n - 1]} ★`}</span>
      </div>
      {RANKS.map((r, ri) => {
        const to = ri + 1 < RANKS.length ? RANKS[ri + 1].from - 1 : MAX_LEVEL;
        const ids = Array.from({ length: to - r.from + 1 }, (_, i) => r.from + i);
        return <div key={r.id}>
          <p className="small" style={{ margin: '4px 2px 6px', color: r.color }}><b>{r.name}</b> <span className="muted tiny">· уровни {r.from}–{to}</span></p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {ids.map((i) => {
              const ok = i <= lv.level;
              return <button key={i} type="button" aria-label={`Уровень ${i}: ${LEVEL_NAMES[i - 1]}`} onClick={() => { tap(); setSel(i); }}
                style={{ padding: 0, border: 'none', background: 'none', position: 'relative', borderRadius: 12, outline: i === lv.level ? '3px solid var(--ink)' : i === sel ? '2px dashed var(--navy)' : 'none', outlineOffset: 2 }}>
                <img src={levelImage(i)} alt="" loading="lazy" style={{ width: '100%', display: 'block', borderRadius: 10, filter: ok ? 'none' : 'grayscale(1)', opacity: ok ? 1 : .38 }} />
                {!ok && <Lock size={14} style={{ position: 'absolute', right: 4, bottom: 4, color: 'var(--navy)' }} />}
              </button>;
            })}
          </div>
        </div>;
      })}
      <div style={{ height: 2, background: 'var(--line)', margin: '10px 0 0' }} />
      <Prizes portal={portal} refresh={refresh} say={say} />
    </div>
  </div>;
}

/* ───────── Призы ───────── */
function Prizes({ portal, refresh, say }: { portal: Portal; refresh: () => Promise<void>; say: (t: string, k: 'ok' | 'bad') => void }) {
  const stars = portal.progress?.stars ?? 0;
  const locked = Boolean(portal.account.trialAccount);
  const [busy, setBusy] = useState(false);
  const buy = async () => {
    if (!window.confirm(`Оформить полный набор за ${KIT_COST} звёзд?`)) return;
    setBusy(true);
    try { await api('/api/student/prize-kit', { method: 'POST', body: JSON.stringify({ itemIds: KIT.map((i) => i.id) }) }); notify('success'); say(`Набор оформлен! Списано ${KIT_COST} звёзд.`, 'ok'); await refresh(); }
    catch (x) { notify('error'); say(errText(x, 'Не удалось оформить набор.'), 'bad'); }
    finally { setBusy(false); }
  };
  const enough = stars >= KIT_COST;
  return <div>
    <Head kicker="Магазин наград" title="Призы" sub="Призы выдаются только полным комплектом." />
    <div className={locked ? 'locked' : ''}>
      {locked && <div className="veil"><div><Lock size={34} /><h3>Призы пока закрыты</h3><p className="small muted" style={{ marginTop: 4 }}>Они откроются, когда ты запишешься на занятия после пробного урока.</p></div></div>}
      <div className="stack" aria-hidden={locked || undefined}>
        <div className="card"><div className="row between"><span>Твои звёзды</span><span className="pill gold"><Star size={15} fill="currentColor" /> {stars}</span></div>
          <div className="xp" style={{ margin: '8px 0 4px' }}><i style={{ width: `${Math.min(100, stars / KIT_COST * 100)}%` }} /></div>
          <p className="tiny muted">{enough ? 'Звёзд хватает на полный набор!' : `Для набора нужно ${KIT_COST}, не хватает ${KIT_COST - stars}.`}</p></div>
        <div className="gifts">{KIT.map((g) => <div key={g.id} className="gift"><div className="pic"><img src={g.img} alt={g.name} loading="lazy" /></div><p className="small" style={{ margin: '6px 0 2px' }}>{g.name}</p><span className="pill gold"><Star size={13} fill="currentColor" /> {g.stars}</span></div>)}</div>
        <div className="card flat row between"><span>Полный набор</span><b className="hand" style={{ fontSize: 28 }}>{KIT_COST} <Star size={18} fill="currentColor" style={{ verticalAlign: -2 }} /></b></div>
        <button className="btn block" disabled={locked || !enough || busy} onClick={() => void buy()}><Gift size={20} /> {busy ? 'Оформляем…' : 'Получить набор'}</button>
      </div>
    </div>
  </div>;
}

/* ───────── Игры и рейтинг ───────── */
type Row = { rank: number; name: string; value: number; me: boolean };
type Ranking = { top: Row[]; me: { rank: number; value: number } | null };
const NO_RANK: Ranking = { top: [], me: null };
type SkyData = { stars: number; bestScore: number; bestStars: number; byStars: Ranking; byScore: Ranking };
type SprintData = { stats: { bestScore: number; bestStars: number }; byStars: Ranking; byScore: Ranking };
type StRating = { stars: number; top: Row[]; me: { rank: number; value: number } | null };
type Sub = 'play' | 'stars' | 'score';

function RankList({ rows, me, unit }: { rows: Row[]; me: { rank: number; value: number } | null; unit: ReactNode }) {
  if (!rows.length) return <Empty icon={Trophy} title="Пока пусто" text="Стань первым в рейтинге!" />;
  const medal = (n: number) => (n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : n);
  const line = (r: Row, k: string) => <div key={k} className={`rank ${r.rank <= 3 ? 'top3' : ''}`} style={r.me ? { outline: '2px solid var(--ink, #1649E8)' } : undefined}>
    <span className="n">{medal(r.rank)}</span><span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.me ? ' (ты)' : ''}</span><b>{r.value} {unit}</b></div>;
  return <>{rows.map((r, i) => line(r, `${r.rank}-${i}`))}
    {me && !rows.some((r) => r.me) && <><p className="tiny muted" style={{ textAlign: 'center' }}>⋯</p>{line({ rank: me.rank, name: 'Ты', value: me.value, me: true }, 'me')}</>}</>;
}

function SubTabs({ sub, setSub, onRefresh }: { sub: Sub; setSub: (s: Sub) => void; onRefresh: () => void }) {
  return <div className="row" style={{ gap: 8 }}>
    <div className="seg grow"><button className={sub === 'play' ? 'on' : ''} onClick={() => { tap(); setSub('play'); }}>Играть</button><button className={sub === 'stars' ? 'on' : ''} onClick={() => { tap(); setSub('stars'); onRefresh(); }}>По звёздам</button><button className={sub === 'score' ? 'on' : ''} onClick={() => { tap(); setSub('score'); onRefresh(); }}>По очкам</button></div>
  </div>;
}

function GameIntro({ title, text, record, onPlay }: { title: string; text: string; record: string; onPlay: () => void }) {
  return <div className="card stack" style={{ textAlign: 'center' }}><h3>{title}</h3><p className="small muted">{text}</p><p className="small"><b>{record}</b></p><button className="btn gold block" onClick={() => { tap('medium'); onPlay(); }}>Играть</button></div>;
}

function SkyQuest() {
  const [section, setSection] = useState<'sky' | 'sprint' | 'rating'>('sky');
  const [skySub, setSkySub] = useState<Sub>('play');
  const [sprintSub, setSprintSub] = useState<Sub>('play');
  const [skyOpen, setSkyOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [sky, setSky] = useState<SkyData>({ stars: 0, bestScore: 0, bestStars: 0, byStars: NO_RANK, byScore: NO_RANK });
  const [sprint, setSprint] = useState<SprintData>({ stats: { bestScore: 0, bestStars: 0 }, byStars: NO_RANK, byScore: NO_RANK });
  const [st, setSt] = useState<StRating>({ stars: 0, top: [], me: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadSky = useCallback(async () => {
    try { const r = await api<SkyData>('/api/student/skyquest'); setSky({ stars: Number(r.stars) || 0, bestScore: Number(r.bestScore) || 0, bestStars: Number(r.bestStars) || 0, byStars: r.byStars || NO_RANK, byScore: r.byScore || NO_RANK }); setError(''); }
    catch (x) { setError(errText(x, 'Не удалось загрузить Sky Quest.')); }
  }, []);
  const loadSprint = useCallback(async () => {
    try { const r = await api<SprintData>('/api/games/school-sprint/leaderboard'); setSprint({ stats: { bestScore: Number(r.stats?.bestScore) || 0, bestStars: Number(r.stats?.bestStars) || 0 }, byStars: r.byStars || NO_RANK, byScore: r.byScore || NO_RANK }); }
    catch { /* игра покажет ошибку сама */ }
  }, []);
  const loadRating = useCallback(async () => {
    try { const r = await api<StRating>('/api/student/rating'); setSt({ stars: Number(r.stars) || 0, top: r.top || [], me: r.me || null }); }
    catch (x) { setError(errText(x, 'Не удалось загрузить рейтинг.')); }
  }, []);
  useEffect(() => { void Promise.all([loadSky(), loadSprint(), loadRating()]).finally(() => setLoading(false)); }, [loadSky, loadSprint, loadRating]);
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const d = ev.data;
      if (d?.type === 'SKYQUEST_BALANCE_CHANGED') void loadSky();
      if (d?.type === 'SKYQUEST_CLOSE') { setSkyOpen(false); setSkySub('play'); void loadSky(); }
      if (d?.type === 'SPRINT_CLOSE') { setSprintOpen(false); setSprintSub('play'); void loadSprint(); }
      if (d?.type === 'FLAPPY_GAME_OVER') {
        const score = Number(d.score);
        if (!Number.isSafeInteger(score) || score < 0) return;
        api('/api/student/skyquest/score', { method: 'POST', body: JSON.stringify({ score, stars: Number(d.sessionCoins) || 0, runToken: typeof d.runToken === 'string' ? d.runToken : '' }) }).then(() => loadSky()).catch(() => {});
      }
    };
    window.addEventListener('message', onMsg); return () => window.removeEventListener('message', onMsg);
  }, [loadSky, loadSprint]);
  const star = <Star size={14} fill="currentColor" style={{ verticalAlign: -2 }} />;
  const list = (r: Ranking, unit: ReactNode, hint: string) => <div className="stack"><p className="small muted">{hint}</p>{loading ? <div className="spin" /> : <RankList rows={r.top} me={r.me} unit={unit} />}</div>;
  return <div className="stack">
    <div className="row between"><Head kicker="Игры и рейтинг" title="Играть" /><span className="pill gold" style={{ alignSelf: 'flex-start', marginTop: 6 }}><Star size={14} fill="currentColor" /> {loading ? '…' : sky.stars}</span></div>
    <div className="seg"><button className={section === 'sky' ? 'on' : ''} onClick={() => setSection('sky')}>Sky Quest</button><button className={section === 'sprint' ? 'on' : ''} onClick={() => { setSection('sprint'); void loadSprint(); }}>School Sprint</button><button className={section === 'rating' ? 'on' : ''} onClick={() => { setSection('rating'); void loadRating(); }}>Рейтинг</button></div>
    {error && <p className="err" role="alert">{error}</p>}
    {section === 'sky' && <>
      <SubTabs sub={skySub} setSub={(s) => { setSkySub(s); if (s !== 'play') setSkyOpen(false); }} onRefresh={() => void loadSky()} />
      {skySub === 'play' && (skyOpen
        ? <iframe className="game game-full" src="/flappy/index.html?autostart=1" title="Sky Quest" allow="autoplay" />
        : <GameIntro title="Sky Quest" text="Веди ракету между колоннами: касание — взлёт. Собирай звёзды — они копятся на твоём счёте — и побивай рекорды." record={`Рекорд: ${sky.bestScore} очков · ${sky.bestStars} звёзд за заход`} onPlay={() => setSkyOpen(true)} />)}
      {skySub === 'stars' && list(sky.byStars, star, 'Рекорд по звёздам, собранным за один заход.')}
      {skySub === 'score' && list(sky.byScore, 'очк.', 'Рекорд по очкам за один заход.')}
    </>}
    {section === 'sprint' && <>
      <SubTabs sub={sprintSub} setSub={(s) => { setSprintSub(s); if (s !== 'play') setSprintOpen(false); }} onRefresh={() => void loadSprint()} />
      {sprintSub === 'play' && (sprintOpen
        ? <iframe className="game game-full" src="/school-sprint/index.html" title="Школьный спринт" allow="autoplay" />
        : <GameIntro title="Школьный спринт" text="Беги по коридору как можно дольше: свайпы меняют дорожки, вверх — прыжок, вниз — кувырок. Собирай звёзды и побивай рекорд." record={`Рекорд: ${sprint.stats.bestScore} очков · ${sprint.stats.bestStars} звёзд за забег`} onPlay={() => setSprintOpen(true)} />)}
      {sprintSub === 'stars' && list(sprint.byStars, star, 'Рекорд по звёздам, собранным за один забег.')}
      {sprintSub === 'score' && list(sprint.byScore, 'очк.', 'Рекорд по очкам за один забег.')}
    </>}
    {section === 'rating' && <div className="stack">
      <div className="row between"><div><h3>Звёзды ST</h3><p className="small muted">За квизы и домашние задания. Твои: <b>{st.stars}</b></p></div><button className="iconbtn" style={{ width: 40, height: 40 }} aria-label="Обновить" onClick={() => void loadRating()}><RefreshCw size={16} /></button></div>
      {loading ? <div className="spin" /> : <RankList rows={st.top} me={st.me} unit={star} />}
    </div>}
  </div>;
}

/* ───────── Кабинет родителя ───────── */
function ChildPick({ kids, value, onChange }: { kids: Child[]; value: string; onChange: (id: string) => void }) {
  if (kids.length < 2) return null;
  return <div className="seg" style={{ marginBottom: 12 }}>{kids.map((k) => <button key={k.id} className={value === k.id ? 'on' : ''} onClick={() => { tap(); onChange(k.id); }}>{k.firstName}</button>)}</div>;
}

function ParentKids({ portal, now, go }: { portal: Portal; now: Date; go: (t: PTab) => void }) {
  const kids = portal.relatedAccounts || [];
  return <div className="stack">
    <div><p className="muted small">{greeting(now)},</p><h1><span className="hl">{portal.account.firstName}</span>!</h1></div>
    {!kids.length ? <Empty icon={BookOpen} title="Ученик пока не привязан" text="Когда администратор свяжет аккаунт с ребёнком, он появится здесь." /> :
      kids.map((k) => {
        const lessons = portal.lessons.filter((l) => l.studentId === k.id).map((l) => ({ ...l, d: offsetOf(l, now) })).sort((a, b) => a.d - b.d || a.hour - b.hour);
        const next = lessons[0];
        return <div key={k.id} className="card stack">
          <div className="row between"><div><h2 style={{ marginBottom: 2 }}>{k.firstName} {k.lastName}</h2><p className="small muted">{k.studentClass || 'Класс не указан'}{k.teacher ? ` · преподаватель: ${k.teacher.firstName} ${k.teacher.lastName}` : ''}</p></div>
            <span className="pill gold"><Star size={15} fill="currentColor" /> {k.progress?.stars ?? 0}</span></div>
          {next ? <div className="slot"><span className="time">{pad(next.hour)}:00</span><div className="grow"><p>{next.title}</p><p className="tiny muted">{next.d === 0 ? 'Сегодня' : dateOf(now, next.d)} · {hh(next.hour)}</p></div></div>
            : <p className="small muted">Занятий в расписании пока нет.</p>}
          <div className="row" style={{ gap: 8 }}><button className="btn ghost small grow" onClick={() => go('hist')}>История уроков</button><button className="btn ghost small grow" onClick={() => go('prizes')}>Призы</button></div>
        </div>;
      })}
  </div>;
}

function ParentHistory({ portal }: { portal: Portal }) {
  const kids = portal.relatedAccounts || [];
  const [kid, setKid] = useState(kids[0]?.id || '');
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!kid) return;
    setItems(null); setError('');
    api<{ history: HistoryEntry[] }>(`/api/parent/students/${kid}/lesson-history`).then((r) => setItems([...(r.history || [])].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)))).catch((x) => setError(errText(x, 'Не удалось загрузить историю.')));
  }, [kid]);
  const fmt = (d: string) => { const t = new Date(`${d}T00:00:00+05:00`); return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('ru-KZ', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long' }); };
  return <div>
    <Head kicker="Что проходили" title="История уроков" sub="Темы, оценки и домашние задания." />
    <ChildPick kids={kids} value={kid} onChange={setKid} />
    {error ? <p className="err" role="alert">{error}</p> : items === null ? <div className="spin" /> : !items.length ? <Empty icon={BookOpen} title="Записей пока нет" text="После занятий преподаватель добавит тему, оценки и домашку." /> :
      <div className="stack">{items.map((e) => <div key={e.id} className={`card ${e.attendance === false ? 'bad' : 'flat'}`}>
        <div className="row between"><h3>{e.topic || 'Занятие'}</h3><span className="tiny muted">{fmt(e.date)} · {e.time}</span></div>
        {e.attendance === false && <p className="small" style={{ marginTop: 4 }}>Не посетил(а){e.attendanceReason ? ` — ${e.attendanceReason}` : ''}</p>}
        {(e.homeworkGrade || e.testGrade) && <p className="small muted" style={{ marginTop: 4 }}>{e.homeworkGrade ? `Домашка: ${e.homeworkGrade}` : ''}{e.homeworkGrade && e.testGrade ? ' · ' : ''}{e.testGrade ? `Тест: ${e.testGrade}` : ''}</p>}
        {e.nextHomework && <p className="small" style={{ marginTop: 6 }}><Paperclip size={14} style={{ verticalAlign: -2 }} /> {e.nextHomework}{e.attachment ? ' · файл сдан' : ''}</p>}
      </div>)}</div>}
  </div>;
}

function ParentPrizes({ portal, refresh, say }: { portal: Portal; refresh: () => Promise<void>; say: (t: string, k: 'ok' | 'bad') => void }) {
  const kids = portal.relatedAccounts || [];
  const [kid, setKid] = useState(kids[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const child = kids.find((k) => k.id === kid) || kids[0];
  const stars = child?.progress?.stars ?? 0;
  const enough = stars >= KIT_COST;
  const buy = async () => {
    if (!child || !window.confirm(`Оформить полный набор для ${child.firstName} за ${KIT_COST} звёзд?`)) return;
    setBusy(true);
    try { await api(`/api/parent/students/${child.id}/prize-kit`, { method: 'POST', body: JSON.stringify({ itemIds: KIT.map((i) => i.id) }) }); notify('success'); say(`Набор оформлен! Списано ${KIT_COST} звёзд.`, 'ok'); await refresh(); }
    catch (x) { notify('error'); say(errText(x, 'Не удалось оформить набор.'), 'bad'); }
    finally { setBusy(false); }
  };
  if (!child) return <div><Head kicker="Магазин наград" title="Призы" /><Empty icon={Gift} title="Ученик не привязан" text="Призы появятся, когда аккаунт будет связан с ребёнком." /></div>;
  return <div>
    <Head kicker="Магазин наград" title="Призы" sub="Призы выдаются только полным комплектом." />
    <ChildPick kids={kids} value={child.id} onChange={setKid} />
    <div className="stack">
      <div className="card"><div className="row between"><span>Звёзды: {child.firstName}</span><span className="pill gold"><Star size={15} fill="currentColor" /> {stars}</span></div>
        <div className="xp" style={{ margin: '8px 0 4px' }}><i style={{ width: `${Math.min(100, stars / KIT_COST * 100)}%` }} /></div>
        <p className="tiny muted">{enough ? 'Звёзд хватает на полный набор!' : `Для набора нужно ${KIT_COST}, не хватает ${KIT_COST - stars}.`}</p></div>
      <div className="gifts">{KIT.map((g) => <div key={g.id} className="gift"><div className="pic"><img src={g.img} alt={g.name} loading="lazy" /></div><p className="small" style={{ margin: '6px 0 2px' }}>{g.name}</p><span className="pill gold"><Star size={13} fill="currentColor" /> {g.stars}</span></div>)}</div>
      <div className="card flat row between"><span>Полный набор</span><b className="hand" style={{ fontSize: 28 }}>{KIT_COST} <Star size={18} fill="currentColor" style={{ verticalAlign: -2 }} /></b></div>
      <button className="btn block" disabled={!enough || busy} onClick={() => void buy()}><Gift size={20} /> {busy ? 'Оформляем…' : 'Оформить набор'}</button>
    </div>
  </div>;
}

function ParentShell({ portal, now, reload, say, onLogout }: { portal: Portal; now: Date; reload: (quiet?: boolean) => Promise<void>; say: (t: string, k: 'ok' | 'bad') => void; onLogout: () => void }) {
  const [tab, setTab] = useState<PTab>('kids');
  const [showMsg, setShowMsg] = useState(false);
  const [showSet, setShowSet] = useState(false);
  const [msgs, setMsgs] = useState(portal.messages);
  useEffect(() => setMsgs(portal.messages), [portal.messages]);
  const unread = msgs.filter((m) => !m.read).length;
  const NAV: { id: PTab; label: string; icon: typeof BookOpen }[] = [
    { id: 'kids', label: 'Дети', icon: BookOpen }, { id: 'plan', label: 'План', icon: Clock3 },
    { id: 'hist', label: 'Уроки', icon: Paperclip }, { id: 'prizes', label: 'Призы', icon: Gift },
  ];
  const view = { ...portal, messages: msgs };
  return <>
    <div className="app">
      <header className="top">
        <img src="/static/ST.webp" alt="StudyTask" className="logo" />
        <div className="grow"><h3 style={{ lineHeight: 1 }}>StudyTask</h3><p className="tiny muted">Кабинет родителя</p></div>
        <button className="iconbtn" aria-label="Сообщения" onClick={() => { tap(); setShowMsg(true); }}><MessageCircle size={21} />{unread > 0 && <span className="dot">{unread}</span>}</button>
        <button className="iconbtn" aria-label="Настройки" onClick={() => { tap(); setShowSet(true); }}><Settings size={21} /></button>
      </header>
      <main key={tab}>
        {tab === 'kids' && <ParentKids portal={view} now={now} go={setTab} />}
        {tab === 'plan' && <Plan portal={view} now={now} />}
        {tab === 'hist' && <ParentHistory portal={view} />}
        {tab === 'prizes' && <ParentPrizes portal={view} refresh={() => reload(true)} say={say} />}
      </main>
    </div>
    <nav className="nav" aria-label="Разделы"><div className="nav-in">{NAV.map(({ id, label, icon: Icon }) =>
      <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => { tap(); setTab(id); window.scrollTo({ top: 0 }); }}><Icon size={21} /><span>{label}</span></button>)}</div></nav>
    {showMsg && <Messages portal={view} onClose={() => setShowMsg(false)} onRead={(id) => setMsgs((m) => m.map((x) => x.id === id ? { ...x, read: true } : x))} />}
    {showSet && <SettingsSheet portal={view} onClose={() => setShowSet(false)} onLogout={() => { setShowSet(false); onLogout(); }} />}
  </>;
}

/* ───────── Сообщения и настройки ───────── */
function Messages({ portal, onClose, onRead }: { portal: Portal; onClose: () => void; onRead: (id: string) => void }) {
  const [busy, setBusy] = useState('');
  const mark = async (m: Message) => { setBusy(m.id); try { await api(`/api/auth/messages/${m.id}/read`, { method: 'POST' }); onRead(m.id); } catch { /* ignore */ } finally { setBusy(''); } };
  const unread = portal.messages.filter((m) => !m.read).length;
  return <Sheet onClose={onClose}>
    <div className="row between"><div><h2>Сообщения</h2><p className="small muted">{unread ? `${unread} непрочитанных` : 'Всё прочитано'}</p></div><button className="iconbtn" onClick={onClose} aria-label="Закрыть"><X size={20} /></button></div>
    <div className="stack" style={{ marginTop: 12 }}>{portal.messages.length ? portal.messages.map((m) => <div key={m.id} className={`card ${m.read ? 'flat' : 'warn'}`}>
      <p className="tiny muted">{m.sender} · {new Date(m.at).toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{m.body}</p>
      {!m.read && <button className="btn small ghost" style={{ marginTop: 10 }} disabled={busy === m.id} onClick={() => void mark(m)}><Check size={16} /> Прочитано</button>}
    </div>) : <Empty icon={MessageCircle} title="Сообщений нет" text="Здесь появятся сообщения от преподавателя." />}</div>
  </Sheet>;
}

function SettingsSheet({ portal, onClose, onLogout }: { portal: Portal; onClose: () => void; onLogout: () => void }) {
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false); const [note, setNote] = useState<{ t: string; ok: boolean } | null>(null);
  const [creds, setCreds] = useState<{ login: string; password: string | null } | null>(null);
  const [show, setShow] = useState(false); const [opening, setOpening] = useState(false);
  useEffect(() => { api<{ login: string; password: string | null }>('/api/auth/credentials').then(setCreds).catch(() => {}); }, []);
  const change = async (e: FormEvent) => {
    e.preventDefault(); setNote(null);
    if (pw !== pw2) { setNote({ t: 'Новые пароли не совпадают.', ok: false }); return; }
    setBusy(true);
    try {
      await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: cur, newPassword: pw }) });
      setCreds((c) => ({ login: c?.login || '', password: pw })); setShow(true);
      setCur(''); setPw(''); setPw2(''); notify('success'); setNote({ t: 'Пароль изменён.', ok: true });
    } catch (x) { notify('error'); setNote({ t: errText(x, 'Не удалось сменить пароль.'), ok: false }); }
    finally { setBusy(false); }
  };
  const openSite = async () => {
    setOpening(true);
    try { const r = await api<{ url: string }>('/api/auth/web-link', { method: 'POST' }); openExternal(r.url); }
    catch { openExternal(`${location.origin}/${portal.account.role === 'parent' ? 'parent' : 'student'}`); }
    finally { setOpening(false); }
  };
  const copy = (text: string) => { try { void navigator.clipboard?.writeText(text); notify('success'); } catch { /* ignore */ } };
  return <Sheet onClose={onClose}>
    <div className="row between"><h2>Настройки</h2><button className="iconbtn" onClick={onClose} aria-label="Закрыть"><X size={20} /></button></div>
    <div className="card flat" style={{ margin: '12px 0' }}><p><b>{portal.account.firstName} {portal.account.lastName}</b></p><p className="small muted">{portal.account.studentClass || 'Класс не указан'}{portal.account.teacher ? ` · преподаватель: ${portal.account.teacher.firstName} ${portal.account.teacher.lastName}` : ''}</p></div>
    <div className="card stack">
      <h3>Данные для входа</h3>
      <div className="row between"><span className="small muted">Логин (телефон)</span><button className="btn small ghost" onClick={() => creds && copy(creds.login)}><b>{creds?.login || '…'}</b></button></div>
      <div className="row between"><span className="small muted">Пароль</span>{creds?.password
        ? <span className="row" style={{ gap: 6 }}><button className="btn small ghost" onClick={() => copy(creds.password!)}><b>{show ? creds.password : '••••••••'}</b></button><button className="btn small ghost" onClick={() => setShow((v) => !v)}>{show ? 'Скрыть' : 'Показать'}</button></span>
        : <span className="small muted">{creds ? 'появится после входа по паролю или смены' : '…'}</span>}</div>
    </div>
    <form onSubmit={change} className="stack card">
      <h3>Сменить пароль</h3>
      <label className="field"><span>Текущий пароль</span><input className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></label>
      <label className="field"><span>Новый пароль</span><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} /></label>
      <label className="field"><span>Повтори новый пароль</span><input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} /></label>
      {note && <p className={note.ok ? 'small' : 'err'} role="status" style={note.ok ? { color: 'var(--green)' } : undefined}>{note.t}</p>}
      <button className="btn block" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить пароль'}</button>
    </form>
    <div className="stack" style={{ marginTop: 14 }}>
      <button className="btn ghost block" disabled={opening} onClick={() => void openSite()}>{opening ? 'Открываем…' : 'Открыть полную версию на сайте'}</button>
      <button className="btn red block" onClick={onLogout}><LogOut size={18} /> Выйти</button>
    </div>
  </Sheet>;
}

/* ───────── Корень ───────── */
let tgAuthDone = false;
export default function TgApp() {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [state, setState] = useState<'loading' | 'login' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [now, setNow] = useState(() => new Date());
  const [testRun, setTestRun] = useState<Test | null>(null);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [hw, setHw] = useState<Homework | null>(null);
  const [showMsg, setShowMsg] = useState(false);
  const [showSet, setShowSet] = useState(false);
  const [toast, setToast] = useState<{ t: string; k: 'ok' | 'bad' } | null>(null);
  const say = useCallback((t: string, k: 'ok' | 'bad') => setToast({ t, k }), []);

  useEffect(() => {
    try { tg?.ready(); tg?.expand(); tg?.disableVerticalSwipes?.(); tg?.setHeaderColor?.('#FBFCFE'); tg?.setBackgroundColor?.('#FBFCFE'); } catch { /* вне Telegram */ }
    const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t);
  }, []);

  // Вход по подписи Telegram: если Telegram привязан к ученику (код STID), пароль не нужен.
  const tgAuth = useCallback(async () => {
    if (!tg?.initData) return false;
    try { await api('/api/tg/auth', { method: 'POST', body: JSON.stringify({ initData: tg.initData }) }); return true; } catch { return false; }
  }, []);
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState('loading');
    try {
      if (!quiet && !tgAuthDone) { tgAuthDone = true; await tgAuth(); }
      let p: Portal;
      try { p = await api<Portal>('/api/auth/portal'); }
      catch (first) {
        const fe = first as Error & { status?: number };
        if (fe.status === 401 && await tgAuth()) p = await api<Portal>('/api/auth/portal'); else throw first;
      }
      if (p.account.role !== 'student' && p.account.role !== 'parent') { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setState('login'); return; }
      setPortal(p); setState('ready');
    } catch (x) {
      const e = x as Error & { status?: number };
      if (e.status === 401 || e.status === 403) setState('login');
      else if (quiet) say(errText(x, 'Не удалось обновить данные.'), 'bad');
      else { setError(errText(x, 'Не удалось загрузить кабинет.')); setState('error'); }
    }
  }, [say, tgAuth]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const f = () => { if (document.visibilityState === 'visible' && state === 'ready') void load(true); }; document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f); }, [load, state]);

  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setShowSet(false); setPortal(null); setTab('home'); setState('login'); };
  const markRead = (id: string) => setPortal((p) => p ? { ...p, messages: p.messages.map((m) => m.id === id ? { ...m, read: true } : m) } : p);

  if (state === 'loading') return <div className="app"><div className="spin" /></div>;
  if (state === 'login') return <Login onDone={() => void load()} />;
  if (state === 'error' || !portal) return <div className="app"><div className="card bad stack" style={{ marginTop: 40 }}><h3>Ой…</h3><p>{error}</p><button className="btn block" onClick={() => void load()}>Повторить</button></div></div>;

  if (portal.account.role === 'parent') return <>
    <ParentShell portal={portal} now={now} reload={load} say={say} onLogout={() => void logout()} />
    {toast && <Toast text={toast.t} kind={toast.k} onDone={() => setToast(null)} />}
  </>;

  if (result) return <div className="app"><div className="login" style={{ minHeight: '80dvh', textAlign: 'center' }}>
    <div className="card ok pop"><Sparkles size={40} /><h1 style={{ marginTop: 6 }}>Тест завершён!</h1>
      <p className="hand" style={{ fontSize: 56, margin: '8px 0' }}>{result.score} <span className="muted">из {result.total}</span></p>
      <p className="small muted">{result.score === result.total ? 'Отлично, без единой ошибки!' : result.score >= result.total / 2 ? 'Хороший результат, так держать!' : 'Не расстраивайся — разберите ошибки на следующем занятии.'}</p>
      <button className="btn gold block" style={{ marginTop: 16 }} onClick={() => { setResult(null); setTab('tests'); }}>Готово</button></div></div></div>;

  if (testRun) return <div className="app"><TestRunner test={testRun} onExit={() => setTestRun(null)} onDone={(score, total) => { setTestRun(null); setResult({ score, total }); void load(true); }} /></div>;

  const stars = portal.progress?.stars ?? 0;
  const unread = portal.messages.filter((m) => !m.read).length;
  const pendingTests = (portal.studentTests || []).filter((t) => t.status === 'assigned').length;
  const pendingHw = (portal.studentHomework || []).filter((h) => !h.attachment).length;
  const NAV: { id: Tab; label: string; icon: typeof BookOpen; badge?: number }[] = [
    { id: 'home', label: 'Занятия', icon: BookOpen }, { id: 'plan', label: 'План', icon: Clock3 },
    { id: 'tests', label: 'Тесты', icon: FileQuestion, badge: pendingTests }, { id: 'hw', label: 'Д/з', icon: Paperclip, badge: pendingHw },
    { id: 'levels', label: 'Уровни', icon: Trophy }, { id: 'sky', label: 'Играть', icon: Rocket },
  ];
  const startTest = (t: Test) => { setTestRun(t); };

  return <>
    <div className="app">
      <header className="top">
        <img src="/static/ST.webp" alt="StudyTask" className="logo" />
        <div className="grow"><h3 style={{ lineHeight: 1 }}>StudyTask</h3><p className="tiny muted">Кабинет ученика</p></div>
        <span className="pill gold"><Star size={14} fill="currentColor" /> {stars}</span>
        <button className="iconbtn" aria-label="Сообщения" onClick={() => { tap(); setShowMsg(true); }}><MessageCircle size={21} />{unread > 0 && <span className="dot">{unread}</span>}</button>
        <button className="iconbtn" aria-label="Настройки" onClick={() => { tap(); setShowSet(true); }}><Settings size={21} /></button>
      </header>
      <main key={tab}>
        {tab === 'home' && <Home portal={portal} now={now} go={setTab} openHw={setHw} startTest={startTest} />}
        {tab === 'plan' && <Plan portal={portal} now={now} />}
        {tab === 'tests' && <Tests portal={portal} start={startTest} />}
        {tab === 'hw' && <HomeworkList portal={portal} open={setHw} />}
        {tab === 'levels' && <Levels portal={portal} refresh={() => load(true)} say={say} />}
        {tab === 'sky' && <SkyQuest />}
      </main>
    </div>
    <nav className="nav" aria-label="Разделы"><div className="nav-in">{NAV.map(({ id, label, icon: Icon, badge }) =>
      <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => { tap(); setTab(id); window.scrollTo({ top: 0 }); }}>
        <Icon size={21} /><span>{label}</span>{!!badge && <i className="badge">{badge}</i>}
      </button>)}</div></nav>
    {hw && <HomeworkSheet hw={hw} onClose={() => setHw(null)} onSaved={() => load(true)} say={say} />}
    {showMsg && <Messages portal={portal} onClose={() => setShowMsg(false)} onRead={markRead} />}
    {showSet && <SettingsSheet portal={portal} onClose={() => setShowSet(false)} onLogout={() => void logout()} />}
    {toast && <Toast text={toast.t} kind={toast.k} onDone={() => setToast(null)} />}
  </>;
}
