import React, { useEffect, useState } from 'react';
import StudyTaskBoard from './StudyTaskBoard';

const NAME_KEY = 'studytask-board-guest-name';

/** Страница /board/<токен>: общая доска для тех, кто открыл ссылку. Вход не нужен. */
export default function SharedBoardPage() {
  const token = window.location.pathname.replace(/^\/board\//, '').split('/')[0];
  const [status, setStatus] = useState<'check' | 'ok' | 'missing'>('check');
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } });
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    document.title = 'Общая доска Study Task';
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex'; document.head.appendChild(meta);
    fetch(`/api/board-share/${encodeURIComponent(token)}`).then((r) => setStatus(r.ok ? 'ok' : 'missing')).catch(() => setStatus('missing'));
    return () => { meta.remove(); };
  }, [token]);

  const saveName = () => { const v = draft.trim().slice(0, 30); setName(v); try { localStorage.setItem(NAME_KEY, v); } catch { /* ignore */ } };

  return (
    <main className="min-h-screen bg-bg p-3 sm:p-4">
      <header className="mx-auto mb-3 flex max-w-[1500px] flex-wrap items-center gap-3">
        <img src="/static/ST.webp" alt="Study Task" className="h-10 w-10 rounded-xl object-contain" />
        <div className="min-w-0 flex-1"><h1 className="font-display text-lg font-bold leading-tight">Общая доска Study Task</h1><p className="text-xs text-muted">Рисуйте вместе: все изменения видны сразу</p></div>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">Ваше имя
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={saveName} onKeyDown={(e) => { if (e.key === 'Enter') { saveName(); (e.target as HTMLInputElement).blur(); } }} maxLength={30} placeholder="Гость" className="h-9 w-40 rounded-lg border border-border bg-white px-3 text-sm text-text outline-none focus:border-primary" />
        </label>
      </header>
      <div className="mx-auto max-w-[1500px]">
        {status === 'check' && <p className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted">Открываем доску…</p>}
        {status === 'missing' && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm font-semibold text-rose-700">Доска не найдена или доступ закрыт. Попросите преподавателя прислать новую ссылку.</p>}
        {status === 'ok' && <StudyTaskBoard shareToken={token} guestName={name} />}
      </div>
    </main>
  );
}
