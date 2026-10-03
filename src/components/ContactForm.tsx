import React from 'react';
import { Mail, Phone, MapPin, Sparkles, MessageSquare } from 'lucide-react';

export default function ContactForm() {
  return (
    <section id="contact" className="py-24 bg-primary-light border-t-2 border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <span className="inline-block text-sm font-bold text-primary bg-white px-4 py-1.5 rounded-full border-2 border-border">
                Связаться с нами
              </span>
              <h2 className="font-display font-extrabold text-foreground text-3xl sm:text-4xl leading-tight">
                Есть вопрос?
                <br />
                Напишите — ответим
              </h2>
              <p className="text-muted">
                Расскажем про расписание, геймификацию, тарифы или поможем выбрать первый предмет.
                Обычно отвечаем в WhatsApp за пару минут.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {[
                { icon: Phone, label: 'Телефон', value: '+7 (771) 751 51 67', hint: 'WhatsApp и Telegram' },
                { icon: Mail, label: 'Почта', value: 'study.task.kz@gmail.com', hint: 'Ответ в течение дня' },
                { icon: MapPin, label: 'Офис', value: 'Алматы, Казахстан', hint: 'Уроки полностью онлайн' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-border flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-muted">{item.label}</h4>
                    <p className="text-foreground font-display font-bold text-sm sm:text-base mt-0.5">{item.value}</p>
                    <p className="text-muted text-xs">{item.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 clay-card p-6 sm:p-8 flex flex-col justify-between gap-6 bg-surface">
            <div className="space-y-3">
              <span className="text-xs font-bold text-accent bg-accent-light border-2 border-blue-200 rounded-full px-3 py-1">
                WhatsApp — самый быстрый способ
              </span>
              <h3 className="font-display font-extrabold text-foreground text-xl">
                Напишите нам в один клик
              </h3>
              <p className="text-muted text-sm">
                Менеджер поможет подобрать время для пробного урока и расскажет про бесплатный стартовый пакет.
              </p>
            </div>

            <div className="bg-primary-light border-2 border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b-2 border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white relative">
                    <MessageSquare className="w-4 h-4" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-foreground">Study Task</span>
                    <span className="block text-[11px] text-emerald-600 font-medium">Онлайн · ответ ~1 мин</span>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-white p-3 rounded-2xl border-2 border-border/50 max-w-[85%] rounded-tl-sm">
                  <p className="text-foreground/80 leading-relaxed">
                    Здравствуйте! Расскажите, в каком классе учится ребёнок и какой предмет интересует — подберём время для пробного урока.
                  </p>
                </div>
                <div className="bg-white p-3 rounded-2xl border-2 border-border/50 max-w-[85%] rounded-tl-sm">
                  <p className="text-foreground/80 leading-relaxed">
                    Первые два занятия и диагностика — <strong>бесплатно</strong>, без обязательств.
                  </p>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/87717515167?text=Здравствуйте! Меня интересуют уроки в школе Study Task"
              target="_blank"
              rel="noreferrer"
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.25rem] font-display font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40"
            >
              <MessageSquare className="w-5 h-5" />
              Написать в WhatsApp
            </a>
          </div>

        </div>

      </div>
    </section>
  );
}
