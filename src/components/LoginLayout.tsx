import { InputHTMLAttributes, ReactNode, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft, BarChart3, BookOpen, BriefcaseBusiness, CalendarDays, CheckCircle2, ClipboardCheck, Flame, GraduationCap,
  Lock, MessageCircle, Shield, ShieldCheck, Sparkles, Star, Trophy, Users, Video, Zap, Gift, FileQuestion, UserCog,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type LoginRole = 'student' | 'teacher' | 'admin';

const ROLE_TABS: Array<{ role: LoginRole; href: string; label: string; icon: LucideIcon }> = [
  { role: 'student', href: '/login', label: 'Ученик · Родитель', icon: GraduationCap },
  { role: 'teacher', href: '/teacher_login', label: 'Преподаватель', icon: BriefcaseBusiness },
  { role: 'admin', href: '/admin_login', label: 'Администратор', icon: ShieldCheck },
];

const ROLE_ACCENT: Record<LoginRole, string> = { student: '#38bdf8', teacher: '#a78bfa', admin: '#34d399' };

type Slide = { icon: LucideIcon; title: string; text: string };
const SLIDES: Record<LoginRole, Slide[]> = {
  student: [
    { icon: Video, title: 'Живые уроки', text: 'Занимайтесь с преподавателем онлайн в удобное время.' },
    { icon: FileQuestion, title: 'Тесты и домашние задания', text: 'Проверяйте знания и закрепляйте каждую тему.' },
    { icon: Trophy, title: 'Звёзды, уровни и призы', text: 'Учёба превращается в игру, где виден каждый шаг.' },
    { icon: BarChart3, title: 'Прогресс виден родителям', text: 'Расписание, оценки и посещаемость — в одном кабинете.' },
  ],
  teacher: [
    { icon: CalendarDays, title: 'Расписание под рукой', text: 'Все занятия недели и ссылки на уроки — на одном экране.' },
    { icon: ClipboardCheck, title: 'Уроки и посещаемость', text: 'Отмечайте занятия и оставляйте записи по каждому ученику.' },
    { icon: FileQuestion, title: 'Тесты в пару кликов', text: 'Назначайте проверочные и домашние задания ученикам.' },
    { icon: MessageCircle, title: 'Связь с семьёй', text: 'Сообщения родителям и ученикам внутри платформы.' },
  ],
  admin: [
    { icon: UserCog, title: 'Управление платформой', text: 'Ученики, родители и преподаватели в одной панели.' },
    { icon: CalendarDays, title: 'Расписание школы', text: 'Назначайте уроки и переносите их перетаскиванием.' },
    { icon: Gift, title: 'Призы и мотивация', text: 'Следите за звёздами, наградами и прогрессом учеников.' },
    { icon: ShieldCheck, title: 'Защищённый доступ', text: 'Закрытая зона с отдельным входом для администраторов.' },
  ],
};

type Chip = { icon: LucideIcon; text: string; className: string; delay: string; tone: string };
const CHIPS: Record<LoginRole, Chip[]> = {
  student: [
    { icon: Zap, text: '+50 XP', className: 'left-[3%] top-[10%]', delay: '0s', tone: 'text-amber-300' },
    { icon: CheckCircle2, text: 'Тест 5 из 5', className: 'right-[2%] top-[22%]', delay: '-1.6s', tone: 'text-emerald-300' },
    { icon: CalendarDays, text: 'Урок в 18:00', className: 'left-[1%] bottom-[14%]', delay: '-3.1s', tone: 'text-sky-300' },
    { icon: Flame, text: 'Серия 7 дней', className: 'right-[4%] bottom-[8%]', delay: '-2.2s', tone: 'text-orange-300' },
  ],
  teacher: [
    { icon: Users, text: 'Группа готова', className: 'left-[3%] top-[10%]', delay: '0s', tone: 'text-violet-300' },
    { icon: CheckCircle2, text: 'Посещаемость 12/12', className: 'right-[1%] top-[22%]', delay: '-1.6s', tone: 'text-emerald-300' },
    { icon: CalendarDays, text: 'Урок в 18:00', className: 'left-[1%] bottom-[14%]', delay: '-3.1s', tone: 'text-sky-300' },
    { icon: FileQuestion, text: 'Тест назначен', className: 'right-[4%] bottom-[8%]', delay: '-2.2s', tone: 'text-amber-300' },
  ],
  admin: [
    { icon: Users, text: 'Новый ученик', className: 'left-[3%] top-[10%]', delay: '0s', tone: 'text-emerald-300' },
    { icon: CheckCircle2, text: 'Расписание сохранено', className: 'right-[1%] top-[22%]', delay: '-1.6s', tone: 'text-sky-300' },
    { icon: Gift, text: 'Приз выдан', className: 'left-[1%] bottom-[14%]', delay: '-3.1s', tone: 'text-amber-300' },
    { icon: Lock, text: 'Доступ защищён', className: 'right-[4%] bottom-[8%]', delay: '-2.2s', tone: 'text-teal-300' },
  ],
};

const STARS = [
  [6, 12, 2], [14, 70, 1.5], [22, 30, 2.5], [31, 88, 1.5], [40, 8, 2], [47, 56, 1.5], [55, 94, 2], [63, 20, 1.5],
  [71, 64, 2.5], [78, 40, 1.5], [86, 82, 2], [92, 14, 1.5], [18, 48, 1.5], [60, 48, 1], [34, 60, 1], [82, 6, 2],
] as const;

const GLYPHS = [
  { g: 'π', cls: 'left-[8%] top-[18%] text-6xl', d: '0s' },
  { g: '∑', cls: 'right-[10%] top-[30%] text-7xl', d: '-2s' },
  { g: '√', cls: 'left-[14%] bottom-[22%] text-7xl', d: '-4s' },
  { g: '%', cls: 'right-[16%] bottom-[12%] text-5xl', d: '-1s' },
  { g: '∞', cls: 'left-[46%] top-[6%] text-5xl', d: '-3s' },
];

function useDesktop() {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);
  return matches;
}

function RocketArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 124" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg-rocket-body" x1="0" x2="1">
          <stop offset="0" stopColor="#dbe7ff" /><stop offset=".5" stopColor="#ffffff" /><stop offset="1" stopColor="#b6cbf3" />
        </linearGradient>
        <linearGradient id="lg-rocket-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7c2" /><stop offset=".45" stopColor="#fbbf24" /><stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="login-flame" style={{ transformOrigin: '32px 84px' }}>
        <path d="M23 84 Q32 128 41 84 Z" fill="url(#lg-rocket-flame)" />
        <path d="M28 84 Q32 110 36 84 Z" fill="#fffbe0" opacity=".9" />
      </g>
      <path d="M18 62 L3 92 L20 85 Z" fill="#1d4ed8" />
      <path d="M46 62 L61 92 L44 85 Z" fill="#1d4ed8" />
      <path d="M32 4 C48 22 51 52 46 85 H18 C13 52 16 22 32 4Z" fill="url(#lg-rocket-body)" />
      <path d="M32 4 C40 13 44 22 45.5 31 H18.5 C20 22 24 13 32 4Z" fill="#2563eb" />
      <circle cx="32" cy="50" r="10.5" fill="#1e3a8a" />
      <circle cx="32" cy="50" r="8" fill="#38bdf8" />
      <path d="M26.5 46.5 A7 7 0 0 1 33 42" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".75" />
      <rect x="22" y="74" width="20" height="9" rx="2.5" fill="#1d4ed8" />
      <text x="32" y="81.2" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">ST</text>
    </svg>
  );
}

function OrbitItem({ angle, children, tone = 'text-white' }: { angle: number; children: ReactNode; tone?: string }) {
  const rad = (angle * Math.PI) / 180;
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${50 + 50 * Math.cos(rad)}%`, top: `${50 + 50 * Math.sin(rad)}%` }}>
      <span className={`login-counter grid h-11 w-11 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/25 backdrop-blur-md ${tone}`}>{children}</span>
    </div>
  );
}

function Twinkles() {
  return (
    <>
      {STARS.map(([top, left, size], index) => (
        <span key={index} aria-hidden="true" className="login-twinkle absolute rounded-full bg-white" style={{ top: `${top}%`, left: `${left}%`, width: size * 2, height: size * 2, animationDelay: `${-(index % 7) * 0.55}s`, animationDuration: `${2.4 + (index % 5) * 0.6}s` }} />
      ))}
    </>
  );
}

function FullScene({ role }: { role: LoginRole }) {
  const slides = SLIDES[role];
  const chips = CHIPS[role];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 4200);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  const slide = slides[index];
  const SlideIcon = slide.icon;

  return (
    <div className="login-scene login-panel-bg relative flex h-full min-h-[34rem] flex-col overflow-hidden rounded-[2rem] p-8 text-white xl:p-10" style={{ ['--login-accent' as string]: ROLE_ACCENT[role] }}>
      <div aria-hidden="true" className="login-grid absolute inset-0" />
      <span aria-hidden="true" className="login-drift absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[color:var(--login-accent)] opacity-25 blur-3xl" />
      <span aria-hidden="true" className="login-drift absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-indigo-400 opacity-30 blur-3xl" style={{ animationDelay: '-6s' }} />
      <Twinkles />
      <span aria-hidden="true" className="login-rocket absolute z-20 w-12"><RocketArt className="h-auto w-full drop-shadow-[0_8px_16px_rgba(0,0,0,.35)]" /></span>

      <div className="relative z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wide ring-1 ring-white/20 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Математика с интересом
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70"><span className="h-2 w-2 rounded-full bg-emerald-400 login-live" /> платформа онлайн</span>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-4">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <div key={chip.text} className={`login-float absolute z-20 flex items-center gap-2 rounded-2xl bg-white/12 px-3.5 py-2.5 text-[13px] font-bold shadow-xl shadow-black/10 ring-1 ring-white/25 backdrop-blur-md ${chip.className}`} style={{ animationDelay: chip.delay }}>
              <Icon className={`h-4 w-4 ${chip.tone}`} /> {chip.text}
            </div>
          );
        })}

        <div className="relative aspect-square h-full max-h-[27rem] min-h-[15rem]">
          <span aria-hidden="true" className="login-pulse absolute inset-[34%] rounded-full border border-white/40" />
          <span aria-hidden="true" className="login-pulse absolute inset-[34%] rounded-full border border-white/40" style={{ animationDelay: '-1.8s' }} />
          <div aria-hidden="true" className="login-ring absolute inset-0 rounded-full border border-white/10" style={{ ['--d' as string]: '60s' }}>
            <OrbitItem angle={-60} tone="text-amber-300"><Star className="h-5 w-5 fill-amber-300" /></OrbitItem>
            <OrbitItem angle={60} tone="text-sky-200"><BookOpen className="h-5 w-5" /></OrbitItem>
            <OrbitItem angle={180} tone="text-emerald-300"><Trophy className="h-5 w-5" /></OrbitItem>
          </div>
          <div aria-hidden="true" className="login-ring rev absolute inset-[17%] rounded-full border border-dashed border-white/25" style={{ ['--d' as string]: '38s' }}>
            <OrbitItem angle={0} tone="text-violet-200"><Shield className="h-5 w-5" /></OrbitItem>
            <OrbitItem angle={120} tone="text-amber-200"><Zap className="h-5 w-5 fill-amber-200" /></OrbitItem>
            <OrbitItem angle={240} tone="text-sky-200"><GraduationCap className="h-5 w-5" /></OrbitItem>
          </div>
          <div className="login-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDuration: '6s' }}>
            <div className="grid h-[6.5rem] w-[6.5rem] place-items-center rounded-[2rem] bg-white shadow-[0_24px_70px_-12px_color-mix(in_srgb,var(--login-accent)_70%,transparent)] ring-4 ring-white/30">
              <img src="/static/ST.webp" alt="" className="h-[4.8rem] w-[4.8rem] object-contain" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 rounded-3xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-md">
        <div className="min-h-[5.25rem]">
          <AnimatePresence mode="wait">
            <motion.div key={index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }} className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 shadow-lg"><SlideIcon className="h-6 w-6" /></span>
              <div>
                <h3 className="font-display text-lg font-extrabold leading-tight">{slide.title}</h3>
                <p className="mt-1 text-sm leading-5 text-blue-100/90">{slide.text}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {slides.map((item, itemIndex) => (
            <span key={item.title} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <span key={`${itemIndex}-${index}`} className={`block h-full rounded-full bg-white ${itemIndex < index ? 'w-full' : itemIndex === index ? 'login-fill' : 'w-0'}`} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompactScene({ role }: { role: LoginRole }) {
  const first = SLIDES[role][0];
  return (
    <div className="login-scene login-panel-bg relative h-36 overflow-hidden rounded-[1.75rem] text-white sm:h-40" style={{ ['--login-accent' as string]: ROLE_ACCENT[role] }}>
      <div aria-hidden="true" className="login-grid absolute inset-0" />
      <Twinkles />
      <span aria-hidden="true" className="login-rocket absolute z-0 w-7"><RocketArt className="h-auto w-full" /></span>
      <div className="relative z-10 flex h-full items-center gap-4 px-5">
        <div className="login-float grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-3xl bg-white shadow-xl ring-4 ring-white/30">
          <img src="/static/ST.webp" alt="" className="h-14 w-14 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-white/70">StudyTask</p>
          <p className="mt-0.5 font-display text-lg font-extrabold leading-tight">{first.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-blue-100/90">{first.text}</p>
        </div>
      </div>
    </div>
  );
}

export function LoginLayout({ role, eyebrow, title, subtitle, children }: { role: LoginRole; eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  const desktop = useDesktop();
  return (
    <main className="grid min-h-dvh bg-white text-slate-900 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_#e4eeff_0%,_#ffffff_55%)] px-5 pb-6 pt-5 sm:px-10 lg:px-14 xl:px-20">
        {GLYPHS.map((glyph) => (
          <span key={glyph.g} aria-hidden="true" className={`login-float pointer-events-none absolute select-none font-display font-black text-blue-200/50 ${glyph.cls}`} style={{ animationDelay: glyph.d, animationDuration: '9s' }}>{glyph.g}</span>
        ))}

        <header className="relative z-10 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-lg shadow-blue-900/10 ring-1 ring-blue-100"><img src="/static/ST.webp" alt="" className="h-9 w-9 object-contain" /></span>
            <span className="font-display text-xl font-extrabold tracking-tight">StudyTask</span>
          </a>
          <a href="/" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-500 transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><ArrowLeft className="h-3.5 w-3.5" /> На главную</a>
        </header>

        {!desktop && <div className="relative z-10 mt-5"><CompactScene role={role} /></div>}

        <div className="relative z-10 flex flex-1 items-center py-7">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="mx-auto w-full max-w-[28rem]">
            <nav aria-label="Тип входа" className="mb-7 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100/90 p-1 ring-1 ring-slate-200/70">
              {ROLE_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = tab.role === role;
                return (
                  <a key={tab.role} href={tab.href} aria-current={active ? 'page' : undefined} className={`relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-[11px] font-bold leading-tight transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:flex-row sm:gap-1.5 sm:text-xs ${active ? 'bg-white text-blue-700 shadow-md shadow-blue-900/10 ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Icon className="h-4 w-4 shrink-0" /> <span>{tab.label}</span>
                  </a>
                );
              })}
            </nav>

            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">{eyebrow}</p>
            <h1 className="font-display text-[2.1rem] font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-[2.5rem]">{title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">{subtitle}</p>

            <div className="mt-7 rounded-[1.75rem] border border-white bg-white/90 p-5 shadow-[0_30px_90px_-40px_rgba(34,88,170,.5)] ring-1 ring-blue-100/80 backdrop-blur sm:p-7">{children}</div>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500"><Lock className="h-3.5 w-3.5 text-slate-400" /> Данные для входа выдаёт администратор платформы.</p>
          </motion.div>
        </div>
      </div>

      {desktop && (
        <aside className="sticky top-0 h-dvh p-3">
          <FullScene role={role} />
        </aside>
      )}
    </main>
  );
}

type LoginFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & { id: string; label: string; icon: LucideIcon; trailing?: ReactNode };

export function LoginField({ id, label, icon: Icon, trailing, className = '', ...input }: LoginFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
        <input id={id} {...input} className={`min-h-[3.25rem] w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-11 ${trailing ? 'pr-12' : 'pr-4'} text-[15px] font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 ${className}`} />
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
}

export function LoginError({ message }: { message: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p key={message} role="alert" initial={{ opacity: 0, height: 0, x: 0 }} animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -4, 4, 0] }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }} className="overflow-hidden rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold leading-5 text-rose-700">{message}</motion.p>
      )}
    </AnimatePresence>
  );
}

export function LoginSubmit({ loading, icon: Icon, children }: { loading: boolean; icon: LucideIcon; children: ReactNode }) {
  return (
    <button type="submit" disabled={loading} className="login-shine relative flex min-h-[3.25rem] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 font-display text-[15px] font-bold text-white shadow-lg shadow-blue-600/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:translate-y-0 disabled:translate-y-0 disabled:opacity-70">
      {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Icon className="h-[1.1rem] w-[1.1rem]" /> {children}</>}
    </button>
  );
}
