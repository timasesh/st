import { useState } from 'react';
import { Lock } from 'lucide-react';
import { LEVEL_NAMES, LEVEL_STARS, MAX_LEVEL, RANKS, isMilestone, levelImage, rankOf, type LevelInfo } from '../shared/levels.js';

// Вкладка «Уровни». Должна выглядеть и считаться так же, как в Telegram-мини-приложении (src/tg/TgApp.tsx, Levels).
export default function StudentLevelsTab({ lv }: { lv: LevelInfo }) {
  const [sel, setSel] = useState(lv.level);
  const reached = sel <= lv.level;
  const rank = rankOf(sel);
  return (
    <section aria-labelledby="levels-title" className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Твой путь</p>
        <h2 id="levels-title" className="mt-1 font-display text-2xl font-extrabold">Уровни</h2>
        <p className="mt-1 text-sm text-slate-500">Звёзды за тесты и домашки поднимают тебя от Земли до Вселенной. Потраченные на призы звёзды уровень не снижают.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <img src={levelImage(lv.level)} alt={lv.name} width={150} height={150} className="mx-auto h-[150px] w-[150px] rounded-2xl" />
          <p className="mt-2 text-xs text-slate-500">{lv.rank.name} · уровень {lv.level} из {MAX_LEVEL}</p>
          <p className="font-display text-3xl font-extrabold">{lv.name}</p>
          <div role="progressbar" aria-label={`Прогресс до уровня ${lv.level + 1}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={lv.pct} className="mx-auto mt-3 h-2.5 max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width] duration-700 ease-out" style={{ width: `${lv.pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{lv.isMax ? 'Ты на вершине — Легенда StudyTask!' : `${lv.into} / ${lv.span} ★ · до уровня ${lv.level + 1} «${lv.nextName}» ещё ${lv.left} ★`}</p>
          <p className="text-xs text-slate-500">Всего заработано: {lv.earned} ★</p>
        </div>

        <div className={`flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 ${reached ? '' : 'text-slate-500'}`}>
          <img src={levelImage(sel)} alt="" width={72} height={72} className={`h-[72px] w-[72px] flex-none rounded-xl ${reached ? '' : 'opacity-60 grayscale'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">{rank.name} · уровень {sel}{isMilestone(sel) ? ' · веха' : ''}</p>
            <p className="font-display text-xl font-extrabold">{LEVEL_NAMES[sel - 1]}</p>
          </div>
          <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${reached ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{reached ? 'Открыт' : `${LEVEL_STARS[sel - 1]} ★`}</span>
        </div>
      </div>

      {RANKS.map((r, ri) => {
        const to = ri + 1 < RANKS.length ? RANKS[ri + 1].from - 1 : MAX_LEVEL;
        const ids = Array.from({ length: to - r.from + 1 }, (_, i) => r.from + i);
        return (
          <div key={r.id}>
            <p className="mb-1.5 px-0.5 text-sm" style={{ color: r.color }}><b>{r.name}</b> <span className="text-xs text-slate-500">· уровни {r.from}–{to}</span></p>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
              {ids.map((i) => {
                const ok = i <= lv.level;
                return (
                  <button key={i} type="button" aria-label={`Уровень ${i}: ${LEVEL_NAMES[i - 1]}`} onClick={() => setSel(i)}
                    className="relative rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    style={{ outline: i === lv.level ? '3px solid #1649E8' : i === sel ? '2px dashed #12266F' : 'none', outlineOffset: 2 }}>
                    <img src={levelImage(i)} alt="" loading="lazy" className="block w-full rounded-[10px]" style={{ filter: ok ? 'none' : 'grayscale(1)', opacity: ok ? 1 : 0.38 }} />
                    {!ok && <Lock className="absolute bottom-1 right-1 h-3.5 w-3.5 text-slate-700" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
