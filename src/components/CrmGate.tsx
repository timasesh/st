import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { CRM_LOCKED_EVENT, CRM_UNLOCKED_EVENT } from './crm/api';

/* PIN-замок для вкладок «CRM» и «Настройка CRM». Тот же экранный набор цифр и тот же PIN-код, что у «Управления данными».
   Сервер выдаёт отдельный cookie-сеанс; пока его нет, все маршруты /api/admin/crm/* отвечают 423. */
export async function lockCrm() {
  await fetch('/api/admin/crm-access/lock', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
  window.dispatchEvent(new Event(CRM_LOCKED_EVENT));
}

type State = 'checking' | 'locked' | 'open';

export default function CrmGate({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  const [state, setState] = useState<State>('checking');
  const [expiresAt, setExpiresAt] = useState(0);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/crm-access/status', { credentials: 'same-origin' })
      .then((response) => response.json().catch(() => ({})))
      .then((body: { unlocked?: boolean; expiresAt?: number }) => { if (!alive) return; setExpiresAt(body.expiresAt || 0); setState(body.unlocked ? 'open' : 'locked'); })
      .catch(() => { if (alive) setState('locked'); });
    return () => { alive = false; };
  }, []);

  const relock = useCallback((message = '') => { setState('locked'); setPin(''); setError(message); }, []);
  useEffect(() => {
    const handler = () => relock('Сеанс завершился. Введите PIN-код ещё раз.');
    window.addEventListener(CRM_LOCKED_EVENT, handler);
    return () => window.removeEventListener(CRM_LOCKED_EVENT, handler);
  }, [relock]);
  useEffect(() => {
    if (state !== 'open' || !expiresAt) return undefined;
    const timer = window.setTimeout(() => { void lockCrm(); }, Math.max(1000, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [state, expiresAt]);

  const unlock = async (event?: FormEvent) => {
    event?.preventDefault();
    if (pin.length !== 4) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/crm-access/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ pin }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Не удалось проверить PIN-код.');
      setExpiresAt(body.expiresAt || 0); setPin(''); setState('open');
      window.dispatchEvent(new Event(CRM_UNLOCKED_EVENT));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось проверить PIN-код.'); setPin(''); }
    finally { setLoading(false); }
  };

  const press = (key: string) => {
    setError('');
    if (key === 'clear') setPin('');
    else if (key === 'back') setPin((value) => value.slice(0, -1));
    else setPin((value) => (value.length < 4 ? `${value}${key}` : value));
  };

  if (state === 'open') return <>{children}</>;
  if (state === 'checking') return <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted"><LoaderCircle className="h-5 w-5 animate-spin" /> Проверяем доступ…</div>;

  return (
    <section className="admin-card mx-auto max-w-lg overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 pb-7 pt-8 text-center text-white sm:px-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30"><LockKeyhole className="h-8 w-8" /></span>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-100">Защищённый доступ</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-blue-100">{hint}</p>
      </div>
      <form onSubmit={(event) => void unlock(event)} className="p-6 sm:p-8">
        <div className="mx-auto mb-5 flex h-12 max-w-[190px] items-center justify-center gap-3" aria-label={`${pin.length} из 4 цифр введено`}>
          {[0, 1, 2, 3].map((index) => <span key={index} className={`grid h-10 w-10 place-items-center rounded-xl border-2 font-display text-xl font-extrabold transition ${pin.length > index ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-transparent'}`}>{pin.length > index ? '●' : '•'}</span>)}
        </div>
        <div className="mx-auto grid max-w-[250px] grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((key) => (
            <button key={key} type="button" aria-label={key === 'clear' ? 'Очистить PIN-код' : key === 'back' ? 'Удалить последнюю цифру' : `Цифра ${key}`} onClick={() => press(key)}
              className={`grid h-14 place-items-center rounded-2xl border text-lg font-extrabold transition active:scale-95 ${key === 'clear' || key === 'back' ? 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50' : 'border-blue-100 bg-blue-50 text-blue-900 shadow-sm hover:border-blue-300 hover:bg-blue-100'}`}>
              {key === 'clear' ? <X className="h-5 w-5" /> : key === 'back' ? <span aria-hidden>⌫</span> : key}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="mx-auto mt-4 max-w-sm rounded-xl bg-rose-50 p-3 text-center text-sm font-semibold text-rose-700">{error}</p>}
        <button type="submit" disabled={pin.length !== 4 || loading} className="mx-auto mt-5 flex min-h-12 w-full max-w-[250px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45">
          {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <><KeyRound className="h-4 w-4" /> Открыть раздел</>}
        </button>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Один ввод PIN-кода открывает «CRM» и «Настройку CRM»</p>
      </form>
    </section>
  );
}
