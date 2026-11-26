import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  ArrowUpRight, ClipboardPaste, Copy, CopyPlus, Crosshair, Download, Eraser, Grid3x3, Hand, Highlighter, ImagePlus, Keyboard, Maximize2, Minimize2,
  Minus, MousePointer2, PaintBucket, PenLine, Plus, Redo2, Scissors, Share2, Square, Triangle, Circle, Trash2, Type, Undo2, Users, X, ZoomIn, ZoomOut,
  ChevronDown,
} from 'lucide-react';
import { applyOps, diffObjs, diffToOp, invertDiff, isEmptyDiff, type BoardDiff } from '../shared/boardOps.js';
import { BoardCollab, type CollabMsg, type CollabStatus, type CollabUser, type RoomPage } from './boardCollab';

type Tool = 'select' | 'pen' | 'marker' | 'eraser' | 'line' | 'arrow' | 'rect' | 'tri' | 'ell' | 'text' | 'laser' | 'hand';
type Kind = 'pen' | 'marker' | 'line' | 'arrow' | 'rect' | 'tri' | 'ell' | 'text' | 'img';
type Pt = [number, number, number];
interface Obj { id: number; k: Kind; c: string; w: number; fill: boolean; pts?: Pt[]; x1: number; y1: number; x2: number; y2: number; text?: string; fs?: number; src?: string }
type Diff = BoardDiff<Obj>;
interface Page { id: string; objs: Obj[]; undo: Diff[]; redo: Diff[] }
const newPageId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const mkPage = (objs: Obj[] = [], id: string = newPageId()): Page => ({ id, objs, undo: [], redo: [] });
const CURSOR_COLORS = ['#e5484d', '#16a34a', '#8b5cf6', '#f59e0b', '#0ea5e9', '#db2777', '#0d9488'];
const cursorColor = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return CURSOR_COLORS[h % CURSOR_COLORS.length]; };
interface View { x: number; y: number; s: number }
type Box = [number, number, number, number];

const STORAGE_KEY = 'studytask-board-v1';
interface SavedBoard { id: string; name: string; updated: number; pageCount: number }
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Ошибка сервера (${res.status})`);
  return data as T;
}
const newBoardId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const COLORS = ['#111827', '#1649E8', '#E5484D', '#16A34A', '#F59E0B', '#8B5CF6', '#0EA5E9'];
const WIDTHS = [2, 4, 8, 14, 24];
const WORLD_W = 3200, WORLD_H = 2000; // рабочая область доски
const GRID = 40;
const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';
const HIST = 200;

let uid = Date.now() % 1_000_000_000;
const nid = () => ++uid;
let clipboard: Obj[] = [];
let pasteCount = 0;

const TOOLS: { id: Tool; label: string; key: string; code: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'select', label: 'Выделение', key: 'B', code: 'KeyB', Icon: MousePointer2 },
  { id: 'pen', label: 'Маркер (перо)', key: 'N', code: 'KeyN', Icon: PenLine },
  { id: 'marker', label: 'Выделитель', key: 'M', code: 'KeyM', Icon: Highlighter },
  { id: 'eraser', label: 'Ластик', key: 'E', code: 'KeyE', Icon: Eraser },
  { id: 'line', label: 'Линия', key: 'L', code: 'KeyL', Icon: Minus },
  { id: 'arrow', label: 'Стрелка', key: 'A', code: 'KeyA', Icon: ArrowUpRight },
  { id: 'rect', label: 'Прямоугольник', key: 'R', code: 'KeyR', Icon: Square },
  { id: 'tri', label: 'Треугольник', key: 'T', code: 'KeyT', Icon: Triangle },
  { id: 'ell', label: 'Окружность / эллипс', key: 'C', code: 'KeyC', Icon: Circle },
  { id: 'text', label: 'Текст', key: 'X', code: 'KeyX', Icon: Type },
  { id: 'laser', label: 'Указка', key: 'K', code: 'KeyK', Icon: Crosshair },
  { id: 'hand', label: 'Рука (двигать лист)', key: 'H', code: 'KeyH', Icon: Hand },
];

// ---------- geometry ----------
let measureCtx: CanvasRenderingContext2D | null = null;
function textSize(o: Obj): [number, number] {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const fs = o.fs || 24;
  const lines = (o.text || '').split('\n');
  if (!measureCtx) return [fs * 0.6 * Math.max(1, ...lines.map((l) => l.length)), lines.length * fs * 1.25];
  measureCtx.font = `${fs}px ${FONT}`;
  return [Math.max(10, ...lines.map((l) => measureCtx!.measureText(l).width)), lines.length * fs * 1.25];
}
function norm(o: Obj): Box { return [Math.min(o.x1, o.x2), Math.min(o.y1, o.y2), Math.max(o.x1, o.x2), Math.max(o.y1, o.y2)]; }
function bounds(o: Obj): Box {
  if (o.k === 'text') { const [w, h] = textSize(o); return [o.x1, o.y1, o.x1 + w, o.y1 + h]; }
  if (o.k === 'img') return norm(o);
  const pad = (o.k === 'marker' ? o.w * 3 : o.w) / 2;
  if (o.pts) {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const p of o.pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }
    return [a - pad, b - pad, c + pad, d + pad];
  }
  const [a, b, c, d] = norm(o);
  const extra = o.k === 'arrow' ? Math.max(16, o.w * 4.5) : 0;
  return [a - pad - extra, b - pad - extra, c + pad + extra, d + pad + extra];
}
function unionBox(list: Obj[]): Box | null {
  if (!list.length) return null;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const o of list) { const r = bounds(o); a = Math.min(a, r[0]); b = Math.min(b, r[1]); c = Math.max(c, r[2]); d = Math.max(d, r[3]); }
  return [a, b, c, d];
}
function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function triPts(o: Obj): [number, number][] { const [a, b, c, d] = norm(o); return [[(a + c) / 2, b], [c, d], [a, d]]; }
function inTri(x: number, y: number, t: [number, number][]) {
  const s = (p: [number, number], q: [number, number]) => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]);
  const d1 = s([x, y], t[0]) , _ = d1;
  void _;
  const a = (x - t[1][0]) * (t[0][1] - t[1][1]) - (t[0][0] - t[1][0]) * (y - t[1][1]);
  const b = (x - t[2][0]) * (t[1][1] - t[2][1]) - (t[1][0] - t[2][0]) * (y - t[2][1]);
  const c = (x - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (y - t[0][1]);
  return !((a < 0 || b < 0 || c < 0) && (a > 0 || b > 0 || c > 0));
}
function hit(o: Obj, x: number, y: number, tol: number): boolean {
  const r = (o.k === 'marker' ? o.w * 3 : o.w) / 2 + tol;
  switch (o.k) {
    case 'pen': case 'marker': {
      const p = o.pts || [];
      if (p.length === 1) return Math.hypot(x - p[0][0], y - p[0][1]) <= r;
      for (let i = 1; i < p.length; i++) if (distSeg(x, y, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]) <= r) return true;
      return false;
    }
    case 'line': case 'arrow': return distSeg(x, y, o.x1, o.y1, o.x2, o.y2) <= r;
    case 'rect': {
      const [a, b, c, d] = norm(o);
      const outer = x >= a - r && x <= c + r && y >= b - r && y <= d + r;
      if (!outer) return false;
      if (o.fill) return true;
      return !(x > a + r && x < c - r && y > b + r && y < d - r);
    }
    case 'ell': {
      const [a, b, c, d] = norm(o);
      const cx = (a + c) / 2, cy = (b + d) / 2, rx = Math.max(1, (c - a) / 2), ry = Math.max(1, (d - b) / 2);
      const v = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
      if (o.fill && v <= 1) return true;
      return Math.abs(v - 1) * Math.min(rx, ry) <= r;
    }
    case 'tri': {
      const t = triPts(o);
      if (o.fill && inTri(x, y, t)) return true;
      return distSeg(x, y, ...t[0], ...t[1]) <= r || distSeg(x, y, ...t[1], ...t[2]) <= r || distSeg(x, y, ...t[2], ...t[0]) <= r;
    }
    case 'text': case 'img': { const [a, b, c, d] = bounds(o); return x >= a - tol && x <= c + tol && y >= b - tol && y <= d + tol; }
  }
}
function moveObj(o: Obj, dx: number, dy: number): Obj {
  return { ...o, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy, pts: o.pts?.map((p) => [p[0] + dx, p[1] + dy, p[2]] as Pt) };
}
function scaleObj(o: Obj, ax: number, ay: number, sx: number, sy: number): Obj {
  const X = (v: number) => ax + (v - ax) * sx, Y = (v: number) => ay + (v - ay) * sy;
  const n: Obj = { ...o, x1: X(o.x1), y1: Y(o.y1), x2: X(o.x2), y2: Y(o.y2), pts: o.pts?.map((p) => [X(p[0]), Y(p[1]), p[2]] as Pt) };
  if (o.k === 'text') n.fs = Math.max(8, (o.fs || 24) * (Math.abs(sx) + Math.abs(sy)) / 2);
  return n;
}

// ---------- images ----------
const imgCache = new Map<string, HTMLImageElement>();
let onImgLoad: (() => void) | null = null;
let imgVer = 0;
/* границы объекта считаются один раз (объекты неизменяемы: при перемещении создаётся новый) */
const bboxCache = new WeakMap<Obj, Box>();
function bbox(o: Obj): Box { let b = bboxCache.get(o); if (!b) { b = bounds(o); bboxCache.set(o, b); } return b; }
function getImg(src?: string): HTMLImageElement | null {
  if (!src || !src.startsWith('data:image/')) return null;
  let im = imgCache.get(src);
  if (!im) { im = new Image(); im.onload = () => { imgVer++; onImgLoad?.(); }; im.src = src; imgCache.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}
async function prepareImage(file: File): Promise<{ src: string; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Не удалось открыть изображение')); i.src = url; });
    const nw = im.naturalWidth || 800, nh = im.naturalHeight || 600;
    const k = Math.min(1, 1600 / Math.max(nw, nh));
    const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); if (!cx) throw new Error('Не удалось обработать изображение');
    cx.imageSmoothingQuality = 'high';
    let src = '';
    if (/png|webp|gif|svg/.test(file.type)) { cx.drawImage(im, 0, 0, w, h); src = cv.toDataURL('image/png'); }
    if (!src || src.length > 1_800_000) {
      cx.clearRect(0, 0, w, h); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
      for (const q of [0.88, 0.72, 0.55]) { src = cv.toDataURL('image/jpeg', q); if (src.length <= 1_800_000) break; }
    }
    if (src.length > 2_500_000) throw new Error('Изображение слишком тяжёлое. Уменьшите его и попробуйте снова.');
    return { src, w, h };
  } finally { URL.revokeObjectURL(url); }
}

// ---------- rendering ----------
// толщина не зависит от нажима: всегда та, что выбрана
function pressureWidth(_p: number) { return 1; }
function drawObj(ctx: CanvasRenderingContext2D, o: Obj) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = o.c; ctx.fillStyle = o.c; ctx.lineWidth = o.w;
  if (o.k === 'pen' || o.k === 'marker') {
    const p = o.pts || [];
    if (o.k === 'marker') { ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = 'multiply'; ctx.lineWidth = o.w * 3; ctx.lineCap = 'butt'; }
    if (p.length === 1) {
      ctx.beginPath(); ctx.arc(p[0][0], p[0][1], Math.max(0.6, (o.k === 'marker' ? o.w * 1.5 : o.w * pressureWidth(p[0][2]) / 2)), 0, Math.PI * 2); ctx.fill();
    } else if (p.length > 1) {
      const varw = false;
      if (!varw) {
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
        ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]); ctx.stroke();
      } else {
        for (let i = 1; i < p.length; i++) {
          ctx.lineWidth = Math.max(0.5, o.w * pressureWidth((p[i - 1][2] + p[i][2]) / 2));
          ctx.beginPath(); ctx.moveTo(p[i - 1][0], p[i - 1][1]); ctx.lineTo(p[i][0], p[i][1]); ctx.stroke();
        }
      }
    }
  } else if (o.k === 'line' || o.k === 'arrow') {
    ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
    if (o.k === 'arrow') {
      const ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), hl = Math.max(16, o.w * 4.5);
      ctx.beginPath();
      ctx.moveTo(o.x2 - hl * Math.cos(ang - 0.45), o.y2 - hl * Math.sin(ang - 0.45)); ctx.lineTo(o.x2, o.y2);
      ctx.lineTo(o.x2 - hl * Math.cos(ang + 0.45), o.y2 - hl * Math.sin(ang + 0.45)); ctx.stroke();
    }
  } else if (o.k === 'rect' || o.k === 'ell' || o.k === 'tri') {
    ctx.beginPath();
    const [a, b, c, d] = norm(o);
    if (o.k === 'rect') ctx.rect(a, b, c - a, d - b);
    else if (o.k === 'ell') ctx.ellipse((a + c) / 2, (b + d) / 2, Math.max(0.5, (c - a) / 2), Math.max(0.5, (d - b) / 2), 0, 0, Math.PI * 2);
    else { const t = triPts(o); ctx.moveTo(...t[0]); ctx.lineTo(...t[1]); ctx.lineTo(...t[2]); ctx.closePath(); }
    if (o.fill) { ctx.save(); ctx.globalAlpha = 0.18; ctx.fill(); ctx.restore(); }
    ctx.stroke();
  } else if (o.k === 'img') {
    const [a, b, c, d] = norm(o); const im = getImg(o.src);
    if (im) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, a, b, c - a, d - b); }
    else { ctx.fillStyle = '#f1f5f9'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.fillRect(a, b, c - a, d - b); ctx.strokeRect(a, b, c - a, d - b); }
  } else if (o.k === 'text') {
    ctx.font = `${o.fs || 24}px ${FONT}`; ctx.textBaseline = 'top';
    (o.text || '').split('\n').forEach((line, i) => ctx.fillText(line, o.x1, o.y1 + i * (o.fs || 24) * 1.25));
  }
  ctx.restore();
}

function savedPages(): { pages: Obj[][]; cur: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.pages) || !data.pages.length) return null;
    return { pages: data.pages.map((p: unknown) => (Array.isArray(p) ? (p as Obj[]) : [])), cur: Math.min(Math.max(0, Number(data.cur) || 0), data.pages.length - 1) };
  } catch { return null; }
}

type Drag =
  | { mode: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { mode: 'draw'; obj: Obj }
  | { mode: 'shape'; obj: Obj; shift: boolean }
  | { mode: 'erase'; gone: Set<number> }
  | { mode: 'laser' }
  | { mode: 'pinch' }
  | { mode: 'move'; wx: number; wy: number; base: Obj[]; moved: boolean; sx: number; sy: number }
  | { mode: 'resize'; ax: number; ay: number; ox: number; oy: number; base: Obj[]; corner: number }
  | { mode: 'marquee'; wx: number; wy: number; additive: boolean };

export default function StudyTaskBoard({ shareToken, guestName }: { shareToken?: string; guestName?: string } = {}) {
  const guest = !!shareToken;
  const wrapRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const [tool, setToolState] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[1]);
  const [width, setWidth] = useState(4);
  const [fill, setFill] = useState(false);
  const [gridMode, setGridMode] = useState<0 | 1 | 2>(1);
  const [penOnly, setPenOnly] = useState(false);
  const [help, setHelp] = useState(false);
  const [cssFs, setCssFs] = useState(false);
  const isFs = cssFs;
  const [toolsOpen, setToolsOpen] = useState(false);
  useEffect(() => { if (!cssFs) setToolsOpen(false); }, [cssFs]);
  const nativeFs = useRef(false);
  const [sel, setSelState] = useState<number[]>([]);
  const [editor, setEditor] = useState<{ id: number | null; x: number; y: number; text: string; fs: number; c: string } | null>(null);

  const stored = useRef(shareToken ? null : savedPages());
  const boardIdRef = useRef<string | null>(shareToken ? null : (() => { try { return localStorage.getItem(STORAGE_KEY + '-id'); } catch { return null; } })());
  const [boards, setBoards] = useState<SavedBoard[]>([]);
  const [boardsOpen, setBoardsOpen] = useState(false);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardsErr, setBoardsErr] = useState('');
  const [boardName, setBoardName] = useState('');
  const [busy, setBusy] = useState(false);
  const [boardMsg, setBoardMsg] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  
  const pagesRef = useRef<Page[]>((stored.current?.pages || [[]]).map((objs) => mkPage(objs)));
  const curRef = useRef(stored.current?.cur || 0);
  const viewRef = useRef<View>({ x: 60, y: 60, s: 1 });
  const selRef = useRef<number[]>([]);
  const predRef = useRef<[number, number, number][]>([]);
  const collabRef = useRef<BoardCollab<Obj> | null>(null);
  const [shareState, setShareState] = useState<{ token: string; status: CollabStatus; users: CollabUser[] } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareErr, setShareErr] = useState('');
  const remoteLive = useRef(new Map<string, Obj & { pg: string; t: number }>());
  const cursors = useRef(new Map<string, { x: number; y: number; pg: string; name: string; t: number }>());
  const liveSent = useRef(0);
  const liveRaf = useRef(0);
  const lastCur = useRef(0);
  const touchesRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ d0: number; s0: number; wx: number; wy: number } | null>(null);
  const gestureRef = useRef(false);
  const userNames = useRef(new Map<string, string>());
  const dragRef = useRef<Drag | null>(null);
  const liveRef = useRef<Obj | null>(null);
  const previewRef = useRef<Map<number, Obj> | null>(null);
  const hiddenRef = useRef<Set<number>>(new Set());
  const marqueeRef = useRef<Box | null>(null);
  const hoverRef = useRef<{ x: number; y: number; touch: boolean } | null>(null);
  const laserRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const spaceRef = useRef(false);
  const eraserEndRef = useRef(false);
  const drawQueued = useRef(false);
  /* кэш статичной сцены (сетка + готовые объекты): при рисовании/наведении перерисовывается только живой штрих */
  const sceneRef = useRef<{ cv: HTMLCanvasElement; key: string; objs: Obj[] | null } | null>(null);
  const st = useRef({ tool, color, width, fill, gridMode, penOnly, editor });
  st.current = { tool, color, width, fill, gridMode, penOnly, editor };

  const page = () => pagesRef.current[curRef.current];
  const setSel = (ids: number[]) => { selRef.current = ids; setSelState(ids); };

  // ----- drawing -----
  const draw = useCallback(() => {
    drawQueued.current = false;
    const cv = canvasRef.current; const ctx = cv?.getContext('2d', { desynchronized: true } as CanvasRenderingContext2DSettings);
    if (!cv || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.width / dpr, H = cv.height / dpr;
    // доска ограничена: нельзя уехать за края рабочей области
    {
      const m = 48, v0 = viewRef.current;
      const minS = Math.max(0.15, Math.min(W / (WORLD_W + 2 * m), H / (WORLD_H + 2 * m)));
      const ns = Math.max(minS, Math.min(6, v0.s));
      const clampAxis = (p: number, size: number, world: number) => {
        const ww = world * ns;
        return ww + 2 * m <= size ? (size - ww) / 2 : Math.min(m, Math.max(size - ww - m, p));
      };
      const nx = clampAxis(v0.x, W, WORLD_W), ny = clampAxis(v0.y, H, WORLD_H);
      if (ns !== v0.s || nx !== v0.x || ny !== v0.y) viewRef.current = { s: ns, x: nx, y: ny };
    }
    const { s, x: vx, y: vy } = viewRef.current;
    const objs = page().objs;
    const prev = previewRef.current; const hid = hiddenRef.current;
    let excl = '';
    if ((prev && prev.size) || hid.size) { const ids: number[] = []; prev?.forEach((_, id) => ids.push(id)); hid.forEach((id) => ids.push(id)); excl = ids.sort((a, b) => a - b).join(','); }
    const gm = st.current.gridMode;
    const key = `${cv.width}x${cv.height}|${vx}|${vy}|${s}|${gm}|${curRef.current}|${imgVer}|${excl}`;
    let scene = sceneRef.current;
    if (!scene) { scene = { cv: document.createElement('canvas'), key: '', objs: null }; sceneRef.current = scene; }
    if (scene.key !== key || scene.objs !== objs) {
      if (scene.cv.width !== cv.width || scene.cv.height !== cv.height) { scene.cv.width = cv.width; scene.cv.height = cv.height; }
      const sc = scene.cv.getContext('2d');
      if (!sc) return;
      sc.setTransform(dpr, 0, 0, dpr, 0, 0);
      sc.fillStyle = '#e6ecf7'; sc.fillRect(0, 0, W, H);
      sc.fillStyle = '#ffffff'; sc.fillRect(vx, vy, WORLD_W * s, WORLD_H * s);
      sc.strokeStyle = '#b9c6e0'; sc.lineWidth = 1; sc.strokeRect(vx - 0.5, vy - 0.5, WORLD_W * s + 1, WORLD_H * s + 1);
      if (gm) {
        sc.save(); sc.beginPath(); sc.rect(vx, vy, WORLD_W * s, WORLD_H * s); sc.clip();
        let step = GRID * s; while (step < 14) step *= 2;
        const ox = ((vx % step) + step) % step, oy = ((vy % step) + step) % step;
        sc.strokeStyle = '#dbe4f5'; sc.fillStyle = '#b9c6e0'; sc.lineWidth = 1;
        if (gm === 1) { sc.beginPath(); for (let x = ox; x < W; x += step) { sc.moveTo(Math.round(x) + 0.5, 0); sc.lineTo(Math.round(x) + 0.5, H); } for (let y = oy; y < H; y += step) { sc.moveTo(0, Math.round(y) + 0.5); sc.lineTo(W, Math.round(y) + 0.5); } sc.stroke(); }
        else for (let x = ox; x < W; x += step) for (let y = oy; y < H; y += step) sc.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
        sc.restore();
      }
      sc.save(); sc.translate(vx, vy); sc.scale(s, s);
      const wx0 = -vx / s, wy0 = -vy / s, wx1 = (W - vx) / s, wy1 = (H - vy) / s;
      for (const o of objs) {
        if (hid.has(o.id) || prev?.has(o.id)) continue;
        const b = bbox(o);
        if (b[2] < wx0 || b[0] > wx1 || b[3] < wy0 || b[1] > wy1) continue; // вне экрана
        drawObj(sc, o);
      }
      sc.restore();
      scene.key = key; scene.objs = objs;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scene.cv, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save(); ctx.translate(vx, vy); ctx.scale(s, s);
    if (prev) prev.forEach((o, id) => { if (!hid.has(id)) drawObj(ctx, o); });
    if (remoteLive.current.size) { const pgId = page().id; remoteLive.current.forEach((o) => { if (o.pg === pgId) drawObj(ctx, o); }); }
    if (liveRef.current) drawObj(ctx, predRef.current.length && liveRef.current.pts ? { ...liveRef.current, pts: [...liveRef.current.pts, ...predRef.current] } : liveRef.current);
    ctx.restore();

    // selection overlay
    const selected = !selRef.current.length ? [] : page().objs.filter((o) => selRef.current.includes(o.id)).map((o) => previewRef.current?.get(o.id) || o);
    const box = unionBox(selected);
    if (box && st.current.tool === 'select') {
      const [a, b, c, d] = [box[0] * s + vx, box[1] * s + vy, box[2] * s + vx, box[3] * s + vy];
      ctx.save(); ctx.strokeStyle = '#1649E8'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.fillStyle = 'rgba(22,73,232,0.06)';
      ctx.fillRect(a - 4, b - 4, c - a + 8, d - b + 8); ctx.strokeRect(a - 4, b - 4, c - a + 8, d - b + 8); ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      for (const [hx, hy] of [[a - 4, b - 4], [c + 4, b - 4], [c + 4, d + 4], [a - 4, d + 4]]) { ctx.fillRect(hx - 5, hy - 5, 10, 10); ctx.strokeRect(hx - 5, hy - 5, 10, 10); }
      ctx.restore();
    } else if (box) {
      const [a, b, c, d] = [box[0] * s + vx, box[1] * s + vy, box[2] * s + vx, box[3] * s + vy];
      ctx.save(); ctx.strokeStyle = 'rgba(22,73,232,0.5)'; ctx.setLineDash([4, 4]); ctx.strokeRect(a - 3, b - 3, c - a + 6, d - b + 6); ctx.restore();
    }
    if (marqueeRef.current) {
      const m = marqueeRef.current;
      ctx.save(); ctx.fillStyle = 'rgba(22,73,232,0.08)'; ctx.strokeStyle = '#1649E8'; ctx.setLineDash([5, 4]);
      ctx.fillRect(m[0] * s + vx, m[1] * s + vy, (m[2] - m[0]) * s, (m[3] - m[1]) * s); ctx.strokeRect(m[0] * s + vx, m[1] * s + vy, (m[2] - m[0]) * s, (m[3] - m[1]) * s); ctx.restore();
    }
    // laser
    const now = performance.now();
    laserRef.current = laserRef.current.filter((p) => now - p.t < 900);
    if (laserRef.current.length) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const L = laserRef.current;
      for (let i = 1; i < L.length; i++) {
        const age = (now - L[i].t) / 900;
        ctx.strokeStyle = `rgba(229,72,77,${Math.max(0, 1 - age)})`; ctx.lineWidth = 7 * (1 - age) + 1.5;
        ctx.beginPath(); ctx.moveTo(L[i - 1].x, L[i - 1].y); ctx.lineTo(L[i].x, L[i].y); ctx.stroke();
      }
      const head = L[L.length - 1];
      ctx.fillStyle = 'rgba(229,72,77,0.9)'; ctx.beginPath(); ctx.arc(head.x, head.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      requestDraw();
    }
    // курсоры других участников
    if (cursors.current.size) {
      const nowT = performance.now(), pgId = page().id;
      cursors.current.forEach((cu, id) => {
        if (cu.pg !== pgId || nowT - cu.t > 8000) return;
        const x = cu.x * s + vx, y = cu.y * s + vy; if (x < -40 || y < -40 || x > W + 40 || y > H + 40) return;
        const col = cursorColor(id);
        ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 17); ctx.lineTo(x + 7.5, y + 12.5); ctx.lineTo(x + 14, y + 12); ctx.closePath(); ctx.stroke(); ctx.fill();
        if (cu.name) { ctx.font = '600 12px system-ui, sans-serif'; const tw = ctx.measureText(cu.name).width; ctx.beginPath(); ctx.roundRect(x + 12, y + 16, tw + 12, 20, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(cu.name, x + 18, y + 30); }
        ctx.restore();
      });
    }
    // cursor preview
    const hv = hoverRef.current;
    if (hv && !hv.touch) {
      const t = st.current.tool;
      if (t === 'eraser') { ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hv.x, hv.y, Math.max(8, st.current.width * 2) , 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      else if (t === 'pen' || t === 'marker') { ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hv.x, hv.y, Math.max(1.5, (t === 'marker' ? st.current.width * 3 : st.current.width) * s / 2), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    }
  }, []);
  const requestDraw = useCallback(() => {
    if (drawQueued.current) return;
    drawQueued.current = true;
    requestAnimationFrame(draw);
  }, [draw]);

  // ----- state changes -----
  const changed = () => { bump(); requestDraw(); };
  const save = useRef<number | undefined>(undefined);
  const scheduleSave = () => {
    if (guest) return;
    window.clearTimeout(save.current);
    save.current = window.setTimeout(() => {
      const arr = pagesRef.current.map((p) => p.objs);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages: arr, cur: curRef.current })); }
      catch { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages: arr.map((l) => l.filter((o) => o.k !== 'img')), cur: curRef.current })); } catch { /* storage full or blocked */ } }
    }, 1500);
  };
  const sendDiff = (pageId: string, d: Diff) => {
    const c = collabRef.current; if (!c) return;
    const op = diffToOp<Obj>(d);
    if (!op.add!.length && !op.del!.length && !op.upd!.length) return;
    c.send({ t: 'ops', pg: pageId, ...op }, true);
  };
  const commit = (objs: Obj[]) => {
    const p = page();
    const d = diffObjs<Obj>(p.objs, objs);
    if (!isEmptyDiff(d)) { p.undo.push(d); if (p.undo.length > HIST) p.undo.shift(); p.redo = []; sendDiff(p.id, d); }
    p.objs = objs;
    previewRef.current = null; hiddenRef.current = new Set();
    const ids = new Set(objs.map((o) => o.id));
    setSel(selRef.current.filter((id) => ids.has(id)));
    scheduleSave(); changed();
  };
  // отмена и возврат работают с изменениями, а не со снимками: чужие правки при этом не затрагиваются
  const undo = () => {
    const p = page(); const d = p.undo.pop(); if (!d) return;
    const inv = invertDiff<Obj>(d); p.objs = applyOps<Obj>(p.objs, diffToOp<Obj>(inv)); p.redo.push(d); sendDiff(p.id, inv); afterHistory();
  };
  const redo = () => {
    const p = page(); const d = p.redo.pop(); if (!d) return;
    p.objs = applyOps<Obj>(p.objs, diffToOp<Obj>(d)); p.undo.push(d); sendDiff(p.id, d); afterHistory();
  };
  const afterHistory = () => {
    const ids = new Set(page().objs.map((o) => o.id));
    setSel(selRef.current.filter((id) => ids.has(id)));
    previewRef.current = null; hiddenRef.current = new Set(); scheduleSave(); changed();
  };
  // ----- общий доступ по ссылке -----
  const shareKey = () => `studytask-board-share:${boardIdRef.current || 'draft'}`;
  const shareLink = (token: string) => `${window.location.origin}/board/${token}`;
  const adoptPages = (pages: RoomPage<Obj>[]) => {
    const curId = pagesRef.current[curRef.current]?.id;
    pagesRef.current = pages.length ? pages.map((rp) => mkPage(rp.objs, rp.id)) : [mkPage()];
    const i = pagesRef.current.findIndex((x) => x.id === curId);
    curRef.current = i >= 0 ? i : 0;
    setSel([]); previewRef.current = null; hiddenRef.current = new Set(); remoteLive.current.clear(); changed();
  };
  const onRemote = (m: CollabMsg) => {
    const from = String(m.from || '');
    if (m.t === 'ops') {
      const pg = pagesRef.current.find((x) => x.id === m.pg); if (!pg) return;
      const op = { add: (m.add as { o: Obj; i: number }[]) || [], del: (m.del as number[]) || [], upd: (m.upd as Obj[]) || [] };
      pg.objs = applyOps<Obj>(pg.objs, op);
      for (const a of op.add) remoteLive.current.delete(`${from}:${a.o.id}`);
      for (const u of op.upd) remoteLive.current.delete(`${from}:${u.id}`);
      const ids = new Set(page().objs.map((o) => o.id));
      if (selRef.current.some((id) => !ids.has(id))) setSel(selRef.current.filter((id) => ids.has(id)));
      changed();
    } else if (m.t === 'page+') {
      const id = String(m.id); if (pagesRef.current.some((x) => x.id === id)) return;
      const curId = page().id; const at = Math.min(Math.max(0, Number(m.at) || 0), pagesRef.current.length);
      pagesRef.current.splice(at, 0, mkPage([], id)); curRef.current = pagesRef.current.findIndex((x) => x.id === curId); changed();
    } else if (m.t === 'page-') {
      const idx = pagesRef.current.findIndex((x) => x.id === m.id); if (idx < 0 || pagesRef.current.length < 2) return;
      const curId = page().id; pagesRef.current.splice(idx, 1);
      const ci = pagesRef.current.findIndex((x) => x.id === curId);
      if (ci >= 0) curRef.current = ci; else { curRef.current = Math.min(idx, pagesRef.current.length - 1); setSel([]); previewRef.current = null; }
      changed();
    } else if (m.t === 'live') {
      const key = `${from}:${m.id}`; let lo = remoteLive.current.get(key);
      if (!lo) { lo = { id: Number(m.id), k: m.k as Kind, c: String(m.c), w: Number(m.w) || 4, fill: !!m.fill, pts: [], x1: 0, y1: 0, x2: 0, y2: 0, pg: String(m.pg), t: 0 }; remoteLive.current.set(key, lo); }
      if (Array.isArray(m.pts)) {
        if (Number(m.s) === 0) lo.pts = [];
        if (Number(m.s) === (lo.pts?.length || 0)) for (const q of m.pts as number[][]) lo.pts!.push([q[0], q[1], 0.5]);
      } else { lo.x1 = Number(m.x1); lo.y1 = Number(m.y1); lo.x2 = Number(m.x2); lo.y2 = Number(m.y2); }
      lo.pg = String(m.pg); lo.t = performance.now(); requestDraw();
    } else if (m.t === 'liveEnd') { remoteLive.current.delete(`${from}:${m.id}`); requestDraw(); }
    else if (m.t === 'cur') {
      if (m.pg === null || m.pg === undefined) cursors.current.delete(from);
      else { const prev = cursors.current.get(from); cursors.current.set(from, { x: Number(m.x), y: Number(m.y), pg: String(m.pg), name: prev?.name || userNames.current.get(from) || '', t: performance.now() }); }
      requestDraw();
    } else if (m.t === 'leave') {
      cursors.current.delete(from); remoteLive.current.forEach((_, k) => { if (k.startsWith(`${from}:`)) remoteLive.current.delete(k); }); requestDraw();
    } else if (m.t === 'users') {
      const users = (m.users as CollabUser[]) || [];
      userNames.current = new Map(users.map((u) => [u.id, u.name]));
      cursors.current.forEach((cu, id) => { const u = users.find((x) => x.id === id); if (u) cu.name = u.name; });
      setShareState((prev) => (prev ? { ...prev, users } : prev)); requestDraw();
    }
  };
  const disconnectShare = () => {
    collabRef.current?.close(); collabRef.current = null;
    remoteLive.current.clear(); cursors.current.clear(); setShareState(null); setShareOpen(false);
  };
  const connectRoom = (token: string, name: string) => {
    collabRef.current?.close();
    remoteLive.current.clear(); cursors.current.clear();
    setShareState({ token, status: 'connecting', users: [] });
    const c = new BoardCollab<Obj>(token, name, {
      onHello: (h, queued) => {
        adoptPages(h.pages); userNames.current = new Map(h.users.map((u) => [u.id, u.name]));
        setShareState((prev) => (prev ? { ...prev, users: h.users } : prev));
        for (const q of queued) { onRemote(q); c.send(q); }
      },
      onMsg: onRemote,
      onStatus: (status) => {
        setShareState((prev) => (prev ? { ...prev, status } : prev));
        if (status === 'gone' && !guest) { try { localStorage.removeItem(shareKey()); } catch { /* ignore */ } collabRef.current = null; setShareState(null); flash('Ссылка отключена'); }
      },
    });
    collabRef.current = c;
  };
  const flushLive = () => {
    const c = collabRef.current; const o = liveRef.current; if (!c || !o) return;
    const pg = page().id;
    if (o.pts) {
      const from = liveSent.current;
      if (o.pts.length > from) {
        c.send({ t: 'live', pg, id: o.id, k: o.k, c: o.c, w: o.w, s: from, pts: o.pts.slice(from).map((q) => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]) });
        liveSent.current = o.pts.length;
      }
    } else c.send({ t: 'live', pg, id: o.id, k: o.k, c: o.c, w: o.w, fill: o.fill, x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2 });
  };
  const scheduleLive = () => {
    if (!collabRef.current || liveRaf.current) return;
    liveRaf.current = requestAnimationFrame(() => { liveRaf.current = 0; flushLive(); });
  };
  const endLive = (id: number) => {
    if (liveRaf.current) { cancelAnimationFrame(liveRaf.current); liveRaf.current = 0; }
    collabRef.current?.send({ t: 'liveEnd', id }); liveSent.current = 0;
  };
  const sendCursor = (wx: number, wy: number) => {
    const c = collabRef.current; if (!c) return;
    const n = performance.now(); if (n - lastCur.current < 40) return; lastCur.current = n;
    c.send({ t: 'cur', pg: page().id, x: Math.round(wx), y: Math.round(wy) });
  };
  const startShare = async () => {
    setShareBusy(true); setShareErr('');
    try {
      const d = await apiFetch<{ token: string }>('/api/teacher/board-share', { method: 'POST', body: JSON.stringify({ boardId: boardIdRef.current, pages: pagesRef.current.map((x) => ({ id: x.id, objs: x.objs })) }) });
      try { localStorage.setItem(shareKey(), d.token); } catch { /* ignore */ }
      connectRoom(d.token, 'Преподаватель');
    } catch (e) { setShareErr((e as Error).message); }
    finally { setShareBusy(false); }
  };
  const stopShare = async () => {
    if (!shareState || !window.confirm('Отключить ссылку? Все, кто сейчас на доске, потеряют доступ, а ссылка перестанет работать.')) return;
    try { await apiFetch(`/api/teacher/board-share/${shareState.token}`, { method: 'DELETE' }); } catch (e) { setShareErr((e as Error).message); return; }
    try { localStorage.removeItem(shareKey()); } catch { /* ignore */ }
    disconnectShare(); flash('Ссылка отключена');
  };
  const copyLink = async () => {
    if (!shareState) return;
    try { await navigator.clipboard.writeText(shareLink(shareState.token)); flash('Ссылка скопирована'); }
    catch { window.prompt('Скопируйте ссылку:', shareLink(shareState.token)); }
  };
  const bindShare = (boardId: string) => {
    if (!shareState) return;
    try { localStorage.setItem(`studytask-board-share:${boardId}`, shareState.token); } catch { /* ignore */ }
    void apiFetch(`/api/teacher/board-share/${shareState.token}/bind`, { method: 'POST', body: JSON.stringify({ boardId }) }).catch(() => undefined);
  };

  const selectedObjs = () => page().objs.filter((o) => selRef.current.includes(o.id));
  const copySel = () => { const s = selectedObjs(); if (!s.length) return false; clipboard = JSON.parse(JSON.stringify(s)); pasteCount = 0; try { void navigator.clipboard?.writeText('studytask-board').catch(() => undefined); } catch { /* ignore */ } return true; };
  const deleteSel = () => { if (!selRef.current.length) return; const ids = new Set(selRef.current); commit(page().objs.filter((o) => !ids.has(o.id))); setSel([]); };
  const cutSel = () => { if (copySel()) deleteSel(); };
  const pasteClip = () => {
    if (!clipboard.length) return;
    pasteCount += 1; const off = 24 * pasteCount;
    const clones = clipboard.map((o) => ({ ...moveObj(JSON.parse(JSON.stringify(o)), off, off), id: nid() }));
    commit([...page().objs, ...clones]); setSel(clones.map((o) => o.id)); setTool('select');
  };
  const duplicateSel = () => {
    const s = selectedObjs(); if (!s.length) return;
    const clones = s.map((o) => ({ ...moveObj(JSON.parse(JSON.stringify(o)), 28, 28), id: nid() }));
    commit([...page().objs, ...clones]); setSel(clones.map((o) => o.id));
  };
  const selectAll = () => { setSel(page().objs.map((o) => o.id)); setTool('select'); changed(); };
  const setTool = (t: Tool) => { setToolState(t); if (t !== 'select') { /* keep selection visible but inactive */ } requestDraw(); };
  const nudge = (dx: number, dy: number) => { if (!selRef.current.length) return; const ids = new Set(selRef.current); commit(page().objs.map((o) => (ids.has(o.id) ? moveObj(o, dx, dy) : o))); };
  const applyStyle = (patch: { c?: string; w?: number; fill?: boolean }) => {
    if (!selRef.current.length) return;
    const ids = new Set(selRef.current);
    commit(page().objs.map((o) => {
      if (!ids.has(o.id)) return o;
      const n = { ...o };
      if (patch.c) n.c = patch.c;
      if (patch.w !== undefined) { if (o.k === 'text') n.fs = Math.max(14, patch.w * 6); else n.w = patch.w; }
      if (patch.fill !== undefined && (o.k === 'rect' || o.k === 'ell' || o.k === 'tri')) n.fill = patch.fill;
      return n;
    }));
  };
  const chooseColor = (c: string) => { setColor(c); applyStyle({ c }); };
  const chooseWidth = (w: number) => { const v = Math.max(1, Math.min(40, w)); setWidth(v); applyStyle({ w: v }); };
  const toggleFill = () => { const v = !st.current.fill; setFill(v); applyStyle({ fill: v }); };
  const setBoardId = (id: string | null) => { boardIdRef.current = id; try { if (id) localStorage.setItem(STORAGE_KEY + '-id', id); else localStorage.removeItem(STORAGE_KEY + '-id'); } catch { /* ignore */ } };
  const flash = (m: string) => { setBoardMsg(m); window.setTimeout(() => setBoardMsg(''), 3000); };
  const refreshBoards = async () => {
    setBoardsLoading(true); setBoardsErr('');
    try { const d = await apiFetch<{ boards: SavedBoard[] }>('/api/teacher/boards'); setBoards(d.boards); return d.boards; }
    catch (e) { setBoardsErr((e as Error).message); return null; }
    finally { setBoardsLoading(false); }
  };
  const saveBoard = async (asNew = false) => {
    if (busy) return;
    const name = boardName.trim() || `Доска ${new Date().toLocaleDateString('ru-RU')}`;
    const id = !asNew && boardIdRef.current ? boardIdRef.current : newBoardId();
    setBusy(true);
    try {
      await apiFetch(`/api/teacher/boards/${id}`, { method: 'PUT', body: JSON.stringify({ name, pages: pagesRef.current.map((p) => p.objs) }) });
      setBoardId(id); bindShare(id); setBoardName(name); flash(boardIdRef.current === id && !asNew && boards.some((b) => b.id === id) ? 'Доска обновлена' : 'Доска сохранена'); scheduleSave();
      if (boardsOpen) void refreshBoards(); else setBoards((list) => (list.some((b) => b.id === id) ? list.map((b) => (b.id === id ? { ...b, name, updated: Date.now(), pageCount: pagesRef.current.length } : b)) : [{ id, name, updated: Date.now(), pageCount: pagesRef.current.length }, ...list]));
    } catch (e) { flash(`Не сохранено: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };
  const openBoard = async (b: SavedBoard) => {
    setBusy(true);
    try {
      const d = await apiFetch<{ board: { id: string; name: string; pages: Obj[][] } }>(`/api/teacher/boards/${b.id}`);
      disconnectShare();
      pagesRef.current = (d.board.pages.length ? d.board.pages : [[]]).map((objs) => mkPage(objs));
      curRef.current = 0; setBoardId(b.id); setBoardName(d.board.name); setSel([]); previewRef.current = null; viewRef.current = { x: 60, y: 60, s: 1 };
      scheduleSave(); setBoardsOpen(false); changed();
    } catch (e) { setBoardsErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const newBoard = () => {
    disconnectShare(); pagesRef.current = [mkPage()]; curRef.current = 0; setBoardId(null); setBoardName(''); setSel([]); previewRef.current = null;
    scheduleSave(); setBoardsOpen(false); changed();
  };
  const renameBoard = async (id: string, name: string) => {
    const n = name.trim(); setRenaming(null); if (!n) return;
    try {
      await apiFetch(`/api/teacher/boards/${id}`, { method: 'PUT', body: JSON.stringify({ name: n }) });
      setBoards((list) => list.map((b) => (b.id === id ? { ...b, name: n } : b)));
      if (boardIdRef.current === id) setBoardName(n);
    } catch (e) { setBoardsErr((e as Error).message); }
  };
  const deleteBoard = async (b: SavedBoard) => {
    if (!window.confirm(`Удалить доску «${b.name}»? Отменить нельзя.`)) return;
    try {
      await apiFetch(`/api/teacher/boards/${b.id}`, { method: 'DELETE' });
      setBoards((list) => list.filter((x) => x.id !== b.id));
      if (boardIdRef.current === b.id) { setBoardId(null); setBoardName(''); }
    } catch (e) { setBoardsErr((e as Error).message); }
  };
  const clearPage = () => { if (page().objs.length) { commit([]); setSel([]); } };
  const gotoPage = (i: number) => { if (i < 0 || i >= pagesRef.current.length) return; curRef.current = i; setSel([]); previewRef.current = null; scheduleSave(); changed(); };
  const addPage = () => { const pg = mkPage(); pagesRef.current.push(pg); collabRef.current?.send({ t: 'page+', id: pg.id, at: pagesRef.current.length - 1 }, true); gotoPage(pagesRef.current.length - 1); };
  const removePage = () => {
    if (pagesRef.current.length < 2) { clearPage(); return; }
    if (!window.confirm('Удалить страницу вместе с содержимым? Отменить это действие нельзя.')) return;
    collabRef.current?.send({ t: 'page-', id: page().id }, true);
    pagesRef.current.splice(curRef.current, 1); curRef.current = Math.min(curRef.current, pagesRef.current.length - 1); setSel([]); scheduleSave(); changed();
  };
  const zoomAt = (sx: number, sy: number, f: number) => {
    const v = viewRef.current; const ns = Math.max(0.15, Math.min(6, v.s * f)); const k = ns / v.s;
    viewRef.current = { s: ns, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k }; changed();
  };
  const zoomCenter = (f: number) => { const r = canvasRef.current?.getBoundingClientRect(); if (r) zoomAt(r.width / 2, r.height / 2, f); };
  const resetView = () => { viewRef.current = { x: 60, y: 60, s: 1 }; changed(); };
  // полный экран: надёжный режим «поверх страницы» (работает и на iPhone), плюс системный полноэкранный, если браузер его даёт
  const enterFs = () => {
    setCssFs(true);
    try {
      const el = wrapRef.current as (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
      const r = el?.requestFullscreen ? el.requestFullscreen() : el?.webkitRequestFullscreen?.();
      if (r && typeof (r as Promise<void>).then === 'function') (r as Promise<void>).then(() => { nativeFs.current = true; }).catch(() => undefined);
    } catch { /* остаёмся в режиме поверх страницы */ }
  };
  const exitFs = () => {
    nativeFs.current = false; setCssFs(false);
    try { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); } catch { /* ignore */ }
  };
  const toggleFullscreen = () => { if (cssFs) exitFs(); else enterFs(); };
  const exportPng = () => {
    const objs = page().objs; const box = unionBox(objs) || ([0, 0, 1200, 800] as Box);
    const pad = 64, sc = 2; const w = Math.ceil(box[2] - box[0] + pad * 2), h = Math.ceil(box[3] - box[1] + pad * 2);
    const cv = document.createElement('canvas'); cv.width = Math.min(8000, w * sc); cv.height = Math.min(8000, h * sc);
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.save(); ctx.scale(sc, sc); ctx.translate(pad - box[0], pad - box[1]);
    objs.forEach((o) => drawObj(ctx, o)); ctx.restore();
    const finish = (logo?: HTMLImageElement) => {
      if (logo && logo.naturalWidth) ctx.drawImage(logo, 14 * sc, 14 * sc, 36 * sc, 36 * sc);
      cv.toBlob((blob) => {
        if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a');
        const d = new Date(); a.href = url; a.download = `study-task-board-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-стр${curRef.current + 1}.png`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    };
    const lg = new Image(); lg.onload = () => finish(lg); lg.onerror = () => finish(); lg.src = '/static/ST.webp';
  };

  // ----- images -----
  const fileRef = useRef<HTMLInputElement>(null);
  const insertImages = async (files: File[], at?: { wx: number; wy: number }) => {
    const imgs = files.filter((f) => f.type.startsWith('image/')); if (!imgs.length) return;
    const cv = canvasRef.current; if (!cv) return;
    const r = cv.getBoundingClientRect(); const v = viewRef.current;
    const cx = at ? at.wx : (r.width / 2 - v.x) / v.s, cy = at ? at.wy : (r.height / 2 - v.y) / v.s;
    const made: Obj[] = []; let off = 0;
    for (const f of imgs) {
      try {
        const { src, w, h } = await prepareImage(f);
        const k = Math.min((r.width * 0.6) / v.s / w, (r.height * 0.7) / v.s / h, 1.5);
        const ww = w * k, hh = h * k;
        made.push({ id: nid(), k: 'img', c: '#000', w: 1, fill: false, x1: cx - ww / 2 + off, y1: cy - hh / 2 + off, x2: cx + ww / 2 + off, y2: cy + hh / 2 + off, src });
        off += 30;
      } catch (e) { flash((e as Error).message); }
    }
    if (made.length) { commit([...made, ...page().objs]); setSel(made.map((o) => o.id)); setTool('select'); }
  };

  // ----- text editor -----
  const openEditor = (x: number, y: number, existing?: Obj) => {
    if (existing) hiddenRef.current = new Set([existing.id]);
    setEditor({ id: existing?.id ?? null, x: existing ? existing.x1 : x, y: existing ? existing.y1 : y, text: existing?.text || '', fs: existing?.fs || Math.max(18, st.current.width * 6), c: existing?.c || st.current.color });
    requestDraw();
  };
  const finishEditor = (text: string) => {
    const ed = st.current.editor; if (!ed) return;
    setEditor(null); hiddenRef.current = new Set();
    const t = text.replace(/\s+$/g, '');
    const objs = page().objs;
    if (ed.id !== null) {
      if (!t) commit(objs.filter((o) => o.id !== ed.id));
      else if (t !== objs.find((o) => o.id === ed.id)?.text) commit(objs.map((o) => (o.id === ed.id ? { ...o, text: t } : o)));
      else requestDraw();
    } else if (t) commit([...objs, { id: nid(), k: 'text', c: ed.c, w: 1, fill: false, x1: ed.x, y1: ed.y, x2: ed.x, y2: ed.y, text: t, fs: ed.fs }]);
    else requestDraw();
  };

  // ----- pointer handling -----
  const evPoint = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect(); const v = viewRef.current;
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    return { sx, sy, wx: (sx - v.x) / v.s, wy: (sy - v.y) / v.s };
  };
  const eraseAt = (wx: number, wy: number, gone: Set<number>) => {
    const tol = Math.max(8, st.current.width * 2) / viewRef.current.s;
    let added = false;
    for (const o of page().objs) {
      if (o.k === 'img' || gone.has(o.id)) continue;
      const b = bbox(o);
      if (wx < b[0] - tol || wx > b[2] + tol || wy < b[1] - tol || wy > b[3] + tol) continue;
      if (hit(o, wx, wy, tol)) { gone.add(o.id); added = true; }
    }
    if (added || hiddenRef.current.size !== gone.size) hiddenRef.current = new Set(gone);
  };
  const topHit = (wx: number, wy: number) => {
    const tol = 6 / viewRef.current.s; const list = page().objs;
    for (let i = list.length - 1; i >= 0; i--) if (hit(list[i], wx, wy, tol)) return list[i];
    return null;
  };
  const handleAt = (sx: number, sy: number) => {
    const box = unionBox(selectedObjs()); if (!box || !selRef.current.length) return -1;
    const v = viewRef.current;
    const pts = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
    const off = [[-4, -4], [4, -4], [4, 4], [-4, 4]];
    for (let i = 0; i < 4; i++) if (Math.hypot(sx - (pts[i][0] * v.s + v.x + off[i][0]), sy - (pts[i][1] * v.s + v.y + off[i][1])) <= 11) return i;
    return -1;
  };

  // два пальца: масштаб и сдвиг листа; начатый первым пальцем штрих отменяется, линии не соединяются
  const cancelStroke = () => {
    const d = dragRef.current;
    if (d && (d.mode === 'draw' || d.mode === 'shape')) endLive(d.obj.id);
    liveRef.current = null; predRef.current = []; dragRef.current = null;
    hiddenRef.current = new Set(); previewRef.current = null; marqueeRef.current = null;
  };
  const startPinch = () => {
    const pts = (Array.from(touchesRef.current.values()) as { x: number; y: number }[]); if (pts.length < 2) return;
    const r = canvasRef.current!.getBoundingClientRect(); const v = viewRef.current;
    const cx = (pts[0].x + pts[1].x) / 2 - r.left, cy = (pts[0].y + pts[1].y) / 2 - r.top;
    pinchRef.current = { d0: Math.max(10, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)), s0: v.s, wx: (cx - v.x) / v.s, wy: (cy - v.y) / v.s };
    dragRef.current = { mode: 'pinch' };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchesRef.current.size >= 2) {
        if (dragRef.current?.mode !== 'pinch') { cancelStroke(); gestureRef.current = true; startPinch(); }
        try { canvasRef.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        requestDraw(); return;
      }
      if (gestureRef.current) return;
    }
    if (e.pointerType === 'touch' && st.current.penOnly) return;
    if (st.current.editor) { const el = document.getElementById('stb-editor') as HTMLTextAreaElement | null; finishEditor(el?.value || ''); }
    const cv = canvasRef.current!; cv.setPointerCapture(e.pointerId);
    const { sx, sy, wx, wy } = evPoint(e);
    hoverRef.current = { x: sx, y: sy, touch: e.pointerType === 'touch' };
    const eraserEnd = e.pointerType === 'pen' && ((e.buttons & 32) === 32 || e.button === 5);
    eraserEndRef.current = eraserEnd;
    let t: Tool = eraserEnd ? 'eraser' : st.current.tool;
    if (e.button === 1 || spaceRef.current || t === 'hand') { dragRef.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }; return; }
    if (e.button !== 0 && !eraserEnd) return;
    const p = 0.5;
    const { color: c, width: w, fill: f } = st.current;
    if (t === 'pen' || t === 'marker') {
      const obj: Obj = { id: nid(), k: t, c, w, fill: false, pts: [[wx, wy, p]], x1: wx, y1: wy, x2: wx, y2: wy };
      liveRef.current = obj; dragRef.current = { mode: 'draw', obj }; liveSent.current = 0; scheduleLive();
    } else if (t === 'eraser') {
      const gone = new Set<number>(); eraseAt(wx, wy, gone); dragRef.current = { mode: 'erase', gone };
    } else if (t === 'line' || t === 'arrow' || t === 'rect' || t === 'tri' || t === 'ell') {
      const obj: Obj = { id: nid(), k: t, c, w, fill: f, x1: wx, y1: wy, x2: wx, y2: wy };
      liveRef.current = obj; dragRef.current = { mode: 'shape', obj, shift: false }; scheduleLive();
    } else if (t === 'text') {
      const h = topHit(wx, wy); if (h && h.k === 'text') openEditor(wx, wy, h); else openEditor(wx, wy);
      e.preventDefault();
    } else if (t === 'laser') {
      dragRef.current = { mode: 'laser' }; laserRef.current.push({ x: sx, y: sy, t: performance.now() });
    } else {
      // select
      const hnd = handleAt(sx, sy);
      if (hnd >= 0) {
        const box = unionBox(selectedObjs())!; const corners = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
        const opp = corners[(hnd + 2) % 4];
        dragRef.current = { mode: 'resize', ax: opp[0], ay: opp[1], ox: corners[hnd][0], oy: corners[hnd][1], base: selectedObjs(), corner: hnd };
      } else {
        const h = topHit(wx, wy);
        const sb = unionBox(selectedObjs());
        const inSel = !!sb && !e.shiftKey && selRef.current.length > 0 && wx >= sb[0] - 4 / viewRef.current.s && wx <= sb[2] + 4 / viewRef.current.s && wy >= sb[1] - 4 / viewRef.current.s && wy <= sb[3] + 4 / viewRef.current.s;
        if (inSel || h) {
          if (inSel) { /* drag the whole current selection by any point inside its frame */ }
          else if (!h) { /* unreachable */ }
          else if (e.shiftKey) { const has = selRef.current.includes(h.id); setSel(has ? selRef.current.filter((id) => id !== h.id) : [...selRef.current, h.id]); }
          else if (!selRef.current.includes(h.id)) setSel([h.id]);
          dragRef.current = { mode: 'move', wx, wy, base: selectedObjs(), moved: false, sx, sy };
        } else {
          if (!e.shiftKey) setSel([]);
          dragRef.current = { mode: 'marquee', wx, wy, additive: e.shiftKey }; marqueeRef.current = [wx, wy, wx, wy];
        }
      }
    }
    requestDraw();
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      if (touchesRef.current.has(e.pointerId)) touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pc = pinchRef.current;
      if (dragRef.current?.mode === 'pinch' && pc && touchesRef.current.size >= 2) {
        const pts = (Array.from(touchesRef.current.values()) as { x: number; y: number }[]); const r = canvasRef.current!.getBoundingClientRect();
        const cx = (pts[0].x + pts[1].x) / 2 - r.left, cy = (pts[0].y + pts[1].y) / 2 - r.top;
        const ns = Math.max(0.15, Math.min(8, pc.s0 * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / pc.d0));
        viewRef.current = { s: ns, x: cx - pc.wx * ns, y: cy - pc.wy * ns };
        changed(); return;
      }
      if (gestureRef.current) return;
    }
    const { sx, sy, wx, wy } = evPoint(e);
    hoverRef.current = { x: sx, y: sy, touch: e.pointerType === 'touch' };
    sendCursor(wx, wy);
    const d = dragRef.current;
    if (!d) { requestDraw(); return; }
    if (d.mode === 'pan') { viewRef.current = { ...viewRef.current, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }; }
    else if (d.mode === 'draw') {
      const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() || [];
      const list = evs.length ? evs : [e.nativeEvent as PointerEvent];
      const pts = d.obj.pts!;
      for (const ev of list) {
        const q = evPoint(ev); const last = pts[pts.length - 1];
        if (Math.hypot(q.wx - last[0], q.wy - last[1]) * viewRef.current.s < 0.3) continue;
        pts.push([q.wx, q.wy, 0.5]);
      }
      liveRef.current = { ...d.obj };
      scheduleLive();
    } else if (d.mode === 'shape') {
      let x2 = wx, y2 = wy; const o = d.obj; const dx = x2 - o.x1, dy = y2 - o.y1;
      if (e.shiftKey) {
        if (o.k === 'line' || o.k === 'arrow') { const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12); const len = Math.hypot(dx, dy); x2 = o.x1 + len * Math.cos(ang); y2 = o.y1 + len * Math.sin(ang); }
        else { const m = Math.max(Math.abs(dx), Math.abs(dy)); x2 = o.x1 + Math.sign(dx || 1) * m; y2 = o.y1 + Math.sign(dy || 1) * m; }
      }
      liveRef.current = { ...o, x2, y2 }; scheduleLive();
    } else if (d.mode === 'erase') { eraseAt(wx, wy, d.gone); }
    else if (d.mode === 'laser') { laserRef.current.push({ x: sx, y: sy, t: performance.now() }); }
    else if (d.mode === 'move') {
      const dx = wx - d.wx, dy = wy - d.wy;
      if (!d.moved && Math.hypot(sx - d.sx, sy - d.sy) < 3) return;
      d.moved = true; previewRef.current = new Map(d.base.map((o) => [o.id, moveObj(o, dx, dy)]));
    } else if (d.mode === 'resize') {
      let fx = (wx - d.ax) / ((d.ox - d.ax) || 1), fy = (wy - d.ay) / ((d.oy - d.ay) || 1);
      if (e.shiftKey || d.base.some((o) => o.k === 'text' || o.k === 'img')) { const f = Math.abs(fx) > Math.abs(fy) ? fx : fy; fx = f; fy = f; }
      fx = Math.abs(fx) < 0.05 ? 0.05 * Math.sign(fx || 1) : fx; fy = Math.abs(fy) < 0.05 ? 0.05 * Math.sign(fy || 1) : fy;
      previewRef.current = new Map(d.base.map((o) => [o.id, scaleObj(o, d.ax, d.ay, fx, fy)]));
    } else if (d.mode === 'marquee') {
      marqueeRef.current = [Math.min(d.wx, wx), Math.min(d.wy, wy), Math.max(d.wx, wx), Math.max(d.wy, wy)];
    }
    requestDraw();
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      touchesRef.current.delete(e.pointerId);
      if (dragRef.current?.mode === 'pinch') {
        try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
        if (touchesRef.current.size < 2) { dragRef.current = null; pinchRef.current = null; }
        if (touchesRef.current.size === 0) gestureRef.current = false;
        requestDraw(); return;
      }
      if (touchesRef.current.size === 0) gestureRef.current = false;
      else if (gestureRef.current) return;
    }
    const d = dragRef.current; dragRef.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (!d) return;
    if (d.mode === 'draw') { const o = liveRef.current || d.obj; flushLive(); liveRef.current = null; predRef.current = []; commit([...page().objs, o]); endLive(o.id); }
    else if (d.mode === 'shape') {
      const o = liveRef.current; liveRef.current = null;
      if (o && Math.hypot(o.x2 - o.x1, o.y2 - o.y1) * viewRef.current.s > 3) commit([...page().objs, o]); else requestDraw();
      endLive(d.obj.id);
    } else if (d.mode === 'erase') {
      if (d.gone.size) commit(page().objs.filter((o) => !d.gone.has(o.id))); else { hiddenRef.current = new Set(); requestDraw(); }
    } else if (d.mode === 'move' || d.mode === 'resize') {
      const pv = previewRef.current; previewRef.current = null;
      if (pv && pv.size) commit(page().objs.map((o) => pv.get(o.id) || o)); else changed();
    } else if (d.mode === 'marquee') {
      const m = marqueeRef.current; marqueeRef.current = null;
      if (m && (m[2] - m[0] > 2 || m[3] - m[1] > 2)) {
        const ids = page().objs.filter((o) => { const b = bounds(o); return b[0] <= m[2] && b[2] >= m[0] && b[1] <= m[3] && b[3] >= m[1]; }).map((o) => o.id);
        setSel(d.additive ? Array.from(new Set([...selRef.current, ...ids])) : ids);
      }
      changed();
    } else requestDraw();
    eraserEndRef.current = false;
  };
  const onLeave = () => { hoverRef.current = null; collabRef.current?.send({ t: 'cur', pg: null }); requestDraw(); };
  const onDouble = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (st.current.tool !== 'select') return;
    const { wx, wy } = evPoint(e); const h = topHit(wx, wy);
    if (h && h.k === 'text') { setSel([h.id]); openEditor(h.x1, h.y1, h); }
  };

  // ----- global effects: wheel, resize, keyboard, fullscreen, autosave -----
  useEffect(() => {
    const cv = canvasRef.current, area = areaRef.current; if (!cv || !area) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1; const r = area.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
      cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`; requestDraw();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(area);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0025));
      else { viewRef.current = { ...viewRef.current, x: viewRef.current.x - e.deltaX, y: viewRef.current.y - e.deltaY }; changed(); }
    };
    cv.addEventListener('wheel', wheel, { passive: false });
    const fsc = () => { if (!document.fullscreenElement && nativeFs.current) { nativeFs.current = false; setCssFs(false); } setTimeout(resize, 50); };
    document.addEventListener('fullscreenchange', fsc);
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = false; };
    window.addEventListener('keyup', onKeyUp);
    return () => { ro.disconnect(); cv.removeEventListener('wheel', wheel); document.removeEventListener('fullscreenchange', fsc); window.removeEventListener('keyup', onKeyUp); window.clearTimeout(save.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = useRef({ undo, redo, copySel, cutSel, pasteClip, duplicateSel, selectAll, deleteSel, nudge, chooseColor, chooseWidth, toggleFill, setTool, gotoPage, zoomCenter, resetView, setGridMode, exportPng, insertImages });
  api.current = { undo, redo, copySel, cutSel, pasteClip, duplicateSel, selectAll, deleteSel, nudge, chooseColor, chooseWidth, toggleFill, setTool, gotoPage, zoomCenter, resetView, setGridMode, exportPng, insertImages };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing) { if (e.code === 'Escape' && el!.id === 'stb-editor') { e.preventDefault(); finishEditor((el as HTMLTextAreaElement).value); } return; }
      if (e.altKey) return;
      const a = api.current; const mod = e.ctrlKey || e.metaKey;
      if (mod) {
        switch (e.code) {
          case 'KeyZ': e.preventDefault(); if (e.shiftKey) a.redo(); else a.undo(); return;
          case 'KeyY': e.preventDefault(); a.redo(); return;
          case 'KeyC': if (a.copySel()) e.preventDefault(); return;
          case 'KeyX': if (selRef.current.length) { e.preventDefault(); a.cutSel(); } return;
          case 'KeyV': return; // обрабатывается событием paste (картинка из буфера или копия объектов)
          case 'KeyD': e.preventDefault(); a.duplicateSel(); return;
          case 'KeyA': e.preventDefault(); a.selectAll(); return;
          case 'Digit0': case 'Numpad0': e.preventDefault(); a.resetView(); return;
          case 'Equal': case 'NumpadAdd': e.preventDefault(); a.zoomCenter(1.25); return;
          case 'Minus': case 'NumpadSubtract': e.preventDefault(); a.zoomCenter(0.8); return;
        }
        return;
      }
      if (e.code === 'Space') { spaceRef.current = true; e.preventDefault(); return; }
      if (e.code === 'Delete' || e.code === 'Backspace') { if (selRef.current.length) { e.preventDefault(); a.deleteSel(); } return; }
      if (e.code === 'Escape') { setSel([]); marqueeRef.current = null; if (st.current.tool !== 'select' && st.current.tool !== 'pen') a.setTool('pen'); changed(); return; }
      if (e.code.startsWith('Arrow') && selRef.current.length) {
        e.preventDefault(); const k = e.shiftKey ? 10 : 1;
        a.nudge(e.code === 'ArrowLeft' ? -k : e.code === 'ArrowRight' ? k : 0, e.code === 'ArrowUp' ? -k : e.code === 'ArrowDown' ? k : 0); return;
      }
      if (e.code === 'PageUp') { a.gotoPage(curRef.current - 1); return; }
      if (e.code === 'PageDown') { a.gotoPage(curRef.current + 1); return; }
      const dig = /^Digit([1-7])$/.exec(e.code); if (dig) { a.chooseColor(COLORS[Number(dig[1]) - 1]); return; }
      if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
        const cur = st.current.width; const idx = WIDTHS.findIndex((w) => w >= cur);
        const next = e.code === 'BracketRight' ? WIDTHS.find((w) => w > cur) ?? 40 : [...WIDTHS].reverse().find((w) => w < cur) ?? 1;
        void idx; a.chooseWidth(next); return;
      }
      if (e.code === 'KeyG') { a.setGridMode(((st.current.gridMode + 1) % 3) as 0 | 1 | 2); requestDraw(); return; }
      if (e.code === 'KeyF') { a.toggleFill(); return; }
      const t = TOOLS.find((x) => x.code === e.code); if (t) { a.setTool(t.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const files = (Array.from(e.clipboardData?.files || []) as File[]).filter((f) => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); void api.current.insertImages(files); return; }
      if (clipboard.length) { e.preventDefault(); api.current.pasteClip(); }
    };
    window.addEventListener('paste', onPaste);
    onImgLoad = () => requestDraw();
    return () => { window.removeEventListener('paste', onPaste); onImgLoad = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { requestDraw(); }, [gridMode, tool, sel, requestDraw]);

  useEffect(() => { wrapRef.current?.scrollIntoView({ block: 'start' }); }, []);
  useEffect(() => {
    if (!cssFs) return;
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !st.current.editor) exitFs(); };
    window.addEventListener('keydown', k);
    const t = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssFs]);
  useEffect(() => {
    if (shareToken) { connectRoom(shareToken, guestName || ''); return () => { collabRef.current?.close(); collabRef.current = null; }; }
    let saved: string | null = null;
    try { saved = localStorage.getItem(shareKey()); } catch { /* ignore */ }
    if (saved) connectRoom(saved, 'Преподаватель');
    return () => { collabRef.current?.close(); collabRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now(); let ch = cursors.current.size > 0;
      remoteLive.current.forEach((o, k) => { if (now - o.t > 10000) { remoteLive.current.delete(k); ch = true; } });
      if (ch) requestDraw();
    }, 1000);
    return () => window.clearInterval(id);
  }, [requestDraw]);
  useEffect(() => {
    if (guest || !guestName || !collabRef.current) return;
    collabRef.current.send({ t: 'name', name: guestName });
  }, [guestName, guest]);
  useEffect(() => {
    if (guest) return;
    void refreshBoards().then((list) => { const id = boardIdRef.current; const found = list?.find((b) => b.id === id); if (found) setBoardName(found.name); else if (list && id) setBoardId(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = page();
  const cursor = tool === 'select' ? 'default' : tool === 'hand' ? 'grab' : tool === 'text' ? 'text' : tool === 'eraser' ? 'none' : 'crosshair';
  const zoomPct = Math.round(viewRef.current.s * 100);
  const hasSel = sel.length > 0;
  const btn = 'grid h-9 min-w-9 place-items-center rounded-lg border border-border bg-white px-2 text-muted transition hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-40';
  const edView = editor ? viewRef.current : null;

  return (
    <section ref={wrapRef} className={`flex flex-col gap-2 bg-bg ${isFs ? 'fixed inset-0 z-[9999]' : ''}`} style={isFs ? { height: '100dvh' } : undefined} aria-label="Study Task board">
      <div className={isFs ? (toolsOpen ? 'absolute inset-x-2 z-30 rounded-2xl border border-border bg-white p-2 shadow-2xl' : 'hidden') : 'rounded-2xl border border-border bg-white p-2 shadow-sm'} style={isFs ? { top: 'calc(max(8px, env(safe-area-inset-top)) + 52px)' } : undefined}>
        <div className="flex flex-wrap items-center gap-1.5">
          {TOOLS.map(({ id, label, key, Icon }) => (
            <button key={id} type="button" onClick={() => setTool(id)} title={`${label} (${key})`} aria-label={label} aria-pressed={tool === id}
              className={`relative grid h-10 w-10 place-items-center rounded-xl border transition ${tool === id ? 'border-primary bg-primary text-white shadow-sm' : 'border-border bg-white text-muted hover:bg-primary-light hover:text-primary'}`}>
              <Icon className="h-5 w-5" /><span className={`absolute bottom-0.5 right-1 text-[9px] font-extrabold leading-none ${tool === id ? 'text-white/80' : 'text-muted/70'}`}>{key}</span>
            </button>
          ))}
          <span className="mx-1 h-7 w-px bg-border" />
          <button type="button" className={btn} onClick={undo} disabled={!p.undo.length} title="Отменить (Ctrl+Z)" aria-label="Отменить"><Undo2 className="h-4 w-4" /></button>
          <button type="button" className={btn} onClick={redo} disabled={!p.redo.length} title="Вернуть (Ctrl+Y или Ctrl+Shift+Z)" aria-label="Вернуть"><Redo2 className="h-4 w-4" /></button>
          <span className="mx-1 h-7 w-px bg-border" />
          <button type="button" className={btn} onClick={cutSel} disabled={!hasSel} title="Вырезать (Ctrl+X)" aria-label="Вырезать"><Scissors className="h-4 w-4" /></button>
          <button type="button" className={btn} onClick={() => copySel()} disabled={!hasSel} title="Копировать (Ctrl+C)" aria-label="Копировать"><Copy className="h-4 w-4" /></button>
          <button type="button" className={btn} onClick={pasteClip} disabled={!clipboard.length} title="Вставить (Ctrl+V)" aria-label="Вставить"><ClipboardPaste className="h-4 w-4" /></button>
          <button type="button" className={btn} onClick={duplicateSel} disabled={!hasSel} title="Дублировать (Ctrl+D)" aria-label="Дублировать"><CopyPlus className="h-4 w-4" /></button>
          <button type="button" className={`${btn} hover:!bg-rose-50 hover:!text-rose-600`} onClick={deleteSel} disabled={!hasSel} title="Удалить (Delete)" aria-label="Удалить"><Trash2 className="h-4 w-4" /></button>
          <span className="mx-1 h-7 w-px bg-border" />
          <button type="button" className={`${btn} gap-1.5 text-xs font-bold`} onClick={() => fileRef.current?.click()} title="Вставить картинку или схему (также Ctrl+V для скриншота или перетащить файл на лист)" aria-label="Вставить картинку"><ImagePlus className="h-4 w-4" /><span className="hidden sm:inline">Картинка</span></button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const fl = (Array.from(e.target.files || []) as File[]); e.target.value = ''; void insertImages(fl); }} />
          <div className="relative ml-auto flex items-center gap-1.5">
            {guest ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-primary-light px-3 text-xs font-bold text-primary" title="Вы работаете на общей доске вместе с остальными">
                <Users className="h-4 w-4" />{shareState?.status === 'gone' ? 'Доступ закрыт' : shareState?.status === 'open' ? `На доске: ${shareState.users.length}` : 'Подключение…'}
              </span>
            ) : (
              <>
                <button type="button" onClick={() => setShareOpen((v) => !v)} aria-expanded={shareOpen} title="Поделиться доской по ссылке"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition ${shareState ? 'border-primary bg-primary text-white' : 'border-border bg-white text-primary hover:bg-primary-light'}`}>
                  <Share2 className="h-4 w-4" />{shareState ? `Доска открыта · ${Math.max(1, shareState.users.length)}` : 'Поделиться'}
                </button>
                {shareOpen && (
                  <div className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,380px)] rounded-2xl border border-border bg-white p-4 text-sm shadow-2xl">
                    <div className="mb-2 flex items-center justify-between"><strong className="font-display">Общий доступ к доске</strong><button type="button" onClick={() => setShareOpen(false)} aria-label="Закрыть" className="rounded p-1 text-muted hover:bg-primary-light"><X className="h-4 w-4" /></button></div>
                    {!shareState ? (
                      <>
                        <p className="text-xs text-muted">Создайте ссылку: все, кто её откроет, смогут рисовать на этой доске вместе с вами со всеми инструментами. Изменения видны сразу.</p>
                        <button type="button" onClick={() => void startShare()} disabled={shareBusy} className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-dark disabled:opacity-60">{shareBusy ? 'Создаём ссылку…' : 'Создать ссылку'}</button>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-1.5">
                          <input readOnly value={shareLink(shareState.token)} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 text-xs outline-none" aria-label="Ссылка на доску" />
                          <button type="button" onClick={() => void copyLink()} className="rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary-dark">Копировать</button>
                        </div>
                        <p className="mt-2 text-xs text-muted">{shareState.status === 'open' ? 'Подключено' : shareState.status === 'reconnecting' ? 'Связь потеряна, переподключаемся…' : 'Подключение…'} · любой, у кого есть ссылка, может рисовать.</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {shareState.users.map((u) => <span key={u.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: cursorColor(u.id) }} />{u.name}</span>)}
                        </div>
                        <button type="button" onClick={() => void stopShare()} className="mt-3 w-full rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Отключить ссылку</button>
                      </>
                    )}
                    {shareErr && <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-700">{shareErr}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
          <div className="flex items-center gap-1" role="group" aria-label="Цвет">
            {COLORS.map((c, i) => (
              <button key={c} type="button" onClick={() => chooseColor(c)} title={`Цвет ${i + 1}`} aria-label={`Цвет ${i + 1}`} aria-pressed={color === c}
                className={`h-7 w-7 rounded-full border-2 transition ${color === c ? 'scale-110 border-primary ring-2 ring-primary/30' : 'border-white shadow ring-1 ring-border'}`} style={{ background: c }} />
            ))}
            <label className="relative ml-0.5 grid h-7 w-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-border bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" title="Свой цвет">
              <input type="color" value={color} onChange={(e) => chooseColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Свой цвет" />
            </label>
          </div>
          <span className="mx-1 h-7 w-px bg-border" />
          <div className="flex items-center gap-1" role="group" aria-label="Толщина">
            {WIDTHS.map((w) => (
              <button key={w} type="button" onClick={() => chooseWidth(w)} title={`Толщина ${w}`} aria-pressed={width === w}
                className={`grid h-9 w-9 place-items-center rounded-lg border transition ${width === w ? 'border-primary bg-primary-light' : 'border-border bg-white hover:bg-primary-light'}`}>
                <span className="rounded-full bg-slate-800" style={{ width: Math.min(24, w + 3), height: Math.min(24, w + 3) }} />
              </button>
            ))}
            <input type="range" min={1} max={40} value={width} onChange={(e) => chooseWidth(Number(e.target.value))} className="mx-1 h-1.5 w-24 accent-primary" aria-label="Толщина линии" />
            <span className="w-8 text-xs font-bold text-muted">{width}px</span>
          </div>
          <span className="mx-1 h-7 w-px bg-border" />
          <button type="button" className={`${btn} ${fill ? '!border-primary !bg-primary-light !text-primary' : ''}`} onClick={toggleFill} aria-pressed={fill} title="Заливка фигур (F)"><PaintBucket className="h-4 w-4" /></button>
          <button type="button" className={`${btn} ${gridMode ? '!border-primary !bg-primary-light !text-primary' : ''}`} onClick={() => setGridMode(((gridMode + 1) % 3) as 0 | 1 | 2)} title={`Сетка: ${['нет', 'клетка', 'точки'][gridMode]} (G)`}><Grid3x3 className="h-4 w-4" /><span className="sr-only">Сетка</span></button>
          <button type="button" className={`${btn} text-xs font-bold ${penOnly ? '!border-primary !bg-primary-light !text-primary' : ''}`} onClick={() => setPenOnly((v) => !v)} aria-pressed={penOnly} title="Игнорировать касания пальцем (защита от ладони)">Только перо</button>
          <span className="ml-auto flex items-center gap-1.5">
            <button type="button" className={btn} onClick={() => zoomCenter(0.8)} title="Уменьшить (Ctrl+−)" aria-label="Уменьшить"><ZoomOut className="h-4 w-4" /></button>
            <button type="button" className={`${btn} w-14 text-xs font-bold`} onClick={resetView} title="Сбросить вид (Ctrl+0)">{zoomPct}%</button>
            <button type="button" className={btn} onClick={() => zoomCenter(1.25)} title="Увеличить (Ctrl++)" aria-label="Увеличить"><ZoomIn className="h-4 w-4" /></button>
            <button type="button" className={btn} onClick={exportPng} title="Скачать страницу как PNG" aria-label="Скачать PNG"><Download className="h-4 w-4" /></button>
            <button type="button" className={btn} onClick={toggleFullscreen} title="На весь экран" aria-label="На весь экран">{isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
            <button type="button" className={`${btn} ${help ? '!border-primary !bg-primary-light !text-primary' : ''}`} onClick={() => setHelp((v) => !v)} title="Горячие клавиши" aria-expanded={help}><Keyboard className="h-4 w-4" /></button>
          </span>
        </div>
      </div>

      <div className={`relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm ${isFs ? 'min-h-0 flex-1 !rounded-none !border-0' : 'h-[max(560px,calc(100vh-200px))]'}`} ref={areaRef}
        onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault(); }}
        onDrop={(e) => { const fl = (Array.from(e.dataTransfer.files) as File[]).filter((f) => f.type.startsWith('image/')); if (!fl.length) return; e.preventDefault(); const q = evPoint(e); void insertImages(fl, { wx: q.wx, wy: q.wy }); }}>
        <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onLeave} onDoubleClick={onDouble}
          onContextMenu={(e) => e.preventDefault()} style={{ touchAction: 'none', cursor, display: 'block' }} aria-label="Белый лист" />
        {isFs && <button type="button" onClick={() => setToolsOpen((v) => !v)} aria-label={toolsOpen ? 'Скрыть инструменты' : 'Показать инструменты'} aria-expanded={toolsOpen} className="absolute left-1/2 z-40 grid h-11 w-16 -translate-x-1/2 place-items-center rounded-full bg-slate-900/85 text-white shadow-lg active:scale-95" style={{ top: 'max(8px, env(safe-area-inset-top))' }}><ChevronDown className={`h-6 w-6 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} /></button>}
        {isFs && <button type="button" onClick={exitFs} aria-label="Выйти из полноэкранного режима" title="Выйти из полноэкранного режима (Esc)" className="absolute right-3 z-40 grid h-11 w-11 place-items-center rounded-full bg-slate-900/85 text-white shadow-lg active:scale-95" style={{ top: 'max(8px, env(safe-area-inset-top))' }}><X className="h-6 w-6" /></button>}
        <img src="/static/ST.webp" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute left-3 top-3 z-[5] h-9 w-9 select-none rounded-lg object-contain opacity-90" />
        {editor && edView && (
          <textarea id="stb-editor" autoFocus defaultValue={editor.text} onBlur={(e) => finishEditor(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); finishEditor(e.currentTarget.value); } }}
            placeholder="Текст… (Esc — готово)" rows={2}
            style={{ position: 'absolute', left: editor.x * edView.s + edView.x, top: editor.y * edView.s + edView.y, fontSize: editor.fs * edView.s, lineHeight: 1.25, color: editor.c, fontFamily: FONT, minWidth: 140, background: 'rgba(255,255,255,0.85)', border: '1.5px dashed #1649E8', outline: 'none', resize: 'both', padding: 0 }} />
        )}
        <div className="pointer-events-none absolute bottom-2 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-muted shadow-sm">
          {hasSel ? `Выбрано: ${sel.length} · Delete — удалить, Ctrl+C / Ctrl+X — копировать / вырезать, стрелки — сдвиг` : TOOLS.find((t) => t.id === tool)?.label}
        </div>
        {boardsOpen && (
          <div className="absolute inset-y-3 left-3 z-10 flex w-[min(92%,380px)] flex-col rounded-2xl border border-border bg-white p-4 text-sm shadow-2xl">
            <div className="mb-2 flex items-center justify-between"><strong className="font-display">Мои доски</strong><button type="button" onClick={() => setBoardsOpen(false)} aria-label="Закрыть" className="rounded p-1 text-muted hover:bg-primary-light"><X className="h-4 w-4" /></button></div>
            <button type="button" onClick={newBoard} className="mb-2 rounded-lg border border-dashed border-primary px-3 py-2 text-xs font-bold text-primary hover:bg-primary-light">+ Новая чистая доска</button>
            <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {boardsErr && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{boardsErr}</p>}
              {boardsLoading && <p className="p-3 text-center text-xs text-muted">Загрузка…</p>}
              {!boardsLoading && !boardsErr && boards.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">Пока ничего не сохранено. Введите название внизу и нажмите «Сохранить».</p>}
              {boards.map((b) => (
                <div key={b.id} className={`rounded-xl border p-3 ${b.id === boardIdRef.current ? 'border-primary bg-primary-light' : 'border-border'}`}>
                  {renaming?.id === b.id ? (
                    <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: b.id, name: e.target.value })} onBlur={() => void renameBoard(b.id, renaming.name)} onKeyDown={(e) => { if (e.key === 'Enter') void renameBoard(b.id, renaming.name); if (e.key === 'Escape') setRenaming(null); }} maxLength={60} className="w-full rounded border border-primary px-2 py-1 text-sm outline-none" />
                  ) : (<strong className="block truncate">{b.name}</strong>)}
                  <span className="text-xs text-muted">{b.pageCount} стр. · {new Date(b.updated).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <div className="mt-2 flex gap-1.5">
                    <button type="button" onClick={() => void openBoard(b)} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-white">Открыть</button>
                    <button type="button" onClick={() => setRenaming({ id: b.id, name: b.name })} className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted hover:bg-white">Переименовать</button>
                    <button type="button" onClick={() => void deleteBoard(b)} className="ml-auto rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">Доски хранятся на сервере в вашем аккаунте и доступны с любого устройства. Изменения в сохранённой доске записываются только по кнопке «Обновить», так что исходник не потеряется. Черновик текущей доски сохраняется сам.</p>
          </div>
        )}
        {help && (
          <div className="absolute right-3 top-3 z-10 w-[min(92%,360px)] rounded-2xl border border-border bg-white p-4 text-sm shadow-2xl">
            <div className="mb-2 flex items-center justify-between"><strong className="font-display">Горячие клавиши</strong><button type="button" onClick={() => setHelp(false)} aria-label="Закрыть" className="rounded p-1 text-muted hover:bg-primary-light"><X className="h-4 w-4" /></button></div>
            <p className="text-xs text-muted">Работают на любой раскладке клавиатуры.</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {[...TOOLS.map((t) => [t.key, t.label]), ['Ctrl+Z', 'Отменить'], ['Ctrl+Y / Ctrl+Shift+Z', 'Вернуть'], ['Ctrl+C / X / V', 'Копировать / вырезать / вставить'], ['Delete', 'Удалить выделенное'], ['Ctrl+D', 'Дублировать'], ['Ctrl+V / перетащить файл', 'Вставить картинку, схему, скриншот'], ['Ctrl+A', 'Выделить всё'], ['Стрелки', 'Сдвиг выделенного (Shift — крупнее)'], ['Shift при рисовании', 'Ровная линия / квадрат / круг'], ['1–7', 'Цвет'], ['[  ]', 'Толщина'], ['F', 'Заливка фигур'], ['G', 'Сетка: клетка / точки / нет'], ['Пробел + мышь', 'Двигать лист'], ['Ctrl + колесо', 'Масштаб'], ['PgUp / PgDn', 'Страница'], ['Esc', 'Снять выделение']].map(([k, v]) => (
                <React.Fragment key={k}><dt className="font-mono text-xs font-bold text-primary">{k}</dt><dd className="text-xs">{v}</dd></React.Fragment>
              ))}
            </dl>
            <p className="mt-2 text-xs text-muted">Перо с нажимом: линия толще при сильном нажатии. Обратный конец пера работает как ластик.</p>
          </div>
        )}
      </div>

      <div className={`${isFs ? "hidden" : "flex"} flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-white p-2 shadow-sm`} role="tablist" aria-label="Страницы доски">
        {pagesRef.current.map((_, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === curRef.current} onClick={() => gotoPage(i)}
            className={`h-9 min-w-9 rounded-lg px-3 text-sm font-bold transition ${i === curRef.current ? 'bg-primary text-white shadow-sm' : 'border border-border bg-white text-muted hover:bg-primary-light'}`}>{i + 1}</button>
        ))}
        <button type="button" onClick={addPage} className={btn} title="Новый чистый лист" aria-label="Добавить страницу"><Plus className="h-4 w-4" /></button>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {!guest && <input value={boardName} onChange={(e) => setBoardName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void saveBoard(); }} placeholder="Название доски" maxLength={60} aria-label="Название доски" className="h-9 w-44 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary" />}
          {!guest && <button type="button" onClick={() => void saveBoard()} disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-dark" title="Сохранить в список досок">{boardIdRef.current ? 'Обновить' : 'Сохранить'}</button>}
          {!guest && boardIdRef.current && <button type="button" onClick={() => void saveBoard(true)} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted hover:bg-primary-light" title="Сохранить копией под этим названием">Как новую</button>}
          {!guest && <button type="button" onClick={() => { const next = !boardsOpen; setBoardsOpen(next); if (next) void refreshBoards(); }} aria-expanded={boardsOpen} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-primary hover:bg-primary-light">Мои доски{boards.length ? ` (${boards.length})` : ''}</button>}
          {boardMsg && <span role="status" className="text-xs font-bold text-emerald-600">{boardMsg}</span>}
          <button type="button" onClick={clearPage} disabled={!p.objs.length} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted hover:bg-primary-light disabled:opacity-40" title="Очистить страницу (можно отменить Ctrl+Z)">Очистить страницу</button>
          <button type="button" onClick={removePage} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Удалить страницу</button>
        </span>
      </div>
    </section>
  );
}
