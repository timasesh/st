import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, LogIn, ShieldCheck, UserRound, Users, GraduationCap, BriefcaseBusiness, Search, Plus, LogOut, Settings, Moon, Sun, Pencil, Trash2, X, RotateCcw, CalendarDays, Clock3, GripVertical, Trash, History } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type LoginPageProps = {
  onLoginSuccess: (name: string, studentClass: string, accountId: string, progress: Partial<LoginProgress> | null, role: 'student' | 'parent' | 'teacher') => void;
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

export function StudentLoginPage({ onLoginSuccess }: LoginPageProps) {
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
        body: JSON.stringify({ phone, password }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось войти. Проверьте номер телефона и пароль.');
      const account = result.account as { id: string; role: 'student' | 'parent' | 'teacher'; firstName: string; lastName: string; studentClass?: string };
      onLoginSuccess(`${account.firstName} ${account.lastName}`, account.studentClass || '', account.id, result.progress || null, account.role);
      window.location.assign('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось подключиться к серверу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="ЛИЧНЫЙ КАБИНЕТ УЧЕНИКА">
      <UserRound className="mx-auto mb-2 mt-4 h-9 w-9 text-blue-100" />
      <h1 className="font-display text-2xl font-extrabold">С возвращением!</h1>
      <p className="mt-1 text-sm text-blue-100">Вход для ученика, родителя или преподавателя</p>
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

type AccountRole = 'student' | 'parent' | 'teacher';
type ManagedAccount = {
  id: string; role: AccountRole; phone: string; firstName: string; lastName: string;
  studentClass?: string; teacherId?: string; teacher?: { id: string; firstName: string; lastName: string } | null;
  status?: 'active' | 'withdrawn';
  children: Array<{ id: string; firstName: string; lastName: string; studentClass?: string }>;
};

type ScheduledLesson = { id: string; studentId?: string; teacherId: string; day: number; hour: number; title: string };
type WeeklySchedule = { lessons: ScheduledLesson[]; targets: Record<string, number> };
type AdminHistoryEntry = { id: string; at: string; actor: string; action: string; details?: string };
const SCHEDULE_DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const SCHEDULE_HOURS = Array.from({ length: 13 }, (_, index) => index + 8);

const ROLE_LABELS: Record<AccountRole, string> = { student: 'Ученики', parent: 'Родители', teacher: 'Преподаватели' };

export function AdminDashboardPage() {
  const [authorized, setAuthorized] = useState(false);
  const [activeRole, setActiveRole] = useState<AccountRole>('student');
  const [activeView, setActiveView] = useState<'accounts' | 'withdrawn' | 'crm' | 'settings' | 'schedule' | 'history'>('accounts');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedAccount | null>(null);
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
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.message.includes('Сервер авторизации')) setError(reason.message);
        else window.location.replace('/admin_login');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try { localStorage.setItem('study_admin_theme', darkTheme ? 'dark' : 'light'); } catch { /* Theme still applies for this session. */ }
  }, [darkTheme]);

  const roleAccounts = accounts.filter((account) => account.role === activeRole && (activeView === 'withdrawn' ? account.status === 'withdrawn' : activeRole !== 'student' || account.status !== 'withdrawn'));
  const visibleAccounts = roleAccounts.filter((account) => `${account.firstName} ${account.lastName}`.toLowerCase().includes(search.toLowerCase()) && (activeRole !== 'student' || selectedClasses.length === 0 || selectedClasses.includes(account.studentClass || '')));
  const students = accounts.filter((account) => account.role === 'student' && account.status !== 'withdrawn');
  const teachers = accounts.filter((account) => account.role === 'teacher');
  const selectedStudent = students.find((student) => student.id === scheduleStudentId) || students[0];
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedStudent?.teacherId);
  const studentLessons = schedule.lessons.filter((lesson) => lesson.studentId === selectedStudent?.id);
  const teacherScheduleTarget = selectedStudent ? schedule.targets[selectedStudent.id] : undefined;

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
    setStudentClass('5 класс'); setTeacherId(''); setSelectedChildren([]); setError(''); setSuccess(''); setShowAccountModal(true);
  };

  const openEditAccount = (account: ManagedAccount) => {
    setEditingAccountId(account.id); setFirstName(account.firstName); setLastName(account.lastName); setPhone(account.phone);
    setPassword(''); setStudentClass(account.studentClass || '5 класс'); setTeacherId(account.teacherId || '');
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
        body: JSON.stringify({ role: activeRole, firstName, lastName, phone, ...(password ? { password } : {}), studentClass, teacherId, children: selectedChildren }),
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
            {(['student', 'parent', 'teacher'] as AccountRole[]).map((role) => (
              <button key={role} type="button" onClick={() => { switchRole(role); setActiveView('accounts'); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeView === 'accounts' && activeRole === role ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-primary-light hover:text-primary'}`}>
                {roleIcon(role)} {ROLE_LABELS[role]} <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${activeView === 'accounts' && activeRole === role ? 'bg-white/20' : 'bg-primary-light'}`}>{accounts.filter((account) => account.role === role && (role !== 'student' || account.status !== 'withdrawn')).length}</span>
              </button>
            ))}
            <button type="button" onClick={() => { setActiveRole('student'); setActiveView('withdrawn'); setSearch(''); setSelectedClasses([]); setError(''); setSuccess(''); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeView === 'withdrawn' ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-primary-light hover:text-primary'}`}><GraduationCap className="h-5 w-5" /> Выбывшие <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${activeView === 'withdrawn' ? 'bg-white/20' : 'bg-primary-light'}`}>{accounts.filter((account) => account.role === 'student' && account.status === 'withdrawn').length}</span></button>
            <button type="button" onClick={() => { setActiveView('schedule'); setError(''); setSuccess(''); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeView === 'schedule' ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-primary-light hover:text-primary'}`}><CalendarDays className="h-5 w-5" /> Расписание</button>
            <button type="button" onClick={() => { setActiveView('crm'); setError(''); setSuccess(''); }} className={`crm-tab flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-extrabold transition ${activeView === 'crm' ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-300' : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'}`}><Settings className="h-5 w-5" /> Настройка CRM</button>
          </nav>
        </aside>

        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-sm font-bold text-primary">{activeView === 'settings' ? 'Параметры панели' : activeView === 'crm' ? 'Управление системой' : activeView === 'schedule' ? 'Планирование занятий' : activeView === 'history' ? 'Аудит действий' : 'Управление аккаунтами'}</p><h1 className="mt-1 font-display text-3xl font-extrabold">{activeView === 'settings' ? 'Настройки' : activeView === 'crm' ? 'Настройка CRM' : activeView === 'schedule' ? 'Расписание' : activeView === 'history' ? 'История действий' : activeView === 'withdrawn' ? 'Выбывшие' : ROLE_LABELS[activeRole]}</h1></div>
            {(activeView === 'accounts' || activeView === 'withdrawn') && <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-muted shadow-sm">Всего: {roleAccounts.length}</span>}
          </div>

          {activeView === 'history' ? (
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
                    {SCHEDULE_HOURS.map((hour) => <div key={hour} className="grid min-h-[46px] grid-cols-[54px_repeat(6,minmax(0,1fr))] border-b border-border last:border-b-0"><div className="p-1.5 text-[10px] font-bold text-muted sm:p-2 sm:text-xs">{String(hour).padStart(2, '0')}:00</div>{SCHEDULE_DAYS.map((day, dayIndex) => { const lesson = studentLessons.find((item) => item.day === dayIndex && item.hour === hour); const legacyLesson = schedule.lessons.find((item) => !item.studentId && item.teacherId === selectedTeacher.id && item.day === dayIndex && item.hour === hour); const teacherBusy = schedule.lessons.some((item) => item.teacherId === selectedTeacher.id && item.day === dayIndex && item.hour === hour && item.studentId !== selectedStudent.id); return <div key={`${dayIndex}-${hour}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedLessonId) void moveScheduledLesson(draggedLessonId, dayIndex, hour); setDraggedLessonId(null); }} className={`border-l border-border p-0.5 transition sm:p-1 ${draggedLessonId ? 'bg-blue-50/70' : ''}`}>
                      {lesson ? <article draggable onDragStart={() => setDraggedLessonId(lesson.id)} onDragEnd={() => setDraggedLessonId(null)} className="group h-full min-h-[40px] cursor-grab rounded-md border border-blue-200 bg-blue-50 p-1 text-blue-950 shadow-sm active:cursor-grabbing sm:rounded-lg sm:p-1.5"><div className="flex items-start justify-between gap-0.5"><span className="inline-flex items-center gap-0.5 text-[8px] font-bold leading-tight text-blue-700 sm:gap-1 sm:text-[10px]"><GripVertical className="h-2.5 w-2.5 shrink-0" />{String(hour).padStart(2, '0')}–{String(hour + 1).padStart(2, '0')}</span><button type="button" disabled={saving} onClick={() => void removeScheduledLesson(lesson.id)} title="Удалить урок" aria-label={`Удалить урок ${lesson.title}`} className="rounded p-0.5 text-blue-500 hover:bg-rose-100 hover:text-rose-600"><Trash className="h-3 w-3" /></button></div><p className="mt-0.5 line-clamp-2 break-words text-[9px] font-extrabold leading-tight sm:text-[11px]">{lesson.title}</p></article> : legacyLesson ? <article className="flex h-full min-h-[40px] items-center justify-between gap-0.5 rounded-md border border-amber-200 bg-amber-50 p-1 text-amber-900 sm:rounded-lg sm:p-1.5"><span className="text-[8px] font-semibold leading-tight sm:text-[10px]">Без ученика</span><button type="button" disabled={saving} onClick={() => void removeScheduledLesson(legacyLesson.id)} aria-label="Удалить непривязанный старый урок" className="rounded p-0.5 text-amber-700 hover:bg-rose-100 hover:text-rose-600"><Trash className="h-3 w-3" /></button></article> : teacherBusy ? <div className="flex h-full min-h-[40px] items-center justify-center rounded-md bg-slate-100 px-0.5 text-center text-[8px] font-semibold leading-tight text-slate-500 sm:rounded-lg sm:px-1 sm:text-[10px]">Занят</div> : <button type="button" disabled={studentLessons.length >= teacherScheduleTarget} onClick={() => { setScheduleSlot({ day: dayIndex, hour }); setScheduleTitle(''); setError(''); setSuccess(''); }} className="flex h-full min-h-[40px] w-full items-center justify-center rounded-md border border-dashed border-transparent text-muted/50 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"><Plus className="h-3.5 w-3.5" /><span className="sr-only">Добавить урок: {day}, {hour}:00</span></button>}
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
              <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="bg-primary-light text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Имя и фамилия</th><th className="px-4 py-3">Телефон</th>{activeRole === 'student' && <><th className="px-4 py-3">Класс</th><th className="px-4 py-3">Преподаватель</th></>}{activeRole === 'parent' && <th className="px-4 py-3">Дети</th>}<th className="px-4 py-3 text-right">Действия</th></tr></thead><tbody>{visibleAccounts.map((account) => <tr key={account.id} className="border-t border-border hover:bg-primary-light/50"><td className="px-4 py-3 font-bold">{account.firstName} {account.lastName}</td><td className="px-4 py-3 text-muted">{account.phone}</td>{activeRole === 'student' && <><td className="px-4 py-3">{account.studentClass || '—'}</td><td className="px-4 py-3">{account.teacher ? `${account.teacher.firstName} ${account.teacher.lastName}` : <span className="text-amber-600">Не назначен</span>}</td></>}{activeRole === 'parent' && <td className="max-w-sm px-4 py-3 text-muted">{account.children.map((child) => `${child.firstName} ${child.lastName}`).join(', ') || '—'}</td>}<td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEditAccount(account)} title="Редактировать" aria-label={`Редактировать ${account.firstName} ${account.lastName}`} className="rounded-lg border border-border p-2 text-primary hover:bg-primary-light"><Pencil className="h-4 w-4" /></button>{activeView === 'withdrawn' ? <button type="button" onClick={() => restoreStudent(account)} title="Вернуть в список учеников" aria-label={`Вернуть ${account.firstName} ${account.lastName}`} className="rounded-lg border border-emerald-200 p-2 text-emerald-600 hover:bg-emerald-50"><RotateCcw className="h-4 w-4" /></button> : <button type="button" onClick={() => setDeleteTarget(account)} title={account.role === 'student' ? 'Переместить в выбывшие' : 'Удалить'} aria-label={account.role === 'student' ? `Переместить ${account.firstName} ${account.lastName} в выбывшие` : `Удалить ${account.firstName} ${account.lastName}`} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table></div>
            ) : <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center"><span className="mx-auto mb-3 block w-fit rounded-full bg-primary-light p-3 text-primary">{roleIcon(activeRole)}</span><p className="font-bold">{roleAccounts.length ? 'Ничего не найдено' : 'Аккаунтов пока нет'}</p><p className="mt-1 text-sm text-muted">{roleAccounts.length ? 'Измените поисковый запрос или фильтры.' : 'Нажмите «Добавить», чтобы создать первый аккаунт.'}</p></div>}
          </section>
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
                  <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-bold">Имя<input required maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label><label className="space-y-1.5 text-sm font-bold">Фамилия<input required maxLength={80} value={lastName} onChange={(event) => setLastName(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" /></label></div>
                  <label className="block space-y-1.5 text-sm font-bold">Номер телефона<input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" placeholder="+7 700 000 00 00" /></label>
                  <label className="block space-y-1.5 text-sm font-bold">{editingAccountId ? 'Новый пароль (необязательно)' : 'Пароль'}<input required={!editingAccountId} type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none" placeholder={editingAccountId ? 'Оставьте пустым, чтобы не менять' : 'Минимум 8 символов'} /></label>
                  {activeRole === 'student' && <><label className="block space-y-1.5 text-sm font-bold">Класс<select required value={studentClass} onChange={(event) => setStudentClass(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none">{[5, 6, 7, 8, 9].map((grade) => <option key={grade}>{grade} класс</option>)}</select></label><label className="block space-y-1.5 text-sm font-bold">Преподаватель<select required value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-normal focus:border-primary focus:outline-none"><option value="">Выберите преподавателя</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}</select>{teachers.length === 0 && <span className="block text-xs font-normal text-amber-700">Сначала создайте аккаунт преподавателя.</span>}</label></>}
                  {activeRole === 'parent' && <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-bold">Привязать детей <span className="text-rose-600">*</span></span><span className="text-xs text-muted">Выбрано: {selectedChildren.length}</span></div><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" /><input value={childSearch} onChange={(event) => setChildSearch(event.target.value)} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" placeholder="Поиск ученика по имени" /></div><div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border p-2">{matchingChildren.length ? matchingChildren.map((child) => <label key={child.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-primary-light"><input type="checkbox" checked={selectedChildren.includes(child.id)} onChange={(event) => setSelectedChildren((current) => event.target.checked ? [...current, child.id] : current.filter((id) => id !== child.id))} className="h-4 w-4 accent-primary" /><span className="min-w-0 flex-1"><strong>{child.firstName} {child.lastName}</strong><span className="ml-2 text-xs text-muted">{child.studentClass}</span></span></label>) : <p className="p-3 text-center text-xs text-muted">{students.length ? 'Ученики не найдены.' : 'Сначала создайте аккаунт ученика.'}</p>}</div></div>}
                  {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowAccountModal(false)} className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-muted hover:bg-primary-light">Отмена</button><button type="submit" disabled={saving || (activeRole === 'parent' && selectedChildren.length === 0) || (activeRole === 'student' && teachers.length === 0)} className="clay-btn rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Сохраняем…' : editingAccountId ? 'Сохранить изменения' : 'Создать аккаунт'}</button></div>
                </form>
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
