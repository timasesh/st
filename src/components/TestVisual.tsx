import React from 'react';

// ───────── Rich text: дроби {a/b}, степени ^{2}, индексы _{n} ─────────
const TOKEN = /\{([^{}/]+)\/([^{}/]+)\}|\^\{([^{}]+)\}|_\{([^{}]+)\}/g;

export function Rich({ text, className }: { text: string; className?: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <span key={k++} className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.8em] leading-none">
          <span className="border-b-2 border-current px-1 pb-0.5">{m[1]}</span>
          <span className="px-1 pt-0.5">{m[2]}</span>
        </span>,
      );
    } else if (m[3] !== undefined) out.push(<sup key={k++} className="text-[0.65em]">{m[3]}</sup>);
    else out.push(<sub key={k++} className="text-[0.65em]">{m[4]}</sub>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <span className={className}>{out}</span>;
}

// ───────── Описание картинок ─────────
export type Visual =
  | { type: 'numberline'; min: number; max: number; step: number; labelEvery?: number; marks?: { at: number; label: string; tone?: 'main' | 'ask' }[]; hop?: { from: number; to: number; label: string } }
  | { type: 'bar'; parts: number; filled: number }
  | { type: 'bars'; data: { label: string; value: number }[]; max: number; unit?: string }
  | { type: 'rect'; w: number; h: number; top?: string; side?: string; center?: string }
  | { type: 'pie'; slices: { label: string; value: number }[]; highlight?: number }
  | { type: 'seq'; boxes: string[]; note?: string }
  | { type: 'ratio'; a: number; b: number; labelA: string; labelB: string; note?: string }
  | { type: 'coord'; xmin: number; xmax: number; ymin: number; ymax: number; xstep?: number; ystep?: number; points?: { x: number; y: number; label?: string }[]; line?: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }; xLabel?: string; yLabel?: string; fn?: (x: number) => number; fn2?: (x: number) => number; area?: { from: number; to: number; top: (x: number) => number; bottom?: (x: number) => number } }
  | { type: 'rtri'; legA: string; legB: string; hyp: string; angle?: string }
  | { type: 'similar'; big: { h: string; b: string }; small: { h: string; b: string } }
  | { type: 'inscribed'; central: string; inscribed: string; deg: number }
  | { type: 'unit'; deg: number; label: string }
  | { type: 'cube'; edge: string; diag: string }
  | { type: 'cyl'; r: string; h: string }
  | { type: 'circle'; label: string; note?: string }
  | { type: 'triangle'; angleA?: string; angleB?: string; angleC?: string; sideAB?: string; sideAC?: string; sideBC?: string; exterior?: string };

const C = { primary: '#2563EB', light: '#DBEAFE', border: '#BFDBFE', navy: '#172554', amber: '#F59E0B', amberLight: '#FEF3C7', rose: '#E11D48', grid: '#E2E8F0', text: '#1E3A5F' };
const PALETTE = ['#2563EB', '#F59E0B', '#10B981', '#E11D48', '#8B5CF6', '#06B6D4'];
const T = (p: React.SVGProps<SVGTextElement>) => <text fontFamily="inherit" fontWeight={800} fill={C.navy} textAnchor="middle" {...p} />;
const fmt = (n: number) => String(n).replace('-', '−');

function NumberLine({ v }: { v: Extract<Visual, { type: 'numberline' }> }) {
  const x0 = 24, x1 = 336, y = 110;
  const X = (n: number) => x0 + ((n - v.min) / (v.max - v.min)) * (x1 - x0);
  const ticks: number[] = [];
  for (let n = v.min; n <= v.max + 1e-9; n += v.step) ticks.push(Math.round(n * 1000) / 1000);
  const every = v.labelEvery ?? 1;
  return (
    <>
      <line x1={x0 - 10} y1={y} x2={x1 + 12} y2={y} stroke={C.navy} strokeWidth={3} strokeLinecap="round" />
      <path d={`M ${x1 + 4} ${y - 7} L ${x1 + 14} ${y} L ${x1 + 4} ${y + 7}`} fill="none" stroke={C.navy} strokeWidth={3} strokeLinecap="round" />
      {ticks.map((n, i) => (
        <g key={n}>
          <line x1={X(n)} y1={y - 7} x2={X(n)} y2={y + 7} stroke={C.navy} strokeWidth={2.5} />
          {i % every === 0 && <T x={X(n)} y={y + 28} fontSize={13}>{fmt(n)}</T>}
        </g>
      ))}
      {v.hop && (
        <g>
          <path d={`M ${X(v.hop.from)} ${y - 8} Q ${(X(v.hop.from) + X(v.hop.to)) / 2} ${y - 78} ${X(v.hop.to)} ${y - 8}`} fill="none" stroke={C.amber} strokeWidth={4} strokeLinecap="round" />
          <path d={`M ${X(v.hop.to) - 9} ${y - 22} L ${X(v.hop.to)} ${y - 8} L ${X(v.hop.to) + 1} ${y - 27}`} fill="none" stroke={C.amber} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <T x={(X(v.hop.from) + X(v.hop.to)) / 2} y={y - 62} fontSize={18} fill={C.amber}>{v.hop.label}</T>
        </g>
      )}
      {v.marks?.map((m, i) => (
        <g key={i}>
          <circle cx={X(m.at)} cy={y} r={9} fill={m.tone === 'ask' ? C.rose : C.primary} stroke="#fff" strokeWidth={3} />
          <T x={X(m.at)} y={y - 18} fontSize={18} fill={m.tone === 'ask' ? C.rose : C.primary}>{m.label}</T>
        </g>
      ))}
    </>
  );
}

function Bar({ v }: { v: Extract<Visual, { type: 'bar' }> }) {
  const w = 300 / v.parts;
  return (
    <>
      {Array.from({ length: v.parts }).map((_, i) => (
        <rect key={i} x={30 + i * w} y={70} width={w} height={70} fill={i < v.filled ? C.primary : '#fff'} stroke={C.navy} strokeWidth={3} />
      ))}
      <T x={180} y={175} fontSize={14} fill={C.text}>фигура поделена на равные части</T>
    </>
  );
}

function Bars({ v }: { v: Extract<Visual, { type: 'bars' }> }) {
  const n = v.data.length, gw = 300 / n, base = 170, top = 40;
  return (
    <>
      <line x1={24} y1={base} x2={340} y2={base} stroke={C.navy} strokeWidth={3} />
      <line x1={24} y1={top - 10} x2={24} y2={base} stroke={C.navy} strokeWidth={3} />
      {v.data.map((d, i) => {
        const h = ((base - top) * d.value) / v.max;
        const x = 38 + i * gw + gw * 0.15;
        return (
          <g key={d.label}>
            <rect x={x} y={base - h} width={gw * 0.7} height={h} rx={5} fill={PALETTE[i % PALETTE.length]} />
            <T x={x + gw * 0.35} y={base - h - 6} fontSize={15}>{d.value}</T>
            <T x={x + gw * 0.35} y={base + 18} fontSize={13}>{d.label}</T>
          </g>
        );
      })}
      {v.unit && <T x={180} y={16} fontSize={12} fill={C.text}>{v.unit}</T>}
    </>
  );
}

function RectV({ v }: { v: Extract<Visual, { type: 'rect' }> }) {
  const k = Math.min(220 / v.w, 100 / v.h);
  const w = v.w * k, h = v.h * k, x = 180 - w / 2, y = 105 - h / 2;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={C.light} stroke={C.primary} strokeWidth={4} />
      {v.top && <T x={180} y={y - 10} fontSize={17}>{v.top}</T>}
      {v.side && <T x={x + w + 16} y={105 + 6} fontSize={17} textAnchor="start">{v.side}</T>}
      {v.center && <T x={180} y={111} fontSize={20} fill={C.primary}>{v.center}</T>}
    </>
  );
}

function Pie({ v }: { v: Extract<Visual, { type: 'pie' }> }) {
  const total = v.slices.reduce((s, x) => s + x.value, 0);
  let a0 = -Math.PI / 2;
  const cx = 88, cy = 105, r = 72;
  return (
    <>
      {v.slices.map((s, i) => {
        const a1 = a0 + (s.value / total) * Math.PI * 2;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
        const mid = (a0 + a1) / 2;
        const el = (
          <g key={i}>
            <path d={d} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={3} transform={v.highlight === i ? `translate(${Math.cos(mid) * 6} ${Math.sin(mid) * 6})` : undefined} />
            <rect x={176} y={42 + i * 34} width={16} height={16} rx={4} fill={PALETTE[i % PALETTE.length]} />
            <T x={198} y={55 + i * 34} fontSize={13} textAnchor="start">{s.label}</T>
          </g>
        );
        a0 = a1;
        return el;
      })}
    </>
  );
}

function Seq({ v }: { v: Extract<Visual, { type: 'seq' }> }) {
  const n = v.boxes.length, gap = n > 3 ? 12 : 18, w = Math.min(90, (330 - (n - 1) * gap) / n), start = 180 - (n * w + (n - 1) * gap) / 2;
  return (
    <>
      {v.boxes.map((b, i) => (
        <g key={i}>
          <rect x={start + i * (w + gap)} y={70} width={w} height={64} rx={14} fill={C.light} stroke={C.primary} strokeWidth={4} />
          <T x={start + i * (w + gap) + w / 2} y={110} fontSize={22} fill={C.primary}>{b}</T>
          {i < n - 1 && n <= 3 && <T x={start + i * (w + gap) + w + gap / 2} y={108} fontSize={20}>,</T>}
        </g>
      ))}
      {v.note && <T x={180} y={175} fontSize={18} fill={C.rose}>{v.note}</T>}
    </>
  );
}

function Ratio({ v }: { v: Extract<Visual, { type: 'ratio' }> }) {
  const sz = 34;
  const row = (n: number, y: number, color: string, label: string) => (
    <g>
      {Array.from({ length: n }).map((_, i) => <rect key={i} x={24 + i * (sz + 6)} y={y} width={sz} height={sz} rx={7} fill={color} />)}
      <T x={24 + n * (sz + 6) + 8} y={y + 24} fontSize={15} textAnchor="start">{label} — {n}</T>
    </g>
  );
  return (
    <>
      {row(v.a, 50, C.amber, v.labelA)}
      {row(v.b, 100, C.primary, v.labelB)}
      {v.note && <T x={180} y={170} fontSize={16} fill={C.rose}>{v.note}</T>}
    </>
  );
}

function Coord({ v }: { v: Extract<Visual, { type: 'coord' }> }) {
  const L = 36, R = 336, Tp = 14, Bt = 186;
  const X = (x: number) => L + ((x - v.xmin) / (v.xmax - v.xmin)) * (R - L);
  const Y = (y: number) => Bt - ((y - v.ymin) / (v.ymax - v.ymin)) * (Bt - Tp);
  const xs = v.xstep ?? 1, ys = v.ystep ?? 1;
  const gx: number[] = [], gy: number[] = [];
  for (let x = Math.ceil(v.xmin / xs) * xs; x <= v.xmax + 1e-9; x += xs) gx.push(x);
  for (let y = Math.ceil(v.ymin / ys) * ys; y <= v.ymax + 1e-9; y += ys) gy.push(y);
  const ax = Math.min(Math.max(0, v.xmin), v.xmax), ay = Math.min(Math.max(0, v.ymin), v.ymax);
  return (
    <>
      {gx.map((x) => <line key={`x${x}`} x1={X(x)} y1={Tp} x2={X(x)} y2={Bt} stroke={C.grid} strokeWidth={1.5} />)}
      {gy.map((y) => <line key={`y${y}`} x1={L} y1={Y(y)} x2={R} y2={Y(y)} stroke={C.grid} strokeWidth={1.5} />)}
      <line x1={L} y1={Y(ay)} x2={R + 6} y2={Y(ay)} stroke={C.navy} strokeWidth={2.5} />
      <line x1={X(ax)} y1={Bt} x2={X(ax)} y2={Tp - 6} stroke={C.navy} strokeWidth={2.5} />
      {gx.filter((x) => x !== 0).map((x) => <T key={`lx${x}`} x={X(x)} y={Y(ay) + 15} fontSize={11}>{fmt(x)}</T>)}
      {gy.filter((y) => y !== 0).map((y) => <T key={`ly${y}`} x={X(ax) - 8} y={Y(y) + 4} fontSize={11} textAnchor="end">{fmt(y)}</T>)}
      <T x={R + 6} y={Y(ay) - 8} fontSize={13} textAnchor="end">{v.xLabel ?? 'x'}</T>
      <T x={X(ax) + 12} y={Tp + 6} fontSize={13}>{v.yLabel ?? 'y'}</T>
      {v.area && (() => {
        const n = 80, pts: string[] = [], back: string[] = [];
        const cl = (y: number) => Math.max(v.ymin, Math.min(v.ymax, y));
        for (let i = 0; i <= n; i++) { const x = v.area.from + ((v.area.to - v.area.from) * i) / n; pts.push(`${X(x)},${Y(cl(v.area.top(x)))}`); back.push(`${X(x)},${Y(cl(v.area.bottom ? v.area.bottom(x) : 0))}`); }
        return <polygon points={[...pts, ...back.reverse()].join(' ')} fill={C.amber} opacity={0.35} stroke="none" />;
      })()}
      {[v.fn, v.fn2].map((f, k) => {
        if (!f) return null;
        let d = '', pen = false;
        const n = 160;
        for (let i = 0; i <= n; i++) {
          const x = v.xmin + ((v.xmax - v.xmin) * i) / n, y = f(x);
          if (!isFinite(y) || y < v.ymin - 0.2 || y > v.ymax + 0.2) { pen = false; continue; }
          d += `${pen ? 'L' : 'M'} ${X(x).toFixed(1)} ${Y(y).toFixed(1)} `; pen = true;
        }
        return <path key={k} d={d} fill="none" stroke={k ? C.rose : C.primary} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />;
      })}
      {v.line && <line x1={X(v.line.x1)} y1={Y(v.line.y1)} x2={X(v.line.x2)} y2={Y(v.line.y2)} stroke={C.primary} strokeWidth={4} strokeLinecap="round" strokeDasharray={v.line.dashed ? '8 7' : undefined} />}
      {v.points?.map((p, i) => (
        <g key={i}>
          <circle cx={X(p.x)} cy={Y(p.y)} r={6} fill={C.rose} stroke="#fff" strokeWidth={2} />
          {p.label && (X(p.x) > 250 ? <T x={X(p.x) - 10} y={Y(p.y) - 9} fontSize={14} textAnchor="end" fill={C.rose}>{p.label}</T> : <T x={X(p.x) + 10} y={Y(p.y) - 9} fontSize={14} textAnchor="start" fill={C.rose}>{p.label}</T>)}
        </g>
      ))}
    </>
  );
}

function CircleV({ v }: { v: Extract<Visual, { type: 'circle' }> }) {
  return (
    <>
      <circle cx={180} cy={102} r={72} fill={C.light} stroke={C.primary} strokeWidth={4} />
      <line x1={180} y1={102} x2={252} y2={102} stroke={C.rose} strokeWidth={4} />
      <circle cx={180} cy={102} r={4} fill={C.navy} />
      <T x={216} y={92} fontSize={16} fill={C.rose}>{v.label}</T>
      {v.note && <T x={180} y={198} fontSize={14} fill={C.text}>{v.note}</T>}
    </>
  );
}

function Triangle({ v }: { v: Extract<Visual, { type: 'triangle' }> }) {
  const A = { x: 50, y: 170 }, B = { x: 250, y: 170 }, Cc = { x: 150, y: 40 };
  return (
    <>
      <path d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${Cc.x} ${Cc.y} Z`} fill={C.light} stroke={C.primary} strokeWidth={4} strokeLinejoin="round" />
      {v.exterior && <line x1={B.x} y1={B.y} x2={B.x + 80} y2={B.y} stroke={C.primary} strokeWidth={4} strokeLinecap="round" />}
      {v.exterior && <path d={`M ${B.x + 34} ${B.y} A 34 34 0 0 0 ${B.x - 21} ${B.y - 27}`} fill="none" stroke={C.rose} strokeWidth={3} />}
      {v.exterior && <T x={B.x + 14} y={B.y - 44} fontSize={18} fill={C.rose}>{v.exterior}</T>}
      <T x={A.x - 6} y={A.y + 20} fontSize={15} textAnchor="end">A</T>
      <T x={B.x} y={B.y + 20} fontSize={15}>B</T>
      <T x={Cc.x} y={Cc.y - 10} fontSize={15}>C</T>
      {v.angleA && <T x={A.x + 46} y={A.y - 8} fontSize={15} fill={C.primary}>{v.angleA}</T>}
      {v.angleB && <T x={B.x - 44} y={B.y - 8} fontSize={15} fill={C.primary}>{v.angleB}</T>}
      {v.angleC && <T x={Cc.x} y={Cc.y + 40} fontSize={15} fill={C.primary}>{v.angleC}</T>}
      {v.sideAB && <T x={(A.x + B.x) / 2} y={A.y + 22} fontSize={16}>{v.sideAB}</T>}
      {v.sideAC && <T x={(A.x + Cc.x) / 2 - 18} y={(A.y + Cc.y) / 2} fontSize={16} textAnchor="end">{v.sideAC}</T>}
      {v.sideBC && <T x={(B.x + Cc.x) / 2 + 18} y={(B.y + Cc.y) / 2} fontSize={16} textAnchor="start">{v.sideBC}</T>}
    </>
  );
}


function RTri({ v }: { v: Extract<Visual, { type: 'rtri' }> }) {
  const A = { x: 70, y: 170 }, B = { x: 290, y: 170 }, Cc = { x: 70, y: 40 };
  return (
    <>
      <path d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${Cc.x} ${Cc.y} Z`} fill={C.light} stroke={C.primary} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M ${A.x} ${A.y - 18} H ${A.x + 18} V ${A.y}`} fill="none" stroke={C.navy} strokeWidth={2.5} />
      <T x={A.x - 16} y={(A.y + Cc.y) / 2 + 6} fontSize={17}>{v.legA}</T>
      <T x={(A.x + B.x) / 2} y={A.y + 24} fontSize={17}>{v.legB}</T>
      <T x={(B.x + Cc.x) / 2 + 22} y={(B.y + Cc.y) / 2 - 8} fontSize={17} fill={C.rose}>{v.hyp}</T>
      {v.angle && <T x={B.x - 52} y={B.y - 8} fontSize={15} fill={C.primary}>{v.angle}</T>}
    </>
  );
}

function Similar({ v }: { v: Extract<Visual, { type: 'similar' }> }) {
  const tri = (x: number, w: number, h: number, hl: string, bl: string, col: string) => (
    <g>
      <path d={`M ${x} 170 L ${x + w} 170 L ${x} ${170 - h} Z`} fill={col} stroke={C.primary} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M ${x} 152 H ${x + 14} V 170`} fill="none" stroke={C.navy} strokeWidth={2} />
      <T x={x - 8} y={170 - h / 2 + 5} fontSize={16} textAnchor="end">{hl}</T>
      <T x={x + w / 2} y={192} fontSize={16}>{bl}</T>
    </g>
  );
  return (
    <>
      {tri(60, 140, 120, v.big.h, v.big.b, C.light)}
      {tri(260, 70, 60, v.small.h, v.small.b, C.amberLight)}
      <line x1={20} y1={170} x2={345} y2={170} stroke={C.navy} strokeWidth={2.5} />
    </>
  );
}

function Inscribed({ v }: { v: Extract<Visual, { type: 'inscribed' }> }) {
  const cx = 180, cy = 108, r = 72, th = (v.deg * Math.PI) / 360;
  const P = (a: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  const A = P(-Math.PI / 2 - th), B = P(-Math.PI / 2 + th), Cc = P(Math.PI / 2);
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={C.light} stroke={C.primary} strokeWidth={4} />
      <path d={`M ${cx} ${cy} L ${A.x} ${A.y} M ${cx} ${cy} L ${B.x} ${B.y}`} stroke={C.rose} strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d={`M ${Cc.x} ${Cc.y} L ${A.x} ${A.y} M ${Cc.x} ${Cc.y} L ${B.x} ${B.y}`} stroke={C.navy} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill={C.navy} />
      <T x={cx} y={cy - 22} fontSize={15} fill={C.rose}>{v.central}</T>
      <T x={Cc.x} y={Cc.y - 14} fontSize={17} fill={C.navy}>{v.inscribed}</T>
      <T x={A.x - 12} y={A.y - 4} fontSize={15}>A</T><T x={B.x + 12} y={B.y - 4} fontSize={15}>B</T>
      <T x={Cc.x} y={Cc.y + 20} fontSize={15}>C</T><T x={cx + 14} y={cy + 4} fontSize={14} textAnchor="start">O</T>
    </>
  );
}

function Unit({ v }: { v: Extract<Visual, { type: 'unit' }> }) {
  const cx = 180, cy = 105, r = 80, a = (v.deg * Math.PI) / 180;
  const px = cx + r * Math.cos(a), py = cy - r * Math.sin(a);
  const ex = cx + 26 * Math.cos(0), ey = cy;
  const ax = cx + 26 * Math.cos(a), ay = cy - 26 * Math.sin(a);
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={C.light} stroke={C.primary} strokeWidth={3.5} />
      <line x1={cx - r - 14} y1={cy} x2={cx + r + 14} y2={cy} stroke={C.navy} strokeWidth={2.5} />
      <line x1={cx} y1={cy + r + 12} x2={cx} y2={cy - r - 14} stroke={C.navy} strokeWidth={2.5} />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={C.rose} strokeWidth={4} strokeLinecap="round" />
      <path d={`M ${ex} ${ey} A 26 26 0 ${v.deg > 180 ? 1 : 0} 0 ${ax} ${ay}`} fill="none" stroke={C.amber} strokeWidth={3.5} />
      <circle cx={px} cy={py} r={6} fill={C.rose} stroke="#fff" strokeWidth={2} />
      <T x={px + (px > cx ? 12 : -12)} y={py - 8} fontSize={15} fill={C.rose} textAnchor={px > cx ? 'start' : 'end'}>{v.label}</T>
      <T x={cx + r + 8} y={cy + 18} fontSize={12}>1</T><T x={cx + 14} y={cy - r - 4} fontSize={12}>1</T>
    </>
  );
}

function Cube({ v }: { v: Extract<Visual, { type: 'cube' }> }) {
  const f = 86, ox = 52, oy = -40, x0 = 96, y0 = 172;
  const fr = [[x0, y0], [x0 + f, y0], [x0 + f, y0 - f], [x0, y0 - f]];
  const bk = fr.map(([x, y]) => [x + ox, y + oy]);
  const poly = (pts: number[][]) => pts.map((p) => p.join(',')).join(' ');
  return (
    <>
      <polygon points={poly(bk)} fill="none" stroke={C.primary} strokeWidth={3} strokeDasharray="6 5" opacity={0.7} />
      {[0, 1, 2, 3].map((i) => <line key={i} x1={fr[i][0]} y1={fr[i][1]} x2={bk[i][0]} y2={bk[i][1]} stroke={C.primary} strokeWidth={3} strokeDasharray={i === 0 ? '6 5' : undefined} />)}
      <polygon points={poly(fr)} fill={C.light} stroke={C.primary} strokeWidth={4} strokeLinejoin="round" />
      <polygon points={poly([fr[3], fr[2], bk[2], bk[3]])} fill={C.border} stroke={C.primary} strokeWidth={3} strokeLinejoin="round" opacity={0.8} />
      <polygon points={poly([fr[1], bk[1], bk[2], fr[2]])} fill={C.light} stroke={C.primary} strokeWidth={3} strokeLinejoin="round" opacity={0.9} />
      <line x1={fr[0][0]} y1={fr[0][1]} x2={bk[2][0]} y2={bk[2][1]} stroke={C.rose} strokeWidth={4} strokeLinecap="round" />
      <T x={x0 + f / 2} y={y0 + 20} fontSize={16}>{v.edge}</T>
      <T x={x0 + f * 0.55 + ox * 0.5 - 22} y={y0 - f * 0.5 + oy * 0.5 - 6} fontSize={17} fill={C.rose}>{v.diag}</T>
    </>
  );
}

function Cyl({ v }: { v: Extract<Visual, { type: 'cyl' }> }) {
  const cx = 150, rx = 70, ry = 20, top = 52, bot = 158;
  return (
    <>
      <path d={`M ${cx - rx} ${top} V ${bot} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bot} V ${top}`} fill={C.light} stroke={C.primary} strokeWidth={4} />
      <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={C.border} stroke={C.primary} strokeWidth={4} />
      <path d={`M ${cx - rx} ${bot} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bot}`} fill="none" stroke={C.primary} strokeWidth={4} />
      <line x1={cx} y1={top} x2={cx + rx} y2={top} stroke={C.rose} strokeWidth={4} />
      <T x={cx + rx / 2} y={top + 20} fontSize={16} fill={C.rose}>{v.r}</T>
      <line x1={cx + rx + 26} y1={top} x2={cx + rx + 26} y2={bot} stroke={C.navy} strokeWidth={3} />
      <path d={`M ${cx + rx + 20} ${top + 8} L ${cx + rx + 26} ${top} L ${cx + rx + 32} ${top + 8} M ${cx + rx + 20} ${bot - 8} L ${cx + rx + 26} ${bot} L ${cx + rx + 32} ${bot - 8}`} fill="none" stroke={C.navy} strokeWidth={3} />
      <T x={cx + rx + 40} y={(top + bot) / 2 + 5} fontSize={17} textAnchor="start">{v.h}</T>
    </>
  );
}

const VIEWBOX: Record<string, string> = { numberline: '0 20 360 140', bar: '0 45 360 145', seq: '0 50 360 150', ratio: '0 30 360 160' };

export function TestVisual({ visual }: { visual: Visual }) {
  const body = (() => {
    switch (visual.type) {
      case 'numberline': return <NumberLine v={visual} />;
      case 'bar': return <Bar v={visual} />;
      case 'bars': return <Bars v={visual} />;
      case 'rect': return <RectV v={visual} />;
      case 'pie': return <Pie v={visual} />;
      case 'seq': return <Seq v={visual} />;
      case 'ratio': return <Ratio v={visual} />;
      case 'coord': return <Coord v={visual} />;
      case 'circle': return <CircleV v={visual} />;
      case 'triangle': return <Triangle v={visual} />;
      case 'rtri': return <RTri v={visual} />;
      case 'similar': return <Similar v={visual} />;
      case 'inscribed': return <Inscribed v={visual} />;
      case 'unit': return <Unit v={visual} />;
      case 'cube': return <Cube v={visual} />;
      case 'cyl': return <Cyl v={visual} />;
    }
  })();
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border-2 border-border bg-primary-light/50 p-2" aria-hidden>
      <svg viewBox={VIEWBOX[visual.type] ?? '0 0 360 210'} className="h-auto w-full">{body}</svg>
    </div>
  );
}
