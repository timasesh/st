import React from 'react';
import { motion } from 'motion/react';
import { Star, Gift } from 'lucide-react';

type GiftItem = { id: string; name: string; stars: number; images: string[] };

// ▼▼▼ СЮДА ВПИСЫВАЕТЕ КАРТИНКИ ▼▼▼
// Файлы лежат в public/static/gifts/, путь в коде начинается с /static/gifts/...
// Несколько вариантов (например, блокноты) — просто несколько путей в images.
export const KIT_1: GiftItem[] = [
  { id: 'stickers', name: 'Стикерпак', stars: 5, images:  [
    '/static/gifts/набор-наклеек-1.png',
  ] },
  { id: 'notebook', name: 'Блокнот', stars: 7, images: [
    '/static/gifts/блокнот-1(3-штуки-на-выбор).png',
  ] },
  { id: 'tshirt', name: 'Фирменная футболка', stars: 10, images: [
    '/static/gifts/футболка.jpeg',
  ] },
  { id: 'backpack', name: 'Фирменный рюкзак', stars: 12, images: [
    '/static/gifts/рюкзак-(3-штуки-на-выбор).png',
  ] },
];
// ▲▲▲ ▲▲▲

const KIT_TOTAL = KIT_1.reduce((sum, g) => sum + g.stars, 0); // 34

function Stars({ n }: { n: number }) {
  return (
    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border-2 border-amber-200 rounded-full px-2.5 py-1">
      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
      {n}
    </span>
  );
}

function Picture({ src, alt }: { src?: string; alt: string; key?: React.Key }) {
  return (
    <div className="aspect-square rounded-2xl bg-primary-light border-2 border-border overflow-hidden flex items-center justify-center">
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-contain p-2" />
      ) : (
        <Gift className="w-8 h-8 text-muted/50" aria-hidden />
      )}
    </div>
  );
}

export default function GiftKit() {
  return (
    <div className="mt-12 clay-card p-6 sm:p-8 bg-surface">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-1">
          <span className="inline-block text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full border-2 border-border">
            Набор 1
          </span>
          <h3 className="font-display font-extrabold text-foreground text-xl sm:text-2xl">
            Что можно получить за звёзды
          </h3>
          <p className="text-muted text-sm">Звёзды копятся за уроки и квизы. Призы уже включены в тариф.</p>
        </div>
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-3 text-center shadow-[0_4px_0_#FCD34D]">
          <div className="text-xs font-bold text-amber-700">Чтобы получить весь набор</div>
          <div className="font-display font-extrabold text-amber-700 text-3xl leading-tight">{KIT_TOTAL} ★</div>
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {KIT_1.map((item, i) => {
          const variants = item.images.length ? item.images : [undefined];
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="clay-card-sm p-4 flex flex-col gap-3 bg-surface"
            >
              <div className={`grid gap-2 ${variants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {variants.map((src, v) => (
                  <Picture key={v} src={src} alt={`${item.name}${variants.length > 1 ? `, вариант ${v + 1}` : ''}`} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 mt-auto">
                <span className="font-display font-bold text-foreground text-sm leading-snug">{item.name}</span>
                <Stars n={item.stars} />
              </div>
              
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}