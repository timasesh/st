import React from 'react';
import { HelpCircle, Laptop, Star, Award, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

const FEATURE_ITEMS = [
  {
    id: 'teachers',
    title: 'Живые уроки',
    description: 'Преподаватель видит экран ребёнка, объясняет на доске и отвечает на вопросы сразу — как в классе, только дома.',
    icon: Award,
    color: 'bg-primary text-white',
    tag: 'с учителем онлайн',
  },
  {
    id: 'quizzes',
    title: 'Квизы после урока',
    description: '5–10 минут на платформе — и сразу видно, что запомнилось. Без зубрёжки и долгих домашних на вечер.',
    icon: HelpCircle,
    color: 'bg-accent text-white',
    tag: 'закрепление',
  },
  {
    id: 'presentations',
    title: 'Игры и презентации',
    description: 'Каждый третий урок — интерактив: ассоциации, визуальные модели, мини-соревнования с одноклассниками.',
    icon: Laptop,
    color: 'bg-violet-500 text-white',
    tag: 'раз в 3 урока',
  },
  {
    id: 'gamification',
    title: 'Звёзды → призы',
    description: 'За уроки и квизы начисляются звёзды. Их можно потратить в магазине — от наклеек до наушников.',
    icon: Star,
    color: 'bg-amber-500 text-white',
    tag: 'реальные награды',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-surface relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="inline-block text-sm font-bold text-primary bg-primary-light px-4 py-1.5 rounded-full border-2 border-border">
            Чем мы отличаемся
          </span>
          <h2 className="font-display font-extrabold text-foreground text-3xl sm:text-4xl">
            Не просто репетитор — целая экосистема
          </h2>
          <p className="text-muted text-base">
            Программа как в хорошей школе, но с механиками из любимых игр: уровни, звёзды и награды, за которые хочется стараться.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURE_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className="clay-card p-6 flex flex-col gap-5 group cursor-default"
              >
                <span className="text-xs font-bold text-muted">{item.tag}</span>

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color} shadow-md group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="space-y-2 flex-1">
                  <h3 className="font-display font-bold text-foreground text-lg group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-14 p-8 sm:p-10 rounded-[2rem] border-2 border-blue-300 bg-gradient-to-br from-primary to-accent-dark text-white relative overflow-hidden shadow-[0_6px_0_#93C5FD,0_10px_28px_rgba(37,99,235,0.15)]">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2">
              <h3 className="font-display font-extrabold text-xl sm:text-2xl">
                Большинство учеников замечают прогресс уже в первый месяц
              </h3>
              <p className="opacity-90 text-sm sm:text-base max-w-2xl">
                Когда ребёнок видит свой уровень, звёзды и реальные призы — учёба перестаёт быть «надо» и становится «хочу».
              </p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <a
                href="https://wa.me/87717515167?text=Здравствуйте! Хочу записаться на диагностику знаний"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white text-primary hover:bg-primary-light px-6 py-3.5 rounded-[1.25rem] font-display font-bold text-sm sm:text-base clay-btn cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                Бесплатная диагностика
                <ShieldCheck className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
