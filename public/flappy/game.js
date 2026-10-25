const canvas = document.getElementById('gameCanvas');
const realCtx = canvas.getContext('2d');
let ctx = realCtx; // swapped for a no-op / offscreen context when needed (see gameLoop, makeSprite)
// Drawing context that ignores everything: used for catch-up ticks so logic runs but pixels are skipped.
const NOOP = new Proxy(function () {}, { get: () => NOOP, apply: () => NOOP, set: () => true });
const loginDemo = new URLSearchParams(window.location.search).get('loginDemo') === '1';
const W = 400, H = 650;
const pixelRatio = loginDemo ? 1 : Math.min(window.devicePixelRatio || 1, 3);
canvas.width = Math.round(W * pixelRatio);
canvas.height = Math.round(H * pixelRatio);
realCtx.scale(pixelRatio, pixelRatio);
realCtx.imageSmoothingEnabled = true;
realCtx.imageSmoothingQuality = 'high';

// Simulation clock: 1 tick = 1/60 s. Replaces simNow() so timing follows game time, not wall time.
const STEP_MS = 1000 / 60;
let simTicks = 0;
const simNow = () => simTicks * STEP_MS;

// Pre-render helper: draws fn(0,0) into an offscreen canvas of w*h CSS px (origin at its centre).
function makeSprite(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * pixelRatio); c.height = Math.ceil(h * pixelRatio);
  const o = c.getContext('2d');
  o.scale(pixelRatio, pixelRatio);
  const prev = ctx; ctx = o;
  try { fn(o); } finally { ctx = prev; }
  return c;
}

const bgImage = null; // neutral procedural city background


// ---- FX sprite sheets & nebula, rendered with OpenMontage / Remotion (projects/studytask-landing: SkyQuestFX) ----
const fxImages = {};
['burst:fx-burst.png', 'boom:fx-boom.png', 'neb0:nebula0.webp', 'neb1:nebula1.webp'].forEach((pair) => {
  const [name, file] = pair.split(':');
  const img = new Image(); img.src = './' + file; fxImages[name] = img;
});
const FX_DEF = { burst: { frames: 12, cell: 128 }, boom: { frames: 14, cell: 160 } };
let fxList = [];
function spawnFx(kind, x, y, size) {
  if (fxList.length < 8) fxList.push({ kind, x, y, size, t: 0 });
}
function drawFx() {
  if (!fxList.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i], d = FX_DEF[f.kind], img = fxImages[f.kind];
    f.t += 0.55;
    const fi = Math.floor(f.t);
    if (fi >= d.frames) { fxList.splice(i, 1); continue; }
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, fi * d.cell, 0, d.cell, d.cell, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
    }
  }
  ctx.restore();
}

// Rocket exhaust: искры + дымок из сопла (учитывает наклон ракеты)
let trail = [];
function drawTrail() {
  if (gameState === 'playing' && !isPaused && player.alive && frame % 2 === 0 && trail.length < 70) {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const reach = 31 + (flightHeld ? 12 : 6);
    const tx = cx - Math.cos(player.angle) * reach, ty = cy - Math.sin(player.angle) * reach;
    trail.push({ kind: 'spark', x: tx, y: ty + (Math.random() - 0.5) * 5, r: 2 + Math.random() * 2.6, life: 18, max: 18, vy: (Math.random() - 0.5) * 0.7 });
    if (frame % 4 === 0) trail.push({ kind: 'smoke', x: tx - 6, y: ty + (Math.random() - 0.5) * 4, r: 3 + Math.random() * 2, life: 34, max: 34, vy: -0.12 - Math.random() * 0.18 });
  }
  if (!trail.length) return;
  ctx.save();
  for (let i = trail.length - 1; i >= 0; i--) {
    const p = trail[i];
    if (!isPaused) { p.x -= PIPE_SPEED * (p.kind === 'smoke' ? 1.05 : 0.9); p.y += p.vy; p.life--; }
    if (p.life <= 0) { trail.splice(i, 1); continue; }
    const k = p.life / p.max;
    if (p.kind === 'smoke') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(190,208,255,${0.20 * k})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2.4 - k * 1.4), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,${Math.round(110 + 110 * k)},${Math.round(40 + 90 * k)},${0.85 * k})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.4 + k * 0.6), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Nebula parallax + shooting stars (space stages)
let nebX = 0, nebX2 = 0, shoot = null, nextShoot = 120;
function drawNebula(stage, moving) {
  const a = fxImages[stage % 2 ? 'neb0' : 'neb1'], b = fxImages[stage % 2 ? 'neb1' : 'neb0'];
  if (moving) { nebX = (nebX - 0.18) % 800; nebX2 = (nebX2 - 0.07) % 800; }
  if (b.complete && b.naturalWidth) {
    ctx.globalAlpha = 0.32;
    ctx.drawImage(b, nebX2 + 800, -70, 800, 650); ctx.drawImage(b, nebX2, -70, 800, 650); ctx.drawImage(b, nebX2 - 800, -70, 800, 650);
  }
  if (a.complete && a.naturalWidth) {
    ctx.globalAlpha = 0.6;
    ctx.drawImage(a, nebX, 30, 800, 650); ctx.drawImage(a, nebX + 800, 30, 800, 650);
  }
  ctx.globalAlpha = 1;
}
function drawShootingStar(moving) {
  if (!shoot) {
    if (moving && --nextShoot <= 0) {
      shoot = { x: W * (0.45 + Math.random() * 0.55), y: Math.random() * H * 0.35, vx: -9, vy: 4.6, life: 28 };
      nextShoot = 220 + Math.random() * 360;
    }
    return;
  }
  shoot.x += shoot.vx; shoot.y += shoot.vy; shoot.life--;
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    ctx.strokeStyle = `rgba(255,255,255,${(1 - k / 6) * Math.min(1, shoot.life / 10)})`;
    ctx.lineWidth = 2.4 - k * 0.3;
    ctx.beginPath();
    ctx.moveTo(shoot.x - shoot.vx * k * 1.2, shoot.y - shoot.vy * k * 1.2);
    ctx.lineTo(shoot.x - shoot.vx * (k + 1) * 1.2, shoot.y - shoot.vy * (k + 1) * 1.2);
    ctx.stroke();
  }
  ctx.restore();
  if (shoot.life <= 0) shoot = null;
}

// ===== ST ROCKET: векторная модель (рисуется кодом, без PNG) =====
// Логотип ST — фирменный st-logo.webp, накладывается на корпус режимом multiply.
const RK_W = 120, RK_H = 64;          // размеры модели в условных единицах
const RK_ASPECT = RK_H / RK_W;
const stLogo = new Image();
let rocketSprite = null;
function buildRocketSprite() {
  const k = Math.min(4, Math.max(2, pixelRatio * 2)) * 1.6; // запас резкости при масштабировании
  const c = document.createElement('canvas');
  c.width = Math.ceil(RK_W * k); c.height = Math.ceil(RK_H * k);
  const o = c.getContext('2d');
  o.scale(k, k);
  o.lineJoin = 'round'; o.lineCap = 'round';
  const NAVY = '#0c2459';
  const hullPath = () => {
    o.beginPath();
    o.moveTo(24, 19);
    o.bezierCurveTo(42, 12.5, 76, 11.5, 93, 16.5);
    o.bezierCurveTo(105, 20.5, 113, 27, 117, 32);
    o.bezierCurveTo(113, 37, 105, 43.5, 93, 47.5);
    o.bezierCurveTo(76, 52.5, 42, 51.5, 24, 45);
    o.closePath();
  };
  const fin = (flip) => {
    o.save();
    if (flip) { o.translate(0, RK_H); o.scale(1, -1); }
    o.beginPath();
    o.moveTo(58, 16); o.quadraticCurveTo(46, 4, 31, 1); o.lineTo(19, 1.5);
    o.quadraticCurveTo(27, 9, 28, 21); o.closePath();
    const g = o.createLinearGradient(20, 1, 58, 18);
    g.addColorStop(0, '#1e5be0'); g.addColorStop(1, '#5aa6ff');
    o.fillStyle = g; o.fill();
    o.lineWidth = 2.2; o.strokeStyle = NAVY; o.stroke();
    o.beginPath(); o.moveTo(30, 5); o.quadraticCurveTo(40, 8, 50, 14);
    o.strokeStyle = 'rgba(255,255,255,.55)'; o.lineWidth = 1.6; o.stroke();
    o.restore();
  };
  // плавники (сзади корпуса)
  fin(false); fin(true);
  // сопло
  o.beginPath(); o.moveTo(24, 23); o.lineTo(9, 19.5); o.quadraticCurveTo(6.5, 32, 9, 44.5); o.lineTo(24, 41); o.closePath();
  let g = o.createLinearGradient(0, 19, 0, 45);
  g.addColorStop(0, '#6b7a99'); g.addColorStop(.5, '#2c3a5c'); g.addColorStop(1, '#151f3a');
  o.fillStyle = g; o.fill(); o.lineWidth = 2.2; o.strokeStyle = NAVY; o.stroke();
  o.beginPath(); o.moveTo(14, 21.5); o.quadraticCurveTo(11.5, 32, 14, 42.5);
  o.strokeStyle = 'rgba(255,255,255,.28)'; o.lineWidth = 1.4; o.stroke();
  // корпус
  hullPath();
  g = o.createLinearGradient(0, 12, 0, 52);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.38, '#f1f6ff'); g.addColorStop(.74, '#c9d9f6'); g.addColorStop(1, '#93aadd');
  o.fillStyle = g; o.fill();
  o.save(); hullPath(); o.clip();
  // носовой конус
  o.beginPath(); o.moveTo(85, 8); o.quadraticCurveTo(92, 32, 85, 56); o.lineTo(124, 56); o.lineTo(124, 8); o.closePath();
  g = o.createLinearGradient(85, 0, 120, 0);
  g.addColorStop(0, '#4a9bff'); g.addColorStop(.55, '#2169ea'); g.addColorStop(1, '#1346b8');
  o.fillStyle = g; o.fill();
  o.lineWidth = 1.6; o.strokeStyle = 'rgba(12,36,89,.55)'; o.stroke();
  // хвостовое кольцо
  o.fillStyle = '#2169ea'; o.fillRect(24, 10, 11, 44);
  o.fillStyle = 'rgba(255,255,255,.35)'; o.fillRect(33.2, 10, 1.4, 44);
  // объём: нижняя тень и блик
  g = o.createLinearGradient(0, 30, 0, 53);
  g.addColorStop(0, 'rgba(10,30,90,0)'); g.addColorStop(1, 'rgba(10,30,90,.30)');
  o.fillStyle = g; o.fillRect(20, 30, 100, 24);
  o.beginPath(); o.moveTo(42, 17.5); o.quadraticCurveTo(64, 14.6, 84, 17);
  o.strokeStyle = 'rgba(255,255,255,.85)'; o.lineWidth = 2.6; o.stroke();
  o.beginPath(); o.moveTo(98, 21); o.quadraticCurveTo(106, 24, 110, 28);
  o.strokeStyle = 'rgba(255,255,255,.55)'; o.lineWidth = 2; o.stroke();
  o.restore();
  hullPath(); o.lineWidth = 2.4; o.strokeStyle = NAVY; o.stroke();
  // иллюминатор-медальон под логотип
  const cx = 60, cy = 32, R = 20.5;
  o.beginPath(); o.arc(cx, cy, R + 2.2, 0, Math.PI * 2);
  g = o.createLinearGradient(0, cy - R, 0, cy + R);
  g.addColorStop(0, '#6db0ff'); g.addColorStop(1, '#1346b8');
  o.fillStyle = g; o.fill(); o.lineWidth = 1.8; o.strokeStyle = NAVY; o.stroke();
  o.beginPath(); o.arc(cx, cy, R, 0, Math.PI * 2);
  g = o.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, R);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e3ecfb');
  o.fillStyle = g; o.fill(); o.lineWidth = 1.2; o.strokeStyle = 'rgba(12,36,89,.6)'; o.stroke();
  // заклёпки
  o.fillStyle = '#7e93c4';
  for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4 + Math.PI / 8; o.beginPath(); o.arc(cx + Math.cos(t) * (R + 2.2 - 0.2), cy + Math.sin(t) * (R + 2.2 - 0.2), 0.9, 0, Math.PI * 2); o.fill(); }
  // логотип ST (фирменный)
  o.save();
  o.beginPath(); o.arc(cx, cy, R - 0.6, 0, Math.PI * 2); o.clip();
  if (stLogo.complete && stLogo.naturalWidth > 0) {
    o.globalCompositeOperation = 'multiply';
    const ls = 36; o.drawImage(stLogo, cx - ls / 2, cy - ls / 2 + 0.5, ls, ls);
  } else {
    o.fillStyle = '#4a90e2'; o.font = '900 20px Nunito, Arial Black, sans-serif'; o.textAlign = 'center'; o.textBaseline = 'middle';
    o.fillText('ST', cx, cy + 1);
  }
  o.restore();
  // блик на стекле медальона
  o.beginPath(); o.ellipse(cx - 6, cy - 10, 8, 3, -0.5, 0, Math.PI * 2);
  o.fillStyle = 'rgba(255,255,255,.55)'; o.fill();
  rocketSprite = c;
  const prev = document.querySelector('.character-preview');
  if (prev) { prev.innerHTML = ''; const im = new Image(); im.alt = 'Ракета ST'; im.src = c.toDataURL('image/png'); prev.appendChild(im); }
}
stLogo.onload = buildRocketSprite;
stLogo.src = './st-logo.webp';
buildRocketSprite();

// Пламя двигателя: анимируется каждый кадр, при удержании тяги — длиннее и ярче.
let flameBoost = 0;
function drawRocketFlame(scale) {
  const target = (typeof flightHeld !== 'undefined' && flightHeld && gameState === 'playing') ? 1 : 0;
  flameBoost += (target - flameBoost) * 0.18;
  const t = (typeof frame === 'number' ? frame : 0);
  const flick = 1 + 0.12 * Math.sin(t * 0.95) + 0.08 * Math.sin(t * 1.9 + 1.3);
  const L = (30 + 20 * flameBoost) * flick;            // длина факела
  const half = 9.5 + 1.8 * flameBoost;                   // ширина у сопла
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-RK_W / 2, -RK_H / 2);                   // начало координат модели — левый верх
  const glow = ctx.createRadialGradient(9, 32, 1, 9, 32, 24 + 8 * flameBoost);
  glow.addColorStop(0, `rgba(255,150,40,${0.34 + 0.14 * flameBoost})`); glow.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = glow; ctx.fillRect(-30, 0, 70, RK_H);
  const layer = (len, w, color, wob) => {
    ctx.beginPath();
    ctx.moveTo(10, 32 - w);
    ctx.bezierCurveTo(10 - len * 0.35, 32 - w * 1.05, 10 - len * 0.8, 32 - w * 0.35 + wob, 10 - len, 32 + wob * 0.5);
    ctx.bezierCurveTo(10 - len * 0.8, 32 + w * 0.35 + wob, 10 - len * 0.35, 32 + w * 1.05, 10, 32 + w);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };
  const wob = Math.sin(t * 0.7) * 1.6;
  layer(L, half, '#ff5a1a', wob);
  layer(L * 0.74, half * 0.72, '#ffa826', -wob * 0.8);
  layer(L * 0.46, half * 0.42, '#fff3c4', wob * 0.5);
  ctx.restore();
}

const GRAVITY = 0.45;
const LIFT = 0.9;
const MAX_ASCENT_SPEED = -7.5;
const PIPE_SPEED = 3;
const PIPE_GAP = 155;
const PIPE_INTERVAL = 1800;

function getPipeSpeed() {
  const speedScore = loginDemo ? Math.min(score, 25) : score;
  return (PIPE_SPEED + speedScore * 0.04) * (loginDemo ? 1.5 : 1);
}

// --- State ---
let gameState = 'start';
let score = 0, bestScore = 0, frame = 0;
let lastPipe = 0, animFrame;
let flightHeld = false;
let isPaused = false;

// Shield
let shield = null;
let playerHasShield = false;
let shieldGlow = 0;
let pipesSpawned = 0;
let nextShieldPipe = 10 + Math.floor(Math.random() * 3);

// Death
let deathFlash = 0;
let deathTimer = 0;
let isDying = false;

// Coins
let totalCoins = parseInt(localStorage.getItem('studyTaskFlappyCoins') || '0');
let demoStars = 0;
let demoStarOnScreen = null;
let demoLastPipeBand = 'center';
let skyQuestAccountSync = false;
let skyQuestSyncQueue = Promise.resolve();
function updateSkyQuestBalance(delta) {
  localStorage.setItem('studyTaskFlappyCoins', totalCoins);
  const startCount = document.getElementById('startCoinCount');
  const coinCount = document.getElementById('coinCount');
  const totalCount = document.getElementById('goTotalCoins');
  if (startCount) startCount.textContent = totalCoins;
  if (coinCount) coinCount.textContent = totalCoins;
  if (totalCount) totalCount.textContent = `Всего звёзд: ${totalCoins}`;
  if (!skyQuestAccountSync || !delta) return;
  skyQuestSyncQueue = skyQuestSyncQueue.then(() => fetch('/api/student/skyquest/stars', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) }))
    .then(response => response.ok ? response.json() : null)
    .then(result => {
      if (!result || !Number.isFinite(Number(result.stars))) return;
      totalCoins = Number(result.stars);
      updateSkyQuestBalance(0);
      window.parent.postMessage({ type: 'SKYQUEST_BALANCE_CHANGED' }, window.location.origin);
    }).catch(() => {});
}
let sessionCoins = 0;
let coinOnScreen = null;
let nextCoinPipe = 4 + Math.floor(Math.random() * 3);
let invincible = 0;
let lifeUsedThisRound = false;

// Confetti
let confetti = [];
let newRecordConfetti = false;

// Start screen preview
let previewPlayer = { x: -50, y: H / 2 - 60, vx: 1.2 };
let previewPipes = [];
let previewLastPipe = 0;

// --- Messages ---
const deathMessages = [
  "Не успел добраться до следующего урока!",
  "Домашка снова впереди — попробуй ещё раз",
  "Учитель говорит: тренировка делает мастера",
  "Чуть не долетел до звезды — в следующий раз!",
  "Контрольная подождёт, перезапускай!",
  "Нужно ещё немного практики",
  "Каждая ошибка — шаг к новому рекорду",
  "Перерыв окончен — возвращайся в игру!",
  "Пропустил звонок на перемену",
  "Звёзды ждут — собери больше в следующий заход",
  "Тетрадка улетела — но ты справишься",
  "Почти как отличник — ещё один прыжок!",
  "Репетитор верит: у тебя получится!",
  "Следующая попытка будет лучше",
];

// --- Player ---
const player = {
  x: 80, y: H/2, vy: 0, w: 32, h: 32,
  angle: 0, alive: true, wingFrame: 0,
};

let pipes = [], particles = [], floatingTexts = [];
let bgStars = [];
let bgClouds = [];
let visualSpaceStage = -1;
let landmarkX = W;
let stageTransitionFrame = 60;
const STAGE_TRANSITION_DURATION = 72;

for (let i = 0; i < 60; i++) {
  bgStars.push({
    x: Math.random() * W,
    y: Math.random() * (H - 80),
    r: Math.random() * 1.5 + 0.3,
    speed: Math.random() * 0.75 + 0.25,
    alpha: Math.random() * 0.6 + 0.2
  });
}

for (let i = 0; i < 9; i++) {
  bgClouds.push({
    x: Math.random() * W,
    y: 70 + Math.random() * (H - 210),
    scale: 0.55 + Math.random() * 0.9,
    speed: 0.25 + Math.random() * 0.35
  });
}

const SVG_PAUSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
const SVG_PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

// ===== PAUSE =====
function togglePause() {
  if (gameState !== 'playing') return;
  isPaused = !isPaused;
  if (isPaused) flightHeld = false;
  document.getElementById('pauseScreen').style.display = isPaused ? 'flex' : 'none';
  document.getElementById('pauseBtn').innerHTML = isPaused ? SVG_PLAY : SVG_PAUSE;
  audio.setPaused(isPaused);
}


// ===== AUDIO: процедурные звуки и фоновая музыка (WebAudio, без файлов) =====
// Звук включается только после первого касания/клика (требование браузеров).
const audio = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* настройка не сохранится */ } };
  let ac = null, master, musicBus, sfxBus, echo, noiseBuf;
  let musicOn = load('studyTaskSkyQuestMusic', true);
  let sfxOn = load('studyTaskSkyQuestSfx', true);
  let timer = null, nextTime = 0, step = 0, running = false, level = 0.55;
  const BPM = 84, EIGHTH = 60 / BPM / 2;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // Am9 → Fmaj7 → Cmaj7 → G6: мягкая «космическая» последовательность
  const CHORDS = [
    { root: 45, tones: [57, 60, 64, 67, 71] },
    { root: 41, tones: [53, 57, 60, 64] },
    { root: 48, tones: [55, 59, 64, 67] },
    { root: 43, tones: [55, 59, 62, 64] },
  ];
  const ARP = [0, 2, 1, 3, 2, 4, 3, 1];

  function build() {
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    // эхо для арпеджио
    echo = ac.createGain(); echo.gain.value = 0.28;
    const dl = ac.createDelay(1); dl.delayTime.value = EIGHTH * 1.5;
    const fb = ac.createGain(); fb.gain.value = 0.36;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    echo.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(musicBus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // Один тон с плавной огибающей (без щелчков)
  function tone(freq, t, dur, o = {}) {
    const osc = ac.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ac.createGain(), a = o.attack ?? 0.008, peak = o.gain ?? 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(o.dest || sfxBus);
    if (o.send) { const s2 = ac.createGain(); s2.gain.value = o.send; g.connect(s2); s2.connect(echo); }
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(t, dur, o = {}) {
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    f.Q.value = o.q ?? 0.8;
    const g = ac.createGain(), a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain ?? 0.1, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  // ---- музыка ----
  function scheduleStep(n, t) {
    const bar = Math.floor(n / 8) % CHORDS.length, inBar = n % 8, ch = CHORDS[bar];
    if (inBar === 0) {
      const len = EIGHTH * 8;
      ch.tones.slice(0, 4).forEach((m, i) => {
        [-7, 7].forEach((dt) => tone(mtof(m), t, len + 0.5, { type: 'triangle', gain: 0.026, attack: 0.9, detune: dt + i, lp: 1300, dest: musicBus }));
      });
      tone(mtof(ch.root), t, len * 0.9, { type: 'sine', gain: 0.13, attack: 0.03, dest: musicBus });
    } else if (inBar === 4) {
      tone(mtof(ch.root), t, EIGHTH * 3, { type: 'sine', gain: 0.07, attack: 0.03, dest: musicBus });
    }
    const skip = (inBar === 1 || inBar === 5) && Math.random() < 0.4;
    if (!skip) {
      const m = ch.tones[ARP[inBar] % ch.tones.length] + 12;
      tone(mtof(m), t, 0.42, { type: 'triangle', gain: 0.042, attack: 0.006, dest: musicBus, send: 0.55 });
    }
    if (inBar % 2 === 1) noise(t, 0.03, { type: 'highpass', f0: 7000, q: 0.5, gain: 0.011, dest: musicBus });
  }
  function pump() {
    if (!ac) return;
    while (nextTime < ac.currentTime + 0.5) { scheduleStep(step, nextTime); nextTime += EIGHTH; step++; }
  }
  function startMusic() {
    if (!ac || running || !musicOn) return;
    running = true; nextTime = ac.currentTime + 0.12; step = 0;
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, ac.currentTime);
    musicBus.gain.linearRampToValueAtTime(level, ac.currentTime + 1.4);
    timer = setInterval(pump, 120);
  }
  function stopMusic() {
    if (!running) return;
    running = false; clearInterval(timer); timer = null;
    if (ac) { musicBus.gain.cancelScheduledValues(ac.currentTime); musicBus.gain.setTargetAtTime(0, ac.currentTime, 0.15); }
  }

  // ---- эффекты ----
  const ready = () => ac && sfxOn && ac.state === 'running';
  const fx = {
    star() { if (!ready()) return; const t = ac.currentTime;
      tone(1318.5, t, 0.28, { type: 'sine', gain: 0.13 }); tone(1975.5, t + 0.07, 0.4, { type: 'sine', gain: 0.12 });
      tone(2637, t + 0.07, 0.3, { type: 'triangle', gain: 0.035 });
      noise(t, 0.12, { type: 'highpass', f0: 6500, gain: 0.025 }); },
    shieldUp() { if (!ready()) return; const t = ac.currentTime;
      tone(320, t, 0.45, { type: 'triangle', gain: 0.1, slideTo: 960, lp: 3000 });
      tone(640, t + 0.04, 0.45, { type: 'sine', gain: 0.06, slideTo: 1920 });
      tone(1760, t + 0.30, 0.35, { type: 'sine', gain: 0.07 });
      noise(t, 0.4, { f0: 1200, f1: 4200, q: 1.4, gain: 0.03 }); },
    shieldBreak() { if (!ready()) return; const t = ac.currentTime;
      noise(t, 0.09, { type: 'bandpass', f0: 3200, f1: 1200, q: 0.9, gain: 0.2 });
      tone(620, t, 0.3, { type: 'sawtooth', gain: 0.07, slideTo: 110, lp: 1500 });
      [2400, 3100, 3900].forEach((f, i) => tone(f, t + i * 0.018, 0.34, { type: 'sine', gain: 0.045 }));
      tone(90, t, 0.25, { type: 'sine', gain: 0.18, slideTo: 45 }); },
    boom() { if (!ready()) return; const t = ac.currentTime;
      noise(t, 0.85, { type: 'lowpass', f0: 2200, f1: 90, q: 0.7, gain: 0.34, attack: 0.006 });
      noise(t, 0.12, { type: 'bandpass', f0: 1800, q: 0.6, gain: 0.14 });
      tone(110, t, 0.7, { type: 'sine', gain: 0.32, slideTo: 36 });
      tone(220, t, 0.35, { type: 'triangle', gain: 0.08, slideTo: 60 }); },
    whoosh() { if (!ready()) return; const t = ac.currentTime;
      noise(t, 0.26, { type: 'bandpass', f0: 500, f1: 2400, q: 1.1, gain: 0.07, attack: 0.07 }); },
    tick() { if (!ready()) return; const t = ac.currentTime;
      tone(880, t, 0.07, { type: 'sine', gain: 0.045 }); },
    record() { if (!ready()) return; const t = ac.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.09, 0.45, { type: 'triangle', gain: 0.09, send: 0.3 })); },
  };

  return {
    ...fx,
    unlock() {
      if (loginDemo || !AC) return;
      if (!ac) build();
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      startMusic();
    },
    setPaused(p) {
      if (!ac) return;
      if (p) ac.suspend().catch(() => {}); else ac.resume().catch(() => {});
    },
    mood(kind) {
      level = kind === 'dead' ? 0.2 : kind === 'menu' ? 0.45 : 0.55;
      if (ac && running) musicBus.gain.setTargetAtTime(level, ac.currentTime, 0.4);
    },
    toggleMusic() { musicOn = !musicOn; save('studyTaskSkyQuestMusic', musicOn); if (musicOn) { this.unlock(); startMusic(); } else stopMusic(); return musicOn; },
    toggleSfx() { sfxOn = !sfxOn; save('studyTaskSkyQuestSfx', sfxOn); if (sfxOn) this.unlock(); return sfxOn; },
    get musicOn() { return musicOn; },
    get sfxOn() { return sfxOn; },
  };
})();
function syncAudioButtons() {
  const m = document.getElementById('musicBtn'), f = document.getElementById('sfxBtn');
  if (m) { m.classList.toggle('off', !audio.musicOn); m.setAttribute('aria-pressed', String(audio.musicOn)); m.title = audio.musicOn ? 'Выключить музыку' : 'Включить музыку'; }
  if (f) { f.classList.toggle('off', !audio.sfxOn); f.setAttribute('aria-pressed', String(audio.sfxOn)); f.title = audio.sfxOn ? 'Выключить звуки' : 'Включить звуки'; }
}
['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => audio.unlock(), { passive: true }));
document.addEventListener('visibilitychange', () => audio.setPaused(document.hidden || isPaused));
syncAudioButtons();

// ===== BACKGROUND =====
const bgLayers = {};
function bgLayer(kind) {
  if (bgLayers[kind]) return bgLayers[kind];
  return (bgLayers[kind] = makeSprite(W, H, () => {
    ctx.translate(0, 0);
    if (kind === 'vignette') {
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
      v.addColorStop(0, 'rgba(0,0,24,0)'); v.addColorStop(1, 'rgba(0,0,24,0.38)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (kind === 'sky') { g.addColorStop(0, '#51b8f5'); g.addColorStop(0.65, '#9addff'); g.addColorStop(1, '#d7f3ff'); }
    else { g.addColorStop(0, '#050817'); g.addColorStop(0.55, '#111936'); g.addColorStop(1, '#080d20'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }));
}
function drawBackground() {
  const moving = (gameState === 'playing' || gameState === 'dead') && !isPaused;
  const spaceStage = getSpaceStage(score);
  if (spaceStage !== visualSpaceStage) {
    visualSpaceStage = spaceStage;
    landmarkX = W + getLandmarkRadius(spaceStage);
    stageTransitionFrame = spaceStage === 0 && frame < 2 ? STAGE_TRANSITION_DURATION : 0;
  }
  if (moving && stageTransitionFrame < STAGE_TRANSITION_DURATION) stageTransitionFrame++;

  if (spaceStage === 0) {
    ctx.drawImage(bgLayer('sky'), 0, 0, W, H);
    drawCloudscape(moving);
    drawStageTransition();
    return;
  }

  ctx.drawImage(bgLayer('space'), 0, 0, W, H);

  drawNebula(spaceStage, moving);
  drawStarfield(moving);
  drawShootingStar(moving);
  if (spaceStage < 7) drawSpaceLandmark(spaceStage, moving);
  drawStageTransition();
}

function drawStageTransition() {
  if (stageTransitionFrame >= STAGE_TRANSITION_DURATION) return;
  const progress = stageTransitionFrame / STAGE_TRANSITION_DURATION;
  const darkness = Math.sin(progress * Math.PI) * 0.76;
  ctx.fillStyle = `rgba(1,3,12,${darkness})`;
  ctx.fillRect(0, 0, W, H);
}

function getSpaceStage(currentScore) {
  if (currentScore < 20) return 0;
  if (currentScore < 40) return 1; // Moon
  if (currentScore < 60) return 2; // Venus
  if (currentScore < 80) return 3; // Mars
  if (currentScore < 100) return 4; // Jupiter
  if (currentScore < 120) return 5; // Sun
  if (currentScore < 140) return 6; // Black hole
  return 7; // Deep space
}

function drawCloudscape(moving) {
  bgClouds.forEach((cloud) => {
    if (moving) cloud.x -= cloud.speed;
    if (cloud.x < -100 * cloud.scale) cloud.x = W + 100 * cloud.scale;

    const x = cloud.x;
    const y = cloud.y;
    const s = cloud.scale;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.beginPath();
    ctx.ellipse(x, y, 35 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 19 * s, y + 1 * s, 20 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 15 * s, y - 6 * s, 23 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 37 * s, y + 2 * s, 18 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawStarfield(moving) {
  bgStars.forEach((star) => {
    if (moving) star.x -= star.speed;
    if (star.x < -star.r) star.x = W + star.r;
    const twinkle = 0.75 + Math.sin(frame * 0.04 + star.x) * 0.25;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${star.alpha * twinkle})`;
    ctx.fill();
  });
}

function drawSpaceLandmark(stage, moving) {
  const radius = getLandmarkRadius(stage);
  if (moving && landmarkX > -radius) landmarkX -= 0.7;
  const y = H * 0.38;
  const cx = landmarkX;
  const pad = radius * 2.5;
  let sprite = landmarkSprites[stage];
  if (!sprite) {
    sprite = landmarkSprites[stage] = makeSprite(pad * 2, pad * 2, () => {
      if (stage === 1) drawMoon(pad, pad, radius);
      else if (stage === 2) drawPlanet(pad, pad, radius, '#d89b58', '#fff0bd', 'rgba(248,220,151,0.38)');
      else if (stage === 3) drawPlanet(pad, pad, radius, '#b74732', '#f28c63', 'rgba(255,196,145,0.42)');
      else if (stage === 4) drawJupiter(pad, pad, radius);
      else if (stage === 5) drawSun(pad, pad, radius);
      else drawBlackHole(pad, pad, radius);
    });
  }
  ctx.drawImage(sprite, cx - pad, y - pad, pad * 2, pad * 2);
}
const landmarkSprites = {};

function getLandmarkRadius(stage) {
  if (stage === 5) return 112;
  if (stage === 6) return 94;
  if (stage === 4) return 78;
  return 62;
}

function drawPlanet(x, y, radius, darkColor, lightColor, detailColor) {
  const glow = ctx.createRadialGradient(x, y, radius * 0.65, x, y, radius * 1.8);
  glow.addColorStop(0, detailColor);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2); ctx.fill();

  const planet = ctx.createRadialGradient(x - radius * 0.38, y - radius * 0.42, radius * 0.08, x, y, radius);
  planet.addColorStop(0, lightColor);
  planet.addColorStop(1, darkColor);
  ctx.fillStyle = planet;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, radius - 1, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = detailColor;
  for (let band = -2; band <= 2; band++) {
    ctx.beginPath();
    ctx.ellipse(x + band * radius * 0.18, y + band * radius * 0.27, radius * 0.9, radius * 0.1, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMoon(x, y, radius) {
  drawPlanet(x, y, radius, '#737d91', '#e2e8f0', 'rgba(100,116,139,0.32)');
  const craters = [[-0.35, -0.2, 0.12], [0.3, -0.35, 0.16], [0.18, 0.2, 0.1], [-0.25, 0.42, 0.18], [0.48, 0.34, 0.08]];
  craters.forEach(([dx, dy, size]) => {
    ctx.beginPath();
    ctx.arc(x + dx * radius, y + dy * radius, size * radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(51,65,85,0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawJupiter(x, y, radius) {
  drawPlanet(x, y, radius, '#a95832', '#f4cf9a', 'rgba(214,160,108,0.5)');
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, radius - 1, 0, Math.PI * 2); ctx.clip();
  ctx.beginPath();
  ctx.ellipse(x + radius * 0.34, y + radius * 0.22, radius * 0.2, radius * 0.12, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(160,65,42,0.78)';
  ctx.fill();
  ctx.restore();
}

function drawSun(x, y, radius) {
  const glow = ctx.createRadialGradient(x, y, radius * 0.6, x, y, radius * 2.4);
  glow.addColorStop(0, 'rgba(255,185,46,0.48)');
  glow.addColorStop(1, 'rgba(255,116,24,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2); ctx.fill();
  const sun = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
  sun.addColorStop(0, '#fff7ae'); sun.addColorStop(0.6, '#ffbd38'); sun.addColorStop(1, '#f4511e');
  ctx.fillStyle = sun;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, radius - 1, 0, Math.PI * 2); ctx.clip();
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 2.4) * radius * 0.5, y + Math.cos(i * 1.8) * radius * 0.48, radius * (0.08 + (i % 3) * 0.025), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(226,72,25,0.35)'; ctx.fill();
  }
  ctx.restore();
}

function drawBlackHole(x, y, radius) {
  const glow = ctx.createRadialGradient(x, y, radius * 0.6, x, y, radius * 2.1);
  glow.addColorStop(0, 'rgba(125,80,255,0.3)');
  glow.addColorStop(0.55, 'rgba(245,95,184,0.16)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, radius * 2.1, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.55, radius * 0.46, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,120,210,0.82)'; ctx.lineWidth = radius * 0.2; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.42, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,205,112,0.9)'; ctx.lineWidth = radius * 0.07; ctx.stroke();
  const core = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * 0.82);
  core.addColorStop(0, '#000'); core.addColorStop(0.75, '#05030b'); core.addColorStop(1, '#40205f');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ===== PIPES =====
const pipeGlow = {};
function drawPipe(pipe) {
  drawBookStack(pipe.x, 0, pipe.w, pipe.topH, true, pipe.moving);
  const botY = pipe.topH + PIPE_GAP;
  drawBookStack(pipe.x, botY, pipe.w, H - botY, false, pipe.moving);

  const gapMid = pipe.topH + PIPE_GAP/2;
  const glowKey = pipe.moving ? 'm' : 'n';
  let glow = pipeGlow[glowKey];
  if (!glow) {
    glow = pipeGlow[glowKey] = makeSprite(160, 160, () => {
      const grd = ctx.createRadialGradient(80, 80, 0, 80, 80, 80);
      grd.addColorStop(0, pipe.moving ? 'rgba(255,180,0,0.07)' : 'rgba(0,200,100,0.08)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, 160, 160);
    });
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(pipe.x - 20, pipe.topH, pipe.w + 40, PIPE_GAP); ctx.clip();
  ctx.drawImage(glow, pipe.x + pipe.w / 2 - 80, gapMid - 80, 160, 160);
  ctx.restore();


}

const stackCache = new Map();
const STACK_OX = 12;
function drawBookStack(x, y, w, h, isTop, moving) {
  if (h <= 0) return;
  const wr = Math.round(w), hr = Math.max(1, Math.round(h));
  const key = (isTop ? 't' : 'b') + (moving ? 'm' : 'n') + wr + 'x' + hr;
  let sprite = stackCache.get(key);
  if (!sprite) {
    if (stackCache.size > 160) stackCache.clear();
    sprite = makeSprite(wr + STACK_OX * 2, hr + 4, () => drawBookStackRaw(STACK_OX, 0, wr, hr, isTop, moving));
    stackCache.set(key, sprite);
  }
  ctx.drawImage(sprite, x - STACK_OX, y, wr + STACK_OX * 2, hr + 4);
}
function rrPath(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
// [светлый, тёмный] — современная, чуть приглушённая палитра обложек
const BOOK_PALETTE = [
  ['#7c83ff', '#3b3fb8'], ['#38bdf8', '#0b6aa8'], ['#fb7185', '#a3173f'],
  ['#fbbf24', '#b45309'], ['#34d399', '#067a55'], ['#c084fc', '#6d28b0'],
];
function drawBook(bx, by, bw, bh, i) {
  const c = ctx, pal = BOOK_PALETTE[i % BOOK_PALETTE.length];
  // тень под книгой
  rrPath(c, bx + 1.5, by + 2.5, bw, bh, 4); c.fillStyle = 'rgba(4,10,40,.30)'; c.fill();
  // обложка
  rrPath(c, bx, by, bw, bh, 4);
  let g = c.createLinearGradient(0, by, 0, by + bh);
  g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
  c.fillStyle = g; c.fill();
  c.save(); rrPath(c, bx, by, bw, bh, 4); c.clip();
  // корешок слева
  g = c.createLinearGradient(bx, 0, bx + 13, 0);
  g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(bx, by, 13, bh);
  c.fillStyle = 'rgba(255,224,130,.95)';
  c.fillRect(bx + 5, by, 1.6, bh); c.fillRect(bx + 9, by, 1, bh);
  // блок страниц справа
  const pw = 9;
  g = c.createLinearGradient(0, by, 0, by + bh);
  g.addColorStop(0, '#fffdf4'); g.addColorStop(1, '#d9d2bd');
  c.fillStyle = g; c.fillRect(bx + bw - pw, by + 2.5, pw, bh - 5);
  c.fillStyle = 'rgba(80,70,40,.22)';
  for (let ly = by + 4.5; ly < by + bh - 3; ly += 2.6) c.fillRect(bx + bw - pw, ly, pw, 0.7);
  // название
  c.fillStyle = 'rgba(255,255,255,.82)';
  rrPath(c, bx + 16, by + bh * 0.34, Math.max(10, bw * 0.34), 2.4, 1.2); c.fill();
  if (bh > 22) { rrPath(c, bx + 16, by + bh * 0.58, Math.max(8, bw * 0.22), 2, 1); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill(); }
  // верхний блик и нижняя кромка
  c.fillStyle = 'rgba(255,255,255,.38)'; c.fillRect(bx, by, bw, 1.8);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(bx, by + bh - 1.6, bw, 1.6);
  c.restore();
  rrPath(c, bx + .5, by + .5, bw - 1, bh - 1, 4);
  c.strokeStyle = 'rgba(10,16,48,.62)'; c.lineWidth = 1; c.stroke();
}
function drawBookStackRaw(x, y, w, h, isTop, moving) {
  const c = ctx;
  c.save();
  c.beginPath(); c.rect(x - STACK_OX, y, w + STACK_OX * 2, h + 4); c.clip();
  // Книги кладутся от края проёма наружу — раскладка не «прыгает», когда колонна движется.
  let off = 0, i = 0;
  while (off < h + 1) {
    const bh = 24 + (i * 7) % 5;
    const width = w + 6 + ((i * 5) % 4) * 3;
    const shift = (((i * 3) % 5) - 2) * 1.6;
    const bx = x + (w - width) / 2 + shift;
    const by = isTop ? y + h - off - bh : y + off;
    drawBook(bx, by, width, bh - 1, i);
    off += bh; i++;
  }
  // светящийся край проёма
  const edgeY = isTop ? y + h : y;
  const col = moving ? '255,176,40' : '70,225,255';
  const g = c.createLinearGradient(0, isTop ? edgeY - 14 : edgeY + 14, 0, edgeY);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},.42)`);
  c.fillStyle = g; c.fillRect(x - 6, isTop ? edgeY - 14 : edgeY, w + 12, 14);
  c.fillStyle = `rgba(${col},.95)`;
  c.fillRect(x - 6, isTop ? edgeY - 2.4 : edgeY, w + 12, 2.4);
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.fillRect(x - 6, isTop ? edgeY - 1.2 : edgeY + 0.6, w + 12, 0.9);
  c.restore();
}

// ===== SHIELD =====
let shieldSpriteCache = null;
function shieldShapePath(c, cx, cy, k) {
  c.beginPath();
  c.moveTo(cx, cy - 25 * k);
  c.bezierCurveTo(cx + 8 * k, cy - 19 * k, cx + 17 * k, cy - 17 * k, cx + 22 * k, cy - 17 * k);
  c.bezierCurveTo(cx + 23 * k, cy + 2 * k, cx + 17 * k, cy + 16 * k, cx, cy + 26 * k);
  c.bezierCurveTo(cx - 17 * k, cy + 16 * k, cx - 23 * k, cy + 2 * k, cx - 22 * k, cy - 17 * k);
  c.bezierCurveTo(cx - 17 * k, cy - 17 * k, cx - 8 * k, cy - 19 * k, cx, cy - 25 * k);
  c.closePath();
}
function getShieldSprite() {
  if (shieldSpriteCache) return shieldSpriteCache;
  return (shieldSpriteCache = makeSprite(56, 64, () => {
    const c = ctx, cx = 28, cy = 32;
    c.lineJoin = 'round'; c.lineCap = 'round';
    shieldShapePath(c, cx, cy + 1.5, 1); c.fillStyle = 'rgba(4,16,60,.35)'; c.fill();
    // внешний обод
    shieldShapePath(c, cx, cy, 1);
    let g = c.createLinearGradient(cx - 22, cy - 25, cx + 22, cy + 26);
    g.addColorStop(0, '#e6faff'); g.addColorStop(.45, '#7dd3fc'); g.addColorStop(1, '#2563eb');
    c.fillStyle = g; c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#0c2459'; c.stroke();
    // внутренняя панель
    shieldShapePath(c, cx, cy + 0.5, 0.8);
    g = c.createLinearGradient(0, cy - 22, 0, cy + 24);
    g.addColorStop(0, '#38bdf8'); g.addColorStop(.55, '#1d6fe8'); g.addColorStop(1, '#1e3fae');
    c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(12,36,89,.7)'; c.stroke();
    // стеклянный блик
    c.save(); shieldShapePath(c, cx, cy + 0.5, 0.8); c.clip();
    c.beginPath(); c.moveTo(cx - 20, cy - 22); c.lineTo(cx + 2, cy - 22); c.quadraticCurveTo(cx - 8, cy - 2, cx - 20, cy + 8); c.closePath();
    c.fillStyle = 'rgba(255,255,255,.30)'; c.fill();
    c.restore();
    // эмблема: галочка
    c.beginPath(); c.moveTo(cx - 8.5, cy + 1.5); c.lineTo(cx - 2.5, cy + 8); c.lineTo(cx + 9, cy - 6.5);
    c.strokeStyle = 'rgba(8,30,90,.45)'; c.lineWidth = 6.2; c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 4.4; c.stroke();
  }));
}
// маленькие четырёхлучевые искорки вокруг объекта
function drawTwinkles(x, y, r, phase, rgb) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const a = phase * 0.9 + k * (Math.PI * 2 / 3);
    const tw = 0.5 + 0.5 * Math.sin(phase * 3 + k * 2);
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.85, sz = 2.2 + tw * 3;
    ctx.fillStyle = `rgba(${rgb},${0.35 + tw * 0.55})`;
    ctx.beginPath();
    ctx.moveTo(px, py - sz); ctx.quadraticCurveTo(px, py, px + sz, py); ctx.quadraticCurveTo(px, py, px, py + sz);
    ctx.quadraticCurveTo(px, py, px - sz, py); ctx.quadraticCurveTo(px, py, px, py - sz); ctx.fill();
  }
  ctx.restore();
}
function drawShield() {
  if (!shield) return;

  if (gameState === 'playing' && !isPaused) {
    shield.x -= PIPE_SPEED + score * 0.04;
    shield.phase += 0.08;
  }

  if (shield.x < -30) { shield = null; return; }

  const pulse = 0.25 + Math.sin(shield.phase) * 0.12;
  const glow = ctx.createRadialGradient(shield.x, shield.y, 0, shield.x, shield.y, 34);
  glow.addColorStop(0, `rgba(0,160,255,${pulse})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(shield.x, shield.y, 34, 0, Math.PI*2);
  ctx.fill();

  const bob = Math.sin(shield.phase * 1.3) * 2.2;
  const sc = 1 + Math.sin(shield.phase * 2) * 0.04;
  ctx.save();
  ctx.translate(shield.x, shield.y + bob); ctx.scale(sc, sc);
  ctx.drawImage(getShieldSprite(), -28, -32, 56, 64);
  ctx.restore();
  drawTwinkles(shield.x, shield.y + bob, 25, shield.phase, '170,235,255');

  if (gameState === 'playing' && !isPaused) {
    const dx = shield.x - (player.x + player.w/2);
    const dy = shield.y - (player.y + player.h/2);
    if (Math.sqrt(dx*dx + dy*dy) < 22) {
      playerHasShield = true;
      audio.shieldUp();
      spawnFx('burst', player.x + player.w / 2, player.y + player.h / 2, 120);
      shield = null;
      floatingTexts.push({
        x: player.x + 20, y: player.y - 15,
        text: '🛡️ ЩИТ!', color: '#00ccff', size: 14,
        life: 55, maxLife: 55
      });
    }
  }
}

// ===== COIN =====
function drawCoin() {
  if (!coinOnScreen) return;

  if (gameState === 'playing' && !isPaused) {
    coinOnScreen.x -= PIPE_SPEED + score * 0.04;
    coinOnScreen.phase += 0.06;
  }

  if (coinOnScreen.x < -20) { coinOnScreen = null; return; }

  const x = coinOnScreen.x;
  const y = coinOnScreen.baseY + Math.sin(coinOnScreen.phase) * 6;
  const r = 15;
  // Outer glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  glow.addColorStop(0, 'rgba(255,220,70,0.42)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI*2); ctx.fill();

  drawStar(x, y, r);
  drawTwinkles(x, y, r * 1.55, coinOnScreen.phase, '255,240,170');

  // Collision
  if (gameState === 'playing' && !isPaused) {
    const dx = x - (player.x + player.w/2);
    const dy = y - (player.y + player.h/2);
    if (Math.sqrt(dx*dx + dy*dy) < r + player.w/2) {
      coinOnScreen = null;
      spawnFx('burst', player.x + player.w / 2, player.y + player.h / 2, 110);
      audio.star();
      totalCoins++;
      sessionCoins++;
      updateSkyQuestBalance(1);
      floatingTexts.push({
        x: player.x + 20, y: player.y - 15,
        text: '+1 ⭐', color: '#ffcc00', size: 15,
        life: 45, maxLife: 45
      });
    }
  }
}

const starSprites = new Map();
function drawStar(x, y, radius) {
  const r = Math.max(6, Math.round(radius));
  let sprite = starSprites.get(r);
  if (!sprite) {
    const S = r * 2 + 12;
    sprite = makeSprite(S, S, () => {
      const c = ctx, cx = S / 2, cy = S / 2 + r * 0.04, R = r * 1.1, inner = R * 0.5;
      const v = [];
      for (let k = 0; k < 10; k++) {
        const ang = -Math.PI / 2 + k * Math.PI / 5, d = k % 2 === 0 ? R : inner;
        v.push([cx + Math.cos(ang) * d, cy + Math.sin(ang) * d]);
      }
      const roundedStar = () => {
        c.beginPath();
        const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const m0 = mid(v[9], v[0]); c.moveTo(m0[0], m0[1]);
        for (let k = 0; k < 10; k++) { const m = mid(v[k], v[(k + 1) % 10]); c.quadraticCurveTo(v[k][0], v[k][1], m[0], m[1]); }
        c.closePath();
      };
      roundedStar();
      const g = c.createLinearGradient(cx, cy - R, cx, cy + R);
      g.addColorStop(0, '#fff9c2'); g.addColorStop(.42, '#fcd34d'); g.addColorStop(1, '#f59e0b');
      c.fillStyle = g; c.fill();
      c.save(); roundedStar(); c.clip();
      // грани: светлая и тёмная половины каждого луча
      for (let k = 0; k < 5; k++) {
        const o = v[k * 2], l = v[(k * 2 + 9) % 10], rr2 = v[(k * 2 + 1) % 10];
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(o[0], o[1]); c.lineTo(l[0], l[1]); c.closePath(); c.fillStyle = 'rgba(255,255,255,.26)'; c.fill();
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(o[0], o[1]); c.lineTo(rr2[0], rr2[1]); c.closePath(); c.fillStyle = 'rgba(217,119,6,.28)'; c.fill();
      }
      const core = c.createRadialGradient(cx - R * 0.15, cy - R * 0.2, 0, cx, cy, R * 0.6);
      core.addColorStop(0, 'rgba(255,255,255,.75)'); core.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = core; c.fillRect(0, 0, S, S);
      c.restore();
      roundedStar(); c.lineJoin = 'round'; c.lineWidth = Math.max(1.2, r * 0.09); c.strokeStyle = 'rgba(146,64,14,.72)'; c.stroke();
    });
    if (starSprites.size > 40) starSprites.clear();
    starSprites.set(r, sprite);
  }
  const S = r * 2 + 12, scale = radius / r;
  ctx.drawImage(sprite, x - S * scale / 2, y - S * scale / 2, S * scale, S * scale);
}

// ===== PLAYER =====
function drawNeutralPlayer(size) {
  const width = size * 1.7;
  const height = width * RK_ASPECT;
  drawRocketFlame(width / RK_W);
  if (rocketSprite) ctx.drawImage(rocketSprite, -width / 2, -height / 2, width, height);
}

function drawPlayer() {
  ctx.save();
  const cx = player.x + player.w/2;
  const cy = player.y + player.h/2;
  ctx.translate(cx, cy);

  const targetAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, player.vy * 0.082));
  player.angle += (targetAngle - player.angle) * (player.vy < 0 ? 0.08 : 0.1);
  ctx.rotate(player.angle);

  // Щит / эффект поломки щита: энергетический пузырь
  if (playerHasShield || shieldGlow > 0) {
    if (shieldGlow > 0) shieldGlow--;
    const t = playerHasShield ? (0.5 + Math.sin(frame * 0.15) * 0.2) : (shieldGlow / 40) * 0.7;
    const col = shieldGlow > 0 ? '255,140,30' : '56,189,248';
    ctx.save();
    ctx.scale(1.3, 1);
    const bub = ctx.createRadialGradient(0, 0, 12, 0, 0, 39);
    bub.addColorStop(0, `rgba(${col},0)`); bub.addColorStop(.72, `rgba(${col},${(0.07 * t).toFixed(3)})`); bub.addColorStop(1, `rgba(${col},${(0.5 * t).toFixed(3)})`);
    ctx.fillStyle = bub; ctx.beginPath(); ctx.arc(0, 0, 39, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = `rgba(${col},${(0.9 * t + 0.1).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(frame * 0.035); ctx.lineCap = 'round'; ctx.lineWidth = 2.6;
    ctx.strokeStyle = `rgba(255,255,255,${(0.85 * t + 0.15).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(0, 0, 38, 0.15, 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 38, Math.PI + 0.15, Math.PI + 0.6); ctx.stroke();
    ctx.restore();
  }

  drawNeutralPlayer(42);

  ctx.restore();
}

// ===== PARTICLES =====
function drawParticles() {
  const ground = H - 2;
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    if (!p.landed) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32;
      p.rotation += p.rotSpeed;
      if (p.y + p.h * 0.5 >= ground) {
        p.y = ground - p.h * 0.5;
        p.vy = 0;
        p.vx *= 0.25;
        p.rotSpeed = 0;
        p.landed = true;
      }
    } else {
      p.vx *= 0.8;
      p.x += p.vx;
    }
    p.life--;

    ctx.save();
    ctx.globalAlpha = p.life < 25 ? p.life / 25 : 1;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.isRocketDebris) {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w * 0.45, p.h * 0.35);
    } else {
      ctx.fillStyle = '#f2ede3';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

      ctx.fillStyle = 'rgba(0, 60, 160, 0.4)';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w * 0.32, p.h * 0.24);

      ctx.strokeStyle = 'rgba(0, 0, 80, 0.3)';
      ctx.lineWidth = 0.7;
      [0.44, 0.66, 0.86].forEach(t => {
        const ly = -p.h / 2 + p.h * t;
        ctx.beginPath();
        ctx.moveTo(-p.w / 2 + 2, ly);
        ctx.lineTo(p.w / 2 - 2, ly);
        ctx.stroke();
      });
    }

    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

// Функция `drawFloatingTexts` реализует локальную часть бизнес-логики модуля.
function drawFloatingTexts() {
  floatingTexts = floatingTexts.filter(t => t.life > 0);
  floatingTexts.forEach(t => {
    t.y -= 0.5; t.life--;
    ctx.globalAlpha = t.life / t.maxLife;
    ctx.fillStyle = t.color || '#ffdd00';
    ctx.font = `bold ${t.size || 14}px Nunito`;
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  });
}

// Функция `addParticles` реализует локальную часть бизнес-логики модуля.
function addParticles(x, y) {
  const rocketColors = ['#ffffff', '#f8fbff', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8', '#1e40af'];
  for (let i = 0; i < 38; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 7;
    particles.push({
      x: x + (Math.random() - 0.5) * 14,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 3 + Math.random() * 5,
      h: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      color: rocketColors[Math.floor(Math.random() * rocketColors.length)],
      isRocketDebris: true,
      life: 70 + Math.floor(Math.random() * 25), maxLife: 95,
      landed: false,
    });
  }
}

// The login showcase displays the game's star as a collectible without changing account balances.
function drawLoginDemoStar() {
  if (!loginDemo || !demoStarOnScreen) return;
  if (demoStarOnScreen.collected) {
    if (gameState === 'playing' && !isPaused) {
      demoStarOnScreen.baseY -= 1.5;
      demoStarOnScreen.life--;
    }
    if (demoStarOnScreen.life <= 0) {
      demoStarOnScreen = null;
      return;
    }
  } else if (gameState === 'playing' && !isPaused) {
    if (demoStarOnScreen.pipe && pipes.includes(demoStarOnScreen.pipe)) {
      demoStarOnScreen.x = demoStarOnScreen.pipe.x + demoStarOnScreen.pipe.w / 2;
      demoStarOnScreen.baseY = demoStarOnScreen.pipe.topH + PIPE_GAP / 2;
    } else {
      demoStarOnScreen.pipe = null;
      demoStarOnScreen.x -= getPipeSpeed();
    }
    demoStarOnScreen.phase += 0.06;
  }
  if (!demoStarOnScreen.collected && demoStarOnScreen.x < -32) {
    demoStarOnScreen = null;
    return;
  }

  const { x, baseY, phase } = demoStarOnScreen;
  const y = baseY + Math.sin(phase) * 7;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 38);
  glow.addColorStop(0, 'rgba(255,220,70,0.58)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  if (demoStarOnScreen.collected) ctx.globalAlpha = Math.min(1, demoStarOnScreen.life / 16);
  ctx.translate(x, y);
  ctx.rotate(Math.sin(phase * 0.65) * 0.12);
  drawStar(0, 0, 19 + Math.sin(phase * 1.4) * 1.5);
  ctx.restore();

  if (!demoStarOnScreen.collected && gameState === 'playing' && !isPaused) {
    const dx = x - (player.x + player.w / 2);
    const dy = y - (player.y + player.h / 2);
    const overlapsStarLane = Math.abs(dx) <= player.w / 2 + 20
      && Math.abs(dy) <= PIPE_GAP / 2 - player.h / 2 + 10;
    if (overlapsStarLane) {
      demoStarOnScreen.collected = true;
      demoStarOnScreen.life = 28;
      demoStarOnScreen.pipe = null;
      floatingTexts.push({
        x: player.x + 35, y: player.y - 14,
        text: '⭐ +1 звезда', color: '#ffdd00', size: 15,
        life: 48, maxLife: 48
      });
    }
  }
}

// ===== CONFETTI =====
const CONFETTI_COLORS = ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD'];

// Функция `spawnConfetti` реализует локальную часть бизнес-логики модуля.
function spawnConfetti() {
  const count = 80 + Math.floor(Math.random() * 21);
  for (let i = 0; i < count; i++) {
    const maxLife = 120 + Math.floor(Math.random() * 31);
    confetti.push({
      x: Math.random() * W,
      y: -10,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      life: maxLife, maxLife
    });
  }
}

// Функция `drawConfetti` реализует локальную часть бизнес-логики модуля.
function drawConfetti() {
  confetti = confetti.filter(c => c.life > 0 && c.y < H + 20);
  confetti.forEach(c => {
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.1;
    c.rotation += c.rotationSpeed;
    c.life--;
    ctx.save();
    ctx.globalAlpha = c.life <= 30 ? c.life / 30 : 1;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    ctx.fillStyle = c.color;
    ctx.fillRect(-3, -5, 6, 10);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

// ===== HUD =====
function addScorePopup(x, y) {
  const msgs = ['+1 урок!','Молодец!','Вперёд!','Отлично!','Дальше!'];
  floatingTexts.push({
    x, y,
    text: msgs[Math.floor(Math.random()*msgs.length)],
    color: score % 5 === 0 ? '#ffdd00' : '#aaffaa',
    size: score % 5 === 0 ? 16 : 13,
    life: 50, maxLife: 50
  });
}

// Touch the DOM only when something actually changed.
const hudEls = {};
function hudSet(id, text, textOnly) {
  const el = hudEls[id] || (hudEls[id] = document.getElementById(id));
  if (!textOnly && el.style.display !== 'block') el.style.display = 'block';
  if (text !== undefined) { const t = String(text); if (el.textContent !== t) el.textContent = t; }
}

// Функция `drawHUD` реализует локальную часть бизнес-логики модуля.
function drawHUD() {
  if (gameState !== 'playing') return;

  hudSet('score', score);
  hudSet('queueStatus', `Пройдено: ${score}`);
  hudSet('coinDisplay');
  hudSet('coinCount', totalCoins, true);

  if (playerHasShield) {
    ctx.fillStyle = 'rgba(0,200,255,0.7)';
    ctx.font = 'bold 10px Nunito';
    ctx.textAlign = 'left';
    ctx.fillText('🛡️ Щит активен', 12, H-75);
  }
}

// Функция `drawReadyHint` реализует локальную часть бизнес-логики модуля.
function drawReadyHint() {
  const alpha = 0.4 + Math.sin(frame * 0.08) * 0.4;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ЗАЖМИ, ЧТОБЫ ЛЕТЕТЬ', W/2, H/2 + 80);
  ctx.globalAlpha = 1;
}

// ===== GAME LOGIC =====
function spawnPipe() {
  const minTop = 80, maxTop = H - PIPE_GAP - 120;
  let topH;
  if (loginDemo) {
    const bands = [
      { name: 'top', min: minTop, max: 112 },
      { name: 'center', min: 210, max: 245 },
      { name: 'bottom', min: 345, max: maxTop }
    ].filter(band => band.name !== demoLastPipeBand);
    const band = bands[Math.floor(Math.random() * bands.length)];
    topH = Math.floor(Math.random() * (band.max - band.min + 1) + band.min);
    demoLastPipeBand = band.name;
  } else {
    topH = Math.floor(Math.random() * (maxTop - minTop) + minTop);
  }
  const isMoving = (pipesSpawned % 9 === 8);
  pipes.push({
    x: W + 10, topH, baseTopH: topH, w: 62, passed: false,
    moving: isMoving, movePhase: Math.random() * Math.PI * 2
  });

  pipesSpawned++;

  if (loginDemo) return;

  if (pipesSpawned >= nextCoinPipe && !coinOnScreen) {
    coinOnScreen = {
      x: W + 36,
      baseY: topH + PIPE_GAP/2 + (Math.random() - 0.5) * 60,
      phase: Math.random() * Math.PI * 2
    };
    nextCoinPipe = pipesSpawned + 4 + Math.floor(Math.random() * 3);
  }

  if (pipesSpawned >= nextShieldPipe && !shield && !playerHasShield) {
    shield = {
      x: W + 36,
      y: topH + PIPE_GAP/2 + (Math.random() - 0.5) * (PIPE_GAP * 0.4),
      phase: 0
    };
    nextShieldPipe = pipesSpawned + 10 + Math.floor(Math.random() * 3);
  }
}

// Функция `updatePipes` реализует локальную часть бизнес-логики модуля.
function updatePipes() {
  const now = simNow();
  if (now - lastPipe > PIPE_INTERVAL) {
    spawnPipe();
    lastPipe = now;
  }

  const speed = getPipeSpeed();
  pipes.forEach(p => {
    p.x -= speed;
    if (p.moving) {
      p.movePhase += 0.02;
      p.topH = p.baseTopH + Math.sin(p.movePhase) * 35;
    }
  });
  pipes = pipes.filter(p => p.x > -p.w - 10);

  pipes.forEach(p => {
    if (!p.passed && p.x + p.w < player.x) {
      p.passed = true;
      score++;
      if (!loginDemo) audio.tick();
      if (!loginDemo && player.alive && p.minClear !== undefined && p.minClear < 7) {
        spawnFx('burst', player.x + player.w / 2 + 8, player.y + player.h / 2, 84);
        audio.whoosh();
        floatingTexts.push({ x: player.x + 40, y: player.y - 26, text: 'Впритык!', color: '#7dd3fc', size: 13, life: 42, maxLife: 42 });
      }
      if (loginDemo && score % 5 === 0) {
        demoStars++;
        document.getElementById('coinCount').textContent = String(demoStars);
        const nextPipe = pipes.filter(pipe => pipe.x + pipe.w >= player.x + 4).sort((a, b) => a.x - b.x)[0];
        demoStarOnScreen = {
          x: nextPipe ? nextPipe.x + nextPipe.w / 2 : W * 0.72,
          baseY: nextPipe ? nextPipe.topH + PIPE_GAP / 2 : player.y + player.h / 2,
          pipe: nextPipe || null, phase: 0, collected: false, life: 0
        };
        floatingTexts.push({
          x: player.x + 45, y: player.y - 14,
          text: '⭐ +1 звезда', color: '#ffdd00', size: 15,
          life: 48, maxLife: 48
        });
      }
      if (!loginDemo && score > bestScore) {
        bestScore = score;
        if (!newRecordConfetti) {
          newRecordConfetti = true;
          audio.record();
          spawnConfetti();
          floatingTexts.push({
            x: W/2, y: H/2 - 60,
            text: '🏆 НОВЫЙ РЕКОРД!', color: '#FFD700', size: 20,
            life: 120, maxLife: 120
          });
        }
      }
      if (!loginDemo) addScorePopup(player.x + 30, player.y);

      if (!loginDemo && score % 10 === 0) {
        floatingTexts.push({
          x: W/2, y: H/2 - 40,
          text: score === 10 ? '🎉 10 уроков — отлично!' :
                score === 20 ? '🔥 Ты в ударе!' :
                score === 30 ? '⭐ Супер ученик!' : `🏆 ${score} очков!`,
          color: '#ffdd00', size: 16, life: 80, maxLife: 80
        });
      }
    }

    const px = player.x + 4, py = player.y + 4;
    const pw = player.w - 8, ph = player.h - 8;
    if (!loginDemo && player.alive && px < p.x + p.w && px + pw > p.x) {
      const clear = Math.min(py - p.topH, p.topH + PIPE_GAP - (py + ph));
      if (clear >= 0 && (p.minClear === undefined || clear < p.minClear)) p.minClear = clear;
    }
    if (!loginDemo && px < p.x + p.w && px + pw > p.x) {
      if (py < p.topH || py + ph > p.topH + PIPE_GAP) {
        if (playerHasShield) {
          playerHasShield = false;
          audio.shieldBreak();
          shieldGlow = 40;
          spawnFx('boom', player.x + player.w / 2, player.y + player.h / 2, 130);
          p.x = -999; // удаляем столб с которым столкнулись
          particles.push({
            x: player.x + player.w/2, y: player.y + player.h/2,
            vx: 0, vy: 0, text: '💥', size: 36, color: '#fff',
            life: 20, maxLife: 20
          });
          floatingTexts.push({
            x: player.x + 20, y: player.y - 15,
            text: '💥 ЩИТ СЛОМАН!', color: '#ffaa00', size: 12,
            life: 55, maxLife: 55
          });
        } else {
          die();
        }
      }
    }
  });

  if (!loginDemo && (player.y + player.h >= H || player.y <= 0)) die();
}

// Функция `die` реализует локальную часть бизнес-логики модуля.
function die() {
  if (loginDemo) {
    startLoginDemo();
    return;
  }
  if (!player.alive) return;
  if (invincible > 0) return;

  flightHeld = false;
  audio.boom(); audio.mood('dead');
  spawnFx('boom', player.x + player.w / 2, player.y + player.h / 2, 190);
  addParticles(player.x + player.w/2, player.y + player.h/2);
  player.alive = false;
  gameState = 'dead';
  if (navigator.vibrate) navigator.vibrate(200);
  deathTimer = 0;
  isDying = true;
}

// Функция `showGameOver` реализует локальную часть бизнес-логики модуля.
function showGameOver() {
  document.getElementById('score').style.display = 'none';
  document.getElementById('queueStatus').style.display = 'none';
  document.getElementById('topControls').style.display = 'none';
  document.getElementById('coinDisplay').style.display = 'none';

  const msg = deathMessages[Math.floor(Math.random() * deathMessages.length)];
  const medal = score >= 30 ? '🏆' : score >= 20 ? '🥇' : score >= 10 ? '🥈' : score >= 5 ? '🥉' : '😔';

  document.getElementById('medal').textContent = medal;
  document.getElementById('goMessage').textContent = msg;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('bestScoreDisplay').textContent = bestScore;

  const title = score >= 30 ? 'ОТЛИЧНИК! 🏆' :
                score >= 20 ? 'МОЛОДЕЦ! 👍' :
                score >= 10 ? 'ХОРОШО! 😊' : 'ЕЩЁ УРОК!';
  document.getElementById('goTitle').textContent = title;
  document.getElementById('goTitle').style.color =
    score >= 30 ? '#ffdd00' : score >= 20 ? '#00ff88' : '#ff4444';

  document.getElementById('goCoins').textContent = `+${sessionCoins} звёзд за раунд`;
  document.getElementById('goTotalCoins').textContent = `Всего звёзд: ${totalCoins}`;

  const btn = document.getElementById('continueBtn');
  if (lifeUsedThisRound) {
    btn.style.display = 'none';
  } else {
    btn.style.display = '';
    if (totalCoins >= 5) {
      btn.disabled = false;
      btn.textContent = '⭐ Продолжить за 5 звёзд';
      btn.classList.remove('btn-coin--disabled');
    } else {
      btn.disabled = true;
      btn.textContent = `Недостаточно звёзд (нужно 5)`;
      btn.classList.add('btn-coin--disabled');
    }
  }

  document.getElementById('gameOverScreen').style.display = 'flex';

  notifyParentGameOver();
}

// Подтверждение захода: сервер выдаёт подписанный токен со временем старта — без него рекорд не засчитывается.
let runToken = null;
function requestRunToken() {
  runToken = null;
  if (loginDemo) return;
  fetch('/api/student/skyquest/run/start', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    .then(r => r.ok ? r.json() : null)
    .then(j => { if (j && typeof j.runToken === 'string') runToken = j.runToken; })
    .catch(() => {});
}

function notifyParentGameOver() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'FLAPPY_GAME_OVER',
        score,
        sessionCoins,
        bestScore,
        runToken
      }, '*');
    }
  } catch (e) {}
}

// Функция `startGame` реализует локальную часть бизнес-логики модуля.
function startGame() {
  audio.unlock(); audio.mood('play');
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('score').style.display = 'none';
  document.getElementById('queueStatus').style.display = 'none';
  document.getElementById('pauseScreen').style.display = 'none';
  document.getElementById('topControls').style.display = 'none';

  pipes = []; particles = []; floatingTexts = []; fxList = []; trail = [];
  shield = null; playerHasShield = false; shieldGlow = 0; deathFlash = 0; deathTimer = 0; isDying = false;
  coinOnScreen = null; sessionCoins = 0; invincible = 0;
  score = 0; frame = 0;
  flightHeld = false; isPaused = false;
  pipesSpawned = 0;
  nextShieldPipe = 10 + Math.floor(Math.random() * 3);
  nextCoinPipe = 4 + Math.floor(Math.random() * 3);
  lifeUsedThisRound = false;
  newRecordConfetti = false;
  confetti = [];
  document.getElementById('coinDisplay').style.display = 'none';

  player.y = H/2 - 20;
  player.vy = 0; player.angle = 0; player.alive = true;

  gameState = 'ready';
}

// Функция `goToMainMenu` реализует локальную часть бизнес-логики модуля.
function goToMainMenu() {
  audio.mood('menu');
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('pauseScreen').style.display = 'none';
  document.getElementById('startScreen').style.display = 'flex';
  document.getElementById('score').style.display = 'none';
  document.getElementById('queueStatus').style.display = 'none';
  document.getElementById('topControls').style.display = 'none';

  pipes = []; particles = []; floatingTexts = [];
  shield = null; playerHasShield = false; shieldGlow = 0; deathFlash = 0; deathTimer = 0; isDying = false;
  coinOnScreen = null; sessionCoins = 0; invincible = 0;
  score = 0; frame = 0; isPaused = false;
  player.y = H/2; player.vy = 0; player.angle = 0; player.alive = true;
  document.getElementById('coinDisplay').style.display = 'none';
  document.getElementById('startCoinCount').textContent = totalCoins;
  previewPipes = [];
  previewLastPipe = 0;
  previewPlayer = { x: -50, y: H / 2 - 60, vx: 1.2 };
  gameState = 'start';
}

// Функция `continueByCoin` реализует локальную часть бизнес-логики модуля.
function continueByCoin() {
  if (totalCoins < 5) return;
  audio.mood('play');
  totalCoins -= 5;
  lifeUsedThisRound = true;
  updateSkyQuestBalance(-5);

  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('score').style.display = 'block';
  document.getElementById('queueStatus').style.display = 'block';
  document.getElementById('topControls').style.display = 'flex';
  document.getElementById('coinDisplay').style.display = 'block';

  pipes = [];
  coinOnScreen = null;
  lastPipe = simNow() + 2500;
  deathFlash = 0; deathTimer = 0; isDying = false;

  player.y = H/2;
  player.vy = 0;
  player.angle = 0;
  player.alive = true;
  flightHeld = false;
  invincible = 120;

  gameState = 'playing';

  floatingTexts.push({
    x: W/2, y: H/2 - 60,
    text: 'Продолжаем! 💪', color: '#00ff88', size: 16,
    life: 90, maxLife: 90
  });
}

// ===== HOLD TO FLY =====
function startFlight() {
  if (gameState === 'dead' || gameState === 'start' || isPaused || !player.alive) return;

  if (gameState === 'ready') {
    gameState = 'playing';
    requestRunToken();
    lastPipe = simNow() + 1000;
    document.getElementById('topControls').style.display = 'flex';
  }

  flightHeld = true;
}

function stopFlight() {
  flightHeld = false;
}

// ===== START SCREEN PREVIEW =====
function updateDrawStartScreen() {
  const PREVIEW_SPEED = PIPE_SPEED / 3;

  const now = simNow();
  if (now - previewLastPipe > 2200) {
    const minTop = 80, maxTop = H - PIPE_GAP - 120;
    previewPipes.push({
      x: W + 10,
      topH: Math.floor(Math.random() * (maxTop - minTop) + minTop),
      w: 52, moving: false
    });
    previewLastPipe = now;
  }
  previewPipes.forEach(p => { p.x -= PREVIEW_SPEED; });
  previewPipes = previewPipes.filter(p => p.x > -70);
  previewPipes.forEach(p => drawPipe(p));

  previewPlayer.x += previewPlayer.vx;
  previewPlayer.y = H / 2 - 60 + Math.sin(frame * 0.04) * 22;
  if (previewPlayer.x > W + 60) previewPlayer.vx = -1.2;
  if (previewPlayer.x < -60) previewPlayer.vx = 1.2;

  ctx.save();
  ctx.translate(previewPlayer.x, previewPlayer.y);
  if (previewPlayer.vx < 0) ctx.scale(-1, 1);
  drawNeutralPlayer(42);
  ctx.restore();
}

// ===== GAME LOOP =====
let shaking = false;
function tick() {
  try {
  ctx.clearRect(0, 0, W, H);
  if (!isPaused) frame++;

  drawBackground();

  if (gameState === 'playing' || gameState === 'dead') {
    pipes.forEach(p => drawPipe(p));
    drawShield();
    drawCoin();
    drawLoginDemoStar();

    if (gameState === 'playing' && !isPaused) {
      if (loginDemo) {
        const nextPipe = pipes.filter(pipe => pipe.x + pipe.w >= player.x + 4).sort((a, b) => a.x - b.x)[0];
        const targetY = nextPipe ? nextPipe.topH + PIPE_GAP / 2 - player.h / 2 : H / 2 - player.h / 2;
        const verticalSpeedScale = 0.8;
        const horizontalSpeed = getPipeSpeed();
        const horizontalDistance = nextPipe
          ? Math.max(player.w / 2, nextPipe.x + nextPipe.w / 2 - (player.x + player.w / 2))
          : W / 2;
        const framesToGap = horizontalDistance / horizontalSpeed;
        const verticalDistance = targetY - player.y;
        const followingPipe = nextPipe && pipes
          .filter(pipe => pipe !== nextPipe && pipe.x > nextPipe.x)
          .sort((a, b) => a.x - b.x)[0];
        const followingGapY = followingPipe
          ? followingPipe.topH + PIPE_GAP / 2 - player.h / 2
          : targetY;
        const framesBetweenGaps = followingPipe
          ? Math.max(1, (followingPipe.x - nextPipe.x) / horizontalSpeed)
          : 1;
        const exitVelocity = followingPipe
          ? (followingGapY - targetY) / framesBetweenGaps
          : 0;
        const exitVelocityWeight = followingPipe
          ? Math.max(0, Math.min(1, 1 - framesToGap / framesBetweenGaps))
          : 0;
        // Plan the acceleration early: this is the velocity needed at the end
        // of a constant-acceleration path, with enough momentum to continue
        // toward the following gap instead of stopping at this one.
        const requiredVelocity = (2 * verticalDistance / framesToGap)
          - player.vy + exitVelocity * exitVelocityWeight;
        const desiredVelocity = Math.max(
          MAX_ASCENT_SPEED * verticalSpeedScale,
          Math.min(9 * verticalSpeedScale, requiredVelocity)
        );
        const nextLiftVelocity = Math.max(
          MAX_ASCENT_SPEED * verticalSpeedScale,
          player.vy + (GRAVITY - LIFT) * verticalSpeedScale
        );
        const nextFallVelocity = Math.min(
          9 * verticalSpeedScale,
          player.vy + GRAVITY * verticalSpeedScale
        );
        const velocityDeadband = 0.45;
        flightHeld = flightHeld
          ? nextLiftVelocity > desiredVelocity - velocityDeadband
          : nextFallVelocity > desiredVelocity + velocityDeadband;
      }
      const verticalSpeedScale = loginDemo ? 0.8 : 1;
      player.vy = flightHeld
        ? Math.max(
          MAX_ASCENT_SPEED * verticalSpeedScale,
          player.vy + (GRAVITY - LIFT) * verticalSpeedScale
        )
        : Math.min(
          9 * verticalSpeedScale,
          player.vy + GRAVITY * verticalSpeedScale
        );
      player.y += player.vy;
      updatePipes();
    }

    drawTrail();
    if (player.alive) {
      if (invincible > 0) {
        invincible--;
        if (Math.floor(invincible / 5) % 2 === 0) drawPlayer();
      } else {
        drawPlayer();
      }
    }
    if (isDying && deathTimer <= 12) {
      ctx.fillStyle = `rgba(255,80,80,${((12 - deathTimer) / 12) * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawParticles();
    drawFx();
    drawFloatingTexts();
    drawConfetti();
    ctx.drawImage(bgLayer('vignette'), 0, 0, W, H);
    drawHUD();
  }

  if (gameState === 'ready') {
    player.y = H/2 - 20 + Math.sin(frame * 0.05) * 8;
    player.vy = 0;
    drawPlayer();
    drawReadyHint();
  }

  if (gameState === 'start') {
    updateDrawStartScreen();
  }

  if (ctx === realCtx) {
    if (isDying && deathTimer < 14) {
      const m = (14 - deathTimer) * 0.5;
      canvas.style.transform = `translate(${((Math.random() - 0.5) * m).toFixed(2)}px,${((Math.random() - 0.5) * m).toFixed(2)}px)`;
      shaking = true;
    } else if (shaking) { canvas.style.transform = ''; shaking = false; }
  }

  if (isDying) {
    deathTimer++;
    if (deathTimer >= 55) {
      isDying = false;
      showGameOver();
    }
  }
  } catch(e) {}
}

// Fixed-timestep loop: 60 logic ticks per second regardless of display refresh rate.
// If the device falls behind, extra ticks run with a no-op context (logic only, no drawing).
let lastTs = 0, acc = 0, onScreen = true;
function gameLoop(ts) {
  animFrame = requestAnimationFrame(gameLoop);
  ts = ts || performance.now();
  let dt = lastTs ? ts - lastTs : STEP_MS;
  lastTs = ts;
  if (dt > 250) dt = STEP_MS; // coming back from a background tab
  if (!onScreen && gameState !== 'playing') { acc = 0; return; }
  acc += dt;
  let n = Math.floor((acc + 1.5) / STEP_MS);
  if (n < 1) return;
  acc -= n * STEP_MS;
  if (n > 5) { n = 5; acc = 0; }
  for (let i = 0; i < n; i++) {
    ctx = i === n - 1 ? realCtx : NOOP;
    simTicks++;
    tick();
  }
  ctx = realCtx;
}

// Pause automatically when the player can't see the game.
function autoPause() { if (gameState === 'playing' && !isPaused && !loginDemo) togglePause(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (!onScreen) autoPause(); }, { threshold: 0.05 }).observe(canvas);
}

// ===== EVENTS =====
document.addEventListener('keydown', e => {
  if (loginDemo) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (!e.repeat) startFlight();
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    togglePause();
  }
});

document.addEventListener('keyup', e => {
  if (loginDemo) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') stopFlight();
});

window.addEventListener('blur', stopFlight);

const gameWrapper = document.getElementById('gameWrapper');
['contextmenu', 'dragstart', 'selectstart'].forEach(eventName => {
  gameWrapper.addEventListener(eventName, event => event.preventDefault());
});

canvas.addEventListener('pointerdown', e => {
  if (loginDemo) { e.preventDefault(); return; }
  e.preventDefault();
  if (gameState !== 'playing' && gameState !== 'ready') return;
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  startFlight();
});

const tapZone = document.getElementById('tapZone');
if (tapZone) {
  tapZone.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (loginDemo) return;
    if (gameState !== 'playing' && gameState !== 'ready') return;
    if (tapZone.setPointerCapture) tapZone.setPointerCapture(e.pointerId);
    startFlight();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => tapZone.addEventListener(n, stopFlight));
}
['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.addEventListener(n, e => e.preventDefault()));
document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = now; }, { passive: false });

function closeGame() {
  stopFlight();
  if (gameState === 'playing' && !isPaused) { try { togglePause(); } catch (_) {} }
  if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'SKYQUEST_CLOSE' }, window.location.origin);
  else if (history.length > 1) history.back();
  else goToMainMenu();
}

canvas.addEventListener('pointerup', stopFlight);
canvas.addEventListener('pointercancel', stopFlight);
canvas.addEventListener('lostpointercapture', stopFlight);

document.getElementById('startCoinCount').textContent = totalCoins;
if (!loginDemo) fetch('/api/student/skyquest', { credentials: 'same-origin' })
  .then(response => response.ok ? response.json() : null)
  .then(result => {
    if (!result || !Number.isFinite(Number(result.stars))) return;
    skyQuestAccountSync = true;
    totalCoins = Number(result.stars);
    updateSkyQuestBalance(0);
  }).catch(() => {});

// Start game loop (procedural background, no AlmaU image)
gameLoop();

if (loginDemo) {
  document.body.classList.add('login-demo-mode');
  startLoginDemo();
}

function startLoginDemo() {
  startGame();
  gameState = 'playing';
  lastPipe = simNow();
  document.getElementById('coinDisplay').style.display = 'block';
  document.getElementById('coinCount').textContent = String(demoStars);
}

// Auto-start when embedded with ?autostart=1
(function() {
  const params = new URLSearchParams(window.location.search);
  if (!loginDemo && params.get('autostart') === '1') {
    setTimeout(() => startGame(), 300);
  }
})();
