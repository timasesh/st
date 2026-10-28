import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';

type TgAdmins = { code: string; isDefault: boolean; admins: { id: string; name: string; at: string }[] };

/* Настройки админ-панели: код, который отправляется боту, чтобы войти администратором в Telegram. */
export default function AdminTelegramCard() {
  const [info, setInfo] = useState<TgAdmins | null>(null);
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/telegram-admin', { credentials: 'same-origin' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Не удалось загрузить настройки Telegram.');
      setInfo(data); setCode(data.code);
    } catch (reason) { setMsg({ ok: false, text: reason instanceof Error ? reason.message : 'Не удалось загрузить настройки Telegram.' }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const response = await fetch('/api/admin/telegram-admin/code', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить код.');
      setMsg({ ok: true, text: 'Код сохранён.' }); await load();
    } catch (reason) { setMsg({ ok: false, text: reason instanceof Error ? reason.message : 'Не удалось сохранить код.' }); }
    finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    if (!window.confirm('Отозвать доступ администратора для этого Telegram?')) return;
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/telegram-admin/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Не удалось отозвать доступ.');
      await load();
    } catch (reason) { setMsg({ ok: false, text: reason instanceof Error ? reason.message : 'Не удалось отозвать доступ.' }); }
  };

  return (
    <section className="admin-card rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-primary-light p-2.5 text-primary"><Send className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-extrabold">Telegram-бот администратора</h2><p className="text-sm text-muted">Отправьте этот код боту @studytaskkzbot — аккаунт администратора авторизуется, откроется мини-приложение админ-панели и начнут приходить уведомления о новых записях на пробный урок и прохождениях теста.</p></div></div>
      <form onSubmit={save} className="space-y-3">
        <label className="block space-y-1.5 text-sm font-bold">Код входа (7–12 цифр)
          <input type={show ? 'text' : 'password'} inputMode="numeric" autoComplete="off" minLength={7} maxLength={12} pattern="[0-9]{7,12}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="admin-input w-full rounded-xl border-2 border-border bg-primary-light px-3 py-2.5 font-mono font-normal tracking-widest focus:border-primary focus:outline-none" />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Показать код</label>
        {info?.isDefault && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Сейчас используется код по умолчанию. Рекомендуем сменить его на свой.</p>}
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-xl p-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p>}
        <button type="submit" disabled={busy || code.length < 7} className="clay-btn flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{busy ? 'Сохраняем…' : 'Сохранить код'}</button>
      </form>
      <div className="mt-5">
        <h3 className="mb-2 text-sm font-extrabold">Авторизованные Telegram-аккаунты</h3>
        {info?.admins.length ? (
          <ul className="space-y-2">{info.admins.map((admin) => (
            <li key={admin.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"><span><strong>{admin.name}</strong><span className="block text-xs text-muted">{admin.at ? new Date(admin.at).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' }) : ''}</span></span><button type="button" onClick={() => void revoke(admin.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Отозвать</button></li>
          ))}</ul>
        ) : <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">Пока ни один Telegram не авторизован.</p>}
      </div>
    </section>
  );
}
