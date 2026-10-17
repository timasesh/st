import React, { useEffect, useState } from 'react';
import { HelpCircle, Star, Award, ShieldCheck, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import LoopVideo from './LoopVideo';

const FEATURE_ITEMS = [
  {
    id: 'teachers',
    title: 'Живые уроки',
    description: 'Преподаватель видит экран ребёнка, объясняет на доске и отвечает на вопросы сразу — как в классе, только дома.',
    tag: 'с учителем онлайн',
  },
  {
    id: 'quizzes',
    title: 'Квизы после урока',
    description: '5–10 минут на платформе — и сразу видно, что запомнилось. Без зубрёжки и долгих домашних на вечер.',
    tag: 'закрепление',
  },
  {
    id: 'gamification',
    title: 'Звёзды → призы',
    description: 'За уроки и квизы — звёзды. Стикерпак за 5★, блокнот за 7★, футболка за 10★, рюкзак за 12★.',
    tag: 'реальные награды',
  },
];

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { type: 'spring' as const, stiffness: 90, damping: 18, delay: i * 0.08 },
});

function LiveMock() {
  return (
    <div className="relative mt-6 md:mt-0 md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2 w-full md:w-[46%]" aria-hidden>
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 shadow-[0_24px_50px_rgba(37,99,235,0.3)]">
        <div className="flex items-center gap-2 text-[11px] font-extrabold text-white/90 mb-3">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> LIVE · урок математики
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 rounded-2xl bg-white p-4 font-display font-extrabold text-foreground leading-tight">
            <div className="text-lg">2x + 6 = 14</div>
            <div className="text-lg text-muted">2x = 14 − 6</div>
            <motion.div
              className="text-2xl text-primary origin-left"
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              x = 4
            </motion.div>
          </div>
          <div className="col-span-2 flex flex-col gap-3">
            {['bg-sky-300', 'bg-amber-300'].map((c, i) => (
              <div key={i} className={`flex-1 rounded-2xl ${c} grid place-items-center relative overflow-hidden`}>
                <div className="w-7 h-7 rounded-full bg-white/80" />
                <div className="absolute bottom-0 w-14 h-6 rounded-t-full bg-white/80" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizMock() {
  const reduce = useReducedMotion();
  const [sel, setSel] = useState(reduce ? 1 : -1);
  useEffect(() => {
    if (reduce) return;
    const seq = [-1, 1, 1, 1];
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % seq.length; setSel(seq[i]); }, 1100);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className="mt-6 grid grid-cols-2 gap-2.5" aria-hidden>
      {['2', '4', '6', '8'].map((o, i) => {
        const ok = sel === i;
        return (
          <div
            key={o}
            className={`flex items-center gap-2.5 rounded-2xl border-2 px-3 py-3 font-display font-extrabold text-lg transition-all duration-300 ${
              ok ? 'border-emerald-400 bg-emerald-50 text-emerald-700 scale-[1.03]' : 'border-slate-200 bg-slate-50 text-foreground'
            } ${sel !== -1 && !ok ? 'opacity-50' : ''}`}
          >
            <span className={`grid place-items-center w-6 h-6 rounded-full text-xs ${ok ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-muted'}`}>
              {ok ? <Check className="w-3.5 h-3.5" strokeWidth={3.5} /> : 'ABCD'[i]}
            </span>
            {o}
          </div>
        );
      })}
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="py-24 sm:py-28 bg-surface relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="eyebrow">Чем мы отличаемся</span>
          <h2 className="section-title">Не просто репетитор — целая экосистема</h2>
          <p className="text-muted text-base sm:text-lg">
            Программа математического образовательного центра с механиками из любимых игр: уровни, звёзды и награды, за которые хочется стараться.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
          <motion.article {...reveal(0)} className="bento-card md:col-span-4 p-7 sm:p-9 md:min-h-[21rem]">
            <div className="md:max-w-[46%] space-y-4 relative z-10">
              <span className="eyebrow">{FEATURE_ITEMS[0].tag}</span>
              <div className="w-12 h-12 rounded-2xl bg-primary text-white grid place-items-center shadow-lg shadow-primary/30">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-display font-extrabold text-foreground text-2xl sm:text-3xl tracking-tight">{FEATURE_ITEMS[0].title}</h3>
              <p className="text-muted leading-relaxed">{FEATURE_ITEMS[0].description}</p>
            </div>
            <LiveMock />
          </motion.article>

          <motion.article {...reveal(1)} className="bento-card md:col-span-2 p-7 sm:p-8">
            <span className="eyebrow">{FEATURE_ITEMS[1].tag}</span>
            <div className="w-12 h-12 rounded-2xl bg-accent text-white grid place-items-center shadow-lg shadow-accent/30 mt-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-extrabold text-foreground text-2xl tracking-tight mt-4">{FEATURE_ITEMS[1].title}</h3>
            <p className="text-muted leading-relaxed mt-3 text-[15px]">{FEATURE_ITEMS[1].description}</p>
            <QuizMock />
          </motion.article>

          <motion.article {...reveal(2)} className="bento-card bento-dark md:col-span-6 p-7 sm:p-9">
            <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full hero-glow" aria-hidden />
            <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <span className="eyebrow eyebrow-dark">{FEATURE_ITEMS[2].tag}</span>
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-navy grid place-items-center shadow-lg shadow-amber-400/30">
                  <Star className="w-6 h-6 fill-navy" />
                </div>
                <h3 className="font-display font-extrabold text-2xl sm:text-4xl tracking-tight">{FEATURE_ITEMS[2].title}</h3>
                <p className="text-blue-100/80 leading-relaxed max-w-xl">{FEATURE_ITEMS[2].description}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {[['Стикерпак', 5], ['Блокнот', 7], ['Футболка', 10], ['Рюкзак', 12]].map(([n, s]) => (
                    <span key={n} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-sm font-bold">
                      {n}
                      <span className="inline-flex items-center gap-1 text-amber-300"><Star className="w-3.5 h-3.5 fill-amber-300" />{s}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-5">
                <div className="rounded-[1.75rem] overflow-hidden border border-white/15 shadow-[0_30px_70px_rgba(2,6,40,0.5)] max-w-sm mx-auto">
                  <LoopVideo name="gifts-reveal" alt="Призы, которые можно получить за звёзды: стикерпак, блокнот, футболка и рюкзак" />
                </div>
              </div>
            </div>
          </motion.article>
        </div>

        <motion.div
          {...reveal(0)}
          className="mt-8 p-8 sm:p-10 rounded-[2rem] bg-gradient-to-br from-primary to-accent-dark text-white relative overflow-hidden shadow-[0_30px_70px_rgba(37,99,235,0.25)]"
        >
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-24 -bottom-16 w-40 h-40 rounded-full bg-sky-300/20 pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2">
              <h3 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight">
                Большинство учеников замечают прогресс уже в первый месяц
              </h3>
              <p className="opacity-90 text-sm sm:text-base max-w-2xl">
                Когда ребёнок видит свой уровень, звёзды и реальные призы — учёба перестаёт быть «надо» и становится «хочу».
              </p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <a
                href="#free-trial"
                className="inline-flex items-center gap-2 bg-white text-primary hover:bg-primary-light px-6 py-3.5 rounded-2xl font-display font-extrabold text-sm sm:text-base transition-all hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 min-h-12"
              >
                Записаться на пробный
                <ShieldCheck className="w-5 h-5" />
              </a>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
