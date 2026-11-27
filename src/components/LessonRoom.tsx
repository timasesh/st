import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, PenTool } from 'lucide-react';

const StudyTaskBoard = lazy(() => import('./StudyTaskBoard'));

const JITSI_HOST = 'meet.jit.si';

type RoomInfo = {
  room: string; displayName: string; role: 'student' | 'parent' | 'teacher'; subject: string;
  student: { id: string; name: string }; teacher: { name: string } | null;
  jaas?: { appId: string; jwt: string } | null;
};

declare global { interface Window { JitsiMeetExternalAPI?: any } }

function loadJitsi(src: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Не удалось загрузить видеосвязь. Проверьте интернет.'));
    document.head.appendChild(s);
  });
}

export default function LessonRoom() {
  const parts = window.location.pathname.split('/').filter(Boolean); // ['lesson', studentId?]
  const studentId = parts[1] || '';
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [error, setError] = useState('');
  const [board, setBoard] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/lesson-room${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`, { credentials: 'same-origin' })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Не удалось открыть урок.'); return d as RoomInfo; })
      .then((d) => { if (alive) setInfo(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Не удалось открыть урок.'); });
    return () => { alive = false; };
  }, [studentId]);

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
        parentNode: holder.current,
        width: '100%',
        height: '100%',
        lang: 'ru',
        userInfo: { displayName: info.displayName },
        configOverwrite: { subject: info.subject, disableDeepLinking: true, startWithAudioMuted: info.role !== 'teacher', defaultLanguage: 'ru' },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false },
      });
      apiRef.current.addEventListener('readyToClose', () => { window.location.href = backHref(info.role); });
    }).catch((e) => setError(e instanceof Error ? e.message : 'Ошибка видеосвязи.'));
    return () => { disposed = true; try { apiRef.current?.dispose(); } catch { /* ignore */ } apiRef.current = null; };
  }, [info]);

  const backHref = (role: string) => (role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/student');

  return (
    <main className="flex h-[100dvh] flex-col bg-bg">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-white px-3 py-2">
        <a href={info ? backHref(info.role) : '/login'} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-primary-light">
          <ArrowLeft className="h-4 w-4" /> В кабинет
        </a>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold leading-tight">{info?.subject || 'Урок Study Task'}</h1>
          {info?.teacher && <p className="truncate text-xs text-muted">Преподаватель: {info.teacher.name}</p>}
        </div>
        {info?.role === 'teacher' && (
          <button type="button" onClick={() => setBoard((v) => !v)} aria-pressed={board}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold ${board ? 'border-primary bg-primary-light text-primary' : 'border-border text-muted hover:bg-primary-light'}`}>
            <PenTool className="h-4 w-4" /> Доска
          </button>
        )}
        {info && !info.jaas && (
          <a href={`https://${JITSI_HOST}/${info.room}`} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground sm:inline-flex">
            <ExternalLink className="h-3.5 w-3.5" /> Открыть отдельно
          </a>
        )}
      </header>

      {error && <p role="alert" className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-700">{error} <a href="/login" className="underline">Войти</a></p>}
      {!error && !info && <p className="m-4 rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted">Открываем урок…</p>}

      {info && !error && (
        <div className={`min-h-0 flex-1 ${board ? 'grid grid-rows-[minmax(220px,38%)_1fr] gap-2 p-2 lg:grid-cols-[minmax(320px,2fr)_3fr] lg:grid-rows-1' : ''}`}>
          <div ref={holder} className="h-full min-h-0 overflow-hidden bg-navy lg:rounded-2xl" />
          {board && (
            <div className="min-h-0 overflow-auto rounded-2xl">
              <Suspense fallback={<p className="p-6 text-sm text-muted">Загружаем доску…</p>}><StudyTaskBoard /></Suspense>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
