import React, { useState, useEffect } from 'react';
import { Menu, X, Star, LogIn, Sparkles, PhoneCall } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { whatsappUrl } from '../constants';

interface NavbarProps {
  stars: number;
  xp: number;
  level: number;
  userName: string;
  onOpenAuthModal: () => void;
  onOpenQuizTab: () => void;
}

export default function Navbar({
  stars,
  xp,
  level,
  onOpenAuthModal,
  onOpenQuizTab,
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const xpNeeded = level * 100;
  const xpPercentage = Math.min((xp / xpNeeded) * 100, 100);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const pos = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pos - offset, behavior: 'smooth' });
    }
  };

  const navLinks = [
    { id: 'home', label: 'Главная' },
    { id: 'interactive', label: 'Квизы', icon: Sparkles },
    { id: 'features', label: 'О центре' },
    { id: 'pricing', label: 'Тарифы' },
    { id: 'contact', label: 'Контакты' },
  ];

  return (
    <>
      <nav
        id="navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'clay-nav shadow-sm py-2.5' : 'clay-nav py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <button
              type="button"
              className="flex items-center gap-2.5 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-xl"
              onClick={() => scrollToSection('home')}
            >
              <img src="/static/ST.webp" alt="Study Task" className="w-10 h-10 object-contain rounded-xl" />
              <div className="text-left">
                <span className="font-display font-bold text-xl text-foreground leading-none">
                  StudyTask
                </span>
                <span className="block text-[11px] text-muted font-medium">
                  математический образовательный центр
                </span>
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="text-muted hover:text-primary font-medium text-sm transition-colors cursor-pointer flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg px-1"
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5 text-amber-500" />}
                  {link.label}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-2.5 self-center">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onOpenQuizTab}
                className="flex items-center gap-2.5 bg-white border-2 border-border rounded-full py-1.5 px-4 cursor-pointer hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted font-bold leading-none">
                    Уровень {level}
                  </span>
                  <div className="w-28 h-2 bg-accent-light rounded-full overflow-hidden mt-1 border border-border/50">
                    <div
                      className="bg-accent h-full rounded-full transition-all duration-500"
                      style={{ width: `${xpPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border-2 border-amber-200">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-amber-700">{stars}</span>
                </div>
              </motion.button>

              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-4 py-2 border-2 border-border hover:border-primary text-primary hover:bg-primary-light rounded-full font-medium text-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <LogIn className="w-4 h-4" />
                Войти
              </button>

              <a
                href={whatsappUrl('Здравствуйте, хотелось бы записаться на обучение!')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-0.5 bg-primary hover:bg-primary-dark text-white rounded-full font-display font-bold text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 min-h-11"
              >
                <PhoneCall className="w-4 h-4" />
                Записаться
              </a>
            </div>

            <div className="lg:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenQuizTab}
                className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border-2 border-amber-200 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-700">{stars}</span>
                <span className="text-[10px] text-accent font-bold">L{level}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-muted hover:text-primary p-2 rounded-xl hover:bg-primary-light transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t-2 border-border bg-surface"
            >
              <div className="px-4 pt-4 pb-6 space-y-1">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="block w-full text-left px-3 py-2.5 rounded-xl text-base font-medium text-foreground hover:bg-primary-light hover:text-primary cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}

                <div className="border-t-2 border-border pt-4 mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => { setIsOpen(false); onOpenAuthModal(); }}
                    className="flex items-center justify-center gap-2 w-full py-3 border-2 border-border rounded-xl font-semibold text-foreground cursor-pointer"
                  >
                    <LogIn className="w-5 h-5 text-muted" />
                    Войти в кабинет
                  </button>

                  <a
                    href={whatsappUrl('Здравствуйте, хотелось бы записаться на обучение!')}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-accent text-white rounded-xl font-display font-bold clay-btn clay-btn-accent cursor-pointer min-h-12"
                  >
                    <PhoneCall className="w-4 h-4" />
                    Записаться в WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
