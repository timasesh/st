import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, ArrowRight, Star, Zap } from 'lucide-react';
import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { whatsappUrl } from '../constants';
import LoopVideo from './LoopVideo';

interface HeroProps {
  onBookTrial: () => void;
  stars: number;
}

const WORD = {
  hidden: { opacity: 0, y: 28, rotateX: -40 },
  show: { opacity: 1, y: 0, rotateX: 0 },
};

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

function Headline() {
  const reduce = useReducedMotion();
  const words = [
    { t: 'учёба,' },
    { t: 'которая' },
    { t: 'похожа', shine: true },
    { t: 'на игру', shine: true },
  ];
  return (
    <h1 className="font-display font-extrabold tracking-[-0.035em] leading-[1.04] text-[clamp(3rem,1.4rem+6.4vw,5.6rem)] [perspective:800px]">
      <motion.span
        className="block"
        initial={reduce ? false : 'hidden'}
        animate="show"
        transition={{ staggerChildren: 0.09, delayChildren: 0.15 }}
      >
        {words.map((w, i) => (
          <motion.span
            key={i}
            variants={WORD}
            transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            className={`inline-block mr-[0.28em] last:mr-0 ${w.shine ? 'text-shine' : ''}`}
          >
            {w.t}
          </motion.span>
        ))}
      </motion.span>
    </h1>
  );
}

export default function Hero({ onBookTrial, stars }: HeroProps) {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const yVideo = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 70]);
  const yChipA = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -50]);
  const yChipB = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);

  // subtle pointer tilt of the video frame
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  // pause decorative CSS loops once the hero leaves the viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle('fx-paused', !e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="home"
      ref={sectionRef}
      className="hero-dark relative min-h-screen pt-28 lg:pt-24 pb-24 lg:pb-28 flex items-center overflow-hidden rounded-b-[2.25rem] sm:rounded-b-[4rem]"
    >
      <div className="grain" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-10 items-center lg:items-start">

          <div className="lg:col-span-6 space-y-8 text-center lg:text-left lg:pt-10">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="eyebrow eyebrow-dark glass !px-5 !py-2.5 !text-[0.95rem] sm:!text-base"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              Математика, 5–9 классы: набор открыт
            </motion.div>

            <Headline />

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-blue-50/95 text-xl sm:text-2xl leading-[1.55] max-w-2xl mx-auto lg:mx-0"
            >
              Живые уроки математики для 5–9 классов онлайн. После каждого занятия квиз,
              за него звёзды, а звёзды меняются на призы. Первый пробный урок бесплатно.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.62 }}
              className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center lg:justify-start gap-3"
            >
              <button
                type="button"
                onClick={onBookTrial}
                className="cta-primary group px-7 py-4 rounded-2xl font-display font-extrabold text-lg sm:text-xl whitespace-nowrap w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 min-h-14"
              >
                Записаться на пробный
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>

              <a
                href={whatsappUrl('Здравствуйте! Хочу записаться на пробный урок математики.')}
                target="_blank"
                rel="noreferrer"
                className="glass px-7 py-4 rounded-2xl font-bold text-lg sm:text-xl whitespace-nowrap text-white hover:bg-white/15 transition-colors w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 min-h-14"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                Написать в WhatsApp
              </a>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="space-y-4 pt-1"
            >
              <p className="text-base sm:text-lg text-blue-100/85 max-w-xl mx-auto lg:mx-0">
                Занятия ведут опытные преподаватели, которые умеют объяснять просто и интересно.
              </p>
              <dl className="grid grid-cols-3 sm:flex sm:flex-wrap items-stretch justify-center lg:justify-start gap-2 sm:gap-3">
                {[
                  { value: <>5–9</>, label: 'классы, математика' },
                  { value: <>1 урок</>, label: 'пробный бесплатно' },
                  { value: <CountUp to={60} suffix=" мин" />, label: 'длительность урока' },
                ].map((stat) => (
                  <div key={stat.label} className="glass rounded-2xl px-3 sm:px-5 py-3 text-left">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="font-display font-extrabold text-2xl sm:text-3xl leading-none tabular-nums">{stat.value}</dd>
                    <div className="text-sm text-blue-100/85 mt-1.5" aria-hidden>{stat.label}</div>
                  </div>
                ))}
              </dl>
            </motion.div>
          </div>

          <div className="lg:col-span-6 relative flex justify-center lg:-mt-2">
            <motion.div style={{ y: yVideo }} className="relative w-full max-w-[34rem]">
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 80, damping: 16, delay: 0.25 }}
                onPointerMove={onMove}
                onPointerLeave={onLeave}
                style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
                className="relative rounded-[2.25rem] p-2.5 sm:p-3 glass"
              >
                <div className="absolute -inset-10 -z-10 hero-glow" aria-hidden />
                <LoopVideo
                  name="hero-loop"
                  alt="Как проходит обучение в StudyTask: урок, квиз, звёзды и приз"
                  className="rounded-[1.7rem]"
                />
              </motion.div>

              <motion.div style={{ y: yChipA }} className="absolute left-4 sm:left-8 -bottom-9 z-20">
                <div className="animate-chip-float rounded-2xl px-4 py-3 flex items-center gap-3 bg-[#0f1b4d]/95 border border-white/15 shadow-[0_18px_40px_rgba(2,6,40,0.55)]">
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-amber-400/20">
                    <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
                  </span>
                  <div className="leading-tight">
                    <div className="font-display font-extrabold text-xl tabular-nums">{stars + 15}</div>
                    <div className="text-[11px] text-blue-200/80">звёзд у Ивана</div>
                  </div>
                </div>
              </motion.div>

              <motion.div style={{ y: yChipB }} className="absolute right-4 sm:right-8 -top-4 z-20">
                <div className="animate-chip-float-2 rounded-2xl px-4 py-3 flex items-center gap-2.5 bg-emerald-500 text-white shadow-[0_18px_40px_rgba(16,185,129,0.35)]">
                  <Zap className="w-4 h-4 fill-white" />
                  <span className="text-sm font-extrabold">+50 XP за урок</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="marquee absolute bottom-6 inset-x-0 overflow-hidden opacity-80 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]" aria-hidden>
        <div className="marquee-track gap-10 text-blue-200/55 font-display font-extrabold text-sm sm:text-base uppercase tracking-[0.18em]">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex shrink-0 items-center gap-10 pr-10">
              {['Урок', 'Квиз', 'Звёзды', 'Приз', 'Урок', 'Квиз', 'Звёзды', 'Приз'].map((w, i) => (
                <span key={i} className="flex items-center gap-10">
                  {w}
                  <Star className="w-3.5 h-3.5 text-amber-300/70 fill-amber-300/70" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
