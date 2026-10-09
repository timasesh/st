import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn, Lock, Mail, User, Trophy, Check } from 'lucide-react';
import { GRADE_OPTIONS } from '../constants';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (name: string, studentClass: string) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    studentClass: '5 класс',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);

      setTimeout(() => {
        onLoginSuccess(
          formData.name || (isLoginTab ? 'Александр П.' : 'Новый Лидер'),
          formData.studentClass
        );
        setSuccess(false);
        onClose();
      }, 1000);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="clay-card w-full max-w-md overflow-hidden bg-surface !rounded-[2rem]"
      >
        <div className="bg-gradient-to-r from-primary to-accent-dark p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-full cursor-pointer transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>

          <Trophy className="w-10 h-10 mx-auto text-amber-300 mb-2" />
          <h3 className="font-display font-extrabold text-lg sm:text-xl">
            Личный кабинет ученика
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            Звёзды, квесты и прогресс — всё в одном месте
          </p>
        </div>

        <div className="grid grid-cols-2 border-b-2 border-border bg-primary-light">
          <button
            type="button"
            onClick={() => { setIsLoginTab(true); setSuccess(false); }}
            className={`py-3.5 text-sm font-bold transition-colors cursor-pointer ${
              isLoginTab ? 'text-primary bg-surface border-b-2 border-primary' : 'text-muted hover:text-foreground'
            }`}
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginTab(false); setSuccess(false); }}
            className={`py-3.5 text-sm font-bold transition-colors cursor-pointer ${
              !isLoginTab ? 'text-primary bg-surface border-b-2 border-primary' : 'text-muted hover:text-foreground'
            }`}
          >
            Регистрация
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {!success ? (
              <motion.form
                key="form-fields"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {!isLoginTab && (
                  <div className="space-y-1.5">
                    <label htmlFor="authName" className="block text-sm font-bold text-foreground">
                      Имя ученика
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-muted" />
                      <input
                        id="authName"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Данияр"
                        className="w-full bg-primary-light border-2 border-border text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="authEmail" className="block text-sm font-bold text-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted" />
                    <input
                      id="authEmail"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="studytask@gmail.com"
                      className="w-full bg-primary-light border-2 border-border text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="authPassword" className="block text-sm font-bold text-foreground">
                    Пароль
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted" />
                    <input
                      id="authPassword"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-primary-light border-2 border-border text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                {!isLoginTab && (
                  <div className="space-y-1.5">
                    <label htmlFor="authClass" className="block text-sm font-bold text-foreground">
                      Класс
                    </label>
                    <select
                      id="authClass"
                      value={formData.studentClass}
                      onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })}
                      className="w-full bg-primary-light border-2 border-border text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:bg-white font-medium cursor-pointer"
                    >
                      {GRADE_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-primary hover:bg-primary-dark disabled:bg-primary/60 text-white rounded-[1.25rem] font-display font-bold text-sm clay-btn transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{isLoginTab ? 'Войти в профиль' : 'Создать аккаунт'}</span>
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success-message"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-lg text-foreground">
                    Авторизация успешна
                  </h4>
                  <p className="text-muted text-xs mt-1">
                    Добро пожаловать — прогресс синхронизирован!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
