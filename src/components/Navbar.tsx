import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn, Sparkles, PhoneCall } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { whatsappUrl } from '../constants';

interface NavbarProps {
  onOpenAuthModal: () => void;
}

const NAV_LINKS = [
  { id: 'home', label: 'Главная' },
  { id: 'interactive', label: 'Квизы', icon: Sparkles },
  { id: 'features', label: 'О центре' },
  { id: 'pricing', label: 'Тарифы' },
  { id: 'contact', label: 'Контакты' },
];

export default function Navbar({
  onOpenAuthModal,
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('home');
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const els = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.2, 0.6, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
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

  return (
    <>
      <nav
        id="navbar"
        aria-label="Основная навигация"
        className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 pt-3 pointer-events-none"
      >
        <div
          className={`pointer-events-auto relative mx-auto max-w-6xl rounded-[1.75rem] lg:rounded-full border transition-all duration-300 ${
            scrolled
              ? 'bg-white/85 border-blue-100 shadow-[0_14px_40px_rgba(23,37,84,0.14)] backdrop-blur-xl'
              : 'bg-white/92 border-white/70 shadow-[0_10px_30px_rgba(2,6,40,0.3)] backdrop-blur-xl'
          }`}
        >
          <div className="flex justify-between items-center pl-3 pr-2.5 py-2">
            <button
              type="button"
              className="flex items-center gap-2.5 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-full pr-2"
              onClick={() => scrollToSection('home')}
            >
              <img src="/static/ST.webp" alt="Study Task" className="w-10 h-10 object-contain rounded-full bg-white" />
              <div className="text-left">
                <span className="font-display font-extrabold text-lg text-foreground leading-none tracking-tight">
                  StudyTask
                </span>
                <span className="hidden sm:block text-[11px] text-muted font-medium leading-tight">
                  математический образовательный центр
                </span>
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  aria-current={active === link.id ? 'true' : undefined}
                  className={`relative px-4 py-2 rounded-full font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active === link.id ? 'text-primary' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {active === link.id && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-primary/10"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {link.icon && <link.icon className="w-3.5 h-3.5 text-amber-500" />}
                    {link.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-4 py-2.5 text-foreground hover:bg-primary/10 rounded-full font-bold text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <LogIn className="w-4 h-4" />
                Войти
              </button>

              <a
                href={whatsappUrl('Здравствуйте, хотелось бы записаться на обучение!')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full font-display font-bold text-sm transition-all hover:shadow-[0_8px_22px_rgba(37,99,235,0.4)] cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 min-h-11"
              >
                <PhoneCall className="w-4 h-4" />
                Записаться
              </a>
            </div>

            <div className="lg:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-foreground p-2.5 rounded-full hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={isOpen}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <motion.div
            aria-hidden
            style={{ scaleX: progress }}
            className="absolute left-6 right-6 -bottom-px h-[3px] origin-left rounded-full bg-gradient-to-r from-primary via-sky-400 to-amber-400"
          />

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden overflow-hidden border-t border-blue-100"
              >
                <div className="px-3 pt-3 pb-4 space-y-1">
                  {NAV_LINKS.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => scrollToSection(link.id)}
                      className={`block w-full text-left px-4 py-3 rounded-2xl text-base font-bold cursor-pointer ${
                        active === link.id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-primary-light'
                      }`}
                    >
                      {link.label}
                    </button>
                  ))}

                  <div className="pt-3 mt-2 border-t border-blue-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => { setIsOpen(false); onOpenAuthModal(); }}
                      className="flex items-center justify-center gap-2 w-full py-3 border border-border rounded-2xl font-bold text-foreground cursor-pointer min-h-12"
                    >
                      <LogIn className="w-5 h-5 text-muted" />
                      Войти в кабинет
                    </button>

                    <a
                      href={whatsappUrl('Здравствуйте, хотелось бы записаться на обучение!')}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-2xl font-display font-bold cursor-pointer min-h-12"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Записаться в WhatsApp
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
}
