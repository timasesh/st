import { useEffect, useState } from 'react';
import { Rocket, Star, Sparkles } from 'lucide-react';

const CYCLE_SIZE = 25;
const PASS_INTERVAL_MS = 2400;

function getStage(score: number) {
  if (score < 20) return 0;
  if (score < 40) return 1;
  if (score < 60) return 2;
  if (score < 80) return 3;
  if (score < 100) return 4;
  if (score < 120) return 5;
  if (score < 140) return 6;
  return 7;
}

const STAGE_NAMES = ['Облачный маршрут', 'Луна', 'Венера', 'Марс', 'Юпитер', 'Солнце', 'Чёрная дыра', 'Глубокий космос'];
const BOOK_COLORS = ['#2874f0', '#e35353', '#9651dc', '#1aa989', '#ed9c28', '#4b70c6'];
const GAP_CENTERS = [300, 390, 445, 330, 425, 285];

function BookPair({ x, index }: { key?: number; x: number; index: number }) {
  const gapCenter = GAP_CENTERS[index % GAP_CENTERS.length];
  const gap = 235;
  const topHeight = gapCenter - gap / 2;
  const bottomY = gapCenter + gap / 2;
  const color = BOOK_COLORS[index % BOOK_COLORS.length];
  return <g transform={`translate(${x} 0)`}>
    <rect x="0" y="-8" width="78" height={topHeight + 8} rx="7" fill="#10224b" opacity=".28" transform="translate(7 9)" />
    <rect x="0" y="-8" width="78" height={topHeight + 8} rx="7" fill={color} stroke="rgba(255,255,255,.5)" strokeWidth="3" />
    <rect x="10" y="3" width="9" height={Math.max(0, topHeight - 8)} rx="4" fill="rgba(255,255,255,.45)" />
    <path d={`M0 ${topHeight - 26} H78 V${topHeight - 8} Q39 ${topHeight + 3} 0 ${topHeight - 8}Z`} fill="#e9f4ff" opacity=".88" />
    <rect x="0" y={bottomY} width="78" height={920 - bottomY} rx="7" fill="#10224b" opacity=".28" transform="translate(7 9)" />
    <rect x="0" y={bottomY} width="78" height={920 - bottomY} rx="7" fill={color} stroke="rgba(255,255,255,.5)" strokeWidth="3" />
    <rect x="10" y={bottomY + 10} width="9" height={Math.max(0, 905 - bottomY)} rx="4" fill="rgba(255,255,255,.45)" />
    <path d={`M0 ${bottomY + 14} Q39 ${bottomY + 4} 78 ${bottomY + 14}`} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="4" />
    <circle cx="61" cy={bottomY + 34} r="4" fill="#fff" opacity=".8" />
  </g>;
}

function SpaceLandmark({ stage }: { stage: number }) {
  if (stage === 0 || stage === 7) return null;
  if (stage === 6) return <g className="login-landmark" transform="translate(970 190)"><circle r="86" fill="#060611" stroke="#7357ef" strokeWidth="9" /><ellipse rx="125" ry="32" fill="none" stroke="#cf89ff" strokeWidth="12" opacity=".7" transform="rotate(-22)" /><circle r="43" fill="#1b1238" /></g>;
  const fills = ['', '#d9e8ff', '#d89b58', '#bd4839', '#d8b97f', '#ffae38'];
  const size = stage === 5 ? 88 : 64;
  return <g className="login-landmark" transform="translate(960 184)">
    {stage === 5 && <circle r="112" fill="#ffc144" opacity=".2" />}
    <circle r={size} fill={fills[stage]} stroke="rgba(255,255,255,.45)" strokeWidth="5" />
    {stage === 1 && <><circle cx="-24" cy="-11" r="17" fill="#abc5ea" opacity=".45" /><circle cx="22" cy="25" r="12" fill="#abc5ea" opacity=".45" /></>}
    {stage === 3 && <><path d="M-52 5 Q0 -20 54 8" fill="none" stroke="#f3a182" strokeWidth="13" opacity=".65" /><path d="M-35 39 Q0 20 40 42" fill="none" stroke="#983629" strokeWidth="8" opacity=".6" /></>}
    {stage === 4 && <ellipse rx="105" ry="23" fill="none" stroke="#f0d59c" strokeWidth="9" transform="rotate(-15)" />}
    {stage === 5 && <><path d="M0 -113 V-139 M0 113 V139 M-113 0 H-139 M113 0 H139 M-80 -80 L-99 -99 M80 80 L99 99 M80 -80 L99 -99 M-80 80 L-99 99" stroke="#ffd166" strokeWidth="12" strokeLinecap="round" /><circle r="43" fill="#ffe78c" opacity=".55" /></>}
  </g>;
}

export default function SkyQuestLoginScene() {
  const [totalPassed, setTotalPassed] = useState(0);
  const stage = getStage(totalPassed);
  const cyclePasses = totalPassed === 0 ? 0 : ((totalPassed - 1) % CYCLE_SIZE) + 1;
  const starCount = Math.floor(totalPassed / 5);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTotalPassed((value) => {
        return value + 1;
      });
    }, PASS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return <section aria-label="Демонстрация игры Sky Quest" className="login-skyquest relative h-[260px] overflow-hidden bg-slate-950 sm:h-[430px] lg:h-full lg:min-h-dvh">
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="loginSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#51b8f5" /><stop offset=".66" stopColor="#9addff" /><stop offset="1" stopColor="#d7f3ff" /></linearGradient>
        <linearGradient id="loginSpace" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={stage < 2 ? '#050817' : stage < 5 ? '#111936' : '#080d20'} /><stop offset=".56" stopColor={stage < 3 ? '#111936' : stage < 6 ? '#1b162d' : '#080d20'} /><stop offset="1" stopColor="#080d20" /></linearGradient>
        <radialGradient id="loginGlow"><stop offset="0" stopColor="#7dd3fc" stopOpacity=".26" /><stop offset="1" stopColor="#7dd3fc" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1200" height="720" fill={stage === 0 ? 'url(#loginSky)' : 'url(#loginSpace)'} className="login-background" />
      {stage === 0 ? <g className="login-clouds" fill="#fff" opacity=".65">
        <ellipse cx="175" cy="160" rx="115" ry="34" /><ellipse cx="143" cy="147" rx="48" ry="31" /><ellipse cx="208" cy="143" rx="54" ry="39" />
        <ellipse cx="1015" cy="510" rx="140" ry="38" /><ellipse cx="969" cy="496" rx="54" ry="32" /><ellipse cx="1050" cy="486" rx="63" ry="48" />
        <ellipse cx="563" cy="109" rx="95" ry="27" /><ellipse cx="535" cy="100" rx="38" ry="24" /><ellipse cx="584" cy="96" rx="45" ry="32" />
      </g> : <g fill="#fff">
        {Array.from({ length: 56 }, (_, i) => <circle key={i} cx={(i * 197 + 57) % 1200} cy={(i * 113 + 37) % 650} r={i % 5 === 0 ? 2.8 : 1.7} opacity={0.32 + ((i * 17) % 60) / 100} className="login-twinkle" style={{ animationDelay: `${(i % 14) * -0.23}s` }} />)}
        <circle cx="900" cy="190" r="230" fill="url(#loginGlow)" />
        <SpaceLandmark stage={stage} />
      </g>}
      <path d="M0 820 Q230 785 470 820 T950 812 T1400 824 V930 H0Z" fill={stage === 0 ? '#8ccf82' : '#070b18'} opacity={stage === 0 ? '.22' : '.34'} />
      <g className="login-obstacle-train">
        {Array.from({ length: 12 }, (_, i) => <BookPair key={i} x={530 + i * 280} index={i} />)}
        <animateTransform attributeName="transform" type="translate" from="0 0" to="-1680 0" dur="14.4s" repeatCount="indefinite" />
      </g>
      <g className="login-rocket-path"><image href="/flappy/%D1%80%D0%B0%D0%BA%D0%B5%D1%82%D0%B0.png" x="175" y="340" width="120" height="58" preserveAspectRatio="xMidYMid meet" /></g>
      <g className="login-engine-sparks" fill="#fff3a3"><circle cx="165" cy="366" r="3" /><circle cx="145" cy="380" r="2" /><circle cx="158" cy="348" r="2.5" /></g>
    </svg>

    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-8 lg:p-10">
      <div className="rounded-2xl border border-white/20 bg-slate-950/25 px-4 py-3 text-white shadow-lg backdrop-blur-md"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-sky-100/75">Sky Quest · автополёт</p><p className="mt-1 flex items-center gap-2 font-display text-2xl font-black tabular-nums sm:text-3xl"><Rocket className="h-5 w-5 text-sky-200" />{cyclePasses}<span className="text-sm font-bold text-white/55">/ {CYCLE_SIZE}</span></p></div>
      <div className="flex items-center gap-2 rounded-2xl border border-amber-200/30 bg-slate-950/30 px-4 py-3 text-amber-100 shadow-lg backdrop-blur-md"><Star className="h-5 w-5 fill-amber-300 text-amber-300" /><span className="font-display text-xl font-black tabular-nums sm:text-2xl">{starCount}</span><span className="hidden text-xs font-bold text-amber-100/70 sm:inline">звёзд</span></div>
    </div>

    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/15 bg-slate-950/35 p-4 text-white shadow-xl backdrop-blur-md sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-sky-200" />{STAGE_NAMES[stage]}</p><p className="text-xs font-semibold text-white/65">{totalPassed >= CYCLE_SIZE ? `Круг ${Math.floor(totalPassed / CYCLE_SIZE) + 1}` : 'Первый круг'}</p></div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${CYCLE_SIZE}, minmax(0, 1fr))` }} aria-hidden="true">{Array.from({ length: CYCLE_SIZE }, (_, i) => <span key={i} className={`h-1.5 rounded-full transition-colors duration-500 ${cyclePasses > i ? i % 5 === 4 ? 'bg-amber-300 shadow-[0_0_8px_#fcd34d]' : 'bg-sky-200' : 'bg-white/20'}`} />)}</div>
        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-white/65"><span>Очки: <strong className="text-white">{totalPassed}</strong></span><span>Звезда за каждые 5 пролётов</span></div>
      </div>
      {totalPassed > 0 && totalPassed % 5 === 0 && <div key={totalPassed} className="login-star-reward absolute bottom-32 right-8 flex items-center gap-2 rounded-full border border-amber-200/40 bg-amber-300 px-4 py-2 font-display text-sm font-black text-amber-950 shadow-xl sm:bottom-36 sm:right-12"><Star className="h-5 w-5 fill-amber-600 text-amber-600" /> +1 звезда</div>}
    </div>
  </section>;
}
