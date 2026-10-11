import { useCallback, useEffect, useState } from 'react';
import { Gamepad2, Medal, RefreshCw, Star, Trophy } from 'lucide-react';

type Player = { id: string; name: string; stars: number };
type SkyQuestData = { stars: number; leaderboard: Player[] };

export default function SkyQuestTab() {
  const [section, setSection] = useState<'game' | 'rating'>('game');
  const [data, setData] = useState<SkyQuestData>({ stars: 0, leaderboard: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/student/skyquest', { credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось загрузить Sky Quest.');
      setData({ stars: Number(result.stars) || 0, leaderboard: Array.isArray(result.leaderboard) ? result.leaderboard : [] });
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить Sky Quest.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => { if (event.data?.type === 'SKYQUEST_BALANCE_CHANGED') void load(); };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [load]);

  return <section aria-labelledby="skyquest-title" className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500">Космическое приключение</p><h2 id="skyquest-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight">Sky Quest</h2><p className="mt-1 text-sm text-slate-500">Игровые звёзды хранятся отдельно от наград за задания.</p></div><div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-700"><Star className="h-5 w-5 fill-amber-400 text-amber-500"/><span className="text-sm font-bold">Мои звёзды</span><strong className="text-xl">{loading ? '…' : data.stars}</strong></div></header>
    <nav aria-label="Разделы Sky Quest" className="flex gap-2"><button type="button" onClick={() => setSection('game')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold ${section === 'game' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}><Gamepad2 className="h-4 w-4"/>Играть</button><button type="button" onClick={() => { setSection('rating'); void load(); }} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold ${section === 'rating' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}><Trophy className="h-4 w-4"/>Рейтинг</button></nav>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {section === 'game' ? <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"><iframe src="/flappy/index.html?autostart=1" title="Sky Quest" className="mx-auto h-[min(650px,75vh)] w-full max-w-[400px] rounded-2xl border-2 border-slate-200 bg-slate-950" allow="autoplay" /></div> : <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><h3 className="font-display text-lg font-extrabold">Топ игроков</h3><p className="text-sm text-slate-500">Рейтинг по игровым звёздам</p></div><button type="button" onClick={() => void load()} aria-label="Обновить рейтинг" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><RefreshCw className="h-4 w-4"/></button></div>{loading ? <p className="py-8 text-center text-sm text-slate-500">Загружаем рейтинг…</p> : data.leaderboard.length ? <ol className="space-y-2">{data.leaderboard.map((player, index) => <li key={player.id} className={`flex items-center gap-3 rounded-xl border px-3 py-3 sm:px-4 ${index < 3 ? 'border-amber-100 bg-amber-50/60' : 'border-slate-100 bg-slate-50/60'}`}><span className="grid h-9 w-9 shrink-0 place-items-center text-xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : <span className="text-sm font-bold text-slate-400">{index + 1}</span>}</span><span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{player.name}</span><span className="inline-flex items-center gap-1.5 font-extrabold tabular-nums text-amber-700"><Star className="h-4 w-4 fill-amber-400 text-amber-500"/>{player.stars}</span>{index < 3 && <Medal className="hidden h-4 w-4 text-amber-500 sm:block"/>}</li>)}</ol> : <p className="py-8 text-center text-sm text-slate-500">Рейтинг появится, когда ученики соберут игровые звёзды.</p>}</div>}
  </section>;
}
