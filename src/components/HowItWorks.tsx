import React from 'react';
import { motion } from 'motion/react';
import { Laptop, ClipboardCheck, Gift, ArrowRight} from 'lucide-react';
import GiftKit from './GiftKit';       

const STEPS = [
  {
    number: '1',
    title: 'Урок с учителем',
    description: 'Подключаетесь по видеосвязи. Учитель объясняет тему, рисует на доске, задаёт вопросы — всё в реальном времени.',
    icon: Laptop,
    color: 'text-accent bg-accent-light border-blue-200',
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
    title: 'Звёзды и призы',
    description: 'За правильные ответы и активность — звёзды. Накопил достаточно? Выбирай приз в магазине, мы доставим.',
    icon: Gift,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 bg-primary-light border-y-2 border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="inline-block text-sm font-bold text-primary bg-white px-4 py-1.5 rounded-full border-2 border-border">
            Три простых шага
          </span>
          <h2 className="font-display font-extrabold text-foreground text-3xl sm:text-4xl">
            Как проходит неделя с Study Task
          </h2>
          <p className="text-muted">
            Урок → квиз → награда. Цикл повторяется, и каждый раз ребёнок чуть ближе к следующему уровню.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.12 }}
                className="clay-card p-7 flex flex-col gap-5 relative group bg-surface"
              >
                <div className="flex justify-between items-start">
                  <span className="font-display text-5xl font-extrabold text-border leading-none">
                    {step.number}
                  </span>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${step.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-bold text-foreground text-xl">
                    {step.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">{step.description}</p>
                </div>

                {index < 2 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 translate-x-1/2 -translate-y-1/2 z-20 bg-surface border-2 border-border p-1.5 rounded-full text-muted group-hover:text-primary transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

          <GiftKit />

        <div className="mt-8 text-center clay-card-sm p-6 max-w-3xl mx-auto bg-surface">
          <p className="text-muted text-sm mb-4">
            Занятия онлайн. Ребёнок занимается с преподавателем, вы видите прогресс в телефоне.
          </p>
          <a
            href="#free-trial"
            className="inline-flex items-center gap-2 text-accent hover:text-accent-dark font-display font-bold text-sm cursor-pointer min-h-11"
          >
            Записаться на пробный урок
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}
