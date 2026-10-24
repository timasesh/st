import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { Laptop, ClipboardCheck, Gift, ArrowRight } from 'lucide-react';
import GiftKit from './GiftKit';
import LoopVideo from './LoopVideo';

const STEPS = [
  {
    number: '1',
    title: 'Урок с учителем',
    description: 'Подключаетесь по видеосвязи. Учитель объясняет тему, рисует на доске, задаёт вопросы — всё в реальном времени.',
    icon: Laptop,
    color: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    number: '2',
    title: 'Квиз на платформе',
    description: 'Сразу после урока — короткий квиз на 5–10 минут. Ребёнок видит результат, вы — статистику в кабинете родителя.',
    icon: ClipboardCheck,
    color: 'text-violet-600 bg-violet-50 border-violet-200',
  },
  {
    number: '3',
    title: 'Звёзды и рейтинг',
    description: 'За правильные ответы и активность — звёзды. Чем их больше, тем выше твоё место в рейтинге.',
    icon: Gift,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
];

export default function HowItWorks() {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 65%', 'end 55%'] });
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  return (
    <section id="how" className="py-24 sm:py-28 section-soft relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="eyebrow">Три простых шага</span>
          <h2 className="section-title">Как проходит неделя с <span className="hl">Study Task</span></h2>
          <p className="text-muted text-base sm:text-lg">
            Урок → квиз → награда. Цикл повторяется, и каждый раз ребёнок чуть ближе к следующему уровню.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 lg:sticky lg:top-28"
          >
            <div className="relative rounded-[2rem] p-2.5 bg-gradient-to-br from-navy to-blue-900 shadow-[0_40px_90px_rgba(23,37,84,0.35)]">
              <LoopVideo
                name="how-it-works"
                alt="Как это работает: урок, квиз, звёзды и приз"
                aspect="aspect-video"
                className="rounded-[1.5rem]"
              />
            </div>
          </motion.div>

          <div className="lg:col-span-5 relative">
            <div className="absolute left-[1.55rem] top-4 bottom-4 w-[3px] rounded-full bg-blue-100" aria-hidden />
            <motion.div
              aria-hidden
              style={{ scaleY: reduce ? 1 : line }}
              className="absolute left-[1.55rem] top-4 bottom-4 w-[3px] rounded-full origin-top bg-gradient-to-b from-primary via-sky-400 to-amber-400"
            />
            <ol ref={listRef} className="relative space-y-6">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.li
                    key={step.number}
                    initial={reduce ? false : { opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ type: 'spring', stiffness: 90, damping: 18, delay: index * 0.06 }}
                    className="relative pl-16"
                  >
                    <div className={`absolute left-0 top-0 w-[3.1rem] h-[3.1rem] rounded-2xl border-2 grid place-items-center bg-white shadow-md ${step.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="bento-card !rounded-3xl p-6">
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-3xl font-extrabold text-blue-200 leading-none">{step.number}</span>
                        <h3 className="font-display font-extrabold text-foreground text-xl tracking-tight">{step.title}</h3>
                      </div>
                      <p className="text-muted text-[15px] leading-relaxed mt-3">{step.description}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </div>

        <GiftKit />

        <div className="mt-10 text-center bento-card !rounded-3xl p-6 max-w-3xl mx-auto">
          <p className="text-muted text-sm mb-4">
            Занятия онлайн. Ребёнок занимается с преподавателем, вы видите прогресс в телефоне.
          </p>
          <a
            href="#free-trial"
            className="inline-flex items-center gap-2 text-primary hover:text-accent-dark font-display font-extrabold text-sm cursor-pointer min-h-11"
          >
            Записаться на пробный урок
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}
