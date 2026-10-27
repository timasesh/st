/* School Sprint — игра на Canvas 2D. Логика в core.js, здесь: ввод, цикл, отрисовка, меню, API. */
(function () {
  'use strict';
  var K = window.SprintCore, C = K.C;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d');
  var API = '/api/games/school-sprint';
  var ac = new AbortController(), sig = { signal: ac.signal };
  var raf = 0, destroyed = false;

  /* ───── настройки (звук / анимации) ───── */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var soundOn = lsGet('ss_sound', '1') === '1';
  var fxOn = lsGet('ss_fx', reduceMotion ? '0' : '1') === '1';
  function syncToggles() {
    ['sndBtn', 'sndBtn2'].forEach(function (id) { $(id).classList.toggle('off', !soundOn); });
    ['fxBtn', 'fxBtn2'].forEach(function (id) { $(id).classList.toggle('off', !fxOn); });
  }

  /* ───── звук (WebAudio, простые синтезированные эффекты) ───── */
  var actx = null;
  function audioUnlock() {
    try { if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } if (actx && actx.state === 'suspended') actx.resume(); } catch (e) { /* ignore */ }
  }
  function beep(freq, dur, type, vol, slide) {
    if (!soundOn || !actx) return;
    try {
      var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime;
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
      g.gain.setValueAtTime(vol || 0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* ignore */ }
  }
  var sfx = {
    star: function () { beep(880, 0.09, 'triangle', 0.07, 1320); },
    gold: function () { beep(660, 0.12, 'triangle', 0.08, 1320); setTimeout(function () { beep(990, 0.15, 'triangle', 0.07, 1480); }, 70); },
    jump: function () { beep(300, 0.14, 'square', 0.04, 600); },
    slide: function () { beep(240, 0.16, 'sawtooth', 0.03, 120); },
    lane: function () { beep(420, 0.05, 'sine', 0.035, 520); },
    hit: function () { beep(180, 0.35, 'sawtooth', 0.09, 50); },
    end: function () { beep(523, 0.14, 'triangle', 0.07); setTimeout(function () { beep(784, 0.2, 'triangle', 0.07); }, 130); },
  };

  /* ───── размеры и проекция ───── */
  var LW = 360, LH = 640, dpr = 1, cx = 180, hor = 180, gy = 512, hcam = 332, sB = 1.2, zMin = -100;
  var E = 210, HC = 420;
  function resize() {
    var r = cv.getBoundingClientRect();
    var w = Math.max(200, r.width), h = Math.max(300, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    LH = Math.max(520, Math.min(780, h / w * LW));
    cx = LW / 2; hor = LH * 0.27; gy = LH * 0.8; hcam = gy - hor;
    sB = (LH - hor) / hcam; zMin = C.FOCAL / sB - C.FOCAL;
    ctx.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
  }
  function S(z) { return C.FOCAL / (C.FOCAL + Math.max(z, -C.FOCAL * 0.6)); }
  function PX(xw, h, z) { var s = S(z); return [cx + xw * s, hor + (hcam - h) * s]; }
  function poly(pts, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ───── состояние ───── */
  var state = 'menu'; // menu | playing | paused | hit | over
  var G = null;       // данные текущего раунда
  var last = 0;
  var session = { id: null, promise: null, ok: false };
  var finishing = false, finished = false, lastResult = null;
  var particles = [], shakeT = 0;
  var uiCache = {};

  function newRound() {
    return {
      t: 0, distU: 0, stars: 0, speed: C.START_SPEED,
      obs: [], stars_: [], nextZ: 450, gen: K.initialStates(),
      p: { lane: 1, x: 1, from: 1, moveT: 1, jumpT: -1, slideT: -1, yOff: 0, h: C.PLAYER_H },
      queue: [], runPhase: 0, hitT: 0, offset: 0, endReason: '',
    };
  }
  function spawn() {
    while (G.nextZ < C.Z_FAR) {
      var sp = K.speedAt(G.t) * (G.mult || 1) * 1.2 + 20;
      var row = K.genRow(G.t, sp, G.gen, Math.random);
      var z = G.nextZ + row.dz;
      var st = K.genStars(G.gen, G.nextZ, z, Math.random);
      for (var i = 0; i < st.length; i++) G.stars_.push({ lane: st[i].lane, z: st[i].z, gold: st[i].gold, got: false });
      for (var l = 0; l < 3; l++) if (row.cells[l]) G.obs.push({ lane: l, type: row.cells[l], z: z });
      G.gen = row.states; G.nextZ = z;
    }
  }

  /* ───── ввод ───── */
  function push(a) {
    if (state !== 'playing') return;
    audioUnlock();
    G.queue.push({ a: a, at: performance.now() });
    if (G.queue.length > 4) G.queue.shift();
  }
  function processQueue() {
    var p = G.p, now = performance.now();
    while (G.queue.length) {
      var q = G.queue[0];
      if (now - q.at > 400) { G.queue.shift(); continue; }
      if (q.a === 'L' || q.a === 'R') {
        if (p.moveT < 1) break; // дорожки переключаются последовательно
        var to = Math.max(0, Math.min(2, p.lane + (q.a === 'L' ? -1 : 1)));
        G.queue.shift();
        if (to !== p.lane) { p.from = p.x; p.lane = to; p.moveT = 0; sfx.lane(); }
      } else if (q.a === 'U') {
        G.queue.shift();
        if (p.slideT >= 0) p.slideT = -1;
        if (p.jumpT < 0) { p.jumpT = 0; sfx.jump(); }
      } else if (q.a === 'D') {
        G.queue.shift();
        if (p.jumpT >= 0) { p.jumpT = -1; p.yOff = 0; }
        if (p.slideT < 0) { p.slideT = 0; sfx.slide(); }
      } else G.queue.shift();
    }
  }
  var ptr = null;
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault(); audioUnlock();
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
    try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
  }, sig);
  cv.addEventListener('pointermove', function (e) {
    if (!ptr || ptr.done || e.pointerId !== ptr.id) return;
    var dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < C.SWIPE_PX) return; // короткие касания игнорируются
    if (Math.abs(dx) > Math.abs(dy)) push(dx < 0 ? 'L' : 'R'); else push(dy < 0 ? 'U' : 'D');
    ptr.done = true; // один жест — одно действие, до отпускания пальца
  }, sig);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { cv.addEventListener(n, function () { ptr = null; }, sig); });
  ['contextmenu', 'dragstart', 'selectstart', 'gesturestart', 'gesturechange'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, sig); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false, signal: ac.signal });
  document.addEventListener('keydown', function (e) {
    var c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') { push('L'); e.preventDefault(); }
    else if (c === 'ArrowRight' || c === 'KeyD') { push('R'); e.preventDefault(); }
    else if (c === 'ArrowUp' || c === 'KeyW' || c === 'Space') { push('U'); e.preventDefault(); }
    else if (c === 'ArrowDown' || c === 'KeyS') { push('D'); e.preventDefault(); }
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
  }, sig);

  /* ───── сеть ───── */
  function api(path, opt) {
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, (opt && opt.timeout) || 7000);
    var init = { credentials: 'same-origin', signal: ctl.signal };
    if (opt && opt.body) { init.method = 'POST'; init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify(opt.body); }
    return fetch(API + path, init).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var er = new Error(j.error || 'Ошибка'); er.status = r.status; throw er; } return j; }); }).finally(function () { clearTimeout(timer); });
  }
  function loadMenuData() {
    api('/profile').then(function (p) {
      $('mDist').textContent = (p.bestDistance || 0) + ' м'; $('mScore').textContent = p.bestScore || 0;
    }).catch(function () { $('mDist').textContent = '—'; $('mScore').textContent = '—'; });
    api('/leaderboard').then(function (r) {
      var ol = $('top'); ol.textContent = '';
      (r.leaderboard || []).slice(0, 5).forEach(function (x, i) {
        var li = document.createElement('li'); if (x.me) li.className = 'me';
        var a = document.createElement('span'); a.textContent = (i + 1) + '. ' + x.name;
        var b = document.createElement('b'); b.textContent = x.bestScore;
        li.appendChild(a); li.appendChild(b); ol.appendChild(li);
      });
    }).catch(function () { $('top').textContent = ''; });
  }

  /* ───── потоки состояний ───── */
  function show(id) { ['menu', 'pause', 'result'].forEach(function (s) { $(s).hidden = s !== id; }); }
  function setNote(t) { var n = $('note'); n.hidden = !t; n.textContent = t || ''; }
  function toMenu() { state = 'menu'; G = null; $('hud').hidden = true; $('hint').hidden = true; setNote(''); show('menu'); loadMenuData(); }
  function begin() {
    audioUnlock(); G = newRound(); finishing = false; finished = false; lastResult = null; particles.length = 0;
    session = { id: null, promise: null, ok: false };
    session.promise = api('/start', { body: {}, timeout: 6000 }).then(function (r) { session.id = r.sessionId; session.ok = true; setNote(''); }).catch(function (e) { session.ok = false; setNote(e.status === 401 ? 'Войдите в кабинет, чтобы результат сохранялся' : 'Нет связи: результат не сохранится'); });
    spawn(); show(null); $('hud').hidden = false;
    var h = $('hint'); h.hidden = false; h.style.animation = 'none'; void h.offsetWidth; h.style.animation = ''; setTimeout(function () { h.hidden = true; }, 3500);
    state = 'playing'; last = performance.now(); updateHud(true);
  }
  function pause() { if (state !== 'playing') return; state = 'paused'; ptr = null; show('pause'); }
  function resume() { if (state !== 'paused') return; show(null); state = 'playing'; last = performance.now(); }
  function endRound(reason) {
    G.endReason = reason; finished = true;
    $('hud').hidden = true; state = 'over'; sfx.end();
    var distM = Math.floor(G.distU / C.UNITS_PER_M), stars = G.stars;
    lastResult = { distance: distM, stars: stars, score: K.scoreOf(distM, stars), playedMs: Math.round(G.t * 1000) };
    $('rTitle').textContent = 'Столкновение!';
    $('rScore').textContent = lastResult.score; $('rDist').textContent = distM + ' м'; $('rStars').textContent = stars; $('rBest').textContent = '…';
    $('retryBtn').hidden = true; show('result'); saveResult();
  }
  function saveResult() {
    if (finishing) return; finishing = true;
    var el = $('rSave'); el.className = 'save'; el.textContent = 'Сохраняем результат…'; $('retryBtn').hidden = true;
    (session.promise || Promise.resolve()).then(function () {
      if (!session.id) throw Object.assign(new Error('no-session'), { status: 0 });
      return api('/finish', { body: { sessionId: session.id, distance: lastResult.distance, collectedStars: lastResult.stars, playedMs: lastResult.playedMs }, timeout: 8000 });
    }).then(function (r) {
      el.className = 'save ok'; el.textContent = r.newRecord ? '🏆 Новый рекорд! Результат сохранён' : 'Результат сохранён';
      $('rScore').textContent = r.result.score; $('rBest').textContent = r.stats.bestScore; finishing = false; session.id = null; session.done = true;
    }).catch(function (e) {
      finishing = false; el.className = 'save bad';
      if (e.message === 'no-session' || e.status === 401) { el.textContent = 'Результат не сохранён: нет игровой сессии'; $('rBest').textContent = '—'; }
      else if (e.status && e.status >= 400 && e.status < 500) { el.textContent = e.message; $('rBest').textContent = '—'; }
      else { el.textContent = 'Не удалось сохранить: проверьте интернет'; $('retryBtn').hidden = false; $('rBest').textContent = '—'; }
    });
  }

  /* ───── обновление ───── */
  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function update(dt) {
    var p = G.p;
    if (state === 'hit') { G.hitT += dt; if (G.hitT >= C.HIT_ANIM_SEC) endRound('hit'); updateParticles(dt); return; }
    G.t += dt;
    var tgt = K.speedMult(K.scoreOf(G.distU / C.UNITS_PER_M, G.stars)); G.mult = (G.mult || 1) + (tgt - (G.mult || 1)) * Math.min(1, dt * 3);
    G.speed = K.speedAt(G.t) * G.mult;
    var d = G.speed * dt; G.distU += d; G.offset = (G.offset + d) % 480;
    processQueue();
    if (p.moveT < 1) { p.moveT = Math.min(1, p.moveT + dt / C.LANE_MOVE_SEC); p.x = p.from + (p.lane - p.from) * ease(p.moveT); } else p.x = p.lane;
    if (p.jumpT >= 0) { p.jumpT += dt; if (p.jumpT >= C.JUMP_SEC) { p.jumpT = -1; p.yOff = 0; } else p.yOff = K.jumpOffset(p.jumpT); }
    if (p.slideT >= 0) { p.slideT += dt; if (p.slideT >= C.SLIDE_SEC) p.slideT = -1; }
    p.h = p.slideT >= 0 ? C.SLIDE_H : C.PLAYER_H;
    G.runPhase += dt * G.speed / 26;
    var i;
    for (i = 0; i < G.obs.length; i++) G.obs[i].z -= d;
    for (i = 0; i < G.stars_.length; i++) G.stars_[i].z -= d;
    G.nextZ -= d;
    for (i = G.obs.length - 1; i >= 0; i--) if (G.obs[i].z + K.TYPES[G.obs[i].type].depth < -120) G.obs.splice(i, 1);
    for (i = G.stars_.length - 1; i >= 0; i--) if (G.stars_[i].z < -120 || G.stars_[i].got) G.stars_.splice(i, 1);
    spawn();
    for (i = 0; i < G.stars_.length; i++) {
      var s = G.stars_[i];
      if (!s.got && K.starTouch(p, s)) { s.got = true; var v = s.gold ? 5 : 1; G.stars += v; (s.gold ? sfx.gold : sfx.star)(); burst(cx + (s.lane - 1) * C.LANE_W, gy - 50 - p.yOff * 0.3, s.gold ? '#FFD34F' : '#FFE58A', s.gold ? 14 : 7); }
    }
    for (i = 0; i < G.obs.length; i++) {
      if (K.hit(p, G.obs[i])) { state = 'hit'; G.hitT = 0; sfx.hit(); shakeT = fxOn ? 0.4 : 0; burst(cx + (p.x - 1) * C.LANE_W, gy - 50 - p.yOff, '#E5484D', 16); break; }
    }
    updateParticles(dt); updateHud(false);
    if (shakeT > 0) shakeT -= dt;
  }
  function burst(x, y, color, n) {
    if (!fxOn) return;
    for (var i = 0; i < n; i++) {
      if (particles.length >= 70) particles.shift();
      var a = Math.random() * 6.283, v = 40 + Math.random() * 110;
      particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.3, max: 0.8, c: color, r: 2 + Math.random() * 3 });
    }
  }
  function updateParticles(dt) { for (var i = particles.length - 1; i >= 0; i--) { var q = particles[i]; q.life -= dt; if (q.life <= 0) { particles.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; } }
  function updateHud(force) {
    var distM = Math.floor(G.distU / C.UNITS_PER_M), sc = K.scoreOf(distM, G.stars), tl = Math.floor(G.t);
    if (force || uiCache.sc !== sc) { $('hScore').textContent = sc; uiCache.sc = sc; }
    if (force || uiCache.tl !== tl) { $('hTime').textContent = Math.floor(tl / 60) + ':' + ('0' + (tl % 60)).slice(-2); uiCache.tl = tl; }
    if (force || uiCache.st !== G.stars) { $('hStars').textContent = 'ST ' + G.stars; uiCache.st = G.stars; }
  }

  /* ───── отрисовка ───── */
  function drawScene() {
    var off = G ? G.offset : 0;
    ctx.save();
    if (shakeT > 0) ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);
    var g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#2a4fb8'); g.addColorStop(0.3, '#dbe8fb'); g.addColorStop(1, '#eaf1fd');
    ctx.fillStyle = g; ctx.fillRect(-10, -10, LW + 20, LH + 20);
    var s0 = 0.05, zEnd = 3800, sEnd = S(zEnd), i, z, z2;
    // потолок
    poly([PX(-E, HC, zEnd), PX(E, HC, zEnd), PX(E, HC, zMin - 60), PX(-E, HC, zMin - 60)], '#e9effa');
    // дальняя стена + дверь
    var a = PX(-E, HC, zEnd), b = PX(E, 0, zEnd);
    ctx.fillStyle = '#b9cdf0'; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    var d1 = PX(-45, 130, zEnd), d2 = PX(45, 0, zEnd); ctx.fillStyle = '#1649e8'; ctx.fillRect(d1[0], d1[1], d2[0] - d1[0], d2[1] - d1[1]);
    // боковые стены
    [-1, 1].forEach(function (side) {
      poly([PX(side * E, HC, zEnd), PX(side * E, HC, zMin - 60), PX(side * E, 0, zMin - 60), PX(side * E, 0, zEnd)], side < 0 ? '#c9d9f5' : '#bfd1f1');
      for (var k = -1; k < 26; k++) {
        z = k * 160 - off % 160; z2 = z + 118; if (z2 < zMin - 60 || z > zEnd) continue;
        var zc = Math.max(z, zMin - 60);
        poly([PX(side * E, 175, zc), PX(side * E, 175, z2), PX(side * E, 0, z2), PX(side * E, 0, zc)], ((k + Math.floor(G ? G.distU / 160 : 0)) % 2 === 0) ? '#2f5dd8' : '#3a6be8', '#12266f', 1.2);
        poly([PX(side * E, 120, zc), PX(side * E, 120, z2), PX(side * E, 116, z2), PX(side * E, 116, zc)], 'rgba(255,255,255,.35)');
      }
    });
    // лампы на потолке
    for (i = -1; i < 26; i++) { z = i * 160 - off % 160; z2 = z + 70; if (z2 < zMin) continue; poly([PX(-40, HC - 2, Math.max(z, zMin - 50)), PX(40, HC - 2, Math.max(z, zMin - 50)), PX(40, HC - 2, z2), PX(-40, HC - 2, z2)], '#fff8d6'); }
    // пол с полосами
    poly([PX(-E, 0, zEnd), PX(E, 0, zEnd), PX(E, 0, zMin - 60), PX(-E, 0, zMin - 60)], '#e3ecf9');
    for (i = -1; i < 34; i++) {
      z = i * 120 - off % 120; z2 = z + 60; if (z2 < zMin - 60 || z > zEnd) continue;
      poly([PX(-E, 0, Math.max(z, zMin - 60)), PX(E, 0, Math.max(z, zMin - 60)), PX(E, 0, z2), PX(-E, 0, z2)], '#d3e1f6');
    }
    // разметка дорожек
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(22,73,232,.45)';
    [-1.5, -0.5, 0.5, 1.5].forEach(function (lx) {
      var p1 = PX(lx * C.LANE_W, 0, zEnd), p2 = PX(lx * C.LANE_W, 0, zMin - 60); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    });
    if (!G) { ctx.restore(); return; }
    // объекты: от дальних к ближним
    var items = [];
    for (i = 0; i < G.obs.length; i++) items.push({ z: G.obs[i].z, o: G.obs[i], k: 0 });
    for (i = 0; i < G.stars_.length; i++) if (!G.stars_[i].got) items.push({ z: G.stars_[i].z, o: G.stars_[i], k: 1 });
    items.sort(function (x, y) { return y.z - x.z; });
    var playerDrawn = false;
    for (i = 0; i < items.length; i++) {
      if (!playerDrawn && items[i].z < 0) { drawPlayer(); playerDrawn = true; }
      var it = items[i]; ctx.globalAlpha = Math.max(0, Math.min(1, (C.Z_FAR + 80 - it.z) / 260));
      if (it.k === 0) drawObstacle(it.o); else drawStar(it.o);
      ctx.globalAlpha = 1;
    }
    if (!playerDrawn) drawPlayer();
    // частицы
    for (i = 0; i < particles.length; i++) { var q = particles[i]; ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
    // ускорение: полосы по краям
    if (G.speed > 400 && fxOn && state === 'playing') { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; for (i = 0; i < 6; i++) { var yy = (G.offset * 2 + i * 97) % LH; ctx.beginPath(); ctx.moveTo(8 + (i % 2) * 6, yy); ctx.lineTo(8 + (i % 2) * 6, yy + 40); ctx.moveTo(LW - 8 - (i % 2) * 6, yy + 20); ctx.lineTo(LW - 8 - (i % 2) * 6, yy + 60); ctx.stroke(); } }
    ctx.restore();
  }
  function box(laneX, wh, z, depth, h0, h1, front, top, line) {
    var f1 = PX(laneX - wh, h1, z), f2 = PX(laneX + wh, h0, z);
    var t1 = PX(laneX - wh, h1, z + depth), t2 = PX(laneX + wh, h1, z + depth);
    poly([f1, [f2[0], f1[1]], t2, t1], top);
    ctx.fillStyle = front; ctx.fillRect(f1[0], f1[1], f2[0] - f1[0], f2[1] - f1[1]);
    if (line) { ctx.strokeStyle = line; ctx.lineWidth = Math.max(1, 2 * S(z)); ctx.strokeRect(f1[0], f1[1], f2[0] - f1[0], f2[1] - f1[1]); }
    return [f1, f2];
  }
  function drawObstacle(o) {
    var lx = (o.lane - 1) * C.LANE_W, s = S(o.z), T = K.TYPES[o.type], f, k, lw = Math.max(1, 2 * s);
    if (o.type === 'backpack') {
      // школьный рюкзак на полу: корпус, карман, лямки, молния
      box(lx, 28, o.z, T.depth, 0, 32, '#d23b46', '#f0757c', '#7a1b20');
      box(lx, 20, o.z - 2, 10, 2, 14, '#b02c36', '#d85a62', '#7a1b20');
      f = PX(lx, 27, o.z); ctx.strokeStyle = '#3b0d12'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(f[0] - 22 * s, f[1]); ctx.lineTo(f[0] + 22 * s, f[1]); ctx.stroke();
      f = PX(lx - 30, 20, o.z); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = Math.max(2, 5 * s); ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.quadraticCurveTo(f[0] - 16 * s, f[1] + 8 * s, f[0] - 10 * s, f[1] + 18 * s); ctx.stroke();
      f = PX(lx + 30, 20, o.z); ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.quadraticCurveTo(f[0] + 16 * s, f[1] + 8 * s, f[0] + 10 * s, f[1] + 18 * s); ctx.stroke();
    } else if (o.type === 'books') {
      // стопка учебников с закладками
      var cols = ['#2f6b3a', '#1649E8', '#c8453b'], offs = [-3, 4, -2];
      for (k = 0; k < 3; k++) {
        box(lx + offs[k], 30 - k * 2, o.z, T.depth, k * 20, k * 20 + 20, cols[k], '#f5efe0', '#12266f');
        f = PX(lx + offs[k], k * 20 + 10, o.z); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(f[0] - 14 * s, f[1] - 3 * s, 28 * s, 6 * s);
      }
      f = PX(lx + 10, 60, o.z + 4); ctx.fillStyle = '#FFD34F'; ctx.fillRect(f[0] - 3 * s, f[1], 6 * s, 14 * s);
    } else if (o.type === 'desk') {
      // школьная парта со стулом на крышке
      var l1 = PX(lx - 36, 70, o.z), l2 = PX(lx - 36, 0, o.z), r1 = PX(lx + 36, 70, o.z), r2 = PX(lx + 36, 0, o.z);
      ctx.strokeStyle = '#4b5563'; ctx.lineWidth = Math.max(2, 6 * s);
      ctx.beginPath(); ctx.moveTo(l1[0], l1[1]); ctx.lineTo(l2[0], l2[1]); ctx.moveTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.stroke();
      box(lx, 42, o.z, T.depth, 70, 80, '#e3b980', '#f1d3a4', '#6b4a2b');
      box(lx, 24, o.z + 10, 24, 80, 112, '#2f7fd8', '#5aa2ee', '#12266f'); // сиденье и спинка
      box(lx, 24, o.z + 10, 4, 112, 150, '#2f7fd8', '#5aa2ee', '#12266f');
      f = PX(lx, 40, o.z); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(f[0] - 30 * s, f[1] - 4 * s, 60 * s, 8 * s);
    } else if (o.type === 'wet') {
      // жёлтая табличка «мокрый пол» и лужа
      var sp = PX(lx, 0, o.z + 20); ctx.fillStyle = 'rgba(86,170,235,.55)'; ctx.beginPath(); ctx.ellipse(sp[0], sp[1], 64 * s, 13 * s, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(sp[0] - 12 * s, sp[1], 20 * s, 4 * s, 0, 0, 6.283); ctx.stroke();
      var b1 = PX(lx - 28, 0, o.z), b2 = PX(lx + 28, 0, o.z), tp = PX(lx, 64, o.z);
      poly([b1, b2, tp], '#FFD34F', '#7a5a00', Math.max(1, 3 * s));
      f = PX(lx, 24, o.z); ctx.fillStyle = '#12266f'; ctx.font = 'bold ' + Math.max(8, 26 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', f[0], f[1] + 4 * s);
      f = PX(lx, 4, o.z); ctx.fillStyle = '#12266f'; ctx.font = 'bold ' + Math.max(6, 9 * s) + 'px sans-serif'; ctx.fillText('МОКРО', f[0], f[1] - 2 * s);
    } else if (o.type === 'bar') {
      // ремонтное ограждение в коридоре: две стойки, полосатая доска и лента
      box(lx - 44, 5, o.z, 8, 0, 150, '#6b7280', '#9ca3af', null); box(lx + 44, 5, o.z, 8, 0, 150, '#6b7280', '#9ca3af', null);
      var a1 = PX(lx - 46, 150, o.z), a2 = PX(lx + 46, 56, o.z);
      ctx.fillStyle = '#fff'; ctx.fillRect(a1[0], a1[1], a2[0] - a1[0], a2[1] - a1[1]);
      ctx.save(); ctx.beginPath(); ctx.rect(a1[0], a1[1], a2[0] - a1[0], a2[1] - a1[1]); ctx.clip();
      ctx.fillStyle = '#f59e0b'; for (k = -2; k < 10; k++) { ctx.beginPath(); var sx = a1[0] + k * 22 * s; ctx.moveTo(sx, a2[1]); ctx.lineTo(sx + 12 * s, a2[1]); ctx.lineTo(sx + 12 * s + 40 * s, a1[1]); ctx.lineTo(sx + 40 * s, a1[1]); ctx.fill(); }
      ctx.restore(); ctx.strokeStyle = '#12266f'; ctx.lineWidth = Math.max(1, 3 * s); ctx.strokeRect(a1[0], a1[1], a2[0] - a1[0], a2[1] - a1[1]);
      f = PX(lx, 103, o.z); ctx.fillStyle = '#fff'; ctx.fillRect(f[0] - 30 * s, f[1] - 9 * s, 60 * s, 18 * s); ctx.fillStyle = '#12266f'; ctx.font = 'bold ' + Math.max(7, 13 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('РЕМОНТ', f[0], f[1] + 4 * s);
    }
  }
  function drawStar(st) {
    // койн: золотая монета с тёмным ST, вращается
    var s = S(st.z), p = PX((st.lane - 1) * C.LANE_W, 48, st.z), r = (st.gold ? 22 : 15) * s;
    var rot = (G.t * 2.4) % 6.283, wob = Math.abs(Math.cos(rot));
    if (st.gold) { ctx.fillStyle = 'rgba(255,211,79,.35)'; ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.6, 0, 6.283); ctx.fill(); }
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(0.35 + 0.65 * wob, 1);
    var gr = ctx.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#fff3a6'); gr.addColorStop(0.5, st.gold ? '#FFB400' : '#FBBF24'); gr.addColorStop(1, '#D97706');
    ctx.fillStyle = gr; ctx.strokeStyle = '#12266f'; ctx.lineWidth = Math.max(1, 2.2 * s);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(146,64,14,.5)'; ctx.lineWidth = Math.max(1, 1.2 * s); ctx.beginPath(); ctx.arc(0, 0, r * 0.76, 0, 6.283); ctx.stroke();
    if (r > 7) { ctx.fillStyle = '#12266F'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 ' + Math.round(r * 0.9) + 'px "Arial Black", Arial, sans-serif'; ctx.fillText('ST', 0, r * 0.04); }
    ctx.restore();
  }
  function drawPlayer() {
    var p = G.p, px = cx + (p.x - 1) * C.LANE_W, base = gy - p.yOff, ph = G.runPhase, hit = state === 'hit';
    var air = p.jumpT >= 0, rolling = p.slideT >= 0 && !hit;
    ctx.fillStyle = 'rgba(18,38,111,.28)'; ctx.beginPath(); ctx.ellipse(px, gy + 5, (rolling ? 30 : 28) * (1 - Math.min(0.5, p.yOff / 250)), 7, 0, 0, 6.283); ctx.fill();
    ctx.save(); ctx.translate(px, base);
    if (hit) { ctx.rotate(Math.min(1, G.hitT / 0.3) * -0.5); ctx.translate(0, -Math.min(1, G.hitT / 0.3) * 4); }
    var skin = '#F3C9A0', hair = '#2b1d14', shirt = hit ? '#E5484D' : '#1649E8', shirtD = hit ? '#b83539' : '#0f36b0', pants = '#12266F', bag = '#FFD34F', line = '#12266f';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function circ(x, y, r, f) { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2.5; ctx.stroke(); }
    if (rolling) {
      // кувырок вперёд: фигура свёрнута в клубок и вращается через голову (вид сзади)
      var u = Math.min(1, p.slideT / C.SLIDE_SEC), ang = u * 6.283, R = 24, cy0 = -30 - Math.sin(u * 3.1416) * 4;
      var parts = [
        { a: ang, r: 12, c: hair, k: 'head' }, { a: ang - 1.5708, r: 18, c: shirt, k: 'back' },
        { a: ang + 3.1416, r: 11, c: pants, k: 'feet' }, { a: ang + 1.5708, r: 16, c: shirtD, k: 'belly' }
      ].map(function (q) { q.z = Math.sin(q.a) * R; q.y = cy0 - Math.cos(q.a) * R; return q; });
      parts.sort(function (x, y) { return y.z - x.z; });
      for (var m = 0; m < parts.length; m++) {
        var q = parts[m]; circ(0, q.y, q.r, q.c);
        if (q.k === 'back' && q.z < 0) { ctx.fillStyle = bag; rrect(-11, q.y - 11, 22, 22, 5); ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke(); }
        if (q.k === 'head' && q.z < 0) { ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, q.y + 3, 8, 0, 3.1416); ctx.fill(); }
      }
      ctx.strokeStyle = 'rgba(18,38,111,.25)'; ctx.lineWidth = 3; for (var w = 0; w < 3; w++) { ctx.beginPath(); ctx.arc(0, cy0, 36 + w * 3, 3.6 + ang * 0.0 + w * 0.5, 4.6 + w * 0.5); ctx.stroke(); }
    } else {
      var sw = air ? 0.5 : Math.sin(ph), sw2 = -sw, lift1 = air ? 12 : Math.max(0, Math.cos(ph)) * 9, lift2 = air ? 4 : Math.max(0, -Math.cos(ph)) * 9;
      // ноги (вид сзади: шаг виден как подъём пятки)
      ctx.strokeStyle = pants; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(-7 + sw * 4, -7 - lift1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -36); ctx.lineTo(7 + sw2 * 4, -7 - lift2); ctx.stroke();
      ctx.fillStyle = '#f5f7ff'; ctx.strokeStyle = line; ctx.lineWidth = 2.5;
      rrect(-14 + sw * 4, -11 - lift1, 14, 9, 4); ctx.fill(); ctx.stroke(); rrect(0 + sw2 * 4, -11 - lift2, 14, 9, 4); ctx.fill(); ctx.stroke();
      // руки
      var asw = air ? -1.0 : Math.sin(ph + 3.14) * 0.9;
      ctx.strokeStyle = shirtD; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(-17, -70); ctx.lineTo(-24 - Math.sin(asw) * 3, -50 + Math.sin(asw) * 12 + (air ? -16 : 0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(17, -70); ctx.lineTo(24 + Math.sin(asw) * 3, -50 - Math.sin(asw) * 12 + (air ? -16 : 0)); ctx.stroke();
      circ(-24 - Math.sin(asw) * 3, -49 + Math.sin(asw) * 12 + (air ? -16 : 0), 4.5, skin); circ(24 + Math.sin(asw) * 3, -49 - Math.sin(asw) * 12 + (air ? -16 : 0), 4.5, skin);
      // торс + рюкзак на спине
      ctx.fillStyle = shirt; rrect(-17, -76, 34, 44, 11); ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = bag; rrect(-13, -72, 26, 32, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6b800'; rrect(-10, -52, 20, 11, 4); ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -56); ctx.lineTo(10, -56); ctx.stroke();
      // голова сзади: волосы, уши
      circ(-14, -88, 4, skin); circ(14, -88, 4, skin);
      circ(0, -90, 15, hair);
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, -77, 7, 4, 0, 0, 6.283); ctx.fill();
    }
    if (hit) { ctx.fillStyle = '#FFD34F'; for (var i = 0; i < 3; i++) { var an = G.hitT * 9 + i * 2.1; ctx.beginPath(); ctx.arc(Math.cos(an) * 22, -104 + Math.sin(an) * 8, 4, 0, 6.283); ctx.fill(); } }
    ctx.restore();
  }

  /* ───── главный цикл (один на всю жизнь страницы) ───── */
  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (G && (state === 'playing' || state === 'hit')) update(dt);
    ctx.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
    drawScene();
  }
  function autoPause() { if (state === 'playing') pause(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) autoPause(); else last = performance.now(); }, sig);
  window.addEventListener('blur', autoPause, sig);
  window.addEventListener('resize', resize, sig);
  window.addEventListener('orientationchange', resize, sig);
  window.addEventListener('pagehide', destroy, sig);

  function destroy() { destroyed = true; cancelAnimationFrame(raf); ac.abort(); try { if (actx) actx.close(); } catch (e) { /* ignore */ } }
  function closeGame() {
    if (state === 'playing') pause();
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'SPRINT_CLOSE' }, window.location.origin);
    else if (history.length > 1) history.back();
  }

  /* ───── кнопки ───── */
  function on(id, fn) { $(id).addEventListener('click', function (e) { e.preventDefault(); audioUnlock(); fn(); }, sig); }
  on('playBtn', begin); on('againBtn', begin); on('pauseBtn', pause); on('resumeBtn', resume);
  on('toMenuBtn', toMenu); on('menuBtn', toMenu); on('closeBtn', closeGame);
  on('retryBtn', saveResult);
  function toggleSound() { soundOn = !soundOn; lsSet('ss_sound', soundOn ? '1' : '0'); syncToggles(); if (soundOn) sfx.star(); }
  function toggleFx() { fxOn = !fxOn; lsSet('ss_fx', fxOn ? '1' : '0'); syncToggles(); if (!fxOn) particles.length = 0; }
  on('sndBtn', toggleSound); on('sndBtn2', toggleSound); on('fxBtn', toggleFx); on('fxBtn2', toggleFx);

  syncToggles(); resize(); loadMenuData();
  last = performance.now(); raf = requestAnimationFrame(frame);
  window.__sprint = { get state() { return state; }, get G() { return G; }, begin: begin, K: K }; // для отладки/тестов
})();
