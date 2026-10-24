import React from 'react';
import { Check, PhoneCall } from 'lucide-react';
import { whatsappUrl } from '../constants';

interface Tariff {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  isPopular?: boolean;
  features: string[];
}

const TARIFFS: Tariff[] = [
  {
    id: 'individual',
    name: 'Индивидуально',
    price: 5000,
    unit: 'за занятие · 60 минут',
    description: 'Максимальный фокус: персональный темп, разбор сложных тем один на один.',
    isPopular: true,
    features: [
      'Занятие 60 минут один на один',
      'Гибкое расписание',
      'Доступ к квизам и звёздам',
      'Место в рейтинге учеников',
    ],
  },
  {
    id: 'pair',
    name: 'В паре',
    price: 4000,
    unit: 'за занятие с ученика · 60 минут',
    description: 'Занятие вдвоём: цена за занятие для каждого ученика. Пара открывается сразу с одного человека, второго можно подключить позже.',
    features: [
      'Занятие 60 минут в паре',
      'Пара открывается с 1 человека',
      'Доступ к квизам и звёздам',
      'Место в рейтинге учеников',
    ],
  },
];

export default function Pricing() {
  const handleWhatsAppOrder = (tariffName: string, price: number) => {
    const text = `Здравствуйте! Хочу записаться на формат «${tariffName}» — ${price.toLocaleString('ru-RU')} ₸ за занятие.`;
    window.open(whatsappUrl(text), '_blank');
  };

  return (
    <section id="pricing" className="py-24 bg-surface relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="eyebrow">
            Тарифы
          </span>
          <h2 className="section-title">
            Цены и <span className="hl">форматы</span>
          </h2>
          <p className="text-muted">
            Математика, 5–9 классы. Урок — 60 минут. Пробный урок — один, бесплатно.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
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
                  <p className="text-sm text-muted mt-1 font-medium">{tariff.unit}</p>
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
                  <span>Записаться в WhatsApp</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted mt-8 max-w-2xl mx-auto">
          Единая цена за занятие, без пакетов и скидок. Фирменный мерч StudyTask покупается отдельно.
        </p>
      </div>
    </section>
  );
}
