import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, BookOpen, Award, CheckCircle, ArrowRight, Heart } from 'lucide-react';

interface FreeTrialProps {
  onUnlockDiagnosticAchievement: () => void;
}

export default function FreeTrial({ onUnlockDiagnosticAchievement }: FreeTrialProps) {
  const [formData, setFormData] = useState({
    parentName: '',
    studentName: '',
    studentClass: '5 класс',
    phone: '',
    subject: 'Математика',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.studentName) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      onUnlockDiagnosticAchievement();
    }, 1200);
  };

  return (
    <section id="free-trial" className="py-24 bg-surface relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="overflow-hidden rounded-[2rem] border-2 border-blue-300 shadow-[0_6px_0_#93C5FD,0_10px_28px_rgba(37,99,235,0.15)] bg-gradient-to-br from-primary to-accent-dark text-white">

          <div className="grid grid-cols-1 lg:grid-cols-12">

            <div className="lg:col-span-6 p-8 sm:p-12 space-y-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-white/15 border-2 border-white/25 rounded-full px-4 py-1.5">
                  <Gift className="w-4 h-4 text-amber-200" />
                  <span className="text-sm font-bold text-white/90">Стартовый пакет</span>
                </div>

                <h3 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight">
                  Два урока бесплатно — без обязательств
                </h3>

                <p className="opacity-90 leading-relaxed text-sm sm:text-base">
                  Попробуйте формат, познакомьтесь с учителем и посмотрите, как ребёнок реагирует на квизы и звёзды.
                  Если не подойдёт — просто скажете, и всё.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border-2 border-white/20">
                      <BookOpen className="w-5 h-5 text-amber-200" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base">2 пробных урока</h4>
                      <p className="opacity-80 text-xs mt-0.5">
                        Полноценное занятие с преподавателем — любой предмет на выбор.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border-2 border-white/20">
                      <Award className="w-5 h-5 text-amber-200" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base">Диагностика знаний</h4>
                      <p className="opacity-80 text-xs mt-0.5">
                        Найдём пробелы и составим план — без давления и «продажи».
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t-2 border-white/15 text-xs opacity-80 flex items-center gap-2">
                <Heart className="w-4 h-4 fill-white/80" />
                <span>Запись ни к чему не обязывает — это нормальный тест-драйв.</span>
              </div>
            </div>

            <div className="lg:col-span-6 bg-surface text-foreground p-8 sm:p-12 flex flex-col justify-center border-t-2 lg:border-t-0 lg:border-l-2 border-border">
              <AnimatePresence mode="wait">

                {!isSubmitted ? (
                  <motion.div
                    key="registration-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h4 className="font-display font-extrabold text-xl text-foreground">
                        Оставить заявку
                      </h4>
                      <p className="text-muted text-sm mt-1">
                        Перезвоним в течение 15 минут и подберём время.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="parentName" className="block text-sm font-bold text-foreground">
                          Имя родителя
                        </label>
                        <input
                          id="parentName"
                          type="text"
                          required
                          value={formData.parentName}
                          onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                          placeholder="Айгуль"
                          className="w-full bg-primary-light border-2 border-border text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label htmlFor="studentName" className="block text-sm font-bold text-foreground">
                            Имя ученика
                          </label>
                          <input
                            id="studentName"
                            type="text"
                            required
                            value={formData.studentName}
                            onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                            placeholder="Амир"
                            className="w-full bg-primary-light border-2 border-border text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="studentClass" className="block text-sm font-bold text-foreground">
                            Класс
                          </label>
                          <select
                            id="studentClass"
                            value={formData.studentClass}
                            onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })}
                            className="w-full bg-primary-light border-2 border-border text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:bg-white transition-colors cursor-pointer font-medium"
                          >
                            {Array.from({ length: 11 }).map((_, i) => (
                              <option key={i} value={`${i + 1} класс`}>
                                {i + 1} класс
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label htmlFor="phone" className="block text-sm font-bold text-foreground">
                            Телефон
                          </label>
                          <input
                            id="phone"
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+7 (___) ___ __ __"
                            className="w-full bg-primary-light border-2 border-border text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="subject" className="block text-sm font-bold text-foreground">
                            Предмет
                          </label>
                          <select
                            id="subject"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full bg-primary-light border-2 border-border text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:bg-white transition-colors cursor-pointer font-medium"
                          >
                            <option value="Математика">Математика</option>
                            <option value="IT & Программирование">IT & Программирование</option>
                            <option value="Физика">Физика</option>
                            <option value="Английский язык">Английский язык</option>
                            <option value="Русский язык">Русский язык</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-accent hover:bg-accent-dark disabled:bg-accent/60 text-white rounded-[1.25rem] font-display font-bold text-base clay-btn clay-btn-accent transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Получить бесплатный пакет</span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success-message"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-6 py-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                      <CheckCircle className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-display font-extrabold text-2xl text-foreground">
                        Заявка отправлена
                      </h4>
                      <p className="text-muted text-sm max-w-sm mx-auto">
                        Спасибо, <strong>{formData.parentName}</strong>! Мы перезвоним на{' '}
                        <strong>{formData.phone}</strong>, чтобы согласовать время урока.
                      </p>
                    </div>

                    <div className="bg-accent-light border-2 border-blue-200 rounded-2xl p-4 max-w-sm mx-auto text-center space-y-2">
                      <span className="text-xs font-bold text-accent block">
                        Бонус в симуляторе на странице
                      </span>
                      <p className="text-muted text-xs leading-relaxed">
                        Вы получили достижение «Герой викторин» и <strong className="text-amber-600">+100 XP</strong> —
                        прокрутите вверх к квизам!
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="px-6 py-2.5 border-2 border-border text-muted hover:bg-primary-light rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Отправить ещё одну заявку
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
