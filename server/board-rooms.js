// Общие доски Study Task: «комната» по ссылке, правки и живые штрихи идут через WebSocket.
// Состояние комнаты (страницы с объектами) хранится в памяти и сохраняется в Supabase app_settings или в файл DATA_DIR.
import crypto from 'node:crypto';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { applyOps } from '../src/shared/boardOps.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const MAX_CLIENTS = 40;
const MAX_PAGES = 100;
const MAX_OBJS_PER_PAGE = 20000;
const MAX_STATE_BYTES = 24 * 1024 * 1024;
const SAVE_DELAY_MS = 2500;
const IDLE_UNLOAD_MS = 5 * 60 * 1000;

const cleanId = (v) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : null);
const isObj = (o) => o && typeof o === 'object' && Number.isFinite(o.id) && typeof o.k === 'string';
const cleanName = (v) => String(v || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30);

export function createBoardRooms(deps) {
  const { readJsonFileOr, writeJsonAtomically, dataDir, getUserSession } = deps;
  const sb = () => deps.supabase;
  const filePath = path.join(dataDir, 'board-rooms.json');
  const rooms = new Map(); // token -> room
  let fileCache = null;

  // ---------- хранилище ----------
  async function storeGet(key) {
    if (sb()) {
      const r = await sb().from('app_settings').select('value').eq('key', key).maybeSingle();
      if (r.error) throw new Error(`Supabase app_settings: ${r.error.message}`);
      return r.data?.value ? JSON.parse(r.data.value) : null;
    }
    fileCache = fileCache || (await readJsonFileOr(filePath, {}));
    return fileCache[key] || null;
  }
  async function storeSet(key, value) {
    if (sb()) {
      if (value === null) { const r = await sb().from('app_settings').delete().eq('key', key); if (r.error) throw new Error(r.error.message); return; }
      const r = await sb().from('app_settings').upsert({ key, value: JSON.stringify(value) });
      if (r.error) throw new Error(`Supabase app_settings: ${r.error.message}`);
      return;
    }
    fileCache = fileCache || (await readJsonFileOr(filePath, {}));
    if (value === null) delete fileCache[key]; else fileCache[key] = value;
    await writeJsonAtomically(filePath, fileCache);
  }

  // ---------- комнаты ----------
  async function loadRoom(token) {
    if (!TOKEN_RE.test(token)) return null;
    let room = rooms.get(token);
    if (room) { if (room.unloadTimer) { clearTimeout(room.unloadTimer); room.unloadTimer = null; } return room; }
    const saved = await storeGet(`board_room:${token}`);
    if (!saved || !Array.isArray(saved.pages)) return null;
    room = rooms.get(token);
    if (room) return room;
    room = { token, owner: saved.owner, boardId: saved.boardId || null, created: saved.created, pages: saved.pages, clients: new Map(), dirty: false, saveTimer: null, unloadTimer: null, seq: 0 };
    rooms.set(token, room);
    return room;
  }
  async function saveRoom(room) {
    if (room.saveTimer) { clearTimeout(room.saveTimer); room.saveTimer = null; }
    if (!room.dirty || room.deleted) return;
    room.dirty = false;
    try {
      const body = { owner: room.owner, boardId: room.boardId, created: room.created, updated: Date.now(), pages: room.pages };
      if (JSON.stringify(body).length > MAX_STATE_BYTES) { console.error('board room too large to save', room.token.slice(0, 6)); return; }
      await storeSet(`board_room:${room.token}`, body);
    } catch (error) { room.dirty = true; console.error('board room save failed:', error.message); }
  }
  function touch(room) {
    room.dirty = true;
    if (!room.saveTimer) room.saveTimer = setTimeout(() => { room.saveTimer = null; void saveRoom(room); }, SAVE_DELAY_MS);
  }
  function usersOf(room) { return [...room.clients.values()].map((c) => ({ id: c.id, name: c.name })); }
  function broadcast(room, msg, exceptId) {
    const data = JSON.stringify(msg);
    for (const c of room.clients.values()) if (c.id !== exceptId && c.ws.readyState === 1) c.ws.send(data);
  }

  function pageOf(room, id) { return room.pages.find((p) => p.id === id); }
  function handle(room, client, msg) {
    switch (msg.t) {
      case 'ops': {
        const page = pageOf(room, cleanId(msg.pg)); if (!page) return;
        const op = {
          add: Array.isArray(msg.add) ? msg.add.filter((x) => x && isObj(x.o)).slice(0, 5000) : [],
          del: Array.isArray(msg.del) ? msg.del.filter(Number.isFinite).slice(0, 20000) : [],
          upd: Array.isArray(msg.upd) ? msg.upd.filter(isObj).slice(0, 5000) : [],
        };
        const next = applyOps(page.objs, op);
        if (next.length > MAX_OBJS_PER_PAGE) return;
        page.objs = next; touch(room);
        broadcast(room, { t: 'ops', pg: page.id, ...op, from: client.id }, client.id);
        return;
      }
      case 'page+': {
        const id = cleanId(msg.id); if (!id || pageOf(room, id) || room.pages.length >= MAX_PAGES) return;
        const at = Number.isInteger(msg.at) && msg.at >= 0 && msg.at <= room.pages.length ? msg.at : room.pages.length;
        room.pages.splice(at, 0, { id, objs: [] }); touch(room);
        broadcast(room, { t: 'page+', id, at, from: client.id }, client.id);
        return;
      }
      case 'page-': {
        const id = cleanId(msg.id); const idx = room.pages.findIndex((p) => p.id === id);
        if (idx < 0 || room.pages.length < 2) return;
        room.pages.splice(idx, 1); touch(room);
        broadcast(room, { t: 'page-', id, from: client.id }, client.id);
        return;
      }
      case 'live': case 'liveEnd': case 'cur': {
        broadcast(room, { ...msg, from: client.id }, client.id);
        return;
      }
      case 'name': {
        const name = cleanName(msg.name); if (!name) return;
        client.name = name; broadcast(room, { t: 'users', users: usersOf(room) });
        return;
      }
      default:
    }
  }

  // ---------- WebSocket ----------
  const wss = new WebSocketServer({ noServer: true, maxPayload: 20 * 1024 * 1024 });
  wss.on('connection', (ws, req, room) => {
    const url = new URL(req.url, 'http://x');
    const client = { id: crypto.randomBytes(5).toString('hex'), name: cleanName(url.searchParams.get('name')) || `Гость ${++room.seq}`, ws, alive: true };
    room.clients.set(client.id, client);
    ws.on('pong', () => { client.alive = true; });
    ws.send(JSON.stringify({ t: 'hello', id: client.id, name: client.name, pages: room.pages, users: usersOf(room) }));
    broadcast(room, { t: 'users', users: usersOf(room) }, client.id);
    ws.on('message', (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg && typeof msg.t === 'string') { try { handle(room, client, msg); } catch (error) { console.error('board room message error:', error.message); } }
    });
    ws.on('close', () => {
      room.clients.delete(client.id);
      broadcast(room, { t: 'leave', id: client.id });
      broadcast(room, { t: 'users', users: usersOf(room) });
      if (!room.clients.size) {
        void saveRoom(room);
        room.unloadTimer = setTimeout(() => { if (!room.clients.size) rooms.delete(room.token); }, IDLE_UNLOAD_MS);
      }
    });
  });
  const heartbeat = setInterval(() => {
    for (const room of rooms.values()) for (const c of room.clients.values()) {
      if (!c.alive) { c.ws.terminate(); continue; }
      c.alive = false; try { c.ws.ping(); } catch { /* closed */ }
    }
  }, 25000);
  heartbeat.unref?.();

  function attach(server) {
    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://x');
      const m = /^\/ws\/board\/([A-Za-z0-9_-]{16,64})$/.exec(url.pathname);
      if (!m) return;
      const origin = req.headers.origin;
      if (origin) { try { if (new URL(origin).host !== req.headers.host) { socket.destroy(); return; } } catch { socket.destroy(); return; } }
      loadRoom(m[1]).then((room) => {
        if (!room) { socket.write('HTTP/1.1 404 Not Found\r\n\r\n'); socket.destroy(); return; }
        if (room.clients.size >= MAX_CLIENTS) { socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n'); socket.destroy(); return; }
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, room));
      }).catch(() => { try { socket.destroy(); } catch { /* ignore */ } });
    });
  }

  // ---------- HTTP ----------
  function teacherOnly(req, res) {
    const user = getUserSession(req);
    if (!user || user.account.role !== 'teacher') { res.status(403).json({ error: 'Поделиться доской может только преподаватель.' }); return null; }
    return user.account;
  }
  const cleanPages = (pages) => {
    if (!Array.isArray(pages) || pages.length < 1 || pages.length > MAX_PAGES) return null;
    const out = [];
    for (const p of pages) {
      const id = cleanId(p?.id); if (!id || !Array.isArray(p.objs) || p.objs.length > MAX_OBJS_PER_PAGE) return null;
      out.push({ id, objs: p.objs.filter(isObj) });
    }
    return out;
  };
  function register(app) {
    app.post('/api/teacher/board-share', async (req, res) => {
      const teacher = teacherOnly(req, res); if (!teacher) return;
      try {
        const boardKey = typeof req.body?.boardId === 'string' && /^[A-Za-z0-9_-]{3,40}$/.test(req.body.boardId) ? req.body.boardId : 'draft';
        const idxKey = `board_room_index:${teacher.id}`;
        const index = (await storeGet(idxKey)) || {};
        if (index[boardKey]) {
          const existing = await loadRoom(index[boardKey]);
          if (existing) return res.json({ token: index[boardKey], reused: true });
        }
        const pages = cleanPages(req.body?.pages);
        if (!pages) return res.status(400).json({ error: 'Не удалось прочитать доску.' });
        const token = crypto.randomBytes(18).toString('base64url');
        const room = { token, owner: teacher.id, boardId: boardKey, created: Date.now(), pages, clients: new Map(), dirty: true, saveTimer: null, unloadTimer: null, seq: 0 };
        rooms.set(token, room);
        await saveRoom(room);
        index[boardKey] = token; await storeSet(idxKey, index);
        return res.json({ token, reused: false });
      } catch (error) { console.error(error); return res.status(500).json({ error: 'Не удалось создать ссылку.' }); }
    });
    app.delete('/api/teacher/board-share/:token', async (req, res) => {
      const teacher = teacherOnly(req, res); if (!teacher) return;
      try {
        const token = req.params.token;
        const room = await loadRoom(token);
        if (!room || room.owner !== teacher.id) return res.status(404).json({ error: 'Ссылка не найдена.' });
        room.deleted = true; if (room.saveTimer) { clearTimeout(room.saveTimer); room.saveTimer = null; }
        broadcast(room, { t: 'closed' });
        for (const c of room.clients.values()) c.ws.close(4001, 'closed');
        rooms.delete(token);
        const idxKey = `board_room_index:${teacher.id}`; const index = (await storeGet(idxKey)) || {};
        for (const k of Object.keys(index)) if (index[k] === token) delete index[k];
        await storeSet(idxKey, index); await storeSet(`board_room:${token}`, null);
        return res.json({ ok: true });
      } catch (error) { console.error(error); return res.status(500).json({ error: 'Не удалось отключить ссылку.' }); }
    });
    app.post('/api/teacher/board-share/:token/bind', async (req, res) => {
      const teacher = teacherOnly(req, res); if (!teacher) return;
      try {
        const room = await loadRoom(req.params.token);
        const boardKey = typeof req.body?.boardId === 'string' && /^[A-Za-z0-9_-]{3,40}$/.test(req.body.boardId) ? req.body.boardId : null;
        if (!room || room.owner !== teacher.id || !boardKey) return res.status(404).json({ error: 'Ссылка не найдена.' });
        const idxKey = `board_room_index:${teacher.id}`; const index = (await storeGet(idxKey)) || {};
        for (const k of Object.keys(index)) if (index[k] === room.token) delete index[k];
        index[boardKey] = room.token; room.boardId = boardKey; room.dirty = true;
        await storeSet(idxKey, index); await saveRoom(room);
        return res.json({ ok: true });
      } catch (error) { console.error(error); return res.status(500).json({ error: 'Не удалось привязать ссылку.' }); }
    });
    app.get('/api/board-share/:token', async (req, res) => {
      try { const room = await loadRoom(req.params.token); return room ? res.json({ ok: true, users: room.clients.size }) : res.status(404).json({ error: 'Доска не найдена или доступ закрыт.' }); }
      catch { return res.status(500).json({ error: 'Ошибка сервера.' }); }
    });
  }

  async function flushAll() { for (const room of rooms.values()) await saveRoom(room); }
  return { register, attach, flushAll };
}
