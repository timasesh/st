import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Link2, PenTool, Video } from 'lucide-react';

const StudyTaskBoard = lazy(() => import('./StudyTaskBoard'));

const JITSI_HOST = 'meet.jit.si';
const GUEST_NAME_KEY = 'studytask-lesson-guest-name';

type RoomInfo = {
  room: string; displayName: string; role: 'student' | 'parent' | 'teacher' | 'guest'; subject: string; boardToken: string;
  student: { id: string; name: string }; teacher: { name: string } | null;
  jaas?: { appId: string; jwt: string } | null; joinPath?: string;
};
type View = 'both' | 'video' | 'board';

declare global { interface Window { JitsiMeetExternalAPI?: any } }

function loadJitsi(src: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Не удалось загрузить видеосвязь. Проверьте интернет.'));
    document.head.appendChild(s);
  });
}

const backHref = (role: string) => (role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : role === 'student' ? '/student' : '/');

export default function LessonRoom() {
  const parts = window.location.pathname.split('/').filter(Boolean); // ['lesson', id?] | ['join', code]
  const guestCode = parts[0] === 'join' ? parts[1] || '' : '';
  const studentId = parts[0] === 'lesson' ? parts[1] || '' : '';
  const isGuest = !!guestCode;

  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('both');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => { try { return localStorage.getItem(GUEST_NAME_KEY) || ''; } catch { return ''; } });
  const [joining, setJoining] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (isGuest) return;
    let alive = true;
    fetch(`/api/lesson-room${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`, { credentials: 'same-origin' })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Не удалось открыть урок.'); return d as RoomInfo; })
      .then((d) => { if (alive) setInfo(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Не удалось открыть урок.'); });
    return () => { alive = false; };
  }, [studentId, isGuest]);

  const joinAsGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.split(/\s+/).filter(Boolean).length < 2) { setError('Введите имя и фамилию.'); return; }
    setError(''); setJoining(true);
    try {
      const r = await fetch(`/api/join/${encodeURIComponent(guestCode)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Не удалось открыть урок.');
      try { localStorage.setItem(GUEST_NAME_KEY, n); } catch { /* ignore */ }
      setInfo(d as RoomInfo);
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось открыть урок.'); }
    finally { setJoining(false); }
  };

  useEffect(() => {
    if (!info || !holder.current) return;
    let disposed = false;
    const jaas = info.jaas;
    const host = jaas ? '8x8.vc' : JITSI_HOST;
    loadJitsi(jaas ? `https://8x8.vc/${jaas.appId}/external_api.js` : `https://${JITSI_HOST}/external_api.js`).then(() => {
      if (disposed || !holder.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current = new window.JitsiMeetExternalAPI(host, {
        roomName: jaas ? `${jaas.appId}/${info.room}` : info.room,
        ...(jaas ? { jwt: jaas.jwt } : {}),
        parentNode: holder.current, width: '100%', height: '100%', lang: 'ru',
        userInfo: { displayName: info.displayName },
        configOverwrite: { subject: info.subject, disableDeepLinking: true, startWithAudioMuted: info.role !== 'teacher', defaultLanguage: 'ru', prejoinPageEnabled: false },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false },
      });
      apiRef.current.addEventListener('readyToClose', () => { window.location.href = backHref(info.role); });
    }).catch((e) => setError(e instanceof Error ? e.message : 'Ошибка видеосвязи.'));
    return () => { disposed = true; try { apiRef.current?.dispose(); } catch { /* ignore */ } apiRef.current = null; };
  }, [info]);

  const copyLink = async () => {
    if (!info?.joinPath) return;
    const url = `${window.location.origin}${info.joinPath}`;
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt('Скопируйте ссылку на занятие:', url); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const seg = (id: View, label: string, icon: React.ReactNode) => (
    <button type="button" onClick={() => setView(id)} aria-pressed={view === id}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold ${view === id ? 'bg-primary text-white' : 'text-muted hover:bg-primary-light'}`}>{icon}{label}</button>
  );

  // Раскладка: видео и доска вместе (на телефоне — друг под другом), либо одно крупно, а второе маленьким окошком.
  const videoCls = view === 'both'
    ? 'h-full min-h-0 overflow-hidden bg-navy'
    : view === 'video'
      ? 'h-full min-h-0 overflow-hidden bg-navy'
      : 'fixed bottom-3 right-3 z-30 h-40 w-28 overflow-hidden rounded-xl border-2 border-white bg-navy shadow-2xl sm:h-48 sm:w-72';
  const showBoard = view !== 'video';

  return (
    <main className="flex h-[100dvh] flex-col bg-bg">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-white px-2 py-2 sm:px-3">
        {!isGuest && (
          <a href={info ? backHref(info.role) : '/login'} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-bold text-muted hover:bg-primary-light" aria-label="В кабинет">
            <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">В кабинет</span>
          </a>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-sm font-bold leading-tight sm:text-base">{info?.subject || 'Урок Study Task'}</h1>
          {info?.teacher && <p className="truncate text-xs text-muted">Преподаватель: {info.teacher.name}</p>}
        </div>
        {info && (
          <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
            {seg('both', 'Вместе', <Video className="h-4 w-4" />)}
            {seg('video', 'Видео', <Video className="h-4 w-4" />)}
            {seg('board', 'Доска', <PenTool className="h-4 w-4" />)}
          </div>
        )}
        {info?.joinPath && (
          <button type="button" onClick={copyLink} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700">
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{copied ? 'Скопировано' : 'Ссылка на занятие'}
          </button>
        )}
      </header>

      {isGuest && !info && (
        <form onSubmit={joinAsGuest} className="m-4 mx-auto w-full max-w-md space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-extrabold">Вход на занятие</h2>
          <p className="text-sm text-muted">Введите имя и фамилию, чтобы присоединиться. Регистрация не нужна.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Имя Фамилия" maxLength={40}
            className="w-full rounded-xl border border-border px-4 py-3 text-base outline-none focus:border-primary" />
          {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
          <button type="submit" disabled={joining} className="w-full rounded-xl bg-primary px-5 py-3 font-display text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{joining ? 'Входим…' : 'Войти на занятие'}</button>
        </form>
      )}
      {!isGuest && error && <p role="alert" className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-700">{error} <a href="/login" className="underline">Войти</a></p>}
      {!isGuest && !error && !info && <p className="m-4 rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted">Открываем урок…</p>}
      {isGuest && info && error && <p role="alert" className="m-2 rounded-xl bg-rose-50 p-3 text-center text-sm font-semibold text-rose-700">{error}</p>}

      {info && (
        <div className={`min-h-0 flex-1 ${view === 'both' ? 'grid grid-rows-[minmax(190px,36%)_1fr] gap-1.5 p-1.5 lg:grid-cols-[minmax(320px,2fr)_3fr] lg:grid-rows-1 lg:gap-2 lg:p-2' : 'p-0'}`}>
          <div className={view === 'both' ? 'min-h-0 overflow-hidden rounded-xl' : view === 'video' ? 'h-full' : ''}>
            <div ref={holder} className={videoCls} />
          </div>
          {showBoard && (
            <div className="h-full min-h-0 overflow-hidden rounded-xl bg-white">
              <Suspense fallback={<p className="p-6 text-sm text-muted">Загружаем доску…</p>}>
                <StudyTaskBoard embedded shareToken={info.boardToken} guestName={info.displayName} />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
