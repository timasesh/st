const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 400, H = 650;
canvas.width = W; canvas.height = H;

const bgImage = null; // neutral procedural city background

const shieldImage = new Image();
shieldImage.src = './shield.png';

const rocketImage = new Image();
rocketImage.src = './ракета.png';

const GRAVITY = 0.45;
const LIFT = 0.9;
const MAX_ASCENT_SPEED = -7.5;
const PIPE_SPEED = 3;
const PIPE_GAP = 155;
const PIPE_INTERVAL = 1800;

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
}

// ===== BACKGROUND =====
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
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#51b8f5');
    sky.addColorStop(0.65, '#9addff');
    sky.addColorStop(1, '#d7f3ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawCloudscape(moving);
    drawStageTransition();
    return;
  }

  const space = ctx.createLinearGradient(0, 0, 0, H);
  space.addColorStop(0, '#050817');
  space.addColorStop(0.55, '#111936');
  space.addColorStop(1, '#080d20');
  ctx.fillStyle = space;
  ctx.fillRect(0, 0, W, H);

  drawStarfield(moving);
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

  if (stage === 1) drawMoon(cx, y, radius);
  else if (stage === 2) drawPlanet(cx, y, radius, '#d89b58', '#fff0bd', 'rgba(248,220,151,0.38)');
  else if (stage === 3) drawPlanet(cx, y, radius, '#b74732', '#f28c63', 'rgba(255,196,145,0.42)');
  else if (stage === 4) drawJupiter(cx, y, radius);
  else if (stage === 5) drawSun(cx, y, radius);
  else drawBlackHole(cx, y, radius);
}

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
function drawPipe(pipe) {
  drawBookStack(pipe.x, 0, pipe.w, pipe.topH, true);
  const botY = pipe.topH + PIPE_GAP;
  drawBookStack(pipe.x, botY, pipe.w, H - botY - 60, false);

  const gapMid = pipe.topH + PIPE_GAP/2;
  const grd = ctx.createRadialGradient(pipe.x + pipe.w/2, gapMid, 0, pipe.x + pipe.w/2, gapMid, 80);
  grd.addColorStop(0, pipe.moving ? 'rgba(255,180,0,0.07)' : 'rgba(0,200,100,0.08)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(pipe.x - 20, pipe.topH, pipe.w + 40, PIPE_GAP);


}

function drawBookStack(x, y, w, h, isTop) {
  if (h <= 0) return;
  const bookColors = ['#ef4444', '#2563eb', '#f59e0b', '#16a34a', '#9333ea', '#0891b2'];
  const layers = Math.max(1, Math.ceil(h / 23));
  const bookH = h / layers;

  for (let i = 0; i < layers; i++) {
    const row = isTop ? i : layers - i - 1;
    const width = w + 8 + (i % 3) * 3;
    const offset = ((i % 4) - 1.5) * 2;
    const bx = x + (w - width) / 2 + offset;
    const by = y + row * bookH;
    const inset = Math.max(1, bookH * 0.08);
    const visibleH = Math.max(2, bookH - inset * 2);
    const color = bookColors[(i + Math.floor(h / 37)) % bookColors.length];

    // Colored cover, offset spine, and page edge make each obstacle read as a book.
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.fillRect(bx + 2, by + inset + 2, width, visibleH);
    ctx.fillStyle = color;
    ctx.fillRect(bx, by + inset, width, visibleH);
    ctx.fillStyle = 'rgba(255,255,255,0.76)';
    ctx.fillRect(bx + width - 6, by + inset + 2, 4, Math.max(1, visibleH - 4));
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(bx + 5, by + inset + 2, 3, Math.max(1, visibleH - 4));
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(bx + 13, by + inset + visibleH * 0.35, width * 0.42, 1.5);
    if (visibleH > 15) {
      ctx.fillRect(bx + 13, by + inset + visibleH * 0.58, width * 0.3, 1.2);
    }
    ctx.strokeStyle = 'rgba(15,23,42,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + inset + 0.5, width - 1, visibleH - 1);
  }
}

// ===== SHIELD =====
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

  const shieldSize = 38;
  ctx.drawImage(shieldImage, shield.x - shieldSize / 2, shield.y - shieldSize / 2, shieldSize, shieldSize);

  if (gameState === 'playing' && !isPaused) {
    const dx = shield.x - (player.x + player.w/2);
    const dy = shield.y - (player.y + player.h/2);
    if (Math.sqrt(dx*dx + dy*dy) < 22) {
      playerHasShield = true;
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

  // Collision
  if (gameState === 'playing' && !isPaused) {
    const dx = x - (player.x + player.w/2);
    const dy = y - (player.y + player.h/2);
    if (Math.sqrt(dx*dx + dy*dy) < r + player.w/2) {
      coinOnScreen = null;
      totalCoins++;
      sessionCoins++;
      localStorage.setItem('studyTaskFlappyCoins', totalCoins);
      floatingTexts.push({
        x: player.x + 20, y: player.y - 15,
        text: '+1 ⭐', color: '#ffcc00', size: 15,
        life: 45, maxLife: 45
      });
    }
  }
}

function drawStar(x, y, radius) {
  const innerRadius = radius * 0.46;
  const gradient = ctx.createLinearGradient(x, y - radius, x, y + radius);
  gradient.addColorStop(0, '#fff7ad');
  gradient.addColorStop(0.45, '#facc15');
  gradient.addColorStop(1, '#f97316');

  ctx.beginPath();
  for (let point = 0; point < 10; point++) {
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const distance = point % 2 === 0 ? radius : innerRadius;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    if (point === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#fff1a6';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ===== PLAYER =====
function drawNeutralPlayer(size) {
  if (rocketImage.complete && rocketImage.naturalWidth > 0) {
    const width = size * 1.45;
    const height = width * rocketImage.naturalHeight / rocketImage.naturalWidth;
    ctx.drawImage(rocketImage, -width / 2, -height / 2, width, height);
    return;
  }

  const r = size * 0.38;

  const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.35, r * 0.1, 0, 0, r);
  bodyGrad.addColorStop(0, '#93c5fd');
  bodyGrad.addColorStop(1, '#2563eb');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r * 0.28, -r * 0.12, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath();
  ctx.arc(r * 0.34, -r * 0.1, r * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, r * 0.05, r * 0.38, r * 0.22, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-r * 0.2, r * 0.02, r * 0.55, r * 0.58);
  ctx.fillStyle = '#fcd34d';
  ctx.font = `bold ${Math.round(r * 0.32)}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ST', r * 0.07, r * 0.38);
}

function drawPlayer() {
  ctx.save();
  const cx = player.x + player.w/2;
  const cy = player.y + player.h/2;
  ctx.translate(cx, cy);

  const targetAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, player.vy * 0.082));
  player.angle += (targetAngle - player.angle) * (player.vy < 0 ? 0.08 : 0.1);
  ctx.rotate(player.angle);

  // Shield / break aura
  if (playerHasShield || shieldGlow > 0) {
    if (shieldGlow > 0) shieldGlow--;
    const t = playerHasShield ? (0.5 + Math.sin(frame * 0.15) * 0.2) : (shieldGlow / 40) * 0.7;
    const auraColor = shieldGlow > 0 ? `rgba(255,120,0,${t})` : `rgba(0,160,255,${t})`;
    const auraGrd = ctx.createRadialGradient(0, 0, 8, 0, 0, 37);
    auraGrd.addColorStop(0, shieldGlow > 0 ? `rgba(255,120,0,${t*0.5})` : `rgba(0,160,255,${t*0.5})`);
    auraGrd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraGrd;
    ctx.beginPath(); ctx.arc(0, 0, 37, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 33, 0, Math.PI*2);
    ctx.strokeStyle = auraColor; ctx.lineWidth = 2.5; ctx.stroke();
  }

  drawNeutralPlayer(42);

  ctx.restore();
}

// ===== PARTICLES =====
function drawParticles() {
  const ground = H - 62;
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

// Функция `drawHUD` реализует локальную часть бизнес-логики модуля.
function drawHUD() {
  if (gameState !== 'playing') return;

  document.getElementById('score').style.display = 'block';
  document.getElementById('score').textContent = score;
  document.getElementById('queueStatus').style.display = 'block';
  document.getElementById('queueStatus').textContent = `Пройдено: ${score}`;
  document.getElementById('coinDisplay').style.display = 'block';
  document.getElementById('coinCount').textContent = totalCoins;

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
  const topH = Math.floor(Math.random() * (maxTop - minTop) + minTop);
  const isMoving = (pipesSpawned % 9 === 8);
  pipes.push({
    x: W + 10, topH, baseTopH: topH, w: 62, passed: false,
    moving: isMoving, movePhase: Math.random() * Math.PI * 2
  });

  pipesSpawned++;

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
  const now = Date.now();
  if (now - lastPipe > PIPE_INTERVAL) {
    spawnPipe();
    lastPipe = now;
  }

  const speed = PIPE_SPEED + score * 0.04;
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
      if (score > bestScore) {
        bestScore = score;
        if (!newRecordConfetti) {
          newRecordConfetti = true;
          spawnConfetti();
          floatingTexts.push({
            x: W/2, y: H/2 - 60,
            text: '🏆 НОВЫЙ РЕКОРД!', color: '#FFD700', size: 20,
            life: 120, maxLife: 120
          });
        }
      }
      addScorePopup(player.x + 30, player.y);

      if (score % 10 === 0) {
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
    if (px < p.x + p.w && px + pw > p.x) {
      if (py < p.topH || py + ph > p.topH + PIPE_GAP) {
        if (playerHasShield) {
          playerHasShield = false;
          shieldGlow = 40;
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

  if (player.y + player.h >= H - 60 || player.y <= 0) die();
}

// Функция `die` реализует локальную часть бизнес-логики модуля.
function die() {
  if (!player.alive) return;
  if (invincible > 0) return;

  flightHeld = false;
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

function notifyParentGameOver() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'FLAPPY_GAME_OVER',
        score,
        sessionCoins,
        bestScore
      }, '*');
    }
  } catch (e) {}
}

// Функция `startGame` реализует локальную часть бизнес-логики модуля.
function startGame() {
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('score').style.display = 'none';
  document.getElementById('queueStatus').style.display = 'none';
  document.getElementById('pauseScreen').style.display = 'none';
  document.getElementById('topControls').style.display = 'none';

  pipes = []; particles = []; floatingTexts = [];
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
  totalCoins -= 5;
  lifeUsedThisRound = true;
  localStorage.setItem('studyTaskFlappyCoins', totalCoins);

  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('score').style.display = 'block';
  document.getElementById('queueStatus').style.display = 'block';
  document.getElementById('topControls').style.display = 'flex';
  document.getElementById('coinDisplay').style.display = 'block';

  pipes = [];
  coinOnScreen = null;
  lastPipe = Date.now() + 2500;
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
    lastPipe = Date.now() + 1000;
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

  const now = Date.now();
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
function gameLoop() {
  try {
  ctx.clearRect(0, 0, W, H);
  if (!isPaused) frame++;

  drawBackground();

  if (gameState === 'playing' || gameState === 'dead') {
    pipes.forEach(p => drawPipe(p));
    drawShield();
    drawCoin();

    if (gameState === 'playing' && !isPaused) {
      player.vy = flightHeld
        ? Math.max(MAX_ASCENT_SPEED, player.vy + GRAVITY - LIFT)
        : Math.min(9, player.vy + GRAVITY);
      player.y += player.vy;
      updatePipes();
    }

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
    drawFloatingTexts();
    drawConfetti();
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

  if (isDying) {
    deathTimer++;
    if (deathTimer >= 55) {
      isDying = false;
      showGameOver();
    }
  }
  } catch(e) {}
  animFrame = requestAnimationFrame(gameLoop);
}

// ===== EVENTS =====
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (!e.repeat) startFlight();
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    togglePause();
  }
});

document.addEventListener('keyup', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') stopFlight();
});

window.addEventListener('blur', stopFlight);

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (gameState !== 'playing' && gameState !== 'ready') return;
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  startFlight();
});

canvas.addEventListener('pointerup', stopFlight);
canvas.addEventListener('pointercancel', stopFlight);
canvas.addEventListener('lostpointercapture', stopFlight);

document.getElementById('startCoinCount').textContent = totalCoins;

// Start game loop (procedural background, no AlmaU image)
gameLoop();

// Auto-start when embedded with ?autostart=1
(function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') {
    setTimeout(() => startGame(), 300);
  }
})();
