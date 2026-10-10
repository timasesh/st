import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Check, Eye, EyeOff, KeyRound, LockKeyhole, LogIn, ShieldCheck, UserRound, Users, GraduationCap, BriefcaseBusiness, Search, Plus, LogOut, Settings, Moon, Sun, Pencil, Trash2, X, RotateCcw, CalendarDays, Clock3, GripVertical, Trash, History, MessageCircle, Mail, Send, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type LoginPageProps = {
  onLoginSuccess: (name: string, studentClass: string, accountId: string, progress: Partial<LoginProgress> | null, role: 'student' | 'parent' | 'teacher') => void;
  expectedRole?: 'teacher';
};

type LoginProgress = {
  stars: number; xp: number; level: number; claimedPrizes: string[]; unlockedAchievements: string[];
  userName: string; userClass: string;
};

function AuthShell({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary-light px-4 py-10">
      <div aria-hidden className="absolute -left-16 top-16 h-48 w-48 rounded-[3rem] border-2 border-blue-200 bg-blue-200/50" />
      <div aria-hidden className="absolute right-8 top-32 h-32 w-32 rounded-full border-2 border-blue-200 bg-blue-200/40" />
      <div aria-hidden className="absolute bottom-8 left-1/4 h-24 w-24 rotate-12 rounded-2xl border-2 border-amber-200 bg-amber-200/50" />

      <div className="relative z-10 w-full max-w-md">
        <a href="/" className="mb-7 flex items-center justify-center gap-3 rounded-xl text-foreground">
          <img src="/static/ST.webp" alt="Study Task" className="h-12 w-12 rounded-xl object-contain" />
          <span className="font-display text-2xl font-extrabold">StudyTask</span>
        </a>
        <section className="clay-card overflow-hidden bg-surface">
          <div className="bg-gradient-to-r from-primary to-accent-dark px-7 py-6 text-center text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              {eyebrow}
            </span>
            {children}
          </div>
        </section>
        <a href="/" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark">
          <ArrowLeft className="h-4 w-4" /> На главную
        </a>
      </div>
    </main>
  );
}

export function StudentLoginPage({ onLoginSuccess, expectedRole }: LoginPageProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ phone, password, audience: expectedRole || 'student_parent' }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось войти. Проверьте номер телефона и пароль.');
      const account = result.account as { id: string; role: 'student' | 'parent' | 'teacher'; firstName: string; lastName: string; studentClass?: string };
      onLoginSuccess(`${account.firstName} ${account.lastName}`, account.studentClass || '', account.id, result.progress || null, account.role);
      window.location.assign(account.role === 'teacher' ? '/teacher/' : account.role === 'parent' ? '/parent' : '/student');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось подключиться к серверу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow={expectedRole ? 'ЛИЧНЫЙ КАБИНЕТ ПРЕПОДАВАТЕЛЯ' : 'ЛИЧНЫЙ КАБИНЕТ УЧЕНИКА И РОДИТЕЛЯ'}>
      <UserRound className="mx-auto mb-2 mt-4 h-9 w-9 text-blue-100" />
      <h1 className="font-display text-2xl font-extrabold">С возвращением!</h1>
      <p className="mt-1 text-sm text-blue-100">{expectedRole ? 'Вход преподавателя по данным, выданным администратором' : 'Вход для ученика или родителя по данным от администратора'}</p>
      <form onSubmit={submit} className="space-y-4 bg-surface p-6 text-left">
        <label className="block space-y-1.5 text-sm font-bold text-foreground" htmlFor="student-phone">
          Номер телефона
          <input
            id="student-phone"
            type="tel"
            autoComplete="username"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 700 000 00 00"
            className="w-full rounded-xl border-2 border-border bg-primary-light px-4 py-3 font-normal focus:border-primary focus:bg-white focus:outline-none"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-bold text-foreground" htmlFor="student-password">
          Пароль
          <span className="relative block">
            <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
            <input
              id="student-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Введи пароль"
              className="w-full rounded-xl border-2 border-border bg-primary-light py-3 pl-10 pr-12 font-normal focus:border-primary focus:bg-white focus:outline-none"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} className="absolute right-3 top-3 rounded p-1 text-muted hover:text-primary">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
        <button type="submit" disabled={loading} className="clay-btn flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-display text-sm font-bold text-white disabled:opacity-70">
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><LogIn className="h-4 w-4" /> Войти в профиль</>}
        </button>
        <p className="text-center text-xs text-muted">Нет регистрации на сайте — данные для входа выдаёт центр.</p>
      </form>
      <a href="/admin_login" className="block border-t border-border px-5 py-4 text-center text-xs font-semibold text-muted hover:text-primary">Вход для администратора</a>
      {expectedRole ? <a href="/login" className="block border-t border-border px-5 py-4 text-center text-xs font-semibold text-muted hover:text-primary">Вход ученика или родителя</a> : <a href="/teacher_login" className="block border-t border-border px-5 py-4 text-center text-xs font-semibold text-muted hover:text-primary">Вход преподавателя</a>}
    </AuthShell>
  );
}

type AdminSession = { authenticated: boolean; mustChangePassword?: boolean };

async function readApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Сервер авторизации не запущен. В Render откройте Settings → Build & Deploy и замените Start Command `npx vite preview ...` на `npm start`, затем выполните Deploy.');
  }
  return response.json();
}

export function AdminLoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(readApiResponse)
      .then((result: AdminSession) => setSession(result))
      .catch((reason) => {
        setSession({ authenticated: false });
        setError(reason instanceof Error ? reason.message : 'Не удалось подключиться к серверу авторизации.');
      });
  }, []);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ login, password }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось войти. Проверьте логин и пароль.');
      window.location.assign('/admin');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ошибка соединения с сервером.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <AuthShell eyebrow="ПРОВЕРКА ДОСТУПА"><div className="p-8 text-sm text-foreground">Загрузка…</div></AuthShell>;
  }

  return (
    <AuthShell eyebrow="ЗАЩИЩЁННЫЙ ДОСТУП">
      <ShieldCheck className="mx-auto mb-2 mt-4 h-9 w-9 text-blue-100" />
      <h1 className="font-display text-2xl font-extrabold">Вход администратора</h1>
      <p className="mt-1 text-sm text-blue-100">Панель управления StudyTask</p>

      <AnimatePresence mode="wait">
          <motion.form key="admin-login" onSubmit={submitLogin} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-surface p-6 text-left">
            <label htmlFor="admin-login" className="block space-y-1.5 text-sm font-bold text-foreground">
              Логин
              <input id="admin-login" autoComplete="username" required value={login} onChange={(event) => setLogin(event.target.value)} className="w-full rounded-xl border-2 border-border bg-primary-light px-4 py-3 font-normal focus:border-primary focus:bg-white focus:outline-none" />
            </label>
            <PasswordField id="admin-password" label="Пароль" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="current-password" />
            {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={loading} className="clay-btn flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-display text-sm font-bold text-white disabled:opacity-70">
              {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><LogIn className="h-4 w-4" /> Войти</>}
            </button>
          </motion.form>
      </AnimatePresence>
      {!session.authenticated && <a href="/login" className="block border-t border-border px-5 py-4 text-center text-xs font-semibold text-muted hover:text-primary">Вход ученика</a>}
    </AuthShell>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <label htmlFor={id} className="block space-y-1.5 text-sm font-bold text-foreground">
      {label}
      <span className="relative block">
        <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
        <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} minLength={id === 'new-admin-password' || id === 'confirm-admin-password' ? 12 : undefined} required value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border-2 border-border bg-primary-light py-3 pl-10 pr-12 font-normal focus:border-primary focus:bg-white focus:outline-none" />
        <button type="button" onClick={onToggle} aria-label={show ? 'Скрыть пароль' : 'Показать пароль'} className="absolute right-3 top-3 rounded p-1 text-muted hover:text-primary">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

type PortalPerson = { id: string; role: 'student' | 'parent' | 'teacher'; firstName: string; lastName: string; phone?: string; studentClass?: string; teacher?: { firstName: string; lastName: string } | null; children?: PortalPerson[] };
type PortalLesson = { id: string; studentId?: string; day: number; hour: number; title: string; trial?: boolean; attendanceOpen?: boolean; student?: PortalPerson | null };
type PortalMessage = { id: string; at: string; sender: string; body: string; read: boolean };
type PortalPayload = { account: PortalPerson; progress: { stars?: number; xp?: number; level?: number } | null; relatedAccounts: PortalPerson[]; lessons: PortalLesson[]; messages: PortalMessage[] };
const PORTAL_DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function UserPortalPage({ expectedRole }: { expectedRole: 'student' | 'parent' | 'teacher' }) {
  const [portal, setPortal] = useState<PortalPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingMessageId, setSavingMessageId] = useState('');
  const [submittingAttendanceId, setSubmittingAttendanceId] = useState('');
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [teacherTab, setTeacherTab] = useState<'students' | 'schedule'>('students');

  const loadPortal = async () => {
    try {
      const response = await fetch('/api/auth/portal', { credentials: 'same-origin' });
      const result = await readApiResponse(response);
      if (response.status === 401) { window.location.replace(expectedRole === 'teacher' ? '/teacher_login' : '/login'); return; }
      if (!response.ok) throw new Error(result.error || 'Не удалось загрузить личный кабинет.');
      if (result.account?.role !== expectedRole) { window.location.replace(result.account?.role === 'teacher' ? '/teacher/' : result.account?.role === 'parent' ? '/parent' : '/student'); return; }
      setPortal(result as PortalPayload);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось подключиться к серверу.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadPortal(); }, [expectedRole]);

  const markRead = async (message: PortalMessage) => {
    setSavingMessageId(message.id);
    try {
      const response = await fetch(`/api/auth/messages/${message.id}/read`, { method: 'POST', credentials: 'same-origin' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось отметить сообщение прочитанным.');
      setPortal((current) => current ? { ...current, messages: current.messages.map((entry) => entry.id === message.id ? { ...entry, read: true } : entry) } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось обновить сообщение.'); }
    finally { setSavingMessageId(''); }
  };

  const markTrialAttendance = async (lesson: PortalLesson, attended: boolean) => {
    setSubmittingAttendanceId(lesson.id); setError('');
    try {
      const response = await fetch(`/api/teacher/trial-lessons/${lesson.id}/attendance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ attended }) });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось отправить отметку.');
      await loadPortal();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось отправить отметку.'); }
    finally { setSubmittingAttendanceId(''); }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.assign(expectedRole === 'teacher' ? '/teacher_login' : '/login');
  };

  const account = portal?.account;
  const roleLabel = expectedRole === 'student' ? 'Личный кабинет ученика' : expectedRole === 'parent' ? 'Личный кабинет родителя' : 'Кабинет преподавателя';
  return (
    <main className="min-h-screen bg-primary-light text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-white px-5 py-4 shadow-sm sm:px-8"><a href="/" className="flex items-center gap-3"><img src="/static/ST.webp" alt="StudyTask" className="h-10 w-10 rounded-lg object-contain" /><span><strong className="block font-display text-lg">StudyTask</strong><span className="text-xs text-muted">{roleLabel}</span></span></a><div className="flex items-center gap-2">{expectedRole === 'teacher' && <div className="relative"><button type="button" onClick={() => { const open = !messagesOpen; setMessagesOpen(open); if (open) void loadPortal(); }} aria-label="Открыть сообщения" aria-expanded={messagesOpen} className="relative rounded-xl border border-border p-2.5 text-primary hover:bg-primary-light"><MessageCircle className="h-5 w-5" />{portal?.messages.some((message) => !message.read) && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-rose-500" />}</button>{messagesOpen && <div role="dialog" aria-label="Сообщения преподавателя" className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-border px-4 py-3"><div><strong className="font-display">Сообщения</strong><p className="text-xs text-muted">{portal?.messages.filter((message) => !message.read).length || 0} непрочитанных</p></div><button type="button" onClick={() => setMessagesOpen(false)} aria-label="Закрыть сообщения" className="rounded-lg p-1.5 text-muted hover:bg-primary-light"><X className="h-4 w-4" /></button></div><div className="max-h-[min(65vh,520px)] space-y-2 overflow-y-auto p-3">{portal?.messages.length ? portal.messages.map((message) => <article key={message.id} className={`rounded-xl border p-3 ${message.read ? 'border-border bg-white' : 'border-blue-200 bg-blue-50/70'}`}><p className="text-xs text-muted">{message.sender} · {new Date(message.at).toLocaleString('ru-KZ', { timeZone: 'Asia/Qyzylorda' })}</p><p className="mt-2 whitespace-pre-wrap text-sm">{message.body}</p>{!message.read && <button type="button" disabled={savingMessageId === message.id} onClick={() => void markRead(message)} className="mt-2 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50">Отметить прочитанным</button>}</article>) : <p className="py-8 text-center text-sm text-muted">Сообщений пока нет.</p>}</div></div>}</div>}<button type="button" onClick={logout} className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-primary-light">Выйти</button></div></header>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8"><div><p className="text-sm font-bold text-primary">Здравствуйте</p><h1 className="mt-1 font-display text-3xl font-extrabold">{account ? `${account.firstName} ${account.lastName}` : roleLabel}</h1>{expectedRole === 'student' && <p className="mt-1 text-muted">{account?.studentClass || ''}</p>}</div>
        {expectedRole === 'teacher' && <nav aria-label="Разделы кабинета преподавателя" className="flex flex-wrap gap-2"><button type="button" onClick={() => setTeacherTab('students')} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${teacherTab === 'students' ? 'bg-primary text-white shadow-sm' : 'border border-border bg-white text-muted hover:bg-primary-light'}`}><Users className="mr-2 inline h-4 w-4" />Мои ученики <span className="ml-1 opacity-75">{portal?.relatedAccounts.length || 0}</span></button><button type="button" onClick={() => setTeacherTab('schedule')} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${teacherTab === 'schedule' ? 'bg-primary text-white shadow-sm' : 'border border-border bg-white text-muted hover:bg-primary-light'}`}><CalendarDays className="mr-2 inline h-4 w-4" />Расписание <span className="ml-1 opacity-75">{portal?.lessons.length || 0}</span></button></nav>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
        {loading ? <div className="rounded-2xl bg-white p-12 text-center text-muted shadow-sm">Загружаем личный кабинет…</div> : portal && <>
          {expectedRole === 'student' && <section className="grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted">Звёзды</p><p className="mt-1 text-3xl font-extrabold">⭐ {portal.progress?.stars ?? 0}</p></article><article className="rounded-2xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted">Уровень</p><p className="mt-1 text-3xl font-extrabold">{portal.progress?.level ?? 1}</p></article><article className="rounded-2xl border border-border bg-white p-5 shadow-sm"><p className="text-sm text-muted">Опыт</p><p className="mt-1 text-3xl font-extrabold">{portal.progress?.xp ?? 0} XP</p></article></section>}
          {expectedRole === 'student' && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-extrabold">Преподаватель</h2><p className="mt-2 text-sm text-muted">{account?.teacher ? `${account.teacher.firstName} ${account.teacher.lastName}` : 'Преподаватель пока не назначен.'}</p></section>}
          {expectedRole === 'parent' && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm"><h2 className="mb-3 font-display text-lg font-extrabold">Мои дети</h2>{portal.relatedAccounts.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{portal.relatedAccounts.map((person) => <article key={person.id} className="rounded-xl border border-border bg-primary-light p-4"><p className="font-bold">{person.firstName} {person.lastName}</p><p className="text-sm text-muted">{person.studentClass || ''}</p></article>)}</div> : <p className="text-sm text-muted">Пока нет прикреплённых учеников.</p>}</section>}{expectedRole === 'teacher' && teacherTab === 'students' && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold">Мои ученики</h2><p className="text-sm text-muted">Ученики, закреплённые за вами в системе.</p></div><span className="rounded-full bg-primary-light px-3 py-1 text-sm font-bold text-primary">{portal.relatedAccounts.length}</span></div>{portal.relatedAccounts.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{portal.relatedAccounts.map((person) => <article key={person.id} className="rounded-xl border border-border bg-primary-light p-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 text-primary"><GraduationCap className="h-5 w-5" /></span><div><p className="font-bold">{person.firstName} {person.lastName}</p><p className="text-sm text-muted">{person.studentClass || 'Класс не указан'}</p><p className="mt-2 text-xs text-muted">Занятий в расписании: {portal.lessons.filter((lesson) => lesson.studentId === person.id && !lesson.trial).length}</p></div></div></article>)}</div> : <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">Пока нет закреплённых учеников.</p>}</section>}
          {expectedRole !== 'teacher' && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-extrabold">Расписание</h2></div>{portal.lessons.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-primary-light text-xs uppercase text-muted"><tr><th className="rounded-l-lg px-3 py-2">День</th><th className="px-3 py-2">Время</th>{expectedRole !== 'student' && <th className="px-3 py-2">Ученик</th>}<th className="rounded-r-lg px-3 py-2">Урок</th></tr></thead><tbody>{[...portal.lessons].sort((a, b) => a.day - b.day || a.hour - b.hour).map((lesson) => <tr key={lesson.id} className="border-b border-border last:border-0"><td className="px-3 py-3">{PORTAL_DAYS[lesson.day]}</td><td className="px-3 py-3">{String(lesson.hour).padStart(2, '0')}:00–{String(lesson.hour + 1).padStart(2, '0')}:00</td>{expectedRole !== 'student' && <td className="px-3 py-3">{lesson.student ? `${lesson.student.firstName} ${lesson.student.lastName}` : '—'}</td>}<td className="px-3 py-3 font-semibold"><div>{lesson.title}</div>{expectedRole === 'teacher' && lesson.trial && lesson.attendanceOpen && <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={submittingAttendanceId === lesson.id} onClick={() => void markTrialAttendance(lesson, true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Check className="mr-1 inline h-3.5 w-3.5" />Пришёл</button><button type="button" disabled={submittingAttendanceId === lesson.id} onClick={() => void markTrialAttendance(lesson, false)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Не пришёл</button></div>}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted">Расписание пока не заполнено.</p>}</section>}
          {expectedRole === 'teacher' && teacherTab === 'schedule' && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold">Расписание недели</h2><p className="text-sm text-muted">Понедельник–суббота · один слот — один час · пробные занятия отмечены отдельно.</p></div><span className="rounded-full bg-primary-light px-3 py-1 text-sm font-bold text-primary">Всего уроков: {portal.lessons.length}</span></div>{portal.lessons.length ? <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[900px] border-collapse text-left text-xs"><thead className="bg-primary-light text-[11px] uppercase text-muted"><tr><th className="sticky left-0 z-10 min-w-16 bg-primary-light px-3 py-3">Время</th>{PORTAL_DAYS.map((day) => <th key={day} className="border-l border-border px-3 py-3">{day}</th>)}</tr></thead><tbody>{Array.from({ length: 13 }, (_, row) => row + 8).map((hour) => <tr key={hour} className="border-t border-border"><th className="sticky left-0 bg-primary-light px-3 py-3 font-bold text-muted">{String(hour).padStart(2, '0')}:00</th>{PORTAL_DAYS.map((day, dayIndex) => { const lessons = portal.lessons.filter((lesson) => lesson.day === dayIndex && lesson.hour === hour); return <td key={day} className="min-w-36 border-l border-border p-1.5 align-top"><div className="space-y-1.5">{lessons.map((lesson) => <article key={lesson.id} className={`rounded-lg border p-2 ${lesson.trial ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50'}`}><strong className="block leading-tight">{lesson.student ? `${lesson.student.firstName} ${lesson.student.lastName}` : lesson.title}</strong><span className={`mt-1 block text-[10px] ${lesson.trial ? 'text-amber-800' : 'text-blue-800'}`}>{lesson.trial ? `Пробный · ${lesson.student?.studentClass || ''}` : lesson.title}</span>{lesson.trial && lesson.attendanceOpen && <div className="mt-2 flex flex-wrap gap-1"><button type="button" disabled={submittingAttendanceId === lesson.id} onClick={() => void markTrialAttendance(lesson, true)} className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"><Check className="mr-1 inline h-3 w-3" />Пришёл</button><button type="button" disabled={submittingAttendanceId === lesson.id} onClick={() => void markTrialAttendance(lesson, false)} className="rounded-md bg-rose-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">Не пришёл</button></div>}</article>)}{!lessons.length && <span className="text-muted/40">—</span>}</div></td>; })}</tr>)}</tbody></table></div> : <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">Расписание пока не заполнено.</p>}</section>}
          {expectedRole !== 'teacher' && <section className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-extrabold">Сообщения</h2><span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-bold">{portal.messages.filter((message) => !message.read).length} новых</span></div>{portal.messages.length ? <div className="space-y-3">{portal.messages.map((message) => <article key={message.id} className={`rounded-xl border p-4 ${message.read ? 'border-border bg-white' : 'border-blue-200 bg-blue-50/60'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted">От {message.sender} · {new Date(message.at).toLocaleString('ru-KZ', { timeZone: 'Asia/Qyzylorda' })}</p><p className="mt-2 whitespace-pre-wrap text-sm">{message.body}</p></div>{!message.read && <button type="button" disabled={savingMessageId === message.id} onClick={() => void markRead(message)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">Отметить прочитанным</button>}</div></article>)}</div> : <p className="text-sm text-muted">Сообщений пока нет.</p>}</section>}
        </>}
      </div>
    </main>
  );
}

type AccountRole = 'student' | 'parent' | 'teacher';
type ManagedAccount = {
  id: string; role: AccountRole; phone: string; firstName: string; lastName: string;
  studentClass?: string; teacherId?: string; teacher?: { id: string; firstName: string; lastName: string } | null;
  parent?: { id: string; firstName: string; lastName: string; phone: string } | null;
  createdAt?: string; withdrawnAt?: string;
  status?: 'active' | 'withdrawn';
  children: Array<{ id: string; firstName: string; lastName: string; studentClass?: string }>;
};

type ScheduledLesson = { id: string; studentId?: string; teacherId: string; day: number; hour: number; title: string };
type WeeklySchedule = { lessons: ScheduledLesson[]; targets: Record<string, number> };
type AdminHistoryEntry = { id: string; at: string; actor: string; action: string; details?: string };
type TrialLesson = { id: string; firstName: string; lastName: string; studentClass: string; parentPhone: string; teacherId: string; teacher: ManagedAccount; day: number; hour: number; createdAt: string; scheduledAt: string; status: 'scheduled' | 'trial' | 'attended' | 'no_show' | 'declined' | 'enrolled'; declineReason?: string; attendanceAt?: string; attendanceMarkedBy?: string; studentId?: string };
const SCHEDULE_DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const SCHEDULE_HOURS = Array.from({ length: 13 }, (_, index) => index + 8);

const ROLE_LABELS: Record<AccountRole, string> = { student: 'Ученики', parent: 'Родители', teacher: 'Преподаватели' };

function astanaDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function astanaWeekBounds(now = new Date()) {
  const today = astanaDateKey(now).split('-').map(Number);
  const date = new Date(Date.UTC(today[0], today[1] - 1, today[2]));
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const start = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 6);
  return { start, end: date.toISOString().slice(0, 10) };
}

function EmptyTrialState({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-border px-4 py-14 text-center"><UserPlus className="mx-auto mb-3 h-8 w-8 text-muted" /><p className="font-bold">{message}</p></div>;
}

export function AdminDashboardPage() {
  const [authorized, setAuthorized] = useState(false);
  const [activeRole, setActiveRole] = useState<AccountRole>('student');
  const [activeView, setActiveView] = useState<'dashboard' | 'accounts' | 'withdrawn' | 'crm' | 'settings' | 'schedule' | 'history' | 'trial'>('dashboard');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedAccount | null>(null);
  const [selectedTeacherSchedule, setSelectedTeacherSchedule] = useState<ManagedAccount | null>(null);
  const [messageTarget, setMessageTarget] = useState<ManagedAccount | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [darkTheme, setDarkTheme] = useState(() => {
    try { return localStorage.getItem('study_admin_theme') === 'dark'; } catch { return false; }
  });
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [studentClass, setStudentClass] = useState('5 класс');
  const [teacherId, setTeacherId] = useState('');
  const [studentParentId, setStudentParentId] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [schedule, setSchedule] = useState<WeeklySchedule>({ lessons: [], targets: {} });
  const [scheduleStudentId, setScheduleStudentId] = useState('');
  const [scheduleSlot, setScheduleSlot] = useState<{ day: number; hour: number } | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleTargetDraft, setScheduleTargetDraft] = useState('');
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<AdminHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialFirstName, setTrialFirstName] = useState('');
  const [trialLastName, setTrialLastName] = useState('');
  const [trialClass, setTrialClass] = useState('5 класс');
  const [trialTeacherId, setTrialTeacherId] = useState('');
  const [trialSlot, setTrialSlot] = useState('');
  const [trialParentPhone, setTrialParentPhone] = useState('');
  const [editingTrialId, setEditingTrialId] = useState<string | null>(null);
  const [trialSubtab, setTrialSubtab] = useState<'create' | 'no_show' | 'past' | 'declined'>('create');
  const [selectedTrial, setSelectedTrial] = useState<TrialLesson | null>(null);
  const [trialDeclineReason, setTrialDeclineReason] = useState('');
  const [trialOtherReason, setTrialOtherReason] = useState('');
  const [trialConversionInfo, setTrialConversionInfo] = useState('');
  const [showTrialDeclineForm, setShowTrialDeclineForm] = useState(false);
  const [trialSearch, setTrialSearch] = useState('');
  const [trialClassFilters, setTrialClassFilters] = useState<string[]>([]);
  const [confirmMoveTrial, setConfirmMoveTrial] = useState<TrialLesson | null>(null);

  const loadAccounts = async () => {
    const response = await fetch('/api/admin/accounts', { credentials: 'same-origin' });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.error || 'Не удалось загрузить аккаунты.');
    setAccounts(result as ManagedAccount[]);
  };

  const loadSchedule = async () => {
    const response = await fetch('/api/admin/schedule', { credentials: 'same-origin' });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.error || 'Не удалось загрузить расписание.');
    setSchedule({ lessons: Array.isArray(result.lessons) ? result.lessons : [], targets: result.targets || {} });
  };

  const loadTrialLessons = async () => {
    const response = await fetch('/api/admin/trial-lessons', { credentials: 'same-origin' });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.error || 'Не удалось загрузить пробные уроки.');
    setTrialLessons(result as TrialLesson[]);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/admin/history', { credentials: 'same-origin' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось загрузить историю.');
      setHistoryEntries(result as AdminHistoryEntry[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить историю действий.');
    } finally { setHistoryLoading(false); }
  };

  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(readApiResponse)
      .then(async (result: AdminSession) => {
        if (!result.authenticated) {
          window.location.replace('/admin_login');
          return;
        }
        setAuthorized(true);
        await loadAccounts();
        await loadSchedule();
        await loadTrialLessons();
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.message.includes('Сервер авторизации')) setError(reason.message);
        else window.location.replace('/admin_login');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authorized || activeView !== 'trial') return;
    const refreshAttendance = async () => {
      try {
        const response = await fetch('/api/admin/trial-lessons', { credentials: 'same-origin' });
        const result = await readApiResponse(response);
        if (response.ok) setTrialLessons(result as TrialLesson[]);
      } catch { /* Keep the current list if a background refresh is temporarily unavailable. */ }
    };
    const timer = window.setInterval(() => { void refreshAttendance(); }, 15000);
    return () => window.clearInterval(timer);
  }, [authorized, activeView]);

  useEffect(() => {
    try { localStorage.setItem('study_admin_theme', darkTheme ? 'dark' : 'light'); } catch { /* Theme still applies for this session. */ }
  }, [darkTheme]);

  const roleAccounts = accounts.filter((account) => account.role === activeRole && (activeView === 'withdrawn' ? account.status === 'withdrawn' : activeRole !== 'student' || account.status !== 'withdrawn'));
  const visibleAccounts = roleAccounts.filter((account) => `${account.firstName} ${account.lastName}`.toLowerCase().includes(search.toLowerCase()) && (activeRole !== 'student' || selectedClasses.length === 0 || selectedClasses.includes(account.studentClass || '')));
  const students = accounts.filter((account) => account.role === 'student' && account.status !== 'withdrawn');
  const teachers = accounts.filter((account) => account.role === 'teacher');
  const parents = accounts.filter((account) => account.role === 'parent');
  const selectedStudent = students.find((student) => student.id === scheduleStudentId) || students[0];
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedStudent?.teacherId);
  const studentLessons = schedule.lessons.filter((lesson) => lesson.studentId === selectedStudent?.id);
  const teacherScheduleTarget = selectedStudent ? schedule.targets[selectedStudent.id] : undefined;
  const isActiveTrial = (lesson: TrialLesson) => lesson.status === 'scheduled' || lesson.status === 'trial';
  const isTrialSlotTaken = (dayIndex: number, hour: number) => schedule.lessons.some((lesson) => lesson.teacherId === trialTeacherId && lesson.day === dayIndex && lesson.hour === hour) || trialLessons.some((lesson) => lesson.id !== editingTrialId && isActiveTrial(lesson) && lesson.teacherId === trialTeacherId && lesson.day === dayIndex && lesson.hour === hour);
  const trialHasEnded = (lesson: TrialLesson) => new Date(lesson.scheduledAt).getTime() + 60 * 60 * 1000 <= Date.now();
  const pastTrials = trialLessons.filter((lesson) => lesson.status === 'attended' || (isActiveTrial(lesson) && trialHasEnded(lesson)));
  const activeTrials = trialLessons.filter((lesson) => isActiveTrial(lesson));
  const upcomingTrials = activeTrials.filter((lesson) => !trialHasEnded(lesson));
  const declinedTrials = trialLessons.filter((lesson) => lesson.status === 'declined');
  const noShowTrials = trialLessons.filter((lesson) => lesson.status === 'no_show');
  const filterTrials = (list: TrialLesson[]) => list.filter((lesson) => `${lesson.firstName} ${lesson.lastName} ${lesson.parentPhone} ${lesson.teacher?.firstName || ''} ${lesson.teacher?.lastName || ''}`.toLowerCase().includes(trialSearch.toLowerCase()) && (!trialClassFilters.length || trialClassFilters.includes(lesson.studentClass)));
  const filteredPastTrials = filterTrials(pastTrials);
  const filteredDeclinedTrials = filterTrials(declinedTrials);
  const filteredNoShowTrials = filterTrials(noShowTrials);
  const dashboardWeek = astanaWeekBounds();
  const isInDashboardWeek = (value?: string) => Boolean(value && astanaDateKey(value) >= dashboardWeek.start && astanaDateKey(value) <= dashboardWeek.end);
  const dashboardTrials = trialLessons.filter((lesson) => isInDashboardWeek(lesson.scheduledAt));
  const dashboardEnrolledTrials = dashboardTrials.filter((lesson) => lesson.status === 'enrolled').length;
  const activeStudents = accounts.filter((account) => account.role === 'student' && account.status !== 'withdrawn');
  const dashboardNewStudents = activeStudents.filter((account) => isInDashboardWeek(account.createdAt)).length;
  const withdrawnStudents = accounts.filter((account) => account.role === 'student' && account.status === 'withdrawn');
  const dashboardWithdrawnThisWeek = withdrawnStudents.filter((account) => isInDashboardWeek(account.withdrawnAt)).length;

  const createTrialLesson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [day, hour] = trialSlot.split(':').map(Number);
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch(editingTrialId ? `/api/admin/trial-lessons/${editingTrialId}` : '/api/admin/trial-lessons', { method: editingTrialId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ firstName: trialFirstName, lastName: trialLastName, studentClass: trialClass, parentPhone: trialParentPhone, teacherId: trialTeacherId, day, hour }) });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось создать пробный урок.');
      await loadTrialLessons();
      setShowTrialModal(false); setTrialFirstName(''); setTrialLastName(''); setTrialSlot(''); setTrialParentPhone(''); setEditingTrialId(null);
      setSuccess(editingTrialId ? 'Пробный урок перенесён.' : `Пробный урок для ${trialFirstName} ${trialLastName} создан.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось создать пробный урок.'); }
    finally { setSaving(false); }
  };

  const openTrialEditor = (lesson?: TrialLesson) => {
    setEditingTrialId(lesson?.id || null); setTrialFirstName(lesson?.firstName || ''); setTrialLastName(lesson?.lastName || ''); setTrialClass(lesson?.studentClass || '5 класс'); setTrialParentPhone(lesson?.parentPhone || ''); setTrialTeacherId(lesson?.teacherId || teachers[0]?.id || ''); setTrialSlot(lesson ? `${lesson.day}:${lesson.hour}` : ''); setError(''); setShowTrialModal(true);
  };

  const deleteTrialLesson = async (lesson: TrialLesson) => {
    if (!window.confirm(`Удалить пробный урок для ${lesson.firstName} ${lesson.lastName}?`)) return;
    try {
      const response = await fetch(`/api/admin/trial-lessons/${lesson.id}`, { method: 'DELETE', credentials: 'same-origin' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось удалить пробный урок.');
      await loadTrialLessons(); setSuccess('Пробный урок удалён.'); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удалить пробный урок.'); }
  };

  const moveTrialToPast = async (lesson: TrialLesson) => {
    setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/admin/trial-lessons/${lesson.id}/move-to-past`, { method: 'POST', credentials: 'same-origin' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось перенести пробный урок.');
      await loadTrialLessons();
      setSuccess(`${lesson.firstName} ${lesson.lastName} перенесён в прошедшие пробные.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось перенести пробный урок.'); }
  };

  const finishTrial = async (outcome: 'declined' | 'enrolled') => {
    if (!selectedTrial) return;
    const reason = trialDeclineReason === 'Другое' ? trialOtherReason.trim() : trialDeclineReason;
    if (outcome === 'declined' && !reason) { setError('Выберите причину отказа или укажите свою.'); return; }
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/trial-lessons/${selectedTrial.id}/outcome`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ outcome, reason }) });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось сохранить результат.');
      await loadTrialLessons();
      setSelectedTrial(null); setTrialDeclineReason(''); setTrialOtherReason(''); setShowTrialDeclineForm(false);
      if (outcome === 'declined') { setSuccess('Отказ сохранён.'); return; }
      await loadAccounts();
      setActiveRole('parent'); setActiveView('accounts'); setSearch(''); setEditingAccountId(null); setFirstName(''); setLastName(''); setPhone(selectedTrial.parentPhone); setPassword('study2026'); setStudentClass(selectedTrial.studentClass); setTeacherId(''); setSelectedChildren([result.student.id]); setChildSearch(''); setError(''); setSuccess(''); setTrialConversionInfo(`Ученик создан. Его временный логин: ${result.temporaryLogin}, пароль: study2026. Временный пароль родителя: study2026.`); setShowAccountModal(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить результат.'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (selectedStudent && scheduleStudentId !== selectedStudent.id) setScheduleStudentId(selectedStudent.id);
  }, [selectedStudent?.id, scheduleStudentId]);

  useEffect(() => {
    if (selectedStudent) setScheduleTargetDraft(teacherScheduleTarget === undefined ? '' : String(teacherScheduleTarget));
  }, [selectedStudent?.id, teacherScheduleTarget]);
  const matchingChildren = accounts.filter((student) => student.role === 'student' && (student.status !== 'withdrawn' || selectedChildren.includes(student.id)) && `${student.firstName} ${student.lastName} ${student.phone}`.toLowerCase().includes(childSearch.toLowerCase()));

  const switchRole = (role: AccountRole) => {
    setActiveRole(role);
    setError('');
    setSuccess('');
    setSelectedChildren([]);
    setSelectedClasses([]);
    setChildSearch('');
  };

  const openCreateAccount = () => {
    setEditingAccountId(null); setFirstName(''); setLastName(''); setPhone(''); setPassword('');
    setStudentClass('5 класс'); setTeacherId(''); setStudentParentId(''); setSelectedChildren([]); setTrialConversionInfo(''); setError(''); setSuccess(''); setShowAccountModal(true);
  };

  const openEditAccount = (account: ManagedAccount) => {
    setEditingAccountId(account.id); setFirstName(account.firstName); setLastName(account.lastName); setPhone(account.phone);
    setPassword(''); setStudentClass(account.studentClass || '5 класс'); setTeacherId(account.teacherId || '');
    setStudentParentId(account.parent?.id || '');
    setSelectedChildren(account.children.map((child) => child.id)); setError(''); setSuccess(''); setShowAccountModal(true);
  };

  const saveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const response = await fetch(editingAccountId ? `/api/admin/accounts/${editingAccountId}` : '/api/admin/accounts', {
        method: editingAccountId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ role: activeRole, firstName, lastName, phone, ...(password ? { password } : {}), studentClass, teacherId, parentId: studentParentId, children: selectedChildren }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось создать аккаунт.');
      await loadAccounts();
      setSuccess(editingAccountId ? 'Изменения сохранены.' : `Аккаунт ${firstName} ${lastName} создан. Логин для входа: ${phone}.`);
      setShowAccountModal(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось подключиться к серверу.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deleteTarget) return;
    setError('');
    setSaving(true);
    try {
      const isStudentArchive = deleteTarget.role === 'student' && activeView !== 'withdrawn';
      const response = await fetch(isStudentArchive ? `/api/admin/accounts/${deleteTarget.id}/archive` : `/api/admin/accounts/${deleteTarget.id}`, { method: isStudentArchive ? 'POST' : 'DELETE', credentials: 'same-origin' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось удалить аккаунт.');
      await loadAccounts();
      setSuccess(isStudentArchive ? `${deleteTarget.firstName} ${deleteTarget.lastName} перемещён во вкладку «Выбывшие».` : `Аккаунт ${deleteTarget.firstName} ${deleteTarget.lastName} удалён.`);
      setDeleteTarget(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить аккаунт.');
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const sendAdminMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageTarget) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/admin/accounts/${messageTarget.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ body: messageBody }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось отправить сообщение.');
      setSuccess(`Сообщение отправлено: ${messageTarget.firstName} ${messageTarget.lastName}.`);
      setMessageTarget(null); setMessageBody('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось отправить сообщение.');
    } finally { setSaving(false); }
  };

  const restoreStudent = async (student: ManagedAccount) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/accounts/${student.id}/restore`, { method: 'POST', credentials: 'same-origin' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось вернуть ученика.');
      await loadAccounts();
      setSuccess(`${student.firstName} ${student.lastName} возвращён в список учеников.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось вернуть ученика.');
    }
  };

  const saveSchedule = async (nextSchedule: WeeklySchedule) => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/schedule', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify(nextSchedule),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось сохранить расписание.');
      setSchedule({ lessons: result.lessons, targets: result.targets || {} });
      setSuccess('Расписание сохранено.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить расписание.');
    } finally { setSaving(false); }
  };

  const createScheduledLesson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleSlot || !selectedTeacher || !selectedStudent) return;
    if (teacherScheduleTarget === undefined || teacherScheduleTarget < 1) { setError('Сначала сохраните план занятий на неделю.'); return; }
    if (studentLessons.length >= teacherScheduleTarget) { setError('Все запланированные занятия уже добавлены. Увеличьте план, чтобы добавить ещё.'); return; }
    if (schedule.lessons.some((lesson) => lesson.teacherId === selectedTeacher.id && lesson.day === scheduleSlot.day && lesson.hour === scheduleSlot.hour)) {
      setError('Этот час уже занят.'); return;
    }
    const lesson: ScheduledLesson = { id: crypto.randomUUID(), studentId: selectedStudent.id, teacherId: selectedTeacher.id, day: scheduleSlot.day, hour: scheduleSlot.hour, title: scheduleTitle.trim() };
    await saveSchedule({ ...schedule, lessons: [...schedule.lessons, lesson] });
    setScheduleSlot(null); setScheduleTitle('');
  };

  const moveScheduledLesson = async (lessonId: string, day: number, hour: number) => {
    const lesson = schedule.lessons.find((item) => item.id === lessonId);
    if (!lesson || schedule.lessons.some((item) => item.id !== lessonId && item.teacherId === lesson.teacherId && item.day === day && item.hour === hour)) {
      setError('Время занято другим уроком этого преподавателя.'); return;
    }
    await saveSchedule({ ...schedule, lessons: schedule.lessons.map((item) => item.id === lessonId ? { ...item, day, hour } : item) });
  };

  const removeScheduledLesson = async (lessonId: string) => {
    await saveSchedule({ ...schedule, lessons: schedule.lessons.filter((lesson) => lesson.id !== lessonId) });
  };

  const setStudentLessonTarget = async (count: number) => {
    if (!selectedStudent) return;
    await saveSchedule({ ...schedule, targets: { ...schedule.targets, [selectedStudent.id]: count } });
  };

  const toggleAdminTheme = () => {
    const nextTheme = !darkTheme;
    setDarkTheme(nextTheme);
    void fetch('/api/admin/history/theme', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ theme: nextTheme ? 'dark' : 'light' }),
    });
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.replace('/admin_login');
  };

  const changeAdminPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newAdminPassword !== confirmAdminPassword) {
      setError('Новый пароль и подтверждение не совпадают.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ currentPassword: currentAdminPassword, newPassword: newAdminPassword }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось сменить пароль.');
      setCurrentAdminPassword(''); setNewAdminPassword(''); setConfirmAdminPassword('');
      setSuccess('Пароль администратора успешно изменён.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось подключиться к серверу.');
    } finally {
      setSaving(false);
    }
  };

  const roleIcon = (role: AccountRole) => role === 'student' ? <GraduationCap className="h-5 w-5" /> : role === 'parent' ? <Users className="h-5 w-5" /> : <BriefcaseBusiness className="h-5 w-5" />;

  return (
    <main className={`admin-dashboard min-h-screen bg-primary-light text-foreground ${darkTheme ? 'theme-dark' : ''}`}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-white px-5 py-4 shadow-sm sm:px-8">
        <a href="/" className="flex items-center gap-3"><img src="/static/ST.webp" alt="StudyTask" className="h-10 w-10 rounded-lg object-contain" /><span><strong className="block font-display text-lg">StudyTask</strong><span className="text-xs text-muted">Панель администратора</span></span></a>
        <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-primary-light"><LogOut className="h-4 w-4" /> Выйти</button>
      </header>
      <div className="flex min-h-[calc(100vh-73px)] w-full flex-col lg:flex-row">
        <aside className="border-b border-border bg-white p-4 lg:w-64 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-3 flex items-center justify-between px-3"><p className="text-xs font-extrabold uppercase tracking-wider text-muted">Управление</p><div className="flex items-center gap-2"><button type="button" onClick={() => { setActiveView('history'); setError(''); setSuccess(''); void loadHistory(); }} title="История действий" aria-label="Открыть историю действий" className={`rounded p-0.5 text-muted transition hover:text-primary ${activeView === 'history' ? 'text-primary' : ''}`}><History className="h-4 w-4" /></button><button type="button" onClick={() => setActiveView('settings')} title="Настройки" aria-label="Открыть настройки" className={`rounded p-0.5 text-muted transition hover:text-primary ${activeView === 'settings' ? 'text-primary' : ''}`}><Settings className="h-4 w-4" /></button></div></div>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            <button type="button" onClick={() => { setActiveView('dashboard'); setError(''); setSuccess(''); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeView === 'dashboard' ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-primary-light hover:text-primary'}`}><BarChart3 className="h-5 w-5" /> Дэшборд</button>
            {(['student', 'parent', 'teacher'] as AccountRole[]).map((role) => (
              <button key={role} type="button" onClick={() => { switchRole(role); setActiveView('accounts'); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeView === 'accounts' && activeRole === role ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-primary-light hover:text-primary'}`}>
                {roleIcon(role)} {ROLE_LABELS[role]} <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${activeView === 'accounts' && activeRole === role ? 'bg-white/20' : 'bg-primary-light'}`}>{accounts.filter((account) => account.role === role && (role !== 'student' || account.status !== 'withdrawn')).length}</span>
              </button>
            ))}
            <button type="button" onClick={() => { setActiveRole('student'); setActiveView('withdrawn'); setSearch(''); setSelectedClasses([]); setError(''); setSuccess(''); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeView === 'withdrawn' ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-primary-light hover:text-primary'}`}><GraduationCap className="h-5 w-5" /> Выбывшие <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${activeView === 'withdrawn' ? 'bg-white/20' : 'bg-primary-light'}`}>{accounts.filter((account) => account.role === 'student' && account.status === 'withdrawn').length}</span></button>
            <button type="button" onClick={() => { setActiveView('schedule'); setError(''); setSuccess(''); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeView === 'schedule' ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-primary-light hover:text-primary'}`}><CalendarDays className="h-5 w-5" /> Расписание</button>
            <button type="button" onClick={() => { setActiveView('trial'); setError(''); setSuccess(''); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeView === 'trial' ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-primary-light hover:text-primary'}`}><UserPlus className="h-5 w-5" /> Пробный урок <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${activeView === 'trial' ? 'bg-white/20' : 'bg-primary-light'}`}>{trialLessons.length}</span></button>
            <button type="button" onClick={() => { setActiveView('crm'); setError(''); setSuccess(''); }} className={`crm-tab flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-extrabold transition ${activeView === 'crm' ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-300' : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'}`}><Settings className="h-5 w-5" /> Настройка CRM</button>
          </nav>
        </aside>

        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-sm font-bold text-primary">{activeView === 'dashboard' ? 'Ключевые показатели центра' : activeView === 'settings' ? 'Параметры панели' : activeView === 'crm' ? 'Управление системой' : activeView === 'schedule' ? 'Планирование занятий' : activeView === 'trial' ? 'Знакомство с центром' : activeView === 'history' ? 'Аудит действий' : 'Управление аккаунтами'}</p><h1 className="mt-1 font-display text-3xl font-extrabold">{activeView === 'dashboard' ? 'Дэшборд' : activeView === 'settings' ? 'Настройки' : activeView === 'crm' ? 'Настройка CRM' : activeView === 'schedule' ? 'Расписание' : activeView === 'trial' ? 'Пробный урок' : activeView === 'history' ? 'История действий' : activeView === 'withdrawn' ? 'Выбывшие' : ROLE_LABELS[activeRole]}</h1></div>
            {(activeView === 'accounts' || activeView === 'withdrawn') && <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-muted shadow-sm">Всего: {roleAccounts.length}</span>}
          </div>

          {activeView === 'dashboard' ? (
            <section className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <article className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-muted">Пробные на этой неделе</span><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><CalendarDays className="h-5 w-5" /></span></div><p className="mt-3 font-display text-3xl font-extrabold">{dashboardTrials.length}</p><p className="mt-1 text-xs text-muted">По дате занятия · неделя {dashboardWeek.start} — {dashboardWeek.end}</p></article>
                <article className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-muted">Записались после пробного</span><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Check className="h-5 w-5" /></span></div><p className="mt-3 font-display text-3xl font-extrabold">{dashboardEnrolledTrials} <span className="text-lg text-muted">/ {dashboardTrials.length}</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-light"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${dashboardTrials.length ? Math.min(100, dashboardEnrolledTrials / dashboardTrials.length * 100) : 0}%` }} /></div><p className="mt-2 text-xs text-muted">Конверсия пробных уроков</p></article>
                <article className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-muted">Активные ученики</span><span className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><GraduationCap className="h-5 w-5" /></span></div><p className="mt-3 font-display text-3xl font-extrabold">{activeStudents.length}</p><p className="mt-1 text-xs text-muted">Всего в центре</p></article>
                <article className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-muted">Новые ученики на этой неделе</span><span className="rounded-xl bg-cyan-50 p-2 text-cyan-700"><UserPlus className="h-5 w-5" /></span></div><p className="mt-3 font-display text-3xl font-extrabold">+{dashboardNewStudents}</p><p className="mt-1 text-xs text-muted">Все регистрации, в том числе без пробного урока</p></article>
                <article className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-muted">Выбывшие ученики</span><span className="rounded-xl bg-rose-50 p-2 text-rose-700"><Trash2 className="h-5 w-5" /></span></div><p className="mt-3 font-display text-3xl font-extrabold">{withdrawnStudents.length}</p><p className="mt-1 text-xs text-muted">Всего в архиве</p></article>
                <article className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-muted">Выбыли на этой неделе</span><span className="rounded-xl bg-rose-50 p-2 text-rose-700"><ArrowRight className="h-5 w-5" /></span></div><p className="mt-3 font-display text-3xl font-extrabold">{dashboardWithdrawnThisWeek}</p><p className="mt-1 text-xs text-muted">По дате перемещения в архив</p></article>
              </div>
              <article className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold">Пробный урок → запись</h2><p className="text-sm text-muted">Сравнение количества назначенных и записавшихся за неделю.</p></div><BarChart3 className="h-6 w-6 text-primary" /></div><div className="space-y-4"><div><div className="mb-1 flex justify-between text-sm"><span>Назначенные пробные</span><strong>{dashboardTrials.length}</strong></div><div className="h-3 rounded-full bg-primary-light"><div className="h-3 rounded-full bg-blue-500" style={{ width: `${dashboardTrials.length ? 100 : 0}%` }} /></div></div><div><div className="mb-1 flex justify-between text-sm"><span>Записавшиеся</span><strong>{dashboardEnrolledTrials}</strong></div><div className="h-3 rounded-full bg-primary-light"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${dashboardTrials.length ? Math.min(100, dashboardEnrolledTrials / dashboardTrials.length * 100) : 0}%` }} /></div></div></div></article>
            </section>
          ) : activeView === 'trial' ? (
            <section className="admin-card rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-lg font-extrabold">Пробные занятия</h2><p className="text-sm text-muted">Заявки, завершённые уроки и результаты.</p></div>{trialSubtab === 'create' && <button type="button" onClick={() => openTrialEditor()} disabled={!teachers.length} className="clay-btn flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50"><Plus className="h-5 w-5" /> Создать пробный урок</button>}</div>
              <div className="mb-5 flex flex-wrap gap-2">{([{ id: 'create', label: 'Создать', count: upcomingTrials.length }, { id: 'no_show', label: 'Не пришедшие', count: noShowTrials.length }, { id: 'past', label: 'Прошедшие пробные', count: pastTrials.length }, { id: 'declined', label: 'Отказавшиеся', count: declinedTrials.length }] as const).map((tab) => <button key={tab.id} type="button" onClick={() => { setTrialSubtab(tab.id); setError(''); setSuccess(''); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${trialSubtab === tab.id ? 'bg-primary text-white' : 'border border-border text-muted hover:bg-primary-light'}`}>{tab.label} <span className="ml-1 opacity-75">{tab.count}</span></button>)}</div>
              {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}{success && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p>}
              {trialSubtab !== 'create' && <div className="mb-5 space-y-3"><div className="relative max-w-xl"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" /><input value={trialSearch} onChange={(event) => setTrialSearch(event.target.value)} className="admin-input w-full rounded-xl border border-border bg-primary-light py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none" placeholder="Поиск по имени, контакту или преподавателю" /></div><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-sm font-bold text-muted">Класс:</span>{[5, 6, 7, 8, 9].map((grade) => { const value = `${grade} класс`; const checked = trialClassFilters.includes(value); return <label key={grade} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition ${checked ? 'border-primary bg-primary text-white' : 'border-border bg-primary-light text-muted hover:border-primary'}`}><input type="checkbox" className="sr-only" checked={checked} onChange={() => setTrialClassFilters((current) => checked ? current.filter((item) => item !== value) : [...current, value])} />{grade} класс</label>; })}{trialClassFilters.length > 0 && <button type="button" onClick={() => setTrialClassFilters([])} className="px-2 text-xs font-bold text-primary">Сбросить</button>}</div></div>}
              {trialSubtab === 'create' ? upcomingTrials.length ? <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead className="bg-primary-light text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Имя ученика</th><th className="px-4 py-3">Класс</th><th className="px-4 py-3">Контакт родителя</th><th className="px-4 py-3">Преподаватель</th><th className="px-4 py-3">Время (Астана)</th><th className="px-4 py-3">Действия</th></tr></thead><tbody>{upcomingTrials.map((lesson) => <tr key={lesson.id} className="border-t border-border"><td className="px-4 py-3 font-bold">{lesson.firstName} {lesson.lastName}</td><td className="px-4 py-3">{lesson.studentClass}</td><td className="px-4 py-3">{lesson.parentPhone}</td><td className="px-4 py-3">{lesson.teacher?.firstName} {lesson.teacher?.lastName}</td><td className="px-4 py-3">{new Date(lesson.scheduledAt).toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty', weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => openTrialEditor(lesson)} className="rounded-lg border border-border p-2 text-primary" title="Перенести урок"><CalendarDays className="h-4 w-4" /></button><button type="button" onClick={() => setConfirmMoveTrial(lesson)} className="rounded-lg border border-emerald-200 p-2 text-emerald-600" title="Перенести в прошедшие пробные" aria-label="Перенести в прошедшие пробные"><ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => void deleteTrialLesson(lesson)} className="rounded-lg border border-rose-200 p-2 text-rose-600" title="Удалить пробный урок"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div> : <EmptyTrialState message="Предстоящих пробных уроков пока нет. Создайте запись кнопкой выше." /> : trialSubtab === 'no_show' ? filteredNoShowTrials.length ? <div className="space-y-2">{filteredNoShowTrials.map((lesson) => <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 p-4"><button type="button" onClick={() => { setSelectedTrial(lesson); setTrialDeclineReason(''); setTrialOtherReason(''); setShowTrialDeclineForm(false); setError(''); }} className="min-w-0 flex-1 text-left hover:text-primary"><strong className="block">{lesson.firstName} {lesson.lastName} · {lesson.studentClass}</strong><span className="text-sm text-muted">Контакт родителя: {lesson.parentPhone} · {lesson.teacher?.firstName} {lesson.teacher?.lastName}</span><span className="block text-xs text-muted">{new Date(lesson.scheduledAt).toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty', weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></button><div className="flex gap-2"><button type="button" onClick={() => openTrialEditor(lesson)} className="rounded-lg border border-border p-2 text-primary" title="Редактировать или перенести"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => { setSelectedTrial(lesson); setTrialDeclineReason(''); setTrialOtherReason(''); setShowTrialDeclineForm(false); setError(''); }} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Информация / записать</button></div></div>)}</div> : <EmptyTrialState message="Не пришедших пробных пока нет." /> : trialSubtab === 'past' ? filteredPastTrials.length ? <div className="space-y-2">{filteredPastTrials.map((lesson) => <button key={lesson.id} type="button" onClick={() => { setSelectedTrial(lesson); setTrialDeclineReason(''); setTrialOtherReason(''); setShowTrialDeclineForm(false); setError(''); }} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-left hover:border-primary hover:bg-primary-light"><span><strong className="block">{lesson.firstName} {lesson.lastName} · {lesson.studentClass}</strong><span className="text-sm text-muted">Контакт родителя: {lesson.parentPhone}</span></span><span className="text-sm font-semibold text-muted">{new Date(lesson.scheduledAt).toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty', weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {lesson.teacher?.firstName} {lesson.teacher?.lastName}</span></button>)}</div> : <EmptyTrialState message="Подходящих завершившихся пробных уроков нет." /> : filteredDeclinedTrials.length ? <div className="space-y-2">{filteredDeclinedTrials.map((lesson) => <button key={lesson.id} type="button" onClick={() => { setSelectedTrial(lesson); setTrialDeclineReason(''); setTrialOtherReason(''); setShowTrialDeclineForm(false); setError(''); }} className="w-full rounded-xl border border-border p-4 text-left hover:border-primary hover:bg-primary-light"><div className="flex flex-wrap justify-between gap-2"><strong>{lesson.firstName} {lesson.lastName} · {lesson.studentClass}</strong><span className="text-sm text-muted">{lesson.parentPhone}</span></div><p className="mt-2 text-sm text-muted">Причина отказа: {lesson.declineReason}</p><span className="mt-2 inline-flex text-xs font-bold text-primary">Открыть карточку и записать →</span></button>)}</div> : <EmptyTrialState message="Подходящих отказавшихся пока нет." />}
            </section>
          ) : activeView === 'history' ? (
            <section className="admin-card rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold">Журнал администраторов</h2><p className="text-sm text-muted">События записываются в Supabase с именем аккаунта и временем.</p></div><button type="button" onClick={() => void loadHistory()} disabled={historyLoading} className="rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-primary-light disabled:opacity-50">Обновить</button></div>
              {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
              {historyLoading ? <p className="py-12 text-center text-sm text-muted">Загружаем историю…</p> : historyEntries.length ? <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[620px] border-collapse text-left text-sm"><thead className="bg-primary-light text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Дата и время</th><th className="px-4 py-3">Администратор</th><th className="px-4 py-3">Действие</th><th className="px-4 py-3">Подробности</th></tr></thead><tbody>{historyEntries.map((entry) => <tr key={entry.id} className="border-t border-border"><td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(entry.at).toLocaleString('ru-KZ', { timeZone: 'Asia/Qyzylorda' })}</td><td className="px-4 py-3 font-bold">{entry.actor}</td><td className="px-4 py-3">{entry.action}</td><td className="px-4 py-3 text-muted">{entry.details || '—'}</td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-border px-4 py-14 text-center"><History className="mx-auto mb-3 h-8 w-8 text-muted" /><p className="font-bold">Действий пока нет</p><p className="mt-1 text-sm text-muted">Новые действия панели появятся здесь.</p></div>}
            </section>
          ) : activeView === 'schedule' ? (
            <section className="admin-card rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <label className="block w-full max-w-sm space-y-1.5 text-sm font-bold">Ученик<select value={selectedStudent?.id || ''} onChange={(event) => setScheduleStudentId(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 focus:border-primary focus:outline-none"><option value="">Выберите ученика</option>{students.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} · {student.studentClass}</option>)}</select></label>
                {selectedStudent && <div className="flex flex-wrap items-end gap-3"><label className="block space-y-1.5 text-sm font-bold">Уроков в неделю<input type="number" min={1} max={100} value={scheduleTargetDraft} onChange={(event) => setScheduleTargetDraft(event.target.value)} className="admin-input w-36 rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 focus:border-primary focus:outline-none" /></label><button type="button" disabled={saving || !Number.isInteger(Number(scheduleTargetDraft)) || Number(scheduleTargetDraft) < 1 || Number(scheduleTargetDraft) > 100} onClick={() => void setStudentLessonTarget(Number(scheduleTargetDraft))} className="mb-px rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50">Сохранить план</button><span className="pb-3 text-sm text-muted">Уже внесено: <strong>{studentLessons.length}</strong></span></div>}
              </div>
              {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
              {success && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p>}
              {!selectedStudent ? <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted" /><p className="font-bold">Сначала добавьте ученика</p><p className="mt-1 text-sm text-muted">Ученик должен быть закреплён за преподавателем.</p></div> : !selectedTeacher ? <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted" /><p className="font-bold">У ученика не назначен преподаватель</p><p className="mt-1 text-sm text-muted">Сначала назначьте преподавателя в карточке ученика.</p></div> : teacherScheduleTarget === undefined || teacherScheduleTarget < 1 ? <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center"><p className="font-bold">Сначала укажите количество уроков в неделю</p><p className="mt-1 text-sm text-muted">Введите план выше и нажмите «Сохранить план», чтобы открыть расписание.</p></div> : (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted"><span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-3 py-1.5"><Clock3 className="h-3.5 w-3.5" /> Каждый слот — 1 час</span><span>Пн–Сб, 08:00–21:00</span><span className="ml-auto inline-flex items-center gap-1"><GripVertical className="h-3.5 w-3.5" /> Перетащите урок в другой свободный слот</span></div>
                  <div className="w-full overflow-hidden rounded-xl border border-border"><div className="w-full min-w-0"><div className="grid grid-cols-[54px_repeat(6,minmax(0,1fr))] border-b border-border bg-primary-light text-[10px] font-extrabold leading-tight text-muted sm:text-xs"><div className="p-2 sm:p-2.5">Время</div>{SCHEDULE_DAYS.map((day) => <div key={day} className="border-l border-border p-2 sm:p-2.5">{day}</div>)}</div>
                    {SCHEDULE_HOURS.map((hour) => <div key={hour} className="grid min-h-[46px] grid-cols-[54px_repeat(6,minmax(0,1fr))] border-b border-border last:border-b-0"><div className="p-1.5 text-[10px] font-bold text-muted sm:p-2 sm:text-xs">{String(hour).padStart(2, '0')}:00</div>{SCHEDULE_DAYS.map((day, dayIndex) => { const lesson = studentLessons.find((item) => item.day === dayIndex && item.hour === hour); const trial = trialLessons.find((item) => isActiveTrial(item) && item.teacherId === selectedTeacher.id && item.day === dayIndex && item.hour === hour); const legacyLesson = schedule.lessons.find((item) => !item.studentId && item.teacherId === selectedTeacher.id && item.day === dayIndex && item.hour === hour); const teacherBusy = schedule.lessons.some((item) => item.teacherId === selectedTeacher.id && item.day === dayIndex && item.hour === hour && item.studentId !== selectedStudent.id) || Boolean(trial); return <div key={`${dayIndex}-${hour}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedLessonId) void moveScheduledLesson(draggedLessonId, dayIndex, hour); setDraggedLessonId(null); }} className={`border-l border-border p-0.5 transition sm:p-1 ${draggedLessonId ? 'bg-blue-50/70' : ''}`}>
                      {lesson ? <article draggable onDragStart={() => setDraggedLessonId(lesson.id)} onDragEnd={() => setDraggedLessonId(null)} className="group h-full min-h-[40px] cursor-grab rounded-md border border-blue-200 bg-blue-50 p-1 text-blue-950 shadow-sm active:cursor-grabbing sm:rounded-lg sm:p-1.5"><div className="flex items-start justify-between gap-0.5"><span className="inline-flex items-center gap-0.5 text-[8px] font-bold leading-tight text-blue-700 sm:gap-1 sm:text-[10px]"><GripVertical className="h-2.5 w-2.5 shrink-0" />{String(hour).padStart(2, '0')}–{String(hour + 1).padStart(2, '0')}</span><button type="button" disabled={saving} onClick={() => void removeScheduledLesson(lesson.id)} title="Удалить урок" aria-label={`Удалить урок ${lesson.title}`} className="rounded p-0.5 text-blue-500 hover:bg-rose-100 hover:text-rose-600"><Trash className="h-3 w-3" /></button></div><p className="mt-0.5 line-clamp-2 break-words text-[9px] font-extrabold leading-tight sm:text-[11px]">{lesson.title}</p></article> : legacyLesson ? <article className="flex h-full min-h-[40px] items-center justify-between gap-0.5 rounded-md border border-amber-200 bg-amber-50 p-1 text-amber-900 sm:rounded-lg sm:p-1.5"><span className="text-[8px] font-semibold leading-tight sm:text-[10px]">Без ученика</span><button type="button" disabled={saving} onClick={() => void removeScheduledLesson(legacyLesson.id)} aria-label="Удалить непривязанный старый урок" className="rounded p-0.5 text-amber-700 hover:bg-rose-100 hover:text-rose-600"><Trash className="h-3 w-3" /></button></article> : trial ? <article className="flex h-full min-h-[40px] items-center justify-center rounded-md border border-amber-200 bg-amber-50 p-1 text-center text-amber-900 sm:rounded-lg sm:p-1.5"><span className="line-clamp-2 text-[8px] font-extrabold leading-tight sm:text-[10px]">Пробный: {trial.firstName} {trial.lastName}</span></article> : teacherBusy ? <div className="flex h-full min-h-[40px] items-center justify-center rounded-md bg-slate-100 px-0.5 text-center text-[8px] font-semibold leading-tight text-slate-500 sm:rounded-lg sm:px-1 sm:text-[10px]">Занят</div> : <button type="button" disabled={studentLessons.length >= teacherScheduleTarget} onClick={() => { setScheduleSlot({ day: dayIndex, hour }); setScheduleTitle(''); setError(''); setSuccess(''); }} className="flex h-full min-h-[40px] w-full items-center justify-center rounded-md border border-dashed border-transparent text-muted/50 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"><Plus className="h-3.5 w-3.5" /><span className="sr-only">Добавить урок: {day}, {hour}:00</span></button>}
                    </div>; })}</div>)}
                  </div></div>
                  <p className="mt-3 text-xs text-muted">Преподаватель: <strong>{selectedTeacher.firstName} {selectedTeacher.lastName}</strong> · Уроки сохраняются с привязкой к выбранному ученику и его преподавателю.</p>
                </>
              )}
            </section>
          ) : activeView === 'crm' ? (
            <section className="crm-empty rounded-2xl border border-blue-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white"><Settings className="h-7 w-7" /></span>
              <h2 className="font-display text-xl font-extrabold">Настройка CRM</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">Раздел готов для будущих инструментов CRM.</p>
            </section>
          ) : activeView === 'settings' ? (
            <div className="grid max-w-3xl gap-6">
              <section className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-primary-light p-2.5 text-primary">{darkTheme ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</span><div><h2 className="font-display text-lg font-extrabold">Оформление</h2><p className="text-sm text-muted">Настройте внешний вид панели для этого браузера.</p></div></div>
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4"><span><strong className="block">Тёмная тема</strong><span className="text-sm text-muted">{darkTheme ? 'Включена' : 'Выключена'}</span></span><button type="button" role="switch" aria-checked={darkTheme} onClick={toggleAdminTheme} className={`relative h-7 w-12 rounded-full transition ${darkTheme ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${darkTheme ? 'left-6' : 'left-1'}`} /></button></div>
              </section>
              <section className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-primary-light p-2.5 text-primary"><KeyRound className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-extrabold">Смена пароля</h2><p className="text-sm text-muted">Подтвердите текущий пароль и задайте новый.</p></div></div>
                <form onSubmit={changeAdminPassword} className="space-y-4">
                  <label className="block space-y-1.5 text-sm font-bold">Текущий пароль<input required type="password" autoComplete="current-password" value={currentAdminPassword} onChange={(event) => setCurrentAdminPassword(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label>
                  <label className="block space-y-1.5 text-sm font-bold">Новый пароль<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /><span className="block text-xs font-normal text-muted">От 8 до 128 символов.</span></label>
                  <label className="block space-y-1.5 text-sm font-bold">Повторите новый пароль<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmAdminPassword} onChange={(event) => setConfirmAdminPassword(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label>
                  {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
                  {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p>}
                  <button type="submit" disabled={saving} className="clay-btn flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60"><KeyRound className="h-4 w-4" />{saving ? 'Сохраняем…' : 'Сменить пароль'}</button>
                </form>
              </section>
            </div>
          ) : (
          <section className="admin-card w-full rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3"><span className="rounded-xl bg-primary-light p-2.5 text-primary">{roleIcon(activeRole)}</span><div><h2 className="font-display text-lg font-extrabold">Список: {ROLE_LABELS[activeRole].toLowerCase()}</h2><p className="text-sm text-muted">Найдено: {visibleAccounts.length}</p></div></div>
              {activeView !== 'withdrawn' && <button type="button" onClick={openCreateAccount} className="clay-btn flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-bold text-white hover:bg-primary-dark"><Plus className="h-5 w-5" /> Добавить</button>}
            </div>
            <div className={`mb-5 grid grid-cols-1 gap-4 ${activeRole === 'student' ? 'xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center' : ''}`}>
              <div className={`relative w-full ${activeRole === 'student' ? 'min-w-0' : 'min-w-64 max-w-xl flex-1'}`}><Search className="absolute left-3 top-3 h-4 w-4 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="admin-input w-full rounded-xl border border-border bg-primary-light py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none" placeholder={`Поиск ${activeView === 'withdrawn' ? 'выбывшего ученика' : activeRole === 'student' ? 'ученика' : activeRole === 'parent' ? 'родителя' : 'преподавателя'} по имени`} /></div>
              {activeRole === 'student' && <div className="flex flex-wrap items-center gap-2 xl:justify-end"><span className="mr-1 text-sm font-bold text-muted">Класс:</span>{[5, 6, 7, 8, 9].map((grade) => { const value = `${grade} класс`; const checked = selectedClasses.includes(value); return <label key={grade} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition ${checked ? 'border-primary bg-primary text-white' : 'border-border bg-primary-light text-muted hover:border-primary'}`}><input type="checkbox" className="sr-only" checked={checked} onChange={() => setSelectedClasses((current) => checked ? current.filter((item) => item !== value) : [...current, value])} />{grade} класс</label>; })}{selectedClasses.length > 0 && <button type="button" onClick={() => setSelectedClasses([])} className="px-2 text-xs font-bold text-primary">Сбросить</button>}</div>}
            </div>
            {success && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p>}
            {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
              {loading ? <p className="py-16 text-center text-sm text-muted">Загружаем список…</p> : visibleAccounts.length ? (
              <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="bg-primary-light text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Имя и фамилия</th><th className="px-4 py-3">Телефон</th>{activeRole === 'student' && <><th className="px-4 py-3">Класс</th><th className="px-4 py-3">Преподаватель</th></>}{activeRole === 'parent' && <th className="px-4 py-3">Дети</th>}<th className="px-4 py-3 text-right">Действия</th></tr></thead><tbody>{visibleAccounts.map((account) => <tr key={account.id} className="border-t border-border hover:bg-primary-light/50"><td className="px-4 py-3 font-bold">{activeRole === 'teacher' ? <button type="button" onClick={() => setSelectedTeacherSchedule(account)} className="rounded px-1 py-0.5 text-left font-bold text-primary hover:underline">{account.firstName} {account.lastName}</button> : `${account.firstName} ${account.lastName}`}</td><td className="px-4 py-3 text-muted">{account.phone}</td>{activeRole === 'student' && <><td className="px-4 py-3">{account.studentClass || '—'}</td><td className="px-4 py-3">{account.teacher ? `${account.teacher.firstName} ${account.teacher.lastName}` : <span className="text-amber-600">Не назначен</span>}</td></>}{activeRole === 'parent' && <td className="max-w-sm px-4 py-3 text-muted">{account.children.map((child) => `${child.firstName} ${child.lastName}`).join(', ') || '—'}</td>}<td className="px-4 py-3"><div className="flex justify-end gap-2">{(account.role === 'student' || account.role === 'parent' || account.role === 'teacher') && activeView !== 'withdrawn' && <button type="button" onClick={() => { setMessageTarget(account); setMessageBody(''); setError(''); }} title="Написать сообщение" aria-label={`Написать ${account.firstName} ${account.lastName}`} className="rounded-lg border border-border p-2 text-blue-600 hover:bg-blue-50"><MessageCircle className="h-4 w-4" /></button>}<button type="button" onClick={() => openEditAccount(account)} title="Редактировать" aria-label={`Редактировать ${account.firstName} ${account.lastName}`} className="rounded-lg border border-border p-2 text-primary hover:bg-primary-light"><Pencil className="h-4 w-4" /></button>{activeView === 'withdrawn' ? <button type="button" onClick={() => restoreStudent(account)} title="Вернуть в список учеников" aria-label={`Вернуть ${account.firstName} ${account.lastName}`} className="rounded-lg border border-emerald-200 p-2 text-emerald-600 hover:bg-emerald-50"><RotateCcw className="h-4 w-4" /></button> : <button type="button" onClick={() => setDeleteTarget(account)} title={account.role === 'student' ? 'Переместить в выбывшие' : 'Удалить'} aria-label={account.role === 'student' ? `Переместить ${account.firstName} ${account.lastName} в выбывшие` : `Удалить ${account.firstName} ${account.lastName}`} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table></div>
            ) : <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center"><span className="mx-auto mb-3 block w-fit rounded-full bg-primary-light p-3 text-primary">{roleIcon(activeRole)}</span><p className="font-bold">{roleAccounts.length ? 'Ничего не найдено' : 'Аккаунтов пока нет'}</p><p className="mt-1 text-sm text-muted">{roleAccounts.length ? 'Измените поисковый запрос или фильтры.' : 'Нажмите «Добавить», чтобы создать первый аккаунт.'}</p></div>}
          </section>
          )}
          {showTrialModal && (
            <div className="admin-modal fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTrialModal(false); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="trial-modal-title" className="admin-card my-auto w-full max-w-xl rounded-2xl border border-border bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><UserPlus className="h-5 w-5" /></span><div><h2 id="trial-modal-title" className="font-display text-xl font-extrabold">{editingTrialId ? 'Перенести пробный урок' : 'Создать пробный урок'}</h2><p className="text-sm text-muted">Ученик пока не получает логин в личный кабинет.</p></div></div>
                <form onSubmit={createTrialLesson} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1.5 text-sm font-bold">Имя<input autoFocus required maxLength={80} value={trialFirstName} onChange={(event) => setTrialFirstName(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label><label className="block space-y-1.5 text-sm font-bold">Фамилия<input required maxLength={80} value={trialLastName} onChange={(event) => setTrialLastName(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label></div>
                  <label className="block space-y-1.5 text-sm font-bold">Класс<select required value={trialClass} onChange={(event) => setTrialClass(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none">{[5, 6, 7, 8, 9].map((grade) => <option key={grade} value={`${grade} класс`}>{grade} класс</option>)}</select></label>
                  <label className="block space-y-1.5 text-sm font-bold">Контакт родителя<input required type="tel" autoComplete="tel" value={trialParentPhone} onChange={(event) => setTrialParentPhone(event.target.value)} placeholder="+7 700 000 00 00" className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label>
                  <label className="block space-y-1.5 text-sm font-bold">Преподаватель<select required value={trialTeacherId} onChange={(event) => { setTrialTeacherId(event.target.value); setTrialSlot(''); }} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none"><option value="">Выберите преподавателя</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}</select></label>
                  <fieldset disabled={!trialTeacherId} className="space-y-2"><legend className="text-sm font-bold">Выберите свободный слот</legend><p className="text-xs text-muted">Понедельник–суббота, 08:00–21:00. Занятые часы отмечены и недоступны.</p><div className="overflow-x-auto rounded-xl border border-border"><div className="min-w-[540px]"><div className="grid grid-cols-[52px_repeat(6,minmax(0,1fr))] border-b border-border bg-primary-light text-[10px] font-extrabold text-muted"><div className="p-2">Время</div>{SCHEDULE_DAYS.map((day) => <div key={day} className="border-l border-border p-2">{day.slice(0, 3)}</div>)}</div>{SCHEDULE_HOURS.map((hour) => <div key={hour} className="grid min-h-9 grid-cols-[52px_repeat(6,minmax(0,1fr))] border-b border-border last:border-0"><div className="p-2 text-[10px] font-bold text-muted">{String(hour).padStart(2, '0')}:00</div>{SCHEDULE_DAYS.map((day, dayIndex) => { const value = `${dayIndex}:${hour}`; const selected = trialSlot === value; const taken = trialTeacherId && isTrialSlotTaken(dayIndex, hour); return <button key={day} type="button" disabled={!trialTeacherId || Boolean(taken)} aria-pressed={selected} aria-label={`${day}, ${hour}:00${taken ? ', занято' : ''}`} onClick={() => setTrialSlot(value)} className={`border-l border-border px-1 py-1 text-[9px] font-bold transition ${selected ? 'bg-primary text-white' : taken ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'text-muted hover:bg-blue-50 hover:text-primary'}`}>{selected ? 'Выбрано' : taken ? 'Занято' : <Plus className="mx-auto h-3 w-3" />}</button>; })}</div>)}</div></div></fieldset>
                  {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
                  <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowTrialModal(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-primary-light">Отмена</button><button type="submit" disabled={saving || !trialTeacherId || !trialSlot} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Сохраняем…' : editingTrialId ? 'Сохранить перенос' : 'Создать пробный урок'}</button></div>
                </form>
              </section>
            </div>
          )}
          {selectedTeacherSchedule && (
            <div className="admin-modal fixed inset-0 z-[115] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTeacherSchedule(null); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="teacher-schedule-title" className="admin-card my-auto w-full max-w-7xl rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-7">
                <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-primary">Расписание преподавателя</p><h2 id="teacher-schedule-title" className="font-display text-2xl font-extrabold">{selectedTeacherSchedule.firstName} {selectedTeacherSchedule.lastName}</h2><p className="text-sm text-muted">Регулярные занятия учеников и пробные уроки · 08:00–21:00</p></div><button type="button" onClick={() => setSelectedTeacherSchedule(null)} aria-label="Закрыть расписание" className="rounded-lg p-2 text-muted hover:bg-primary-light"><X className="h-5 w-5" /></button></div>
                <div className="max-h-[70vh] overflow-auto rounded-xl border border-border"><table className="w-full min-w-[980px] border-collapse text-left text-xs"><thead className="sticky top-0 z-10 bg-primary-light text-muted"><tr><th className="sticky left-0 z-20 bg-primary-light px-3 py-3">Время</th>{SCHEDULE_DAYS.map((day) => <th key={day} className="border-l border-border px-3 py-3">{day}</th>)}</tr></thead><tbody>{SCHEDULE_HOURS.map((hour) => <tr key={hour} className="border-t border-border"><th className="sticky left-0 bg-primary-light px-3 py-3 font-bold text-muted">{String(hour).padStart(2, '0')}:00</th>{SCHEDULE_DAYS.map((day, dayIndex) => {
                  const regularLessons = schedule.lessons.filter((lesson) => lesson.teacherId === selectedTeacherSchedule.id && lesson.day === dayIndex && lesson.hour === hour);
                  const trialSlotLessons = trialLessons.filter((lesson) => lesson.teacherId === selectedTeacherSchedule.id && lesson.day === dayIndex && lesson.hour === hour);
                  return <td key={day} className="min-w-36 border-l border-border p-2 align-top"><div className="space-y-1.5">{regularLessons.map((lesson) => { const student = accounts.find((account) => account.id === lesson.studentId); return <div key={lesson.id} className="rounded-lg bg-blue-50 p-2"><strong className="block text-blue-900">{student ? `${student.firstName} ${student.lastName}` : lesson.title}</strong><span className="text-[10px] text-blue-700">{student?.studentClass || lesson.title || 'Ученик'}</span></div>; })}{trialSlotLessons.map((lesson) => <div key={lesson.id} className={`rounded-lg p-2 ${lesson.status === 'no_show' ? 'bg-rose-50' : lesson.status === 'enrolled' ? 'bg-emerald-50' : 'bg-amber-50'}`}><strong className="block">{lesson.firstName} {lesson.lastName}</strong><span className="block text-[10px]">Пробный · {lesson.studentClass}</span><span className="block text-[10px] font-bold">{lesson.status === 'no_show' ? 'Не пришёл' : lesson.status === 'attended' ? 'Пришёл' : lesson.status === 'enrolled' ? 'Записался' : lesson.status === 'declined' ? 'Отказ' : 'Назначен'}</span></div>)}{!regularLessons.length && !trialSlotLessons.length && <span className="text-muted/50">—</span>}</div></td>;
                })}</tr>)}</tbody></table></div>
                <p className="mt-3 text-xs text-muted">Нажмите на имя преподавателя в списке, чтобы открыть это расписание.</p>
              </section>
            </div>
          )}
          {confirmMoveTrial && (
            <div className="admin-modal fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmMoveTrial(null); }}>
              <section role="alertdialog" aria-modal="true" aria-labelledby="move-trial-title" className="admin-card w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl"><span className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-700"><ArrowRight className="h-6 w-6" /></span><h2 id="move-trial-title" className="font-display text-xl font-extrabold">Перенести пробный урок?</h2><p className="mt-2 text-sm text-muted">Урок для {confirmMoveTrial.firstName} {confirmMoveTrial.lastName} будет отмечен как прошедший и появится во вкладке «Прошедшие пробные».</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmMoveTrial(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-primary-light">Отмена</button><button type="button" onClick={() => { const lesson = confirmMoveTrial; setConfirmMoveTrial(null); void moveTrialToPast(lesson); }} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Подтвердить</button></div></section>
            </div>
          )}
          {selectedTrial && (
            <div className="admin-modal fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTrial(null); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="past-trial-title" className="admin-card my-auto w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><UserPlus className="h-5 w-5" /></span><div><h2 id="past-trial-title" className="font-display text-xl font-extrabold">Результат пробного урока</h2><p className="text-sm text-muted">Урок завершён по времени Астаны</p></div></div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-primary-light p-4 text-sm"><dt className="text-muted">Имя</dt><dd className="font-bold">{selectedTrial.firstName} {selectedTrial.lastName}</dd><dt className="text-muted">Класс</dt><dd className="font-bold">{selectedTrial.studentClass}</dd><dt className="text-muted">Контакт родителя</dt><dd className="font-bold">{selectedTrial.parentPhone}</dd><dt className="text-muted">Преподаватель</dt><dd className="font-bold">{selectedTrial.teacher?.firstName} {selectedTrial.teacher?.lastName}</dd><dt className="text-muted">Время (Астана)</dt><dd className="font-bold">{new Date(selectedTrial.scheduledAt).toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</dd>{selectedTrial.status === 'no_show' && <><dt className="text-muted">Результат</dt><dd className="font-bold text-rose-700">Ученик не пришёл</dd></>}{selectedTrial.status === 'declined' && <><dt className="text-muted">Причина отказа</dt><dd className="font-bold">{selectedTrial.declineReason}</dd></>}</dl>
                {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
                {showTrialDeclineForm ? <div className="mt-5 space-y-3"><p className="text-sm font-bold">Укажите причину отказа</p>{['Не подошло расписание', 'Не устроила стоимость', 'Передумали или пока неактуально', 'Выбрали другой учебный центр', 'Не удалось связаться или ученик не пришёл', 'Другое'].map((reason) => <label key={reason} className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="trial-decline-reason" value={reason} checked={trialDeclineReason === reason} onChange={() => setTrialDeclineReason(reason)} className="accent-primary" />{reason}</label>)}{trialDeclineReason === 'Другое' && <textarea rows={3} maxLength={500} value={trialOtherReason} onChange={(event) => setTrialOtherReason(event.target.value)} placeholder="Укажите причину" className="admin-input w-full rounded-xl border-2 border-border bg-primary-light p-3 text-sm focus:border-primary focus:outline-none" />}<div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowTrialDeclineForm(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted">Назад</button><button type="button" disabled={saving || !trialDeclineReason || (trialDeclineReason === 'Другое' && !trialOtherReason.trim())} onClick={() => void finishTrial('declined')} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Сохраняем…' : 'Подтвердить отказ'}</button></div></div> : <div className="mt-6 flex flex-wrap justify-end gap-3">{selectedTrial.status === 'no_show' && <button type="button" onClick={() => { const lesson = selectedTrial; setSelectedTrial(null); openTrialEditor(lesson); }} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary-light">Редактировать</button>}{!['declined', 'no_show'].includes(selectedTrial.status) && <button type="button" onClick={() => setShowTrialDeclineForm(true)} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50">Отказ</button>}<button type="button" disabled={saving} onClick={() => void finishTrial('enrolled')} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50">{saving ? 'Создаём…' : 'Записался'}</button></div>}
              </section>
            </div>
          )}
          {scheduleSlot && (
            <div className="admin-modal fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScheduleSlot(null); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title" className="admin-card w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl"><div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><CalendarDays className="h-5 w-5" /></span><div><h2 id="schedule-modal-title" className="font-display text-xl font-extrabold">Новый урок</h2><p className="text-sm text-muted">{SCHEDULE_DAYS[scheduleSlot.day]}, {String(scheduleSlot.hour).padStart(2, '0')}:00–{String(scheduleSlot.hour + 1).padStart(2, '0')}:00</p></div></div><form onSubmit={createScheduledLesson} className="space-y-4"><label className="block space-y-1.5 text-sm font-bold">Название урока или группы<input autoFocus required maxLength={100} value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" placeholder="Например: Математика, 7 класс" /></label><p className="text-sm text-muted">Ученик: <strong>{selectedStudent?.firstName} {selectedStudent?.lastName}</strong><br />Преподаватель: <strong>{selectedTeacher?.firstName} {selectedTeacher?.lastName}</strong></p>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setScheduleSlot(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-primary-light">Отмена</button><button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">Добавить урок</button></div></form></section>
            </div>
          )}
          {showAccountModal && (
            <div className="admin-modal fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAccountModal(false); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="account-modal-title" className="admin-card my-auto w-full max-w-2xl rounded-2xl border border-border bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary-light p-2.5 text-primary">{roleIcon(activeRole)}</span><div><h2 id="account-modal-title" className="font-display text-xl font-extrabold">{editingAccountId ? 'Редактировать аккаунт' : `Новый аккаунт: ${ROLE_LABELS[activeRole].toLowerCase()}`}</h2><p className="text-xs text-muted">Логин — номер телефона</p></div></div><button type="button" onClick={() => setShowAccountModal(false)} aria-label="Закрыть" className="rounded-lg p-2 text-muted hover:bg-primary-light"><X className="h-5 w-5" /></button></header>
                <form onSubmit={saveAccount} className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto p-5 sm:p-7">
                  {trialConversionInfo && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{trialConversionInfo}</p>}
                  <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-bold">Имя<input required maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label><label className="space-y-1.5 text-sm font-bold">Фамилия<input required maxLength={80} value={lastName} onChange={(event) => setLastName(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label></div>
                  <label className="block space-y-1.5 text-sm font-bold">Номер телефона<input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" placeholder="+7 700 000 00 00" /></label>
                  <label className="block space-y-1.5 text-sm font-bold">{editingAccountId ? 'Новый пароль (необязательно)' : 'Пароль'}<input required={!editingAccountId} type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" placeholder={editingAccountId ? 'Оставьте пустым, чтобы не менять' : 'Минимум 8 символов'} /></label>
                  {activeRole === 'student' && <><label className="block space-y-1.5 text-sm font-bold">Класс<select required value={studentClass} onChange={(event) => setStudentClass(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none">{[5, 6, 7, 8, 9].map((grade) => <option key={grade}>{grade} класс</option>)}</select></label><label className="block space-y-1.5 text-sm font-bold">Преподаватель<select required value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none"><option value="">Выберите преподавателя</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}</select>{teachers.length === 0 && <span className="block text-xs font-normal text-amber-700">Сначала создайте аккаунт преподавателя.</span>}</label>{editingAccountId && <label className="block space-y-1.5 text-sm font-bold">Родитель<select value={studentParentId} onChange={(event) => setStudentParentId(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none"><option value="">Не привязан</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.firstName} {parent.lastName} · {parent.phone}{parent.id === studentParentId ? ' · выбран' : ''}</option>)}</select><span className="block text-xs font-normal text-muted">Сейчас прикреплён: {parents.find((parent) => parent.id === studentParentId) ? `${parents.find((parent) => parent.id === studentParentId)?.firstName} ${parents.find((parent) => parent.id === studentParentId)?.lastName}` : 'родитель не выбран'}.</span></label>}</>}
                  {activeRole === 'parent' && <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-bold">Привязать детей <span className="text-rose-600">*</span></span><span className="text-xs text-muted">Выбрано: {selectedChildren.length}</span></div><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" /><input value={childSearch} onChange={(event) => setChildSearch(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" placeholder="Поиск ученика по имени" /></div><div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border p-2">{matchingChildren.length ? matchingChildren.map((child) => <label key={child.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-primary-light"><input type="checkbox" checked={selectedChildren.includes(child.id)} onChange={(event) => setSelectedChildren((current) => event.target.checked ? [...current, child.id] : current.filter((id) => id !== child.id))} className="h-4 w-4 accent-primary" /><span className="min-w-0 flex-1"><strong>{child.firstName} {child.lastName}</strong><span className="ml-2 text-xs text-muted">{child.studentClass}</span></span></label>) : <p className="p-3 text-center text-xs text-muted">{students.length ? 'Ученики не найдены.' : 'Сначала создайте аккаунт ученика.'}</p>}</div></div>}
                  {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowAccountModal(false)} className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-muted hover:bg-primary-light">Отмена</button><button type="submit" disabled={saving || (activeRole === 'parent' && selectedChildren.length === 0) || (activeRole === 'student' && teachers.length === 0)} className="clay-btn rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Сохраняем…' : editingAccountId ? 'Сохранить изменения' : 'Создать аккаунт'}</button></div>
                </form>
              </section>
            </div>
          )}
          {messageTarget && (
            <div className="admin-modal fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMessageTarget(null); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="message-modal-title" className="admin-card w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><MessageCircle className="h-5 w-5" /></span><div><h2 id="message-modal-title" className="font-display text-xl font-extrabold">Новое сообщение</h2><p className="text-sm text-muted">Для {messageTarget.role === 'student' ? 'ученика' : messageTarget.role === 'parent' ? 'родителя' : 'преподавателя'}: {messageTarget.firstName} {messageTarget.lastName}</p></div></div><button type="button" onClick={() => setMessageTarget(null)} aria-label="Закрыть" className="rounded-lg p-2 text-muted hover:bg-primary-light"><X className="h-5 w-5" /></button></div>
                <form onSubmit={sendAdminMessage} className="space-y-4"><label htmlFor="account-message" className="block space-y-1.5 text-sm font-bold">Текст сообщения<textarea id="account-message" autoFocus required maxLength={5000} rows={6} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="admin-input w-full resize-y rounded-xl border-2 border-border bg-primary-light p-3 font-normal focus:border-primary focus:outline-none" placeholder="Введите сообщение для личного кабинета" /><span className="block text-right text-xs font-normal text-muted">{messageBody.length}/5000</span></label>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setMessageTarget(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-primary-light">Отмена</button><button type="submit" disabled={saving || !messageBody.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Отправляем…' : <><Send className="h-4 w-4" /> Отправить</>}</button></div></form>
              </section>
            </div>
          )}
          {deleteTarget && (
            <div className="admin-modal fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
              <section role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title" className="admin-card w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl"><span className="mb-4 inline-flex rounded-xl bg-rose-50 p-3 text-rose-600"><Trash2 className="h-6 w-6" /></span><h2 id="delete-modal-title" className="font-display text-xl font-extrabold">{deleteTarget.role === 'student' ? 'Переместить в «Выбывшие»?' : 'Удалить аккаунт?'}</h2><p className="mt-2 text-sm text-muted">{deleteTarget.role === 'student' ? `Ученик «${deleteTarget.firstName} ${deleteTarget.lastName}» будет перемещён из активного списка в архив выбывших.` : `Аккаунт «${deleteTarget.firstName} ${deleteTarget.lastName}» будет удалён без возможности восстановления.`}</p>{deleteTarget.role === 'student' && <p className="mt-2 text-xs text-muted">Ученик не сможет войти в профиль, пока находится в архиве. Его можно будет вернуть из вкладки «Выбывшие».</p>}{deleteTarget.role === 'teacher' && <p className="mt-2 text-xs text-muted">К преподавателю не должны быть прикреплены активные ученики.</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-primary-light">Отмена</button><button type="button" disabled={saving} onClick={confirmDeleteAccount} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? 'Обрабатываем…' : deleteTarget.role === 'student' ? 'Переместить' : 'Удалить'}</button></div></section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
