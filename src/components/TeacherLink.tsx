import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ExternalLink, Eye, EyeOff, GraduationCap, Link2, Link2Off, LoaderCircle } from 'lucide-react';
import PhoneInput from '../shared/PhoneInput';

export type TeacherLink = { name: string };
/** Привязка хранится на сервере (работает и на сайте, и в Telegram Mini App). */
export async function fetchTeacherLink(): Promise<TeacherLink | null> {
  try {
    const response = await fetch('/api/admin/teacher-link', { credentials: 'same-origin' });
    const result = await response.json().catch(() => ({}));
    return response.ok && result.linked && result.teacher ? { name: String(result.teacher.name || '') } : null;
  } catch { return null; }
}
/** Выдаёт сеанс привязанного преподавателя (без пароля) — перед открытием панели. */
export async function openTeacherSession(): Promise<boolean> {
  try { return (await fetch('/api/admin/teacher-link/session', { method: 'POST', credentials: 'same-origin' })).ok; } catch { return false; }
}
export async function unlinkTeacherOnServer() {
  try { await fetch('/api/admin/teacher-link', { method: 'DELETE', credentials: 'same-origin' }); } catch { /* повторим при следующей попытке */ }
}

/** Логотип ST: обычный клик — как раньше (ссылка на главную), удержание 2 секунды — onHold (с кольцом прогресса). */
export function HoldLogo({ onHold, noNav, holdMs = 2000, children }: { onHold?: () => void; noNav?: boolean; holdMs?: number; children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const held = useRef(false);
  const stop = () => { if (timer.current) window.clearTimeout(timer.current); if (raf.current) cancelAnimationFrame(raf.current); timer.current = null; raf.current = null; setProgress(0); };
  useEffect(() => stop, []);
  const start = () => {
    if (!onHold) return;
    held.current = false; const t0 = performance.now();
    const tick = () => { setProgress(Math.min(1, (performance.now() - t0) / holdMs)); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    timer.current = window.setTimeout(() => { held.current = true; stop(); onHold(); }, holdMs);
  };
  const R = 27, C = 2 * Math.PI * R;
  return (
    <a href="/" draggable={false} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(event) => { if (onHold) event.preventDefault(); }}
      onClick={(event) => { if (held.current || noNav) { event.preventDefault(); held.current = false; } }}
      style={{ WebkitTouchCallout: 'none', userSelect: 'none', touchAction: 'manipulation' }} className="relative flex items-center gap-3">
      {progress > 0 && <svg className="pointer-events-none absolute -left-1.5 -top-1.5 h-[52px] w-[52px] -rotate-90" viewBox="0 0 60 60" aria-hidden><circle cx="30" cy="30" r={R} fill="none" stroke="#bfdbfe" strokeWidth="3.5" /><circle cx="30" cy="30" r={R} fill="none" stroke="#1d4ed8" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} /></svg>}
      <span className="contents" style={{ transform: progress > 0 ? `scale(${1 - progress * 0.06})` : undefined }}>{children}</span>
    </a>
  );
}

type Phase = 'idle' | 'loading' | 'done';
const STEPS = ['Проверяем логин и пароль…', 'Подключаем панель преподавателя…', 'Почти готово…'];
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function TeacherLinkCard({ link, notice, onLinked, onUnlink, onOpen }: { link: TeacherLink | null; notice?: string; onLinked: (link: TeacherLink) => void; onUnlink: () => void; onOpen: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (phone.length < 10 || !password) { setError('Введите номер телефона и пароль преподавателя.'); return; }
    setError(''); setPhase('loading'); setStep(0);
    const steps = [window.setTimeout(() => setStep(1), 900), window.setTimeout(() => setStep(2), 1800)];
    try {
      const request = fetch('/api/admin/teacher-link', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: `7${phone}`, password }) })
        .then(async (response) => { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Не удалось войти. Проверьте номер телефона и пароль.'); return result; });
      const [result] = await Promise.all([request, sleep(2300)]);
      if (!result.linked || !result.teacher) throw new Error('Это не аккаунт преподавателя.');
      setPhase('done'); setPassword('');
      await sleep(800);
      onLinked({ name: String(result.teacher.name || '') });
      setPhase('idle'); setPhone('');
    } catch (reason) {
      setPhase('idle'); setError(reason instanceof Error ? reason.message : 'Не удалось подключить панель преподавателя.');
    } finally { steps.forEach((id) => window.clearTimeout(id)); }
  };
  const unlink = async () => {
    await unlinkTeacherOnServer();
    onUnlink();
  };

  const field = 'admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 text-sm focus:border-primary focus:outline-none';
  return (
    <section className="admin-card relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-primary-light p-2.5 text-primary"><GraduationCap className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-extrabold">Панель преподавателя</h2><p className="text-sm text-muted">Привяжите кабинет преподавателя, чтобы открывать его прямо из админки.</p></div></div>
      {notice && !link && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{notice}</p>}
      {link ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
            <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Link2 className="h-4 w-4" /></span><span><strong className="block">Привязана: {link.name}</strong><span className="text-sm text-muted">Зажмите логотип ST слева сверху на 2 секунды, чтобы переключаться между панелями.</span></span></span>
            <span className="flex flex-wrap gap-2"><button type="button" onClick={onOpen} className="clay-btn inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark"><ExternalLink className="h-4 w-4" />Открыть</button><button type="button" onClick={() => void unlink()} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><Link2Off className="h-4 w-4" />Отвязать</button></span>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-bold">Логин (телефон преподавателя)<div className="mt-1"><PhoneInput value={phone} onChange={setPhone} className={field} invalid={false} /></div></label>
          <label className="block text-sm font-bold">Пароль<div className="relative mt-1"><input type={showPassword ? 'text' : 'password'} autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} className={`${field} pr-11`} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-primary-light">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
          <button type="submit" disabled={phase !== 'idle'} className="clay-btn inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60"><Link2 className="h-4 w-4" />Привязать</button>
          <p className="text-xs text-muted">Пароль нигде не сохраняется: он проверяется один раз. Привязка действует и в Telegram Mini App администратора.</p>
        </form>
      )}
      {phase !== 'idle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 grid place-items-center bg-white/95 p-6 text-center backdrop-blur-sm" role="status" aria-live="polite">
          <div className="w-full max-w-xs">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary-light text-primary">
              {phase === 'done' ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }} className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-8 w-8" /></motion.span> : <LoaderCircle className="h-8 w-8 animate-spin" />}
            </div>
            <p className="font-display text-base font-extrabold">{phase === 'done' ? 'Панель подключена!' : STEPS[step]}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-light"><motion.div className="h-full rounded-full bg-primary" initial={{ width: '4%' }} animate={{ width: phase === 'done' ? '100%' : '92%' }} transition={{ duration: phase === 'done' ? 0.3 : 2.4, ease: 'easeInOut' }} /></div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
