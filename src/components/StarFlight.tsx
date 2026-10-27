import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';

// Большая звезда появляется в центре экрана и летит к счётчику звёзд в шапке.
// Счётчик (элемент с data-star-counter) увеличивается только после приземления — см. onLanded.
export default function StarFlight({ amount, onLanded }: { amount: number; onLanded: () => void }) {
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const landed = useRef(false);

  useLayoutEffect(() => {
    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-star-counter]'));
    const visible = counters.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const rect = visible?.getBoundingClientRect();
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    // Если счётчика не видно — звезда просто улетает вверх экрана.
    setTarget(rect ? { x: rect.left + rect.width * 0.3 - cx, y: rect.top + rect.height / 2 - cy } : { x: 0, y: -cy + 40 });
  }, []);

  // Страховка: если анимация не запустится, всё равно отдаём управление счётчику.
  useEffect(() => {
    const timer = window.setTimeout(() => { if (!landed.current) { landed.current = true; onLanded(); } }, 3600);
    return () => window.clearTimeout(timer);
  }, [onLanded]);

  if (!target) return null;
  const sparks = Array.from({ length: 10 }, (_, index) => index);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[600] grid place-items-center">
      <motion.div
        className="absolute inset-0 bg-slate-900/25"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.2, times: [0, 0.18, 0.62, 1], ease: 'easeInOut' }}
      />
      {sparks.map((index) => {
        const angle = (index / sparks.length) * Math.PI * 2;
        return (
          <motion.span
            key={index}
            className="absolute h-3 w-3 rounded-full bg-amber-300"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: Math.cos(angle) * 130, y: Math.sin(angle) * 130, opacity: [0, 1, 0], scale: [0.4, 1, 0.2] }}
            transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
          />
        );
      })}
      <motion.div
        className="absolute flex flex-col items-center"
        initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
        animate={{
          x: [0, 0, 0, target.x],
          y: [0, 0, 0, target.y],
          scale: [0.2, 1.25, 1, 0.12],
          opacity: [0, 1, 1, 1],
        }}
        transition={{ duration: 2.2, times: [0, 0.22, 0.58, 1], ease: 'easeInOut' }}
        onAnimationComplete={() => { if (!landed.current) { landed.current = true; onLanded(); } }}
      >
        <motion.div initial={{ rotate: -25 }} animate={{ rotate: [-25, 8, 0, 360] }} transition={{ duration: 2.2, times: [0, 0.22, 0.58, 1], ease: 'easeInOut' }}>
          <Star className="h-40 w-40 fill-amber-400 text-amber-500 drop-shadow-[0_8px_24px_rgba(245,158,11,0.55)]" strokeWidth={1.5} />
        </motion.div>
        <motion.span
          className="mt-1 rounded-full bg-white px-4 py-1 text-2xl font-extrabold text-amber-600 shadow-lg"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.2, times: [0, 0.2, 0.55, 0.62] }}
        >
          +{amount} {amount === 1 ? 'звезда' : 'звезды'}
        </motion.span>
      </motion.div>
    </div>
  );
}
