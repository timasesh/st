import React from 'react';
import {
  Star,
  Trophy,
  Target,
  Rocket,
  User,
  Medal,
  Shield,
  Lock,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { whatsappUrl } from '../constants';

interface HeroProps {
  onBookTrial: () => void;
  stars: number;
}

export default function Hero({ onBookTrial, stars }: HeroProps) {
  return (
    <section
      id="home"
      className="relative min-h-screen pt-28 pb-20 flex items-center bg-primary-light overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute top-20 -left-16 w-48 h-48 rounded-[3rem] bg-blue-200/50 border-2 border-blue-200 animate-float-soft"
      />
      <div
        aria-hidden
        className="absolute top-40 right-8 w-32 h-32 rounded-full bg-blue-200/40 border-2 border-blue-200 animate-float-soft-reverse animation-delay-2000"
      />
      <div
        aria-hidden
        className="absolute bottom-24 left-1/4 w-24 h-24 rounded-2xl bg-amber-200/50 border-2 border-amber-200 rotate-12 animate-float-soft animation-delay-4000"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-full text-sm font-bold w-fit border-2 border-border clay-card-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Математика, 5–9 классы: набор открыт
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="space-y-4"
            >
              <h1 className="font-display font-extrabold text-foreground text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.12] tracking-tight">
                StudyTask: учёба, которая похожа на игру
              </h1>

              <p className="text-muted text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                Живые уроки математики для 5–9 классов онлайн. После каждого занятия квиз,
                за него звёзды, а звёзды меняются на призы. Первый пробный урок бесплатно.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <button
                type="button"
                onClick={onBookTrial}
                className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-[1.25rem] font-display font-bold text-lg clay-btn w-full sm:w-auto cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 min-h-12"
              >
                Записаться на пробный
              </button>

              <a
                href={whatsappUrl('Здравствуйте! Хочу записаться на пробный урок математики.')}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-foreground border-2 border-border px-8 py-4 rounded-[1.25rem] font-bold text-lg hover:bg-primary-light transition-colors w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 min-h-12"
              >
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                Написать в WhatsApp
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="space-y-3 pt-2"
            >
              <p className="text-sm text-foreground font-medium max-w-lg mx-auto lg:mx-0">
                Занятия ведут опытные преподаватели, которые умеют объяснять просто и интересно.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                {[
                  { value: '5–9', label: 'классы, математика' },
                  { value: '1 урок', label: 'пробный бесплатно' },
                  { value: '60 мин', label: 'длительность урока' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="clay-card-sm px-4 py-3 flex items-center gap-2"
                  >
                    <div>
                      <span className="block font-display font-bold text-foreground text-lg leading-none">
                        {stat.value}
                      </span>
                      <span className="text-xs text-muted">{stat.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-5 relative w-full flex justify-center items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="w-full max-w-md clay-card p-6 space-y-5 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/static/ST.webp" alt="Study Task" className="w-12 h-12 rounded-2xl object-contain bg-white p-1 shadow-md" />
                  <div>
                    <h3 className="font-display font-bold text-foreground text-sm">
                      Иван Смирнов
                    </h3>
                    <span className="text-xs text-muted">5 класс · математика</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-200 rounded-full px-3 py-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-bold text-amber-700">{stars + 15}</span>
                </div>
              </div>

              <div className="space-y-2 bg-accent-light/60 p-4 rounded-2xl border-2 border-border/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-accent flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Уровень 3
                  </span>
                  <span className="text-muted font-medium">75% до 4-го</span>
                </div>
                <div className="w-full bg-white h-3 rounded-full overflow-hidden border border-border">
                  <div className="bg-gradient-to-r from-primary to-accent h-full rounded-full w-3/4 transition-all" />
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-muted">Задания на сегодня</h4>

                <div className="flex items-center justify-between p-3 bg-white border-2 border-border/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-accent-light flex items-center justify-center text-accent font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-foreground">Дроби и деление</h5>
                      <p className="text-[11px] text-muted">Математика · квиз пройден</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                    +10 <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border-2 border-dashed border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-foreground">Проценты</h5>
                      <p className="text-[11px] text-emerald-600 font-medium">Сейчас в процессе</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                    +15 <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted">Награды</h4>
                <div className="flex gap-3 justify-center">
                  {[
                    { icon: Medal, label: 'Дроби', color: 'from-amber-300 to-orange-400' },
                    { icon: Shield, label: 'Уравнения', color: 'from-blue-300 to-indigo-400' },
                    { icon: Rocket, label: 'Геометрия', color: 'from-emerald-300 to-teal-400' },
                    { icon: Lock, label: 'Скоро', color: '', locked: true },
                  ].map((badge) => (
                    <div key={badge.label} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center ${
                          badge.locked
                            ? 'bg-accent-light border-2 border-dashed border-border text-muted'
                            : `bg-gradient-to-br ${badge.color} text-white shadow-md`
                        }`}
                      >
                        <badge.icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold ${badge.locked ? 'text-muted/60' : 'text-foreground'}`}>
                        {badge.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -bottom-3 -right-2 bg-emerald-500 text-white rounded-2xl px-4 py-2 flex items-center gap-2 shadow-lg border-2 border-emerald-400">
                <Target className="w-4 h-4" />
                <span className="text-xs font-bold">+50 XP за урок</span>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
