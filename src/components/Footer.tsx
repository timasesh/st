import React from 'react';
import { Heart } from 'lucide-react';
import { WHATSAPP_DISPLAY } from '../constants';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy text-blue-200/80 py-16 border-t-2 border-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-b border-blue-900/60 pb-12 mb-10">

          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <img src="/static/ST.webp" alt="Study Task" className="w-9 h-9 rounded-xl object-contain bg-white p-0.5" />
              <span className="font-display font-bold text-lg text-white">
                Study Task
              </span>
            </div>

            <p className="text-sm text-blue-200/70 max-w-sm leading-relaxed">
              Математический образовательный центр для 5–9 классов: живые уроки, квизы и система звёзд с реальными призами.
            </p>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h4 className="text-sm font-display font-bold text-white">
              Навигация
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#home" className="hover:text-white transition-colors cursor-pointer">Главная</a></li>
              <li><a href="#interactive" className="hover:text-white transition-colors cursor-pointer">Квизы</a></li>
              <li><a href="#features" className="hover:text-white transition-colors cursor-pointer">О центре</a></li>
              <li><a href="#free-trial" className="hover:text-white transition-colors cursor-pointer">Пробный урок</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors cursor-pointer">Тарифы</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="text-sm font-display font-bold text-white">
              Контакты
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-blue-300/60">Почта: </span>
                <span className="text-white/90">study.task.kz@gmail.com</span>
              </li>
              <li>
                <span className="text-blue-300/60">Телефон: </span>
                <span className="text-white/90">{WHATSAPP_DISPLAY}</span>
              </li>
              <li>
                <span className="text-blue-300/60">Город: </span>
                <span className="text-white/90">Алматы, Казахстан</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {currentYear} Study Task</p>

          <div className="flex items-center gap-1.5 text-blue-300/60">
            <span>Сделано с</span>
            <Heart className="w-3.5 h-3.5 text-accent fill-accent" />
            <span>в Алматы</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
