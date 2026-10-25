import { useState } from 'react';
import { ArrowRight, BookOpen, BookOpenCheck, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, FileQuestion, Gift, GraduationCap, LockKeyhole, LogOut, MessageCircle, Paperclip, Play, Rocket, Sparkles, Star, Trophy, X, RotateCw } from 'lucide-react';
import SkyQuestTab from './SkyQuestTab';
import PortalSettings from './PortalSettings';
import { KIT_1 } from './GiftKit';

type StudentTab = 'lessons' | 'schedule' | 'tests' | 'homework' | 'prizes' | 'skyquest';

type StudentLesson = {
  id: string;
  day: number;
  hour: number;
  title: string;
  lessonLink?: string;
  lessonDescription?: string;
  attendance?: boolean;
};

type StudentHomework = {
  id: string;
  date: string;
  time: string;
  topic: string;
  nextHomework: string;
  attachment?: { filename: string } | null;
};

type StudentTest = {
  id: string;
  title: string;
  studentClass: string;
  lessonHour?: number;
  availableAt?: string;
  deadlineAt?: string;
  createdAt?: string;
  durationMinutes: number;
  questions: unknown[];
  status: 'assigned' | 'completed' | 'expired';
  score?: number;
};

type StudentMessage = { id: string; at: string; sender: string; body: string; read: boolean };

type StudentDashboardData = {
  account: { firstName: string; lastName: string; studentClass?: string; trialAccount?: boolean; teacher?: { firstName: string; lastName: string } | null };
  progress: { stars?: number; xp?: number; level?: number } | null;
  lessons: StudentLesson[];
  studentTests?: StudentTest[];
  studentHomework?: StudentHomework[];
  messages: StudentMessage[];
};

type Props = {
  portal: StudentDashboardData | null;
  now: Date;
  loading: boolean;
  error: string;
  activeTab: StudentTab;
  onChangeTab: (tab: StudentTab) => void;
  messagesOpen: boolean;
  darkTheme: boolean;
  onThemeChange: (dark: boolean) => void;
  onToggleMessages: () => void;
  onCloseMessages: () => void;
  onLogout: () => void;
  savingMessageId: string;
  onMarkRead: (message: StudentMessage) => void;
  testNotice: string;
  onStartTest: (test: StudentTest) => void;
  onOpenHomework: (homework: StudentHomework) => void;
  onPrizeBalanceUpdate: (stars: number) => void;
};

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const TABS: Array<{ id: StudentTab; label: string; mobileLabel: string; icon: typeof CalendarDays }> = [
  { id: 'lessons', label: 'Занятия', mobileLabel: 'Занятия', icon: CalendarDays },
  { id: 'schedule', label: 'Расписание', mobileLabel: 'План', icon: Clock3 },
  { id: 'tests', label: 'Тесты', mobileLabel: 'Тесты', icon: FileQuestion },
  { id: 'homework', label: 'Домашние задания', mobileLabel: 'Д/з', icon: Paperclip },
  { id: 'prizes', label: 'Призы', mobileLabel: 'Призы', icon: Gift },
  { id: 'skyquest', label: 'Играть', mobileLabel: 'Играть', icon: Rocket },
];

function StudentPrizesTab({ stars, trialAccount, onBalanceUpdate }: { stars: number; trialAccount?: boolean; onBalanceUpdate: (stars: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; success: boolean } | null>(null);
  const total = KIT_1.reduce((sum, item) => sum + item.stars, 0);
  const buyKit = async () => {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch('/api/student/prize-kit', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemIds: KIT_1.map((item) => item.id) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось оформить полный набор.');
      onBalanceUpdate(result.stars);
      setNotice({ text: `Полный набор оформлен. Списано ${total} звёзд.`, success: true });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : 'Не удалось оформить полный набор.', success: false }); }
    finally { setBusy(false); }
  };

  return <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-600">Магазин наград</p><h2 className="mt-1 font-display text-2xl font-extrabold">Призы</h2><p className="mt-1 text-sm text-slate-500">Призы выдаются только полным комплектом.</p></div><span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 font-extrabold text-amber-800"><Star className="h-5 w-5 fill-amber-400 text-amber-500" />Твои звёзды: {stars}</span></div>
    <div className={`transition ${trialAccount ? 'pointer-events-none select-none grayscale opacity-40 blur-[1px]' : ''}`} aria-hidden={trialAccount || undefined}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{KIT_1.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid aspect-square min-h-40 place-items-center bg-slate-50 p-4 sm:p-5">{item.images[0] ? <img src={item.images[0]} alt={item.name} className="h-full w-full object-contain" /> : <Gift className="h-14 w-14 text-slate-400" />}</div><div className="min-h-16 px-4 py-3 text-center"><strong className="text-sm leading-5">{item.name}</strong></div></article>)}</div><div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>Полный набор из {KIT_1.length} призов</strong><p className="mt-1 text-sm text-slate-500">Стоимость списывается только с твоего баланса.</p></div><span className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-lg font-extrabold text-amber-700">Цена комплекта: {total} ★</span></div>{stars < total && <p className="mt-3 text-sm font-semibold text-amber-800">Не хватает {total - stars} звёзд для полного набора.</p>}<button type="button" disabled={stars < total || busy} onClick={() => void buyKit()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Оформляем…' : <><Check className="h-4 w-4" />Оформить полный набор · {total} ★</>}</button>{notice && <p role={notice.success ? 'status' : 'alert'} className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${notice.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{notice.text}</p>}</div></div>
    {trialAccount && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-200/70 p-5 text-center backdrop-blur-[2px]"><div className="max-w-sm rounded-2xl border border-slate-300 bg-white/95 p-6 shadow-xl"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500"><LockKeyhole className="h-7 w-7" /></span><h3 className="mt-4 font-display text-lg font-extrabold text-slate-800">Призы пока закрыты</h3><p className="mt-2 text-sm leading-6 text-slate-600">Призы станут доступны, когда запишешься на занятия.</p></div></div>}
  </section>;
}

function getAstanaClock(now: Date) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Almaty', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return { day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')), hour: Number(get('hour')), minute: Number(get('minute')) };
}

function canJoinLesson(day: number, hour: number, clock: ReturnType<typeof getAstanaClock>) {
  const currentMinutes = clock.hour * 60 + clock.minute;
  return day === clock.day && currentMinutes >= hour * 60 && currentMinutes < (hour + 1) * 60 + 10;
}

function getLessonOffset(lesson: StudentLesson, now: Date) {
  const clock = getAstanaClock(now);
  let days = (lesson.day - clock.day + 7) % 7;
  if (days === 0 && (lesson.hour + 1) * 60 <= clock.hour * 60 + clock.minute) days = 7;
  return days;
}

function getLessonDate(now: Date, days: number) {
  const date = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('ru-KZ', { timeZone: 'Asia/Almaty', weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

function getGreeting(now: Date) {
  const { hour } = getAstanaClock(now);
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function EmptyState({ icon: Icon, title, text, action }: { icon: typeof BookOpen; title: string; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-white/70 px-5 py-10 text-center">
      <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{text}</p>
      {action && <button type="button" onClick={action.onClick} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{action.label}<ArrowRight className="h-4 w-4" /></button>}
    </div>
  );
}

export default function StudentDashboard({ portal, now, loading, error, activeTab, onChangeTab, messagesOpen, darkTheme, onThemeChange, onToggleMessages, onCloseMessages, onLogout, savingMessageId, onMarkRead, testNotice, onStartTest, onOpenHomework, onPrizeBalanceUpdate }: Props) {
  if (!portal) return <div className="min-h-screen bg-[#f4f7fc] px-4 py-6 sm:px-6"><header className="mx-auto flex max-w-6xl items-center gap-3"><img src="/static/ST.webp" alt="StudyTask" className="h-10 w-10 object-contain" /><div><strong className="block font-display font-extrabold">StudyTask</strong><span className="text-xs text-slate-500">Кабинет ученика</span></div></header><main className="mx-auto mt-10 max-w-6xl">{error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}{loading ? <div aria-label="Загружаем кабинет" className="space-y-5"><div className="h-56 animate-pulse rounded-3xl bg-white" /><div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl bg-white" /><div className="h-32 animate-pulse rounded-2xl bg-white" /><div className="h-32 animate-pulse rounded-2xl bg-white" /></div></div> : <p className="text-sm text-slate-600">Не удалось загрузить данные кабинета.</p>}</main></div>;
  const account = portal.account;
  const level = portal.progress?.level ?? 1;
  const xp = portal.progress?.xp ?? 0;
  const stars = portal.progress?.stars ?? 0;
  const xpTarget = level * 100;
  const safeXp = Math.min(xpTarget, Math.max(0, xp));
  const xpProgress = xpTarget ? Math.min(100, (safeXp / xpTarget) * 100) : 0;
  const xpRemaining = Math.max(0, xpTarget - safeXp);
  const lessons = [...portal.lessons].map((lesson) => ({ ...lesson, daysUntil: getLessonOffset(lesson, now) })).sort((a, b) => a.daysUntil - b.daysUntil || a.hour - b.hour);
  const tests = [...(portal.studentTests || [])].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'assigned' ? -1 : 1;
    if (a.status === 'assigned') return (a.lessonHour ?? 99) - (b.lessonHour ?? 99) || new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  const assignedTests = tests.filter((test) => test.status === 'assigned');
  const homework = [...(portal.studentHomework || [])].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  const nextLesson = lessons[0];
  const nextHomework = homework.find((item) => !item.attachment);
  const nextTest = assignedTests[0];
  const clock = getAstanaClock(now);
  const lessonIsLive = Boolean(nextLesson && nextLesson.daysUntil === 0 && canJoinLesson(nextLesson.day, nextLesson.hour, clock));
  const completedTests = tests.filter((test) => test.status === 'completed');
  const unreadMessages = portal.messages.filter((message) => !message.read).length;

  const lessonIsToday = Boolean(nextLesson && nextLesson.daysUntil === 0);
  const mainAction = lessonIsToday && nextLesson
    ? { kind: 'lesson' as const, title: 'Занятие уже идёт', detail: nextLesson.title, hint: 'Подключайся — преподаватель ждёт тебя.', lesson: nextLesson }
    : nextLesson
      ? { kind: 'lesson' as const, title: 'Следующее занятие', detail: nextLesson.title, hint: `${getLessonDate(now, nextLesson.daysUntil)} · ${String(nextLesson.hour).padStart(2, '0')}:00–${String(nextLesson.hour + 1).padStart(2, '0')}:00`, lesson: nextLesson }
      : nextHomework
        ? { kind: 'homework' as const, title: 'Пора выполнить домашнее задание', detail: nextHomework.topic || 'Задание от преподавателя', hint: nextHomework.nextHomework, homework: nextHomework }
        : nextTest
          ? { kind: 'test' as const, title: 'Для тебя подготовлен тест', detail: nextTest.title, hint: `${nextTest.questions.length} вопросов · около ${nextTest.durationMinutes} минут`, test: nextTest }
          : { kind: 'empty' as const, title: 'Ты на хорошем пути', detail: 'Новых задач пока нет', hint: 'Здесь появятся ближайшие занятия, тесты и домашние задания.' };

  const goTo = (tab: StudentTab) => onChangeTab(tab);

  return (
    <div className={`student-dashboard min-h-screen bg-[#f4f7fc] text-slate-900 ${darkTheme ? 'portal-theme-dark' : ''}`}>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a href="/student" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            <img src="/static/ST.webp" alt="StudyTask" className="h-10 w-10 shrink-0 object-contain" />
            <span className="min-w-0"><strong className="block font-display text-[17px] font-extrabold tracking-tight text-slate-900">StudyTask</strong><span className="hidden text-xs text-slate-500 sm:block">Кабинет ученика</span></span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 sm:flex">
              <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
              <span className="text-lg font-extrabold leading-none text-amber-700">{stars}</span>
            </div>
            <div className="hidden min-w-[156px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:block">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold"><span>Уровень {level}</span><span className="text-slate-500">{safeXp}/{xpTarget} XP</span></div>
              <div role="progressbar" aria-label={`Опыт до уровня ${level + 1}`} aria-valuemin={0} aria-valuemax={xpTarget} aria-valuenow={safeXp} className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out" style={{ width: `${xpProgress}%` }} /></div>
            </div>
            <div className="relative">
              <button type="button" onClick={onToggleMessages} aria-label={`Сообщения${unreadMessages ? `, ${unreadMessages} непрочитанных` : ''}`} aria-expanded={messagesOpen} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                <MessageCircle className="h-[19px] w-[19px]" />
                {unreadMessages > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-blue-600 px-1 text-[9px] font-bold text-white">{unreadMessages}</span>}
              </button>
              {messagesOpen && <div role="dialog" aria-label="Сообщения" className="absolute right-0 top-full mt-3 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><strong className="text-sm">Сообщения</strong><p className="mt-0.5 text-xs text-slate-500">{unreadMessages} непрочитанных</p></div><button type="button" onClick={onCloseMessages} aria-label="Закрыть сообщения" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
                <div className="max-h-[min(65vh,480px)] space-y-2 overflow-y-auto p-3">{portal.messages.length ? portal.messages.map((message) => <article key={message.id} className={`rounded-xl border p-3 ${message.read ? 'border-slate-100 bg-white' : 'border-blue-100 bg-blue-50/60'}`}><p className="text-[11px] text-slate-500">{message.sender} · {new Date(message.at).toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p><p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-slate-800">{message.body}</p>{!message.read && <button type="button" disabled={savingMessageId === message.id} onClick={() => onMarkRead(message)} className="mt-2 min-h-9 rounded-lg px-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50">Отметить прочитанным</button>}</article>) : <p className="py-8 text-center text-sm text-slate-500">Сообщений пока нет.</p>}</div>
              </div>}
            </div>
            <PortalSettings dark={darkTheme} onThemeChange={onThemeChange} />
            <button type="button" onClick={() => window.location.reload()} aria-label="Обновить страницу" title="Обновить страницу" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"><RotateCw className="h-4 w-4" /></button>
            <button type="button" onClick={onLogout} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-4"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Выйти</span></button>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-white px-4 py-2 sm:hidden">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-500" /><strong className="text-sm text-amber-700">{stars}</strong></div><div className="min-w-0 flex-1"><div className="mb-1 flex justify-between text-[10px] font-bold"><span>Уровень {level}</span><span className="text-slate-500">{safeXp}/{xpTarget} XP</span></div><div role="progressbar" aria-label={`Опыт до уровня ${level + 1}`} aria-valuemin={0} aria-valuemax={xpTarget} aria-valuenow={safeXp} className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out" style={{ width: `${xpProgress}%` }} /></div></div></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] self-start overflow-y-auto border-r border-slate-200/80 bg-white/60 px-4 py-6 lg:flex lg:flex-col">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Моё обучение</p>
          <nav aria-label="Разделы кабинета ученика" className="mt-3 space-y-1">{TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => goTo(id)} aria-current={activeTab === id ? 'page' : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${id === 'skyquest' ? 'skyquest-nav-tab' : activeTab === id ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}><Icon className="h-[18px] w-[18px]" /><span className="flex-1">{label}</span>{id === 'tests' && assignedTests.length > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>{assignedTests.length}</span>}</button>)}</nav>
          <div className="mt-auto space-y-3 pt-8">
            <section className="rounded-2xl border border-blue-100 bg-white p-4">
              <div className="flex items-center gap-2 text-blue-700"><GraduationCap className="h-4 w-4" /><h2 className="text-xs font-bold">Преподаватель</h2></div>
              <p className="mt-2 text-sm font-semibold text-slate-800">{account.teacher ? `${account.teacher.firstName} ${account.teacher.lastName}` : 'Пока не назначен'}</p>
              {account.studentClass && <p className="mt-1 text-xs text-slate-500">{account.studentClass}</p>}
            </section>
            <p className="px-2 text-[11px] leading-5 text-slate-400">Каждый урок — ещё один шаг вперёд.</p>
          </div>
        </aside>

        <main className="min-w-0 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-9 lg:pb-12 lg:pt-9">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
            <div className="min-w-0"><p className="text-sm font-semibold text-blue-700">{getGreeting(now)}, {account.firstName}</p>{account.trialAccount && <span className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">Пробный аккаунт</span>}<h1 className="mt-1 break-words font-display text-[27px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">Продолжаем учиться?</h1><p className="mt-2 text-sm text-slate-500">{account.studentClass ? `${account.studentClass} · ` : ''}Твой план занятий и прогресс</p></div>
            <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 sm:self-auto"><Sparkles className="h-4 w-4 text-blue-600" /><span className="text-xs font-semibold text-slate-600">{xpRemaining ? `Ещё ${xpRemaining} XP до уровня ${level + 1}` : `Уровень ${level} пройден`}</span></div>
          </div>

          {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}
          {testNotice && activeTab === 'tests' && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{testNotice}</div>}

          {loading ? <div aria-label="Загружаем кабинет" className="space-y-5"><div className="h-56 animate-pulse rounded-3xl bg-white" /><div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl bg-white" /><div className="h-32 animate-pulse rounded-2xl bg-white" /><div className="h-32 animate-pulse rounded-2xl bg-white" /></div></div> : activeTab === 'lessons' ? <>
            <section aria-labelledby="next-action-title" className={`relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-650 to-blue-900 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7 lg:p-8 ${mainAction.kind === 'lesson' && lessonIsLive ? 'animate-pulse' : ''}`}>
              <div aria-hidden className="absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full border border-white/10 bg-white/[0.06]" />
              <div aria-hidden className="absolute bottom-[-90px] right-[24%] -z-10 h-52 w-52 rounded-full border border-white/10" />
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_190px] lg:items-end">
                <div className="min-w-0"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50"><Sparkles className="h-3.5 w-3.5" />Твоя следующая цель</span><h2 id="next-action-title" className="mt-4 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{mainAction.title}</h2><p className="mt-2 break-words text-lg font-semibold text-white/95">{mainAction.detail}</p><p className="mt-2 max-w-2xl break-words text-sm leading-6 text-blue-100">{mainAction.hint}</p></div>
                <div className="flex lg:justify-end">{mainAction.kind === 'lesson' && mainAction.lesson.lessonLink && lessonIsLive ? <a href={mainAction.lesson.lessonLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:w-auto"><Play className="h-4 w-4 fill-current" />Подключиться</a> : mainAction.kind === 'homework' ? <button type="button" onClick={() => onOpenHomework(mainAction.homework)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:w-auto">Открыть задание<ArrowRight className="h-4 w-4" /></button> : mainAction.kind === 'test' ? <button type="button" onClick={() => onStartTest(mainAction.test)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:w-auto">Начать тест<ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={() => goTo(mainAction.kind === 'empty' ? 'schedule' : 'lessons')} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:w-auto">{mainAction.kind === 'empty' ? 'Открыть расписание' : 'Все занятия'}<ArrowRight className="h-4 w-4" /></button>}</div>
              </div>
              {mainAction.kind === 'lesson' && mainAction.lesson.attendance === false && <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-orange-200/30 bg-orange-400/15 px-3 py-2 text-xs font-semibold text-orange-50"><span className="h-2 w-2 rounded-full bg-orange-300" />На прошлом занятии не получилось присутствовать</p>}
            </section>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => goTo('schedule')} className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><CalendarDays className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">Расписание</strong><span className="text-xs text-slate-500">{lessons.length} занятий в неделю</span></span><ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" /></button>
              <button type="button" onClick={() => goTo('tests')} className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><FileQuestion className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">Тесты</strong><span className="text-xs text-slate-500">{assignedTests.length ? `${assignedTests.length} ждут тебя` : 'Все результаты здесь'}</span></span><ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" /></button>
              <button type="button" onClick={() => goTo('homework')} className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Paperclip className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">Домашние задания</strong><span className="text-xs text-slate-500">{homework.filter((item) => !item.attachment).length} без файла</span></span><ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" /></button>
            </div>

            <section className="mt-8" aria-labelledby="upcoming-title"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">На этой неделе</p><h2 id="upcoming-title" className="mt-1 font-display text-xl font-extrabold tracking-tight">Ближайшие занятия</h2></div><button type="button" onClick={() => goTo('schedule')} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Расписание<ArrowRight className="h-4 w-4" /></button></div>
              {lessons.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{lessons.slice(0, 3).map((lesson, index) => { const isLive = lesson.daysUntil === 0 && lesson.hour === clock.hour; const absent = lesson.attendance === false; return <article key={lesson.id} className={`rounded-2xl border bg-white p-4 transition hover:shadow-md ${absent ? 'border-orange-200' : index === 0 ? 'border-blue-200 shadow-sm' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-3"><span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${isLive ? 'bg-emerald-50 text-emerald-700' : absent ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>{isLive ? 'Сейчас' : absent ? 'Не посещено' : lesson.daysUntil === 0 ? 'Сегодня' : getLessonDate(now, lesson.daysUntil)}</span>{lesson.lessonLink && <a href={lesson.lessonLink} target="_blank" rel="noopener noreferrer" aria-label={`Открыть занятие: ${lesson.title}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Play className="ml-0.5 h-4 w-4 fill-current" /></a>}</div><h3 className="mt-4 line-clamp-2 min-h-10 font-semibold leading-5 text-slate-900">{lesson.title}</h3><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><Clock3 className="h-4 w-4" />{String(lesson.hour).padStart(2, '0')}:00–{String(lesson.hour + 1).padStart(2, '0')}:00 <span className="text-slate-300">·</span> 60 минут</p>{lesson.lessonDescription && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{lesson.lessonDescription}</p>}</article>; })}</div> : <EmptyState icon={CalendarDays} title="Занятий пока нет" text="Когда преподаватель добавит занятие, оно появится здесь и в расписании." action={{ label: 'Посмотреть расписание', onClick: () => goTo('schedule') }} />}
            </section>

            <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="progress-title"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Твой прогресс</p><h2 id="progress-title" className="mt-1 font-display text-lg font-extrabold">Уровень {level}</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Trophy className="h-5 w-5" /></span></div><div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-3xl font-extrabold tracking-tight text-slate-900">{safeXp}<span className="ml-1 text-base font-bold text-slate-400">XP</span></p><p className="mt-1 text-xs text-slate-500">из {xpTarget} XP до следующего уровня</p></div><p className="text-sm font-bold text-blue-700">Осталось {xpRemaining} XP</p></div><div role="progressbar" aria-label={`Прогресс до уровня ${level + 1}`} aria-valuemin={0} aria-valuemax={xpTarget} aria-valuenow={safeXp} className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width] duration-700 ease-out" style={{ width: `${xpProgress}%` }} /></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm text-slate-500">Звёзды можно обменять на призы</span><span className="inline-flex items-center gap-1.5 font-bold text-amber-600"><Star className="h-4 w-4 fill-amber-400 text-amber-500" />{stars}</span></div></section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-blue-600" /><h2 className="font-display text-lg font-extrabold">Учёба в цифрах</h2></div><div className="mt-4 divide-y divide-slate-100"><div className="flex items-center justify-between py-3"><span className="text-sm text-slate-500">Домашние задания</span><strong className="text-sm">{homework.length}</strong></div><div className="flex items-center justify-between py-3"><span className="text-sm text-slate-500">Тесты на выполнение</span><strong className="text-sm">{assignedTests.length}</strong></div><div className="flex items-center justify-between py-3"><span className="text-sm text-slate-500">Завершённые тесты</span><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{completedTests.length}</span></div></div></section>
            </div>
          </> : activeTab === 'schedule' ? <section aria-labelledby="schedule-title"><div className="mb-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">План на неделю</p><h2 id="schedule-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight">Расписание</h2><p className="mt-1 text-sm text-slate-500">Время указано по часовому поясу Алматы.</p></div>{lessons.length ? <div className="space-y-3">{DAYS.map((day, dayIndex) => { const dayLessons = lessons.filter((lesson) => lesson.day === dayIndex).sort((a, b) => a.hour - b.hour); if (!dayLessons.length) return null; const isToday = clock.day === dayIndex; return <section key={day} className={`rounded-2xl border bg-white p-4 sm:p-5 ${isToday ? 'border-blue-200 shadow-sm shadow-blue-900/5' : 'border-slate-200'}`}><div className="mb-3 flex items-center gap-2"><h3 className="font-display font-extrabold">{day}</h3>{isToday && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Сегодня</span>}</div><div className="space-y-2">{dayLessons.map((lesson) => { const isLive = isToday && lesson.hour === clock.hour; const absent = lesson.attendance === false; return <article key={lesson.id} className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${absent ? 'border-orange-200 bg-orange-50/70' : isLive ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-100 bg-slate-50/70'}`}><div className="flex shrink-0 items-center gap-3 sm:w-40"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-700"><Clock3 className="h-4 w-4" /></span><span className="text-sm font-bold tabular-nums">{String(lesson.hour).padStart(2, '0')}:00–{String(lesson.hour + 1).padStart(2, '0')}:00</span></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{lesson.title}</p>{lesson.lessonDescription && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{lesson.lessonDescription}</p>}</div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${absent ? 'bg-orange-100 text-orange-800' : isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-500'}`}>{absent ? 'Не посещено' : isLive ? 'Сейчас' : 'Запланировано'}</span>{lesson.lessonLink && <a href={lesson.lessonLink} target="_blank" rel="noopener noreferrer" aria-label={`Открыть занятие: ${lesson.title}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"><Play className="h-3.5 w-3.5 fill-current" />Подключиться</a>}</div></article>; })}</div></section>; })}</div> : <EmptyState icon={CalendarDays} title="Расписание пока не заполнено" text="Как только появятся занятия, они будут распределены по дням недели." />}</section> : activeTab === 'tests' ? <section aria-labelledby="tests-title"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Проверка знаний</p><h2 id="tests-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight">Тесты</h2><p className="mt-1 text-sm text-slate-500">Сначала новые тесты, затем результаты.</p></div>{assignedTests.length > 0 && <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{assignedTests.length} ждут выполнения</span>}</div>{tests.length ? <div className="space-y-3">{tests.map((test) => <article key={test.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${test.status === 'assigned' ? 'bg-violet-50 text-violet-700' : test.status === 'expired' ? 'bg-orange-100 text-orange-800' : 'bg-emerald-50 text-emerald-700'}`}>{test.status === 'expired' ? <LockKeyhole className="h-5 w-5" /> : <FileQuestion className="h-5 w-5" />}</span><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{test.title}</h3><p className="mt-1 text-sm text-slate-500">{test.studentClass} · {test.questions.length} вопросов · около {test.durationMinutes} минут</p>{test.status === 'assigned' ? <p className="mt-2 text-xs font-semibold text-violet-700">{test.deadlineAt ? `Сдать до ${new Date(test.deadlineAt).toLocaleTimeString('ru-KZ', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit' })}` : test.lessonHour !== undefined ? `Открывается в ${String(test.lessonHour).padStart(2, '0')}:50` : 'Время выполнения уточнит преподаватель'}</p> : test.status === 'expired' ? <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-orange-800"><LockKeyhole className="h-3.5 w-3.5" />Тест закрылся в {test.deadlineAt ? new Date(test.deadlineAt).toLocaleTimeString('ru-KZ', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit' }) : '—'}</p> : <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Результат: {test.score ?? 0} из {test.questions.length}</p>}</div></div>{test.status === 'assigned' && <button type="button" onClick={() => onStartTest(test)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Начать тест<ArrowRight className="h-4 w-4" /></button>}</article>)}</div> : <EmptyState icon={FileQuestion} title="Пока нет тестов" text="После занятия преподаватель может добавить тест, он появится в этом разделе." />}</section> : activeTab === 'homework' ? <section aria-labelledby="homework-title"><div className="mb-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Задания от преподавателя</p><h2 id="homework-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight">Домашние задания</h2><p className="mt-1 text-sm text-slate-500">Открой задание, чтобы прочитать подробности и прикрепить решение.</p></div>{homework.length ? <div className="grid gap-3 xl:grid-cols-2">{homework.map((item) => <button key={item.id} type="button" onClick={() => onOpenHomework(item)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:p-5"><div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.attachment ? 'bg-emerald-50 text-emerald-700' : 'bg-cyan-50 text-cyan-700'}`}><Paperclip className="h-5 w-5" /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.attachment ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.attachment ? 'Файл отправлен' : 'Ждёт выполнения'}</span></div><h3 className="mt-4 break-words font-semibold text-slate-900">{item.topic || 'Домашнее задание'}</h3><p className="mt-1 text-xs text-slate-500">Занятие · {item.date} · {item.time}</p>{item.nextHomework && <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{item.nextHomework}</p>}<span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">{item.attachment ? 'Открыть задание' : 'Открыть и прикрепить файл'}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></button>)}</div> : <EmptyState icon={Paperclip} title="Домашних заданий пока нет" text="Новое задание появится здесь после того, как преподаватель добавит его к занятию." />}</section> : activeTab === 'prizes' ? <StudentPrizesTab stars={stars} trialAccount={account.trialAccount} onBalanceUpdate={onPrizeBalanceUpdate} /> : <SkyQuestTab />}
        </main>
      </div>

      <nav aria-label="Навигация по кабинету" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-6">{TABS.map(({ id, mobileLabel, icon: Icon }) => <button key={id} type="button" onClick={() => goTo(id)} aria-current={activeTab === id ? 'page' : undefined} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-semibold leading-tight transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${id === 'skyquest' ? 'skyquest-nav-tab' : activeTab === id ? 'text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><Icon className={`h-[18px] w-[18px] ${activeTab === id ? 'stroke-[2.4]' : ''}`} /><span className="max-w-full truncate">{mobileLabel}</span></button>)}</div></nav>
    </div>
  );
}
