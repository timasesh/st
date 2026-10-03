import React from 'react';
import { motion } from 'motion/react';
import { Star, Quote } from 'lucide-react';

const REVIEWS = [
  {
    id: 1,
    name: 'Айгуль К.',
    role: 'мама, 6 класс',
    text: 'Сын раньше откладывал домашку до ночи. Сейчас сам спрашивает, когда следующий квиз — и уже два раза обменял звёзды на наклейки в магазине.',
    rating: 5,
    accent: 'bg-accent-light text-primary',
  },
  {
    id: 2,
    name: 'Дамир Н.',
    role: 'папа, 8 класс',
    text: 'Понравилось, что учитель на связи вживую, а не просто видео. Дочь за месяц подтянула дроби — учительница в школе даже спросила, куда мы ходим.',
    rating: 5,
    accent: 'bg-blue-100 text-accent',
  },
  {
    id: 3,
    name: 'Мадина С.',
    role: 'мама, 4 класс',
    text: 'Записались на бесплатные уроки без обязательств — так и остались. Ребёнку нравится система уровней, мне — что вижу прогресс в личном кабинете.',
    rating: 5,
    accent: 'bg-amber-100 text-amber-700',
  },
];

export default function Testimonials() {
  return (
    <section id="reviews" className="py-24 bg-surface relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary bg-primary-light px-4 py-1.5 rounded-full border-2 border-border">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            Отзывы родителей
          </span>
          <h2 className="font-display font-extrabold text-foreground text-3xl sm:text-4xl">
            Что говорят семьи, которые уже с нами
          </h2>
          <p className="text-muted text-base">
            Реальные истории — без маркетинговых обещаний. Спросите у нас контакты для связи с родителями.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REVIEWS.map((review, index) => (
            <motion.article
              key={review.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className="clay-card p-6 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <Quote className="w-8 h-8 text-border" />
                <div className="flex gap-0.5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              <p className="text-foreground/90 text-sm leading-relaxed flex-1 italic">
                «{review.text}»
              </p>

              <div className="flex items-center gap-3 pt-3 border-t-2 border-border/50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm ${review.accent}`}>
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="font-display font-bold text-foreground text-sm">{review.name}</p>
                  <p className="text-xs text-muted">{review.role}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
