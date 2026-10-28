import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';

/* Админ-панель внутри Telegram: тот же интерфейс и функции, что на сайте (/admin). Вход — по Telegram, после отправки боту кода администратора. */
const AdminDashboardPage = lazy(() => import('../components/AuthPages').then((module) => ({ default: module.AdminDashboardPage })));

const box: CSSProperties = { minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif', color: '#12266F', background: '#f4f7fc' };

export default function TgAdmin() {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    try { tg?.ready?.(); tg?.expand?.(); tg?.disableVerticalSwipes?.(); } catch { /* не критично */ }
    fetch('/api/tg/admin-auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: tg?.initData || '' }) })
      .then((response) => setState(response.ok ? 'ok' : 'denied'))
      .catch(() => setState('denied'));
  }, []);
  if (state === 'loading') return <div style={box} role="status">Входим как администратор…</div>;
  if (state === 'denied') return (
    <div style={box}>
      <div style={{ maxWidth: 360 }}>
        <h2 style={{ margin: '0 0 8px' }}>Доступ не подтверждён</h2>
        <p style={{ margin: 0, lineHeight: 1.45 }}>Отправьте боту <b>код администратора</b> (он указан в настройках админ-панели на сайте) — после этого панель откроется здесь.</p>
      </div>
    </div>
  );
  return <Suspense fallback={<div style={box} role="status">Загружаем панель…</div>}><AdminDashboardPage /></Suspense>;
}
