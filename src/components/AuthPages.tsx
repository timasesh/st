import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type LoginPageProps = {
  onLoginSuccess: (name: string, studentClass: string) => void;
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    // Student credentials are currently handled by the existing demo profile flow.
    window.setTimeout(() => {
      onLoginSuccess(email.split('@')[0] || 'Ученик', '5 класс');
      window.location.assign('/');
    }, 450);
  };

  return (
    <AuthShell eyebrow="ЛИЧНЫЙ КАБИНЕТ УЧЕНИКА">
      <UserRound className="mx-auto mb-2 mt-4 h-9 w-9 text-blue-100" />
      <h1 className="font-display text-2xl font-extrabold">С возвращением!</h1>
      <p className="mt-1 text-sm text-blue-100">Войди, чтобы продолжить свой путь</p>
      <form onSubmit={submit} className="space-y-4 bg-surface p-6 text-left">
        <label className="block space-y-1.5 text-sm font-bold text-foreground" htmlFor="student-email">
          Электронная почта
          <input
            id="student-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      setSession({ authenticated: true, mustChangePassword: result.mustChangePassword });
      if (!result.mustChangePassword) window.location.assign('/admin');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ошибка соединения с сервером.');
    } finally {
      setLoading(false);
    }
  };

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ newPassword }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Не удалось сменить пароль.');
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
      <h1 className="font-display text-2xl font-extrabold">{session.authenticated ? 'Смена пароля' : 'Вход администратора'}</h1>
      <p className="mt-1 text-sm text-blue-100">{session.authenticated ? 'Для начала работы установите новый пароль' : 'Панель управления StudyTask'}</p>

      <AnimatePresence mode="wait">
        {session.authenticated ? (
          <motion.form key="change-password" onSubmit={submitPasswordChange} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-surface p-6 text-left">
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">Это обязательный первый шаг. После смены пароля откроется страница администратора.</p>
            <PasswordField id="new-admin-password" label="Новый пароль" value={newPassword} onChange={setNewPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
            <PasswordField id="confirm-admin-password" label="Повторите новый пароль" value={confirmPassword} onChange={setConfirmPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />
            <p className="text-xs text-muted">Минимум 12 символов.</p>
            {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={loading} className="clay-btn flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-display text-sm font-bold text-white disabled:opacity-70">
              {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><KeyRound className="h-4 w-4" /> Сменить пароль</>}
            </button>
          </motion.form>
        ) : (
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
        )}
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

export function AdminDashboardPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((result: AdminSession) => {
        if (!result.authenticated || result.mustChangePassword) {
          window.location.replace('/admin_login');
          return;
        }
        setAuthorized(true);
      })
      .catch(() => window.location.replace('/admin_login'));
  }, []);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.replace('/admin_login');
  };

  return (
    <AuthShell eyebrow="ЗАЩИЩЁННЫЙ ДОСТУП">
      <ShieldCheck className="mx-auto mb-2 mt-4 h-9 w-9 text-blue-100" />
      <h1 className="font-display text-2xl font-extrabold">Панель администратора</h1>
      <div className="space-y-4 bg-surface p-6 text-center">
        <p className="text-sm text-muted">{authorized ? 'Вы вошли как study-admin.' : 'Проверяем доступ…'}</p>
        {authorized && <button type="button" onClick={logout} className="w-full rounded-xl bg-primary px-5 py-3 font-display text-sm font-bold text-white hover:bg-primary-dark">Выйти</button>}
      </div>
    </AuthShell>
  );
}
