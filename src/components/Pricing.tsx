import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Calendar, Star, HelpCircle, PhoneCall, Sparkles } from 'lucide-react';

interface Tariff {
  id: string;
  name: string;
  price: number;
  oldPrice: number;
  description: string;
  isPopular?: boolean;
  comingSoon?: boolean;
  comingSoonSubText?: string;
  features: string[];
}

const TARIFFS: Tariff[] = [
  {
    id: 'individual',
    name: 'Индивидуальные занятия',
    price: 5000,
    oldPrice: 7000,
    description: 'Максимальный фокус на успехе ребенка. Индивидуальный темп, персональная учебная программа и разбор сложных тем один на один с преподавателем.',
    isPopular: true,
    features: [
      'Персональный подбор преподавателя',
      'Гибкое расписание занятий',
      'Индивидуальный темп и программа',
      'Доступ ко всей платформе квизов',
      'Полная статистика для родителей',
      'Система наград (реальные призы)'
    ]
  },
  {
    id: 'pairs',
    name: 'Занятия в паре',
    price: 4000,
    oldPrice: 6000,
    description: 'Обучение с другом или одноклассником схожего уровня. Здоровое соревнование повышает вовлечение в учебный процесс.',
    comingSoon: true,
    comingSoonSubText: 'Мы активно дорабатываем парную видеосвязь',
    features: [
      'Обучение в паре с другом',
      'Командные квесты и викторины',
      'Индивидуальный разбор ошибок',
      'Доступ ко всей платформе квизов',
      'Совместные проекты и соревнования',
      'Система наград (реальные призы)'
    ]
  },
  {
    id: 'group',
    name: 'Групповые занятия',
    price: 3000,
    oldPrice: 5000,
    description: 'Небольшие интерактивные группы из 3-5 учеников. Много практики, командные баттлы, социализация и обмен знаниями.',
    comingSoon: true,
    comingSoonSubText: 'Группы формируются к новому учебному сезону',
    features: [
      'Мини-группы из 3-5 человек',
      'Интерактивная командная работа',
      'Групповой лидерборд и лиги',
      'Доступ ко всей платформе квизов',
      'Постоянная поддержка куратора',
      'Система наград (реальные призы)'
    ]
  }
];

export default function Pricing() {
  // Interactive Calculator State
  const [frequency, setFrequency] = useState<number>(2); // times per week
  const [durationWeeks, setDurationWeeks] = useState<number>(4); // default 1 month (4 weeks)
  const [tariffType, setTariffType] = useState<number>(5000); // 5000 / 4000 / 3000

  // Calculation
  const totalLessons = frequency * durationWeeks;
  const totalPrice = totalLessons * tariffType;
  const originalPrice = totalLessons * (tariffType === 5000 ? 7000 : tariffType === 4000 ? 6000 : 5000);
  const totalSavings = originalPrice - totalPrice;

  const handleWhatsAppOrder = (tariffName: string, price: number) => {
    const text = `Здравствуйте! Хочу записаться на ${tariffName} по тарифу за ${price} ₸/час.`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/87717515167?text=${encoded}`, '_blank');
  };

  return (
    <section id="pricing" className="py-24 bg-surface relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="inline-block text-sm font-bold text-primary bg-primary-light px-4 py-1.5 rounded-full border-2 border-border">
            Тарифы
          </span>
          <h2 className="font-display font-extrabold text-foreground text-3xl sm:text-4xl">
            Стоимость обучения
          </h2>
          <p className="text-muted">
            Без скрытых платежей. Пробный урок — бесплатно.
          </p>
        </div>

        {/* Tariffs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20 items-stretch">
          {TARIFFS.map((tariff) => (
            <div
              key={tariff.id}
              className={`clay-card p-8 flex flex-col justify-between relative overflow-hidden transition-all ${
                tariff.isPopular
                  ? 'border-primary ring-2 ring-primary/20'
                  : ''
              }`}
            >
              {/* Coming soon glass overlay */}
              {tariff.comingSoon && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center">
                  <div className="bg-amber-100 text-amber-800 border border-amber-200 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse mb-3 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 fill-amber-300" />
                    Скоро на платформе
                  </div>
                  <h4 className="font-display font-bold text-foreground text-lg">{tariff.name}</h4>
                  <p className="text-muted text-xs mt-1 max-w-[220px]">
                    {tariff.comingSoonSubText}. Забронируйте место заранее со скидкой!
                  </p>
                  <button
                    onClick={() => handleWhatsAppOrder(`${tariff.name} (Предзаказ)`, tariff.price)}
                    className="mt-4 px-5 py-2 bg-navy hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all clay-btn-sm cursor-pointer"
                  >
                    Забронировать со скидкой
                  </button>
                </div>
              )}

              {/* Popular Tag */}
              {tariff.isPopular && (
                <div className="absolute top-5 right-5 bg-gradient-to-r from-primary to-accent-dark text-white text-[10px] font-bold px-3 py-1 rounded-full">
                  Популярно
                </div>
              )}

              <div className="space-y-6">
                {/* Header info */}
                <div>
                  <h3 className="font-display font-extrabold text-foreground text-xl">{tariff.name}</h3>
                  <p className="text-muted text-xs mt-1 min-h-[50px] leading-relaxed">
                    {tariff.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pb-6 border-b-2 border-border">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-4xl font-display font-extrabold text-foreground tracking-tight">
                      {tariff.price.toLocaleString()}
                    </span>
                    <span className="text-lg font-bold text-muted">₸/час</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs line-through text-muted/70 font-mono">
                      {tariff.oldPrice.toLocaleString()} ₸/час
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Скидка {Math.round(((tariff.oldPrice - tariff.price) / tariff.oldPrice) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Features list */}
                <ul className="space-y-3.5">
                  {tariff.features.map((feat, i) => (
                    <li key={i} className="flex items-start space-x-3 text-muted text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary-light border-2 border-border flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-8 border-t-2 border-border">
                <button
                  onClick={() => handleWhatsAppOrder(tariff.name, tariff.price)}
                  className={`w-full py-3.5 rounded-[1.25rem] font-display font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    tariff.isPopular
                      ? 'bg-primary hover:bg-primary-dark text-white clay-btn'
                      : 'bg-navy hover:bg-blue-950 text-white clay-btn'
                  }`}
                >
                  <PhoneCall className="w-4.5 h-4.5" />
                  <span>Выбрать тариф в WhatsApp</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* INTERACTIVE TUITION CALCULATOR */}
        <div className="clay-card p-6 sm:p-10 bg-primary-light relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Calculator controls */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold text-primary block mb-1">
                  Калькулятор
                </span>
                <h3 className="font-display font-extrabold text-foreground text-xl sm:text-2xl">
                  Посчитай стоимость курса
                </h3>
                <p className="text-muted text-sm mt-1">
                  Настройте интенсивность и длительность занятий, чтобы увидеть полную стоимость обучения со всеми бонусами.
                </p>
              </div>

              <div className="space-y-4">
                {/* Format choice */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground">
                    Формат занятий:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Индивидуально', price: 5000 },
                      { label: 'В паре', price: 4000 },
                      { label: 'Группа', price: 3000 }
                    ].map((opt) => (
                      <button
                        key={opt.price}
                        onClick={() => setTariffType(opt.price)}
                        className={`py-3 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer text-center ${
                          tariffType === opt.price
                            ? 'border-primary bg-surface text-primary shadow-xs'
                            : 'border-border bg-white hover:bg-primary-light text-muted hover:border-primary/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-foreground text-xs">
                      Занятий в неделю:
                    </label>
                    <span className="font-bold text-primary font-mono text-sm">{frequency} раз(а)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={frequency}
                    onChange={(e) => setFrequency(Number(e.target.value))}
                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-muted font-bold">
                    <span>1 раз</span>
                    <span>2 раза</span>
                    <span>3 раза</span>
                    <span>4 раза</span>
                    <span>5 раз</span>
                  </div>
                </div>

                {/* Duration selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-foreground text-xs">
                      Продолжительность курса:
                    </label>
                    <span className="font-bold text-primary font-mono text-sm">
                      {durationWeeks / 4} мес ({durationWeeks} недель)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    step="4"
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-muted font-bold">
                    <span>1 мес (4 нед)</span>
                    <span>2 мес (8 нед)</span>
                    <span>3 мес (12 нед)</span>
                    <span>4 мес (16 нед)</span>
                    <span>5 мес (20 нед)</span>
                    <span>6 мес (24 нед)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculator results side block */}
            <div className="lg:col-span-5 clay-card-sm p-6 sm:p-8 bg-surface flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted text-center">
                  Параметры обучения
                </h4>

                <div className="space-y-2 text-sm text-muted">
                  <div className="flex justify-between">
                    <span>Всего уроков:</span>
                    <strong className="text-foreground font-mono">{totalLessons} занятий</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ставка за час:</span>
                    <strong className="text-foreground font-mono">{tariffType.toLocaleString()} ₸/ч</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-border">
                    <span>Базовая стоимость:</span>
                    <span className="line-through font-mono text-muted/70 text-xs">
                      {originalPrice.toLocaleString()} ₸
                    </span>
                  </div>
                </div>

                <div className="bg-accent-light rounded-xl p-4 text-center border-2 border-border">
                  <span className="block text-xs font-bold text-primary mb-1">
                    Итого со скидкой
                  </span>
                  <span className="text-3xl font-display font-extrabold text-primary tracking-tight">
                    {totalPrice.toLocaleString()} ₸
                  </span>
                  <span className="block text-xs text-emerald-600 font-bold mt-1">
                    Экономия {totalSavings.toLocaleString()} ₸
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleWhatsAppOrder(
                  `Курс (${totalLessons} уроков, ${frequency} р/нед)`,
                  tariffType
                )}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-[1.25rem] font-display font-bold text-base clay-btn transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Записаться в WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
