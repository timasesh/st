/* School Sprint — чистая игровая логика (без DOM): константы, скорость, генератор препятствий с проверкой проходимости, коллизии. */
(function (root) {
  'use strict';
  var C = {
    ROUND_SEC: 60, LANES: 3, LANE_W: 104, Z_FAR: 3200, FOCAL: 520, PLAYER_Z: 14,
    LANE_MOVE_SEC: 0.15, JUMP_SEC: 0.6, SLIDE_SEC: 0.52, JUMP_APEX: 125, PLAYER_H: 92, SLIDE_H: 38,
    SWIPE_PX: 32, STAR_POINTS: 10, START_SPEED: 300, MAX_SPEED: 520, HIT_ANIM_SEC: 0.7, UNITS_PER_M: 10, MAX_BOOSTS: 6,
  };
  var TYPES = {
    backpack: { need: 'jump', h0: 0, h1: 30, depth: 34 },
    books: { need: 'jump', h0: 0, h1: 60, depth: 34 },
    wet: { need: 'jump', h0: 0, h1: 24, depth: 44 },
    bar: { need: 'slide', h0: 56, h1: 150, depth: 24 },
    desk: { need: 'block', h0: 0, h1: 150, depth: 70 },
  };

  function speedAt(t) { return Math.min(C.MAX_SPEED, C.START_SPEED + 3.6 * Math.max(0, t)); }
  function phaseOf(t) { return t < 10 ? 0 : t < 20 ? 1 : t < 40 ? 2 : 3; }
  var GAP = [[1.5, 2.1], [1.2, 1.7], [0.95, 1.4], [0.8, 1.2]];
  var COUNTS = [[[1, 1]], [[1, 0.7], [2, 0.3]], [[1, 0.35], [2, 0.5], [3, 0.15]], [[1, 0.2], [2, 0.5], [3, 0.3]]];
  var KINDS = [
    [['backpack', 3], ['wet', 2], ['books', 2], ['bar', 2]],
    [['backpack', 3], ['wet', 2], ['books', 2], ['bar', 3], ['desk', 1]],
    [['backpack', 2], ['wet', 2], ['books', 2], ['bar', 3], ['desk', 3]],
    [['backpack', 2], ['wet', 2], ['books', 3], ['bar', 3], ['desk', 4]],
  ];
  function pickW(list, rnd) {
    var sum = 0, i; for (i = 0; i < list.length; i++) sum += list[i][1];
    var r = rnd() * sum; for (i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
    return list[list.length - 1][0];
  }

  /* Достижимые состояния игрока (дорожка + последнее действие) после ряда препятствий. T — время между рядами, сек. */
  function stepStates(states, cells, T) {
    var out = {};
    for (var s = 0; s < states.length; s++) {
      var st = states[s];
      for (var l = 0; l < 3; l++) {
        var cell = cells[l];
        var need = cell ? TYPES[cell].need : 'free';
        if (need === 'block') continue;
        var move = Math.abs(l - st.lane);
        var t = move * C.LANE_MOVE_SEC + (move ? 0.12 : 0);
        var act = need === 'jump' ? 1 : need === 'slide' ? 2 : 0;
        if (act) t += 0.15 + (st.act ? (st.act === 1 ? C.JUMP_SEC : C.SLIDE_SEC) + 0.05 : 0);
        if (T + 1e-6 < t) continue;
        out[l * 3 + act] = { lane: l, act: act };
      }
    }
    return Object.keys(out).map(function (k) { return out[k]; });
  }
  function initialStates() { return [{ lane: 1, act: 0 }]; }

  /* Новый ряд: случайные препятствия, принимаются только комбинации, у которых есть проходимый путь. */
  function genRow(t, speed, states, rnd) {
    rnd = rnd || Math.random;
    var ph = phaseOf(t), g = GAP[ph];
    for (var attempt = 0; attempt < 14; attempt++) {
      var gapT = g[0] + rnd() * (g[1] - g[0]);
      var dz = speed * gapT;
      var T = gapT / 1.08;
      var count = pickW(COUNTS[ph], rnd);
      var lanes = [0, 1, 2].sort(function () { return rnd() - 0.5; }).slice(0, count);
      var cells = [null, null, null];
      for (var i = 0; i < lanes.length; i++) cells[lanes[i]] = pickW(KINDS[ph], rnd);
      var ns = stepStates(states, cells, T);
      if (ns.length) return { cells: cells, dz: dz, gapT: gapT, states: ns };
    }
    var gt = g[1], empty = [null, null, null];
    return { cells: empty, dz: speed * gt, gapT: gt, states: stepStates(states, empty, gt / 1.08) };
  }

  /* Звёзды в промежутке между рядами: линия по дорожке из достижимых. */
  function genStars(prevStates, gapStart, gapEnd, rnd) {
    rnd = rnd || Math.random;
    if (gapEnd - gapStart < 240 || rnd() > 0.5 || !prevStates.length) return [];
    var lane = prevStates[Math.floor(rnd() * prevStates.length)].lane;
    return [{ lane: lane, z: (gapStart + gapEnd) / 2, gold: rnd() < 0.1 }]; // по одной звезде в промежутке
  }

  function jumpOffset(elapsed) {
    var u = Math.min(1, Math.max(0, elapsed / C.JUMP_SEC));
    return C.JUMP_APEX * 4 * u * (1 - u);
  }
  /* player: {x: дорожка (0..2, дробная при смене), yOff, h}; o: {lane, type, z} */
  function hit(player, o) {
    var tp = TYPES[o.type];
    if (o.z > C.PLAYER_Z || o.z + tp.depth < -C.PLAYER_Z) return false;
    if (Math.abs(player.x - o.lane) > 0.52) return false;
    return player.yOff + player.h > tp.h0 && player.yOff < tp.h1;
  }
  /* звезда висит на высоте ~28–68: подбирается только при касании по высоте (прыжок выше — пролетаешь над ней) */
  function starTouch(player, s) {
    if (s.z > C.PLAYER_Z + 10 || s.z < -C.PLAYER_Z - 10 || Math.abs(player.x - s.lane) >= 0.62) return false;
    return player.yOff + player.h > 28 && player.yOff < 68;
  }
  /* каждые 1000 очков скорость ×1.4 (не более 6 раз) */
  function speedMult(score) { return Math.pow(1.4, Math.min(C.MAX_BOOSTS, Math.floor(Math.max(0, score) / 1000))); }

  function scoreOf(distanceM, stars) { return Math.floor(distanceM) + Math.floor(stars) * C.STAR_POINTS; }

  var core = { C: C, TYPES: TYPES, speedAt: speedAt, phaseOf: phaseOf, stepStates: stepStates, initialStates: initialStates, genRow: genRow, genStars: genStars, jumpOffset: jumpOffset, hit: hit, starTouch: starTouch, speedMult: speedMult, scoreOf: scoreOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = core; else root.SprintCore = core;
})(typeof window !== 'undefined' ? window : globalThis);
