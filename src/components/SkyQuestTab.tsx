import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gamepad2, RefreshCw, Rocket, Star, Trophy, Zap } from 'lucide-react';

type Row = { rank: number; name: string; value: number; me: boolean };
type Ranking = { top: Row[]; me: { rank: number; value: number } | null };
const EMPTY: Ranking = { top: [], me: null };
type SkyData = { stars: number; bestScore: number; bestStars: number; byStars: Ranking; byScore: Ranking };
type SprintStats = { bestScore: number; bestDistance: number; bestStars: number; rounds: number };
type SprintData = { stats: SprintStats; byStars: Ranking; byScore: Ranking };
type StRating = { stars: number; top: Row[]; me: { rank: number; value: number } | null };

type Section = 'sky' | 'sprint' | 'rating';
type Sub = 'play' | 'stars' | 'score';

const MEDAL = ['🥇', '🥈', '🥉'];
const btn = (on: boolean) => `inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold ${on ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`;
const subBtn = (on: boolean) => `rounded-lg px-3 py-2 text-sm font-bold ${on ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`;

function RankRows({ rows, me, unit, empty }: { rows: Row[]; me: { rank: number; value: number } | null; unit: string; empty: string }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500">{empty}</p>;
  const meInTop = rows.some((r) => r.me);
  const row = (r: Row, key: string) => <li key={key} className={`flex items-center gap-3 rounded-xl border px-3 py-3 sm:px-4 ${r.me ? 'border-indigo-300 bg-indigo-50' : r.rank <= 3 ? 'border-amber-100 bg-amber-50/60' : 'border-slate-100 bg-slate-50/60'}`}>
    <span className="grid h-9 w-9 shrink-0 place-items-center text-xl">{r.rank <= 3 ? MEDAL[r.rank - 1] : <span className="text-sm font-bold text-slate-500">{r.rank}</span>}</span>
    <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{r.name}{r.me && <span className="ml-2 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">ты</span>}</span>
    <strong className="shrink-0 text-sm text-slate-900">{r.value} {unit}</strong>
  </li>;
  return <ol className="space-y-2">{rows.map((r, i) => row(r, `${r.rank}-${i}`))}
    {!meInTop && me && <>{<li aria-hidden className="text-center text-slate-300">⋯</li>}{row({ rank: me.rank, name: 'Ты', value: me.value, me: true }, 'me')}</>}
  </ol>;
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">{children}</div>;
}

function SubNav({ sub, setSub, onRefresh }: { sub: Sub; setSub: (s: Sub) => void; onRefresh: () => void }) {
  return <div className="mb-5 flex flex-wrap items-center gap-2">
    <button type="button" onClick={() => setSub('play')} className={subBtn(sub === 'play')}><Gamepad2 className="mr-1 inline h-4 w-4" />Играть</button>
    <button type="button" onClick={() => { setSub('stars'); onRefresh(); }} className={subBtn(sub === 'stars')}><Star className="mr-1 inline h-4 w-4 fill-current" />Лучшие по звёздам</button>
    <button type="button" onClick={() => { setSub('score'); onRefresh(); }} className={subBtn(sub === 'score')}><Trophy className="mr-1 inline h-4 w-4" />Лучшие по очкам</button>
    <button type="button" onClick={onRefresh} aria-label="Обновить" className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button>
  </div>;
}

export default function SkyQuestTab() {
  const [section, setSection] = useState<Section>('sky');
  const [skySub, setSkySub] = useState<Sub>('play');
  const [sprintSub, setSprintSub] = useState<Sub>('play');
  const [skyOpen, setSkyOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [sky, setSky] = useState<SkyData>({ stars: 0, bestScore: 0, bestStars: 0, byStars: EMPTY, byScore: EMPTY });
  const [sprint, setSprint] = useState<SprintData>({ stats: { bestScore: 0, bestDistance: 0, bestStars: 0, rounds: 0 }, byStars: EMPTY, byScore: EMPTY });
  const [st, setSt] = useState<StRating>({ stars: 0, top: [], me: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => { const mq = window.matchMedia('(max-width: 639px)'); const on = () => setMobile(mq.matches); on(); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);

  const get = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, { credentials: 'same-origin' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((result as { error?: string }).error || 'Не удалось загрузить данные.');
    return result as T;
  };
  const loadSky = useCallback(async () => {
    try { const r = await get<SkyData>('/api/student/skyquest'); setSky({ stars: Number(r.stars) || 0, bestScore: Number(r.bestScore) || 0, bestStars: Number(r.bestStars) || 0, byStars: r.byStars || EMPTY, byScore: r.byScore || EMPTY }); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить Sky Quest.'); }
  }, []);
  const loadSprint = useCallback(async () => {
    try { const r = await get<SprintData>('/api/games/school-sprint/leaderboard'); setSprint({ stats: r.stats, byStars: r.byStars || EMPTY, byScore: r.byScore || EMPTY }); }
    catch { /* игра покажет ошибку сама */ }
  }, []);
  const loadRating = useCallback(async () => {
    try { const r = await get<StRating>('/api/student/rating'); setSt({ stars: Number(r.stars) || 0, top: r.top || [], me: r.me || null }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить рейтинг.'); }
  }, []);
  const loadAll = useCallback(async () => { await Promise.all([loadSky(), loadSprint(), loadRating()]); setLoading(false); }, [loadSky, loadSprint, loadRating]);
  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const d = event.data;
      if (d?.type === 'SKYQUEST_BALANCE_CHANGED') void loadSky();
      if (d?.type === 'SKYQUEST_CLOSE') { setSkyOpen(false); setSkySub('play'); void loadSky(); }
      if (d?.type === 'SPRINT_CLOSE') { setSprintOpen(false); setSprintSub('play'); void loadSprint(); }
      if (d?.type === 'FLAPPY_GAME_OVER') {
        const score = Number(d.score), stars = Number(d.sessionCoins) || 0;
        if (!Number.isSafeInteger(score) || score < 0) return;
        void fetch('/api/student/skyquest/score', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score, stars, runToken: typeof d.runToken === 'string' ? d.runToken : '' }) })
          .then(() => loadSky()).catch(() => {});
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loadSky, loadSprint]);

  const frame = (src: string, title: string, open: boolean, h: string, w: string) => open && (mobile
    ? <>{createPortal(<iframe src={src} title={title} className="fixed inset-0 z-[300] h-[100dvh] w-screen border-0 bg-slate-950" allow="autoplay" />, document.body)}<p className="py-6 text-center text-sm text-slate-500">Игра открыта на весь экран. Нажми ✕ в углу, чтобы выйти.</p></>
    : <iframe src={src} title={title} className={`mx-auto ${h} w-full ${w} rounded-2xl border-2 border-slate-200 bg-slate-950`} allow="autoplay" />);

  const intro = (icon: React.ReactNode, title: string, text: string, records: string, onPlay: () => void) => <div className="mx-auto max-w-md text-center">
    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-600">{icon}</span>
    <h3 className="mt-3 font-display text-xl font-extrabold">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{text}</p>
    <p className="mt-3 text-sm font-bold text-slate-700">{records}</p>
    <button type="button" onClick={onPlay} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white hover:bg-indigo-700">{icon}Играть</button>
  </div>;

  const list = (r: Ranking, unit: string, title: string, hint: string) => <>
    <h3 className="font-display text-lg font-extrabold">{title}</h3><p className="mb-4 text-sm text-slate-500">{hint}</p>
    {loading ? <p className="py-8 text-center text-sm text-slate-500">Загружаем рейтинг…</p> : <RankRows rows={r.top} me={r.me} unit={unit} empty="Пока пусто — стань первым!" />}
  </>;

  return <section aria-labelledby="skyquest-title" className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500">Игры и рейтинг</p><h2 id="skyquest-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight">Играть</h2></div>
      <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-700"><Star className="h-5 w-5 fill-amber-400 text-amber-500" /><span className="text-sm font-bold">Игровые звёзды</span><strong className="text-xl">{loading ? '…' : sky.stars}</strong></div></header>
    <nav aria-label="Разделы" className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setSection('sky')} className={btn(section === 'sky')}><Rocket className="h-4 w-4" />Sky Quest</button>
      <button type="button" onClick={() => { setSection('sprint'); void loadSprint(); }} className={btn(section === 'sprint')}><Zap className="h-4 w-4" />School Sprint</button>
      <button type="button" onClick={() => { setSection('rating'); void loadRating(); }} className={btn(section === 'rating')}><Trophy className="h-4 w-4" />Рейтинг</button>
    </nav>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

    {section === 'sky' && <Panel>
      <SubNav sub={skySub} setSub={(s) => { setSkySub(s); if (s !== 'play') setSkyOpen(false); }} onRefresh={() => void loadSky()} />
      {skySub === 'play' && (skyOpen ? frame('/flappy/index.html?autostart=1', 'Sky Quest', true, 'h-[min(650px,75vh)]', 'max-w-[400px]')
        : intro(<Rocket className="h-7 w-7" />, 'Sky Quest', 'Веди ракету между колоннами: удерживай касание, чтобы лететь вверх. Собирай звёзды — они копятся на твоём счёте — и побивай рекорды.', `Рекорд: ${sky.bestScore} очков · ${sky.bestStars} звёзд за заход`, () => setSkyOpen(true)))}
      {skySub === 'stars' && list(sky.byStars, '⭐', 'Лучшие по звёздам', 'Рекорд по звёздам, собранным за один заход.')}
      {skySub === 'score' && list(sky.byScore, 'очк.', 'Лучшие по очкам', 'Рекорд по очкам за один заход.')}
    </Panel>}

    {section === 'sprint' && <Panel>
      <SubNav sub={sprintSub} setSub={(s) => { setSprintSub(s); if (s !== 'play') setSprintOpen(false); }} onRefresh={() => void loadSprint()} />
      {sprintSub === 'play' && (sprintOpen ? frame('/school-sprint/index.html', 'Школьный спринт', true, 'h-[min(680px,80vh)]', 'max-w-[420px]')
        : intro(<Zap className="h-7 w-7" />, 'School Sprint', 'Беги по школьному коридору как можно дольше: свайпы меняют дорожки, вверх — прыжок, вниз — кувырок. Каждые 1000 очков скорость растёт.', `Рекорд: ${sprint.stats.bestScore} очков · ${sprint.stats.bestStars} звёзд за заход`, () => setSprintOpen(true)))}
      {sprintSub === 'stars' && list(sprint.byStars, '⭐', 'Лучшие по звёздам', 'Рекорд по звёздам, собранным за один забег.')}
      {sprintSub === 'score' && list(sprint.byScore, 'очк.', 'Лучшие по очкам', 'Рекорд по очкам за один забег.')}
    </Panel>}

    {section === 'rating' && <Panel>
      <div className="mb-1 flex items-center justify-between gap-3"><h3 className="font-display text-lg font-extrabold">Звёзды ST</h3><button type="button" onClick={() => void loadRating()} aria-label="Обновить рейтинг" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button></div>
      <p className="mb-4 text-sm text-slate-500">Звёзды за квизы и домашние задания (игровые не считаются). Твои: <strong>{st.stars}</strong></p>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Загружаем рейтинг…</p> : <RankRows rows={st.top} me={st.me} unit="⭐" empty="Рейтинг появится, когда ученики заработают первые звёзды." />}
    </Panel>}
  </section>;
}
