import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, BookOpen, CalendarDays, Check, ChevronRight, FileQuestion, FileText, Gamepad2, GraduationCap, KeyRound, LoaderCircle, LockKeyhole, MessageCircle, RotateCw, ShieldCheck, Trash2, Users, X } from 'lucide-react';

type CleanupItem = { id: string; label: string; details: string; model: string };
type ModelInfo = { key: string; label: string; count: number };
type CleanupPayload = { models: ModelInfo[]; rows: Record<string, CleanupItem[]> };

const modelIcons: Record<string, typeof Users> = {
  accounts: Users,
  schedule: CalendarDays,
  scheduleTargets: CalendarDays,
  trials: GraduationCap,
  tests: FileQuestion,
  lessonHistory: BookOpen,
  homework: FileText,
  homeworkFiles: Archive,
  gameProgress: Gamepad2,
  messages: MessageCircle,
  audit: FileText,
  studentProgress: Check,
};

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  return { body, error: typeof body.error === 'string' ? body.error : '' };
}

export default function AdminDataCleanup() {
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeModel, setActiveModel] = useState('accounts');
  const [data, setData] = useState<CleanupPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/cleanup/data', { credentials: 'same-origin' });
      const { body, error: message } = await parseResponse(response);
      if (response.status === 423) { setIsUnlocked(false); setData(null); setPin(''); }
      if (!response.ok) throw new Error(message || 'Не удалось загрузить объекты.');
      setData(body as CleanupPayload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить объекты.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isUnlocked) void loadData(); }, [isUnlocked]);
  useEffect(() => {
    if (!isUnlocked) return;
    const timer = window.setTimeout(() => {
      void fetch('/api/admin/cleanup/lock', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
      setIsUnlocked(false); setData(null); setPin(''); setError('Защитный доступ завершился. Введите PIN-код ещё раз.');
    }, 5 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [isUnlocked]);

  const unlock = async (event?: FormEvent) => {
    event?.preventDefault();
    if (pin.length !== 4) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/cleanup/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ pin }),
      });
      const { error: message } = await parseResponse(response);
      if (!response.ok) throw new Error(message || 'Не удалось открыть раздел.');
      setIsUnlocked(true); setPin('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось проверить PIN-код.'); }
    finally { setLoading(false); }
  };

  const lock = async () => {
    await fetch('/api/admin/cleanup/lock', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
    setIsUnlocked(false); setData(null); setPin(''); setError(''); setNotice('');
  };

  const appendDigit = (digit: string) => {
    setError('');
    setPin((current) => current.length < 4 ? `${current}${digit}` : current);
  };

  const deleteItem = async (item: CleanupItem) => {
    const accepted = window.confirm(`Удалить «${item.label}» из раздела «${item.model}»? Это действие нельзя отменить.`);
    if (!accepted) return;
    setBusyId(item.id); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/cleanup/data/${encodeURIComponent(activeModel)}/${encodeURIComponent(item.id)}`, { method: 'DELETE', credentials: 'same-origin' });
      const { error: message } = await parseResponse(response);
      if (response.status === 423) { setIsUnlocked(false); setData(null); throw new Error('Защитный доступ завершился. Введите PIN-код ещё раз.'); }
      if (!response.ok) throw new Error(message || 'Не удалось удалить объект.');
      setNotice('Объект удалён.');
      await loadData();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удалить объект.'); }
    finally { setBusyId(''); }
  };

  const selectedItems = useMemo(() => data?.rows[activeModel] || [], [data, activeModel]);

  if (!isUnlocked) {
    return (
      <section className="admin-card mx-auto max-w-lg overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 pb-7 pt-8 text-center text-white sm:px-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30"><LockKeyhole className="h-8 w-8" /></span>
          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-100">Защищённый доступ</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold">Управление данными</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-blue-100">Введите PIN-код на экранной клавиатуре, чтобы просматривать и удалять отдельные записи.</p>
        </div>
        <form onSubmit={(event) => void unlock(event)} className="p-6 sm:p-8">
          <div className="mx-auto mb-5 flex h-12 max-w-[190px] items-center justify-center gap-3" aria-label={`${pin.length} из 4 цифр введено`}>
            {[0, 1, 2, 3].map((index) => <span key={index} className={`grid h-10 w-10 place-items-center rounded-xl border-2 font-display text-xl font-extrabold transition ${pin.length > index ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-transparent'}`}>{pin.length > index ? '●' : '•'}</span>)}
          </div>
          <div className="mx-auto grid max-w-[250px] grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((key) => <button key={key} type="button" aria-label={key === 'clear' ? 'Очистить PIN-код' : key === 'back' ? 'Удалить последнюю цифру' : `Цифра ${key}`} onClick={() => key === 'clear' ? (setPin(''), setError('')) : key === 'back' ? (setPin((value) => value.slice(0, -1)), setError('')) : appendDigit(key)} className={`grid h-14 place-items-center rounded-2xl border text-lg font-extrabold transition active:scale-95 ${key === 'clear' || key === 'back' ? 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50' : 'border-blue-100 bg-blue-50 text-blue-900 shadow-sm hover:border-blue-300 hover:bg-blue-100'}`}>
              {key === 'clear' ? <X className="h-5 w-5" /> : key === 'back' ? <span aria-hidden>⌫</span> : key}
            </button>)}
          </div>
          {error && <p role="alert" className="mx-auto mt-4 max-w-sm rounded-xl bg-rose-50 p-3 text-center text-sm font-semibold text-rose-700">{error}</p>}
          <button type="submit" disabled={pin.length !== 4 || loading} className="mx-auto mt-5 flex min-h-12 w-full max-w-[250px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45">
            {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <><KeyRound className="h-4 w-4" /> Открыть раздел</>}
          </button>
          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Сеанс доступа закроется автоматически через 5 минут</p>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="admin-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-display font-extrabold">Защищённый режим включён</h2><p className="text-sm text-muted">Удаление доступно для каждой записи отдельно.</p></div></div>
        <div className="flex gap-2"><button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold text-muted hover:bg-primary-light disabled:opacity-50"><RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Обновить</button><button type="button" onClick={() => void lock()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold text-muted hover:bg-primary-light"><LockKeyhole className="h-4 w-4" /> Закрыть</button></div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Модели данных">
        {(data?.models || []).map((model) => {
          const Icon = modelIcons[model.key] || Archive;
          return <button key={model.key} type="button" role="tab" aria-selected={activeModel === model.key} onClick={() => { setActiveModel(model.key); setError(''); setNotice(''); }} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${activeModel === model.key ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-border bg-white text-muted hover:border-blue-200 hover:text-primary'}`}><Icon className="h-4 w-4" />{model.label}<span className={`rounded-full px-2 py-0.5 text-xs ${activeModel === model.key ? 'bg-white/20' : 'bg-primary-light'}`}>{model.count}</span></button>;
        })}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}
      <section className="admin-card overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5"><div><h3 className="font-display text-lg font-extrabold">{data?.models.find((model) => model.key === activeModel)?.label || 'Объекты'}</h3><p className="mt-0.5 text-sm text-muted">Записей: {selectedItems.length}</p></div><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><AlertTriangle className="h-5 w-5" /></span></div>
        {loading && !data ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted"><LoaderCircle className="h-5 w-5 animate-spin" /> Загружаем объекты…</div> : selectedItems.length ? <ul className="divide-y divide-border">{selectedItems.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary"><ChevronRight className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{item.label}</p><p className="mt-0.5 break-words text-xs text-muted">{item.details}</p></div><button type="button" disabled={busyId === item.id} onClick={() => void deleteItem(item)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />{busyId === item.id ? 'Удаляем…' : 'Удалить'}</button></li>)}</ul> : <div className="px-4 py-14 text-center"><Check className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-bold">В этом разделе нет записей</p><p className="mt-1 text-sm text-muted">После добавления объектов они появятся здесь.</p></div>}
      </section>
      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Удаление аккаунта может каскадно убрать связанные файлы и игровой прогресс. Учётная запись администратора и секрет сессий доступны только в системных настройках и здесь не отображаются.</p>
    </section>
  );
}
