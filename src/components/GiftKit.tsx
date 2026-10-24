import React from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { Gift, PhoneCall } from 'lucide-react';
import { whatsappUrl } from '../constants';

type GiftItem = { id: string; name: string; stars: number; images: string[] };

// ▼▼▼ СЮДА ВПИСЫВАЕТЕ КАРТИНКИ ▼▼▼
// Файлы лежат в public/static/gifts/, путь в коде начинается с /static/gifts/...
// Несколько вариантов (например, блокноты) — просто несколько путей в images.
export const KIT_1: GiftItem[] = [
  { id: 'stickers', name: 'Стикерпак', stars: 5, images:  [
    '/static/gifts/stickers.webp',
  ] },
  { id: 'notebook', name: 'Блокнот', stars: 7, images: [
    '/static/gifts/notebook.webp',
  ] },
  { id: 'tshirt', name: 'Фирменная футболка', stars: 10, images: [
    '/static/gifts/tshirt.webp',
  ] },
  { id: 'backpack', name: 'Фирменный рюкзак', stars: 12, images: [
    '/static/gifts/backpack.webp',
  ] },
];
// ▲▲▲ ▲▲▲

export const KIT_PRICE = 24990; // тенге за весь набор

function Picture({ src, alt }: { src?: string; alt: string; key?: React.Key }) {
  return (
    <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100 overflow-hidden flex items-center justify-center">
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-contain p-3 drop-shadow-[0_14px_18px_rgba(30,64,175,0.2)]" />
      ) : (
        <Gift className="w-8 h-8 text-muted/50" aria-hidden />
      )}
    </div>
  );
}

function TiltCard({ children, index }: { children: React.ReactNode; index: number; key?: React.Key }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 220, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 220, damping: 20 });
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 100, damping: 16, delay: index * 0.08 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className="bento-card !rounded-3xl p-4 flex flex-col gap-3"
    >
      {children}
    </motion.li>
  );
}

export default function GiftKit() {
  const orderKit = () => {
    window.open(
      whatsappUrl(`Здравствуйте! Хочу заказать фирменный набор StudyTask (стикерпак, блокнот, футболка, рюкзак) — ${KIT_PRICE.toLocaleString('ru-RU')} ₸.`),
      '_blank',
    );
  };
  return (
    <div className="mt-16 bento-card !rounded-[2.25rem] p-6 sm:p-9">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-8">
        <div className="space-y-2">
          <span className="eyebrow">Фирменный набор</span>
          <h3 className="font-display font-extrabold text-foreground text-2xl sm:text-3xl tracking-tight">
            Мерч StudyTask
          </h3>
          <p className="text-muted text-sm">
            Набор покупается отдельно. Звёзды за уроки и квизы дают место в рейтинге учеников.
          </p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 px-6 py-4 text-center shadow-[0_16px_36px_rgba(245,158,11,0.35)]">
          <div className="text-xs font-extrabold text-amber-950/80">Весь набор</div>
          <div className="font-display font-extrabold text-amber-950 text-4xl leading-tight">{KIT_PRICE.toLocaleString('ru-RU')} ₸</div>
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {KIT_1.map((item, i) => {
          const variants = item.images.length ? item.images : [undefined];
          return (
            <TiltCard key={item.id} index={i}>
              <div className={`grid gap-2 ${variants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {variants.map((src, v) => (
                  <Picture key={v} src={src} alt={`${item.name}${variants.length > 1 ? `, вариант ${v + 1}` : ''}`} />
                ))}
              </div>
              <div className="mt-auto">
                <span className="font-display font-extrabold text-foreground text-sm leading-snug">{item.name}</span>
              </div>
            </TiltCard>
          );
        })}
      </ul>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={orderKit}
          className="px-8 py-3.5 rounded-[1.25rem] bg-primary hover:bg-primary-dark text-white font-display font-bold text-sm clay-btn flex items-center justify-center gap-2 cursor-pointer min-h-12"
        >
          <PhoneCall className="w-4.5 h-4.5" />
          <span>Заказать набор в WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
