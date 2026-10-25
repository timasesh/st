// «Школьный спринт»: игровые сессии, личная статистика, таблица рекордов. Счёт считает сервер.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildRanking, isRankable, shortName } from './game-ranking.js';

const GAME = 'school-sprint';
const STORE_KEY = 'school_sprint';
const ROUND_SEC = 60;
const MAX_SPEED_UNITS = 520 * Math.pow(1.4, 6);      // макс. скорость игры, ед/с
const UNITS_PER_M = 10;
const STAR_POINTS = 10;
const MAX_SESSION_AGE_MS = 30 * 60 * 1000; // сессия живёт 30 минут (с учётом пауз)
const KEEP_SESSIONS_MS = 7 * 24 * 3600 * 1000;

export function createSchoolSprint({ getSupabase, dataDir, getAccounts, refreshAccounts, getUserSession }) {
  const storePath = path.join(dataDir, 'school-sprint.json');
  let store = { sessions: {}, stats: {} };
  let loaded = false;
  let chain = Promise.resolve();

  async function load() {
    if (loaded) return;
    const supabase = getSupabase();
    try {
      let raw = null;
      if (supabase) {
        const r = await supabase.from('app_settings').select('value').eq('key', STORE_KEY).maybeSingle();
        if (!r.error && r.data?.value) raw = typeof r.data.value === 'string' ? JSON.parse(r.data.value) : r.data.value;
      } else raw = JSON.parse(await fs.readFile(storePath, 'utf8'));
      if (raw && typeof raw === 'object') store = { sessions: raw.sessions || {}, stats: raw.stats || {} };
    } catch { /* первый запуск */ }
    loaded = true;
  }
  function prune() {
    const now = Date.now();
    for (const [id, s] of Object.entries(store.sessions)) if (now - new Date(s.startedAt).getTime() > KEEP_SESSIONS_MS) delete store.sessions[id];
  }
  function save() {
    prune();
    const snapshot = JSON.stringify(store);
    const job = chain.then(async () => {
      const supabase = getSupabase();
      if (supabase) {
        const r = await supabase.from('app_settings').upsert({ key: STORE_KEY, value: snapshot }, { onConflict: 'key' });
        if (r.error) throw new Error(r.error.message);
      } else {
        await fs.mkdir(dataDir, { recursive: true });
        const tmp = `${storePath}.tmp`;
        await fs.writeFile(tmp, snapshot, { mode: 0o600 });
        await fs.rename(tmp, storePath);
      }
    });
    chain = job.catch((error) => { console.error('School Sprint save failed:', error.message); });
    return job;
  }

  const emptyStats = () => ({ bestScore: 0, bestDistance: 0, bestStars: 0, bestScoreAt: 0, bestStarsAt: 0, rounds: 0, totalStars: 0, lastPlayedAt: null });
  const statsOf = (userId) => ({ ...emptyStats(), ...(store.stats[userId] || {}) });
  const scoreOf = (distance, stars) => Math.floor(distance) + Math.floor(stars) * STAR_POINTS;

  async function student(req, res) {
    await refreshAccounts();
    const user = getUserSession(req);
    if (!user) { res.status(401).json({ error: 'Войдите в аккаунт, чтобы играть.' }); return null; }
    if (user.account.role !== 'student') { res.status(403).json({ error: 'Игра доступна только ученикам.' }); return null; }
    await load();
    return user.account;
  }

  function register(app) {
    app.get(`/api/games/${GAME}/profile`, async (req, res) => {
      try { const a = await student(req, res); if (!a) return; res.json({ ...statsOf(a.id), roundSec: ROUND_SEC }); }
      catch (e) { res.status(500).json({ error: 'Не удалось загрузить статистику.' }); }
    });

    app.post(`/api/games/${GAME}/start`, async (req, res) => {
      try {
        const a = await student(req, res); if (!a) return;
        const now = Date.now();
        const mine = Object.values(store.sessions).filter((s) => s.userId === a.id);
        if (mine.some((s) => now - new Date(s.startedAt).getTime() < 800)) return res.status(429).json({ error: 'Слишком часто. Подождите секунду.' });
        for (const s of mine) if (s.status === 'active') { s.status = 'abandoned'; }
        const session = { id: crypto.randomUUID(), userId: a.id, startedAt: new Date(now).toISOString(), finishedAt: null, score: 0, distance: 0, collectedStars: 0, status: 'active' };
        store.sessions[session.id] = session;
        await save();
        res.json({ sessionId: session.id, roundSec: ROUND_SEC });
      } catch (e) { res.status(500).json({ error: 'Не удалось начать игру.' }); }
    });

    app.post(`/api/games/${GAME}/finish`, async (req, res) => {
      try {
        const a = await student(req, res); if (!a) return;
        const { sessionId } = req.body || {};
        const distance = Number(req.body?.distance), stars = Number(req.body?.collectedStars), playedMs = Number(req.body?.playedMs);
        const session = typeof sessionId === 'string' ? store.sessions[sessionId] : null;
        if (!session || session.userId !== a.id) return res.status(404).json({ error: 'Игровая сессия не найдена.' });
        // повторное завершение: ничего не начисляем повторно, возвращаем сохранённый итог
        if (session.status === 'finished') return res.json({ ok: true, duplicate: true, result: { score: session.score, distance: session.distance, collectedStars: session.collectedStars }, stats: statsOf(a.id) });
        if (session.status !== 'active') return res.status(409).json({ error: 'Сессия уже закрыта.' });
        const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
        if (elapsedMs > MAX_SESSION_AGE_MS) { session.status = 'expired'; await save(); return res.status(410).json({ error: 'Сессия устарела.' }); }
        if (![distance, stars, playedMs].every(Number.isFinite) || distance < 0 || stars < 0 || playedMs < 0 || !Number.isInteger(Math.floor(distance)))
          return res.status(400).json({ error: 'Некорректные данные результата.' });
        const playedSec = playedMs / 1000;
        const maxDistance = (playedSec * MAX_SPEED_UNITS) / UNITS_PER_M * 1.05 + 10;
        const maxStars = playedSec * 8 + 10; // не больше одной звезды (до 5 золотой) за промежуток ≥0,7 с
        if (playedMs > MAX_SESSION_AGE_MS || playedMs > elapsedMs + 1500 || distance > maxDistance || stars > maxStars)
          return res.status(422).json({ error: 'Результат не прошёл проверку.' });
        session.status = 'finished'; session.finishedAt = new Date().toISOString();
        session.distance = Math.floor(distance); session.collectedStars = Math.floor(stars);
        session.score = scoreOf(session.distance, session.collectedStars);
        const st = statsOf(a.id);
        st.rounds += 1; st.totalStars += session.collectedStars;
        const nowTs = Date.now();
        const newScoreRecord = session.score > st.bestScore;
        if (newScoreRecord) { st.bestScore = session.score; st.bestScoreAt = nowTs; }
        if (session.collectedStars > st.bestStars) { st.bestStars = session.collectedStars; st.bestStarsAt = nowTs; }
        if (session.distance > st.bestDistance) st.bestDistance = session.distance;
        st.lastPlayedAt = session.finishedAt;
        store.stats[a.id] = st;
        await save();
        res.json({ ok: true, result: { score: session.score, distance: session.distance, collectedStars: session.collectedStars }, stats: st, newRecord: newScoreRecord });
      } catch (e) { res.status(500).json({ error: 'Не удалось сохранить результат.' }); }
    });

    app.get(`/api/games/${GAME}/leaderboard`, async (req, res) => {
      try {
        const a = await student(req, res); if (!a) return;
        const accounts = getAccounts().filter(isRankable);
        const statOf = (id) => store.stats[id] || {};
        const byScore = buildRanking(accounts.map((q) => ({ id: q.id, name: shortName(q), value: Number(statOf(q.id).bestScore) || 0, at: statOf(q.id).bestScoreAt })), a.id);
        const byStars = buildRanking(accounts.map((q) => ({ id: q.id, name: shortName(q), value: Number(statOf(q.id).bestStars) || 0, at: statOf(q.id).bestStarsAt })), a.id);
        // leaderboard — для меню игры (совместимость): по очкам, топ-5
        const leaderboard = byScore.top.slice(0, 5).map((e) => ({ name: e.name, bestScore: e.value, me: e.me }));
        res.json({ leaderboard, byScore, byStars, stats: statsOf(a.id) });
      } catch (e) { res.status(500).json({ error: 'Не удалось загрузить рейтинг.' }); }
    });
  }
  return { register };
}
