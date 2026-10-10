import React, { useState } from 'react';
import { Check, PhoneCall, Sparkles } from 'lucide-react';
import { whatsappUrl } from '../constants';

interface Tariff {
  id: string;
  name: string;
  price: number;
  priceHint: string;
  description: string;
  isPopular?: boolean;
  features: string[];
}

const TARIFFS: Tariff[] = [
  {
    id: 'individual',
    name: 'Индивидуально',
    price: 60000,
    priceHint: '8 занятий · 2 раза в неделю',
    description:
      'Максимальный фокус: персональный темп, разбор сложных тем один на один. 7 500 ₸ за час.',
    isPopular: true,
    features: [
      '8 занятий по 60 минут',
      '7 500 ₸ за час без пакета',
      'Гибкое расписание',
      'Доступ к квизам и звёздам',
      'Система наград (реальные призы)',
    ],
  },
  {
    id: 'pair',
    name: 'Мини-группа (пара)',
    price: 44000,
    priceHint: '8 занятий · цена с ученика',
    description:
      '5 500 ₸ с ученика за час. Мини-группа открывается сразу с одного человека — второго можно подключить позже.',
    features: [
      '8 занятий по 60 минут',
      '5 500 ₸ с ученика за час',
      'Пара открывается с 1 человека',
      'Доступ к квизам и звёздам',
      'Система наград (реальные призы)',
    ],
  },
];

const SPECIALS = [
  {
    id: 'individual-4m',
    title: 'Индивидуально: 3 месяца + 1 в подарок',
    price: 180000,
    oldPrice: 240000,
    hint: '4 месяца по цене 3 · 32 занятия',
  },
  {
    id: 'pair-4m',
    title: 'Мини-группа: 3 месяца + 1 в подарок',
    price: 132000,
    oldPrice: 176000,
    hint: '4 месяца по цене 3 · 32 занятия, цена с ученика',
  },
];

export default function Pricing() {
  const [format, setFormat] = useState<'individual' | 'pair'>('individual');
  const [pack, setPack] = useState<'month' | 'special'>('month');

  const packagePrice =
    format === 'individual'
      ? pack === 'month'
        ? 60000
        : 180000
      : pack === 'month'
        ? 44000
        : 132000;
  const regularPrice =
    format === 'individual'
      ? pack === 'month'
        ? 60000
        : 240000
      : pack === 'month'
        ? 44000
        : 176000;
  const totalLessons = pack === 'month' ? 8 : 32;
  const totalSavings = regularPrice - packagePrice;
  const formatLabel = format === 'individual' ? 'Индивидуально' : 'Мини-группа (пара)';
  const hourly = format === 'individual' ? 7500 : 5500;

  const handleWhatsAppOrder = (tariffName: string, price: number) => {
    const text = `Здравствуйте! Хочу записаться на ${tariffName} — ${price.toLocaleString('ru-RU')} ₸.`;
    window.open(whatsappUrl(text), '_blank');
  };

  return (
    <section id="pricing" className="py-24 bg-surface relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="inline-block text-sm font-bold text-primary bg-primary-light px-4 py-1.5 rounded-full border-2 border-border">
            Тарифы
          </span>
          <h2 className="font-display font-extrabold text-foreground text-4xl">
            Цены и форматы
          </h2>
          <p className="text-muted">
            Математика, 5–9 классы. Урок — 60 минут. Пробный урок — один, бесплатно.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto mb-10">
          <div className="clay-card-sm p-5 bg-primary-light">
            <p className="text-xs font-bold text-primary mb-1">Разовая цена</p>
            <p className="font-display font-extrabold text-foreground text-xl">7 500 ₸ / час</p>
            <p className="text-sm text-muted mt-1">Индивидуальное занятие</p>
          </div>
          <div className="clay-card-sm p-5 bg-primary-light">
            <p className="text-xs font-bold text-primary mb-1">Разовая цена</p>
            <p className="font-display font-extrabold text-foreground text-xl">5 500 ₸ / час</p>
            <p className="text-sm text-muted mt-1">
              С ученика в мини-группе (паре). Группа открывается сразу с одного человека.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 items-stretch max-w-5xl mx-auto">
          {TARIFFS.map((tariff) => (
            <div
              key={tariff.id}
              className={`clay-card p-8 flex flex-col justify-between relative overflow-hidden transition-all ${
                tariff.isPopular ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
            >
              {tariff.isPopular && (
                <div className="absolute top-5 right-5 bg-gradient-to-r from-primary to-accent-dark text-white text-[10px] font-bold px-3 py-1 rounded-full">
                  Популярно
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-extrabold text-foreground text-xl">{tariff.name}</h3>
                  <p className="text-muted text-xs mt-1 min-h-[50px] leading-relaxed">
                    {tariff.description}
                  </p>
                </div>

                <div className="pb-6 border-b-2 border-border">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-4xl font-display font-extrabold text-foreground tracking-tight">
                      {tariff.price.toLocaleString('ru-RU')}
                    </span>
                    <span className="text-lg font-bold text-muted">₸</span>
                  </div>
                  <p className="text-sm text-muted mt-1 font-medium">{tariff.priceHint}</p>
                </div>

                <ul className="space-y-3.5">
                  {tariff.features.map((feat) => (
                    <li key={feat} className="flex items-start space-x-3 text-muted text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary-light border-2 border-border flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8 mt-8 border-t-2 border-border">
                <button
                  type="button"
                  onClick={() => handleWhatsAppOrder(tariff.name, tariff.price)}
                  className={`w-full py-3.5 rounded-[1.25rem] font-display font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer min-h-12 ${
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

        <div className="max-w-5xl mx-auto mb-20">
          <div className="clay-card p-6 sm:p-8 bg-primary-light">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-extrabold text-foreground text-xl">
                Спецпредложение, скидка 25%
              </h3>
            </div>
            <p className="text-sm text-muted mb-6">
              Три месяца плюс один в подарок: 4 месяца по цене 3.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SPECIALS.map((offer) => (
                <div key={offer.id} className="clay-card-sm p-5 bg-surface flex flex-col gap-3">
                  <div>
                    <h4 className="font-display font-bold text-foreground">{offer.title}</h4>
                    <p className="text-xs text-muted mt-0.5">{offer.hint}</p>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-display font-extrabold text-primary">
                      {offer.price.toLocaleString('ru-RU')} ₸
                    </span>
                    <span className="text-sm line-through text-muted/70">
                      {offer.oldPrice.toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleWhatsAppOrder(offer.title, offer.price)}
                    className="mt-auto w-full py-2.5 rounded-xl bg-navy hover:bg-blue-950 text-white font-display font-bold text-xs clay-btn cursor-pointer min-h-11"
                  >
                    Записаться со скидкой
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="clay-card p-6 sm:p-10 bg-primary-light relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold text-primary block mb-1">Калькулятор</span>
                <h3 className="font-display font-extrabold text-foreground text-2xl">
                  Посчитай стоимость курса
                </h3>
                <p className="text-muted text-sm mt-1">
                  Выберите формат и пакет — цена совпадает с тарифами на сайте.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground">Формат занятий:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'individual' as const, label: 'Индивидуально' },
                      { id: 'pair' as const, label: 'Мини-группа' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormat(opt.id)}
                        className={`py-3 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer text-center min-h-12 ${
                          format === opt.id
                            ? 'border-primary bg-surface text-primary shadow-xs'
                            : 'border-border bg-white hover:bg-primary-light text-muted hover:border-primary/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground">Пакет:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'month' as const, label: '1 месяц · 8 занятий' },
                      { id: 'special' as const, label: '4 месяца по цене 3' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPack(opt.id)}
                        className={`py-3 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer text-center min-h-12 ${
                          pack === opt.id
                            ? 'border-primary bg-surface text-primary shadow-xs'
                            : 'border-border bg-white hover:bg-primary-light text-muted hover:border-primary/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 clay-card-sm p-6 sm:p-8 bg-surface flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted text-center">Параметры обучения</h4>
                <div className="space-y-2 text-sm text-muted">
                  <div className="flex justify-between gap-3">
                    <span>Формат:</span>
                    <strong className="text-foreground text-right">{formatLabel}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Цена за час:</span>
                    <strong className="text-foreground">{hourly.toLocaleString('ru-RU')} ₸</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Всего уроков:</span>
                    <strong className="text-foreground">{totalLessons} занятий</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Длительность урока:</span>
                    <strong className="text-foreground">60 минут</strong>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex justify-between pt-2 border-t-2 border-border">
                      <span>Без скидки:</span>
                      <span className="line-through text-muted/70 text-xs">
                        {regularPrice.toLocaleString('ru-RU')} ₸
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-accent-light rounded-xl p-4 text-center border-2 border-border">
                  <span className="block text-xs font-bold text-primary mb-1">Итого</span>
                  <span className="text-3xl font-display font-extrabold text-primary tracking-tight">
                    {packagePrice.toLocaleString('ru-RU')} ₸
                  </span>
                  {totalSavings > 0 && (
                    <span className="block text-xs text-emerald-600 font-bold mt-1">
                      Экономия {totalSavings.toLocaleString('ru-RU')} ₸
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsAppOrder(`${formatLabel}, ${pack === 'month' ? '1 месяц' : '4 месяца по цене 3'}`, packagePrice)}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-[1.25rem] font-display font-bold text-base clay-btn transition-all flex items-center justify-center gap-2 cursor-pointer min-h-12"
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
