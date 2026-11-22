import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Calculator, Atom, Cpu, Code2 } from 'lucide-react';

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { type: 'spring' as const, stiffness: 90, damping: 18, delay: i * 0.08 },
});

function MathArt() {
  return (
    <div className="mt-5 flex items-center gap-4" aria-hidden>
      <div className="rounded-2xl bg-white/15 border border-white/20 px-4 py-3 font-display font-extrabold text-lg leading-tight">
        <div>x² − 5x + 6 = 0</div>
        <div className="text-amber-300">x = 2 или x = 3</div>
      </div>
      <svg viewBox="0 0 80 64" className="h-16 w-20 shrink-0">
        <polygon points="8,56 72,56 8,8" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M8 48h8v8" fill="none" stroke="#fcd34d" strokeWidth="2.5" />
        <text x="30" y="50" fill="#fcd34d" fontSize="11" fontWeight="800">a</text>
      </svg>
    </div>
  );
}

function PhysicsArt({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="mt-5 flex items-center gap-4" aria-hidden>
      <div className="relative h-20 w-24 shrink-0">
        <div className="absolute left-1/2 top-0 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/60" />
        <motion.div
          className="absolute left-1/2 top-1 h-[4.2rem] w-0.5 origin-top bg-white/70"
          animate={reduce ? undefined : { rotate: [-28, 28, -28] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ rotate: reduce ? -20 : undefined }}
        >
          <span className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.7)]" />
        </motion.div>
      </div>
      <div className="rounded-2xl bg-white/15 border border-white/20 px-4 py-3 font-display font-extrabold leading-tight">
        <div className="text-lg">F = m · a</div>
        <div className="text-sm text-white/80">E = m · g · h</div>
      </div>
    </div>
  );
}

function InfoArt({ reduce }: { reduce: boolean | null }) {
  const bits = '1011001010110100'.split('');
  return (
    <div className="mt-5 flex items-center gap-4" aria-hidden>
      <div className="grid grid-cols-8 gap-1.5 rounded-2xl bg-white/15 border border-white/20 p-3">
        {bits.map((b, i) => (
          <motion.span
            key={i}
            className={`grid h-5 w-5 place-items-center rounded-md text-[11px] font-extrabold ${b === '1' ? 'bg-emerald-300 text-emerald-950' : 'bg-white/20 text-white/80'}`}
            animate={reduce ? undefined : { opacity: [1, 0.45, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: (i % 8) * 0.18 }}
          >{b}</motion.span>
        ))}
      </div>
      <div className="font-display font-extrabold leading-tight">
        <div className="text-lg">1011₂ = 11</div>
        <div className="text-sm text-white/80">алгоритмы · данные</div>
      </div>
    </div>
  );
}

function CodeArt({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="mt-5 rounded-2xl bg-slate-950/70 border border-white/15 p-4 font-mono text-[13px] leading-6 text-left" aria-hidden>
      <div className="mb-2 flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-400" /><i className="h-2.5 w-2.5 rounded-full bg-amber-300" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div>
      <div><span className="text-violet-300">for</span> <span className="text-sky-200">i</span> <span className="text-violet-300">in</span> <span className="text-amber-200">range</span>(<span className="text-emerald-300">3</span>):</div>
      <div className="pl-5"><span className="text-amber-200">print</span>(<span className="text-emerald-300">"Привет, мир!"</span>)</div>
      <div className="text-white/60">
        &gt; Привет, мир!
        <motion.span className="ml-1 inline-block h-4 w-2 translate-y-0.5 bg-emerald-300" animate={reduce ? undefined : { opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
      </div>
    </div>
  );
}

export default function Subjects() {
  const reduce = useReducedMotion();
  return (
    <section id="subjects" className="py-24 sm:py-28 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="eyebrow">Предметы</span>
          <h2 className="section-title">Четыре направления — <span className="hl">один центр</span></h2>
          <p className="text-muted text-base sm:text-lg">
            Математика, физика, информатика и программирование: живые уроки онлайн, квизы после занятий и звёзды в общем рейтинге
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.article {...reveal(0)} className="rounded-[2rem] p-7 sm:p-8 text-white bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_24px_50px_rgba(37,99,235,0.25)] relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Calculator className="h-6 w-6" /></span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">Математика</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Алгебра', 'Геометрия', '1–11 классы'].map((t) => <span key={t} className="rounded-full border border-white/25 bg-white/15 px-3.5 py-1 text-sm font-bold">{t}</span>)}
              </div>
              <p className="mt-4 text-blue-50/90 leading-relaxed">Уравнения, дроби, функции, фигуры и доказательства — от школьной программы до олимпиадных задач.</p>
              <MathArt />
            </div>
          </motion.article>

          <motion.article {...reveal(1)} className="rounded-[2rem] p-7 sm:p-8 text-white bg-gradient-to-br from-fuchsia-600 to-purple-700 shadow-[0_24px_50px_rgba(147,51,234,0.25)] relative overflow-hidden">
            <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-white/10" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Atom className="h-6 w-6" /></span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">Физика</h3>
              </div>
              <p className="mt-4 text-purple-50/90 leading-relaxed">Законы, которые объясняют мир вокруг: механика, электричество, свет. Разбираем на опытах и задачах, а не зубрим формулы.</p>
              <PhysicsArt reduce={reduce} />
            </div>
          </motion.article>

          <motion.article {...reveal(2)} className="rounded-[2rem] p-7 sm:p-8 text-white bg-gradient-to-br from-emerald-600 to-teal-700 shadow-[0_24px_50px_rgba(13,148,136,0.25)] relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-white/10" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Cpu className="h-6 w-6" /></span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">Информатика</h3>
              </div>
              <p className="mt-4 text-emerald-50/90 leading-relaxed">Как устроены компьютеры, данные и алгоритмы: системы счисления, логика, таблицы и задачи на мышление.</p>
              <InfoArt reduce={reduce} />
            </div>
          </motion.article>

          <motion.article {...reveal(3)} className="rounded-[2rem] p-7 sm:p-8 text-white bg-gradient-to-br from-slate-800 to-slate-950 shadow-[0_24px_50px_rgba(15,23,42,0.3)] relative overflow-hidden">
            <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-sky-400/10" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><Code2 className="h-6 w-6" /></span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">Программирование</h3>
              </div>
              <p className="mt-4 text-slate-200/90 leading-relaxed">Пишем свой код с первых занятий: программы, игры и боты. Учимся думать как разработчик.</p>
              <CodeArt reduce={reduce} />
            </div>
          </motion.article>
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Не знаете, с чего начать? <a href="#free-trial" className="font-bold text-primary hover:underline">Запишитесь на пробный урок</a> — подскажем подходящий предмет и уровень.
        </p>
      </div>
    </section>
  );
}
