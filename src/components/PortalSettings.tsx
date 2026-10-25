import { FormEvent, useEffect, useState } from 'react';
import { Check, Eye, EyeOff, LockKeyhole, Moon, Settings, Sun, X } from 'lucide-react';
import { createPortal } from 'react-dom';

type Props = { dark: boolean; onThemeChange: (dark: boolean) => void };

export default function PortalSettings({ dark, onThemeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [creds, setCreds] = useState<{ login: string; password: string | null } | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowSaved(false);
    fetch('/api/auth/credentials', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setCreds(d); }).catch(() => {});
  }, [open]);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (newPassword !== confirmPassword) { setNotice({ text: 'Новые пароли не совпадают.', ok: false }); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось сменить пароль.');
      setCreds((c) => ({ login: c?.login || '', password: newPassword })); setShowSaved(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setNotice({ text: 'Пароль успешно изменён.', ok: true });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Не удалось сменить пароль.', ok: false });
    } finally { setBusy(false); }
  };

  return <>
    <button type="button" onClick={() => { setOpen(true); setNotice(null); }} aria-label="Настройки" title="Настройки" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
      <Settings className="h-[19px] w-[19px]" />
    </button>
    {open && typeof document !== 'undefined' && createPortal(<div className={dark ? 'portal-theme-dark' : ''}><div className="portal-settings-overlay fixed inset-0 z-[180] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="portal-settings-title" className="portal-settings-card my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Личный кабинет</p><h2 id="portal-settings-title" className="mt-1 font-display text-2xl font-extrabold">Настройки</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Закрыть настройки" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <section className="mb-5 rounded-xl border border-slate-200 p-4"><div className="mb-3"><h3 className="font-bold">Тема оформления</h3><p className="mt-1 text-sm text-slate-500">Настройка сохранится на этом устройстве.</p></div><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={!dark} onClick={() => onThemeChange(false)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-bold ${!dark ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}><Sun className="h-4 w-4" />Светлая{!dark && <Check className="h-4 w-4" />}</button><button type="button" aria-pressed={dark} onClick={() => onThemeChange(true)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-bold ${dark ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}><Moon className="h-4 w-4" />Тёмная{dark && <Check className="h-4 w-4" />}</button></div></section>
        <section className="mb-5 rounded-xl border border-slate-200 p-4"><h3 className="mb-3 font-bold">Данные для входа</h3>
          <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">Логин (телефон)</span><strong className="select-all">{creds?.login || '…'}</strong></div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">Пароль</span>{creds?.password
            ? <span className="flex items-center gap-2"><strong className="select-all">{showSaved ? creds.password : '••••••••'}</strong><button type="button" onClick={() => setShowSaved((v) => !v)} aria-label={showSaved ? 'Скрыть пароль' : 'Показать пароль'} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">{showSaved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span>
            : <span className="text-right text-xs text-slate-500">{creds ? 'появится после следующего входа по паролю или смены пароля' : '…'}</span>}</div></section>
        <form onSubmit={(event) => void changePassword(event)} className="space-y-3"><div><h3 className="font-bold">Сменить пароль</h3><p className="mt-1 text-sm text-slate-500">Используйте текущий пароль для подтверждения.</p></div>
          {[['current', 'Текущий пароль', currentPassword, setCurrentPassword], ['new', 'Новый пароль', newPassword, setNewPassword], ['confirm', 'Повторите новый пароль', confirmPassword, setConfirmPassword]].map(([key, label, value, setter]) => <label key={String(key)} className="block space-y-1.5 text-sm font-semibold">{String(label)}<span className="relative block"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input required type={showPasswords ? 'text' : 'password'} autoComplete={key === 'current' ? 'current-password' : 'new-password'} minLength={key === 'current' ? undefined : 8} maxLength={128} value={String(value)} onChange={(event) => (setter as (v: string) => void)(event.target.value)} className="portal-settings-input w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></span></label>)}
          <button type="button" onClick={() => setShowPasswords((value) => !value)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700">{showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPasswords ? 'Скрыть пароли' : 'Показать пароли'}</button>
          {notice && <p role={notice.ok ? 'status' : 'alert'} className={`rounded-lg px-3 py-2 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{notice.text}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">{busy ? 'Сохраняем…' : 'Изменить пароль'}</button>
        </form>
      </section>
    </div></div>, document.body)}
  </>;
}
