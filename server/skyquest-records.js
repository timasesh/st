// Sky Quest: рекорды (очки и звёзды за один заход), рейтинги и защита от накрутки.
// Заход начинается запросом run/start — сервер выдаёт подписанный токен со временем старта.
// Результат принимается только с токеном и только если он физически возможен за прошедшее время.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildRanking, isRankable, shortName } from './game-ranking.js';

const STORE_KEY = 'skyquest_records';
const PIPE_MS = 1700;          // игра ставит колонны раз в 1,8 с игрового времени (с запасом)
const TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_SCORE = 5000;

export function createSkyQuestRecords({ getSupabase, dataDir, getAccounts, refreshAccounts, getUserSession, getSecret, readBalances, recordScore }) {
  const storePath = path.join(dataDir, 'skyquest-records.json');
  let stats = {}; // { [studentId]: { bestStars, bestStarsAt, bestScoreAt } }
  let loaded = false;
  let chain = Promise.resolve();

  async function load() {
    if (loaded) return;
    try {
      const supabase = getSupabase();
      let raw = null;
      if (supabase) {
        const r = await supabase.from('app_settings').select('value').eq('key', STORE_KEY).maybeSingle();
        if (r.error) throw new Error(r.error.message);
        if (r.data?.value) raw = typeof r.data.value === 'string' ? JSON.parse(r.data.value) : r.data.value;
      } else { try { raw = JSON.parse(await fs.readFile(storePath, 'utf8')); } catch { raw = null; } }
      if (raw && typeof raw === 'object') stats = raw.stats || {};
      loaded = true;
    } catch (error) { console.warn('Sky Quest records load failed:', error.message); throw error; }
  }
  function save() {
    const snapshot = JSON.stringify({ stats });
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
    chain = job.catch((error) => console.error('Sky Quest records save failed:', error.message));
    return job;
  }

  const sign = (payload) => crypto.createHmac('sha256', getSecret()).update(`skyquest-run:${payload}`).digest('base64url');
  function makeToken(studentId) {
    const payload = Buffer.from(JSON.stringify({ u: studentId, t: Date.now(), n: crypto.randomBytes(6).toString('hex') })).toString('base64url');
    return `${payload}.${sign(payload)}`;
  }
  function readToken(token, studentId) {
    if (typeof token !== 'string' || token.length > 300) return null;
    const [payload, mac] = token.split('.');
    if (!payload || !mac) return null;
    const expected = sign(payload);
    if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
    let data; try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
    if (data.u !== studentId || !Number.isFinite(data.t)) return null;
    const age = Date.now() - data.t;
    if (age < 0 || age > TOKEN_TTL_MS) return null;
    return { startedAt: data.t, elapsedMs: age };
  }

  async function student(req, res) {
    await refreshAccounts();
    const user = getUserSession(req);
    if (!user || user.account.role !== 'student') { res.status(403).json({ error: 'Доступ запрещён.' }); return null; }
    return user.account;
  }

  function register(app) {
    app.get('/api/student/skyquest', async (req, res) => {
      try {
        const me = await student(req, res); if (!me) return;
        await load();
        const balances = await readBalances();
        const accounts = getAccounts().filter(isRankable);
        const starEntries = accounts.map((a) => ({ id: a.id, name: shortName(a), value: Number(stats[a.id]?.bestStars) || 0, at: stats[a.id]?.bestStarsAt }));
        const scoreEntries = accounts.map((a) => ({ id: a.id, name: shortName(a), value: Number(balances[a.id]?.bestScore) || 0, at: stats[a.id]?.bestScoreAt }));
        const byStars = buildRanking(starEntries, me.id), byScore = buildRanking(scoreEntries, me.id);
        return res.json({
          stars: balances[me.id]?.stars || 0,            // баланс игровых звёзд
          bestScore: balances[me.id]?.bestScore || 0,
          bestStars: Number(stats[me.id]?.bestStars) || 0,
          byStars, byScore,
        });
      } catch (error) { console.error('Could not load Sky Quest data:', error); return res.status(503).json({ error: 'Не удалось загрузить Sky Quest. Проверьте настройку хранилища.' }); }
    });

    app.post('/api/student/skyquest/run/start', async (req, res) => {
      try { const me = await student(req, res); if (!me) return; return res.json({ runToken: makeToken(me.id) }); }
      catch { return res.status(500).json({ error: 'Не удалось начать заход.' }); }
    });

    app.post('/api/student/skyquest/score', async (req, res) => {
      try {
        const me = await student(req, res); if (!me) return;
        const score = Number(req.body?.score), stars = Number(req.body?.stars ?? 0);
        if (!Number.isSafeInteger(score) || score < 0 || score > MAX_SCORE || !Number.isSafeInteger(stars) || stars < 0) return res.status(400).json({ error: 'Некорректный результат.' });
        const run = readToken(req.body?.runToken, me.id);
        if (!run) return res.status(422).json({ error: 'Результат не засчитан: заход не подтверждён.' });
        // физическая возможность: колонна в 1,8 с игры; монетка — не чаще чем раз в 4 колонны
        const maxScore = Math.floor(run.elapsedMs / PIPE_MS) + 1;
        const maxStars = Math.floor(score / 4) + 2;
        if (score > maxScore || stars > maxStars) return res.status(422).json({ error: 'Результат не прошёл проверку.' });
        await load();
        const balances = await readBalances();
        const prevBest = Number(balances[me.id]?.bestScore) || 0;
        const st = stats[me.id] || {};
        const now = Date.now();
        let changed = false;
        if (stars > (Number(st.bestStars) || 0)) { st.bestStars = stars; st.bestStarsAt = now; changed = true; }
        let bestScore = prevBest;
        if (score > prevBest) { bestScore = await recordScore(me.id, score); st.bestScoreAt = now; changed = true; }
        if (changed) { stats[me.id] = st; await save(); }
        return res.json({ bestScore, bestStars: Number(st.bestStars) || 0, newScoreRecord: score > prevBest });
      } catch (error) { console.error('Could not save Sky Quest score:', error); return res.status(503).json({ error: 'Не удалось сохранить рекорд Sky Quest.' }); }
    });

    // Рейтинг «Звёзды ST»: только звёзды за квизы и домашки (без игровых). Считаем всё заработанное,
    // включая потраченное на призы, чтобы покупка набора не роняла место.
    app.get('/api/student/rating', async (req, res) => {
      try {
        const me = await student(req, res); if (!me) return;
        const earned = (a) => {
          const orders = Array.isArray(a.progress?.prizeOrders) ? a.progress.prizeOrders : [];
          const spent = orders.reduce((sum, o) => sum + (Number(o?.cost) || 0), 0);
          return Math.max(0, (Number(a.progress?.stars) || 0) + spent);
        };
        const entries = getAccounts().filter(isRankable).map((a) => ({ id: a.id, name: shortName(a), value: earned(a), at: 0 }));
        const r = buildRanking(entries, me.id);
        const mine = getAccounts().find((a) => a.id === me.id);
        return res.json({ stars: mine ? earned(mine) : 0, top: r.top, me: r.me });
      } catch (error) { console.error('Could not load rating:', error); return res.status(503).json({ error: 'Не удалось загрузить рейтинг.' }); }
    });
  }
  return { register };
}
