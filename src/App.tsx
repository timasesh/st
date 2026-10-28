import React, { lazy, Suspense, useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
const InteractivePlatform = lazy(() => import('./components/InteractivePlatform'));
const Features = lazy(() => import('./components/Features'));
const HowItWorks = lazy(() => import('./components/HowItWorks'));
const Pricing = lazy(() => import('./components/Pricing'));
const FreeTrial = lazy(() => import('./components/FreeTrial'));
const ContactForm = lazy(() => import('./components/ContactForm'));
const Footer = lazy(() => import('./components/Footer'));
const StudentLoginPage = lazy(() => import('./components/AuthPages').then((module) => ({ default: module.StudentLoginPage })));
const AdminLoginPage = lazy(() => import('./components/AuthPages').then((module) => ({ default: module.AdminLoginPage })));
const UserPortalPage = lazy(() => import('./components/AuthPages').then((module) => ({ default: module.UserPortalPage })));
const PublicTest = lazy(() => import('./components/PublicTest'));
const TrialBooking = lazy(() => import('./components/TrialBooking'));
const AdminDashboardPage = lazy(() => import('./components/AuthPages').then((module) => ({ default: module.AdminDashboardPage })));

// Секции ниже первого экрана подгружаются после первой отрисовки, чтобы Hero появлялся сразу.
function useDeferredMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const go = () => setReady(true);
    const w = window as any;
    const t = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1500 }) : window.setTimeout(go, 600);
    const events = ['scroll', 'pointerdown', 'keydown', 'touchstart', 'hashchange'];
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    return () => {
      if (w.cancelIdleCallback && w.requestIdleCallback) w.cancelIdleCallback(t); else clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, go));
    };
  }, []);
  return ready;
}

function PageLoading() {
  return <main className="grid min-h-[60vh] place-items-center bg-surface p-6 text-center text-sm font-semibold text-muted" role="status">Загружаем страницу…</main>;
}

function withPageLoading(page: React.ReactNode) {
  return <Suspense fallback={<PageLoading />}>{page}</Suspense>;
}

import { Rocket, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type StoredProgress = {
  stars: number;
  xp: number;
  level: number;
  claimedPrizes: string[];
  unlockedAchievements: string[];
  userName: string;
  userClass: string;
};

const DEFAULT_PROGRESS: StoredProgress = {
  stars: 0,
  xp: 0,
  level: 1,
  claimedPrizes: [],
  unlockedAchievements: [],
  userName: 'Иван Смирнов',
  userClass: '5 класс',
};

function loadStoredProgress(): StoredProgress {
  try {
    const stored = localStorage.getItem('study_task_progress');
    if (!stored) return DEFAULT_PROGRESS;
    const progress = { ...DEFAULT_PROGRESS, ...JSON.parse(stored) };
    if (/^юный самурай$/i.test(progress.userName?.trim() ?? '')) {
      progress.userName = 'Иван Смирнов';
    }
    return progress;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const initialProgress = loadStoredProgress();
  const belowFoldReady = useDeferredMount();

  // Global gamified state
  const [stars, setStars] = useState<number>(initialProgress.stars);
  const [xp, setXp] = useState<number>(initialProgress.xp);
  const [level, setLevel] = useState<number>(initialProgress.level);
  const [claimedPrizes, setClaimedPrizes] = useState<string[]>(initialProgress.claimedPrizes);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(initialProgress.unlockedAchievements);
  
  // Custom user profile state
  const [userName, setUserName] = useState<string>(initialProgress.userName);
  const [userClass, setUserClass] = useState<string>(initialProgress.userClass);
  const [loggedInAccountId, setLoggedInAccountId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('study_task_account_id'); } catch { return null; }
  });

  // Modals / Overlays
  const [showLevelUpModal, setShowLevelUpModal] = useState<boolean>(false);
  const [prevLevel, setPrevLevel] = useState<number>(initialProgress.level);

  // Save states to local storage on change
  useEffect(() => {
    try {
      const stateObj = {
        stars,
        xp,
        level,
        claimedPrizes,
        unlockedAchievements,
        userName,
        userClass,
      };
      localStorage.setItem('study_task_progress', JSON.stringify(stateObj));
      if (loggedInAccountId) {
        fetch('/api/auth/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          // Star balances are server-owned and must never be overwritten by values from the browser.
          body: JSON.stringify({ xp, level, claimedPrizes, unlockedAchievements }),
        }).catch((e) => console.warn('Could not sync student progress:', e));
      }
    } catch (e) {
      console.warn('Could not save localStorage progress:', e);
    }
  }, [stars, xp, level, claimedPrizes, unlockedAchievements, userName, userClass, loggedInAccountId]);

  // Handle Rewards & Level Up logic
  const handleAddRewards = (starsAdded: number, xpAdded: number) => {
    setStars((prev) => {
      const nextStars = prev + starsAdded;
      // Stars based achievements checking
      if (nextStars >= 25 && !unlockedAchievements.includes('ach-star-collector')) {
        handleUnlockAchievement('ach-star-collector');
      }
      return nextStars;
    });

    setXp((prevXp) => {
      let currentXp = prevXp + xpAdded;
      let currentLevel = level;
      let xpNeeded = currentLevel * 100;

      while (currentXp >= xpNeeded) {
        currentXp -= xpNeeded;
        currentLevel += 1;
        xpNeeded = currentLevel * 100;
      }

      if (currentLevel > level) {
        setPrevLevel(level);
        setLevel(currentLevel);
        setShowLevelUpModal(true);

        // Level based achievements checking
        if (currentLevel >= 3 && !unlockedAchievements.includes('ach-level-up')) {
          handleUnlockAchievement('ach-level-up');
        }
      }

      return currentXp;
    });
  };

  // Unlock Achievements
  const handleUnlockAchievement = (id: string) => {
    if (!unlockedAchievements.includes(id)) {
      setUnlockedAchievements((prev) => [...prev, id]);
    }
  };

  // Spend stars in shop
  const handleClaimPrize = (id: string, cost: number) => {
    if (stars >= cost) {
      setStars((prev) => prev - cost);
      if (!claimedPrizes.includes(id)) {
        setClaimedPrizes((prev) => [...prev, id]);
      }
    }
  };

  // Custom User details sync
  const handleLoginSuccess = (name: string, studentClass: string, accountId: string, savedProgress: Partial<StoredProgress> | null, role: 'student' | 'parent' | 'teacher') => {
    const accountProgress = role === 'student' ? (savedProgress || DEFAULT_PROGRESS) : null;
    const nextProgress = { ...DEFAULT_PROGRESS, ...(accountProgress || {}), userName: name, userClass: studentClass };
    setUserName(name);
    setUserClass(studentClass);
    setStars(nextProgress.stars);
    setXp(nextProgress.xp);
    setLevel(nextProgress.level);
    setClaimedPrizes(nextProgress.claimedPrizes);
    setUnlockedAchievements(nextProgress.unlockedAchievements);
    setLoggedInAccountId(role === 'student' ? accountId : null);
    try {
      if (role === 'student') sessionStorage.setItem('study_task_account_id', accountId);
      else sessionStorage.removeItem('study_task_account_id');
      localStorage.setItem('study_task_progress', JSON.stringify(nextProgress));
    } catch (e) {
      console.warn('Could not cache signed-in profile:', e);
    }
  };

  // Reset simulator
  const handleResetProgress = () => {
    if (window.confirm('Вы действительно хотите сбросить прогресс симулятора на лендинге?')) {
      setStars(5);
      setXp(45);
      setLevel(1);
      setClaimedPrizes([]);
      setUnlockedAchievements([]);
      setUserName('Иван Смирнов');
      setUserClass('5 класс');
      try {
        localStorage.removeItem('study_task_progress');
      } catch (e) {}
    }
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const pos = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: pos - offset,
        behavior: 'smooth',
      });
    }
  };

  const handleBookTrial = () => scrollToId('free-trial');

  // Trigger from the Free Trial Section
  const handleUnlockDiagnosticAchievement = () => {
    handleUnlockAchievement('ach-level-up');
    handleAddRewards(15, 100); // 100 XP triggers high progress
  };

  if (window.location.pathname === '/trial' || window.location.pathname === '/trial/') {
    return withPageLoading(<TrialBooking />);
  }
  if (window.location.pathname === '/test' || window.location.pathname.startsWith('/test/')) {
    return withPageLoading(<PublicTest />);
  }
  if (window.location.pathname === '/login') {
    return withPageLoading(<StudentLoginPage onLoginSuccess={handleLoginSuccess} />);
  }
  if (window.location.pathname === '/teacher_login') {
    return withPageLoading(<StudentLoginPage expectedRole="teacher" onLoginSuccess={handleLoginSuccess} />);
  }
  if (window.location.pathname === '/student' || window.location.pathname === '/student/') {
    return withPageLoading(<UserPortalPage expectedRole="student" />);
  }
  if (window.location.pathname === '/parent' || window.location.pathname === '/parent/') {
    return withPageLoading(<UserPortalPage expectedRole="parent" />);
  }
  if (window.location.pathname === '/teacher' || window.location.pathname === '/teacher/') {
    return withPageLoading(<UserPortalPage expectedRole="teacher" />);
  }
  if (window.location.pathname === '/admin_login') {
    return withPageLoading(<AdminLoginPage />);
  }
  if (window.location.pathname === '/admin') {
    return withPageLoading(<AdminDashboardPage />);
  }

  return (
    <div className="landing-site min-h-screen bg-surface text-foreground font-sans antialiased overflow-x-hidden selection:bg-primary-light selection:text-primary">
      
      {/* Sticky Navigation */}
      <Navbar
        onOpenAuthModal={() => window.location.assign('/login')}
      />

      {/* Main Sections */}
      <main>
        {/* Hero Banner Section */}
        <Hero onBookTrial={handleBookTrial} stars={stars} />

        {belowFoldReady ? (
        <Suspense fallback={<div className="min-h-[100vh]" aria-hidden="true" />}>
        {/* Live Interactive Gamification Cockpit */}
        <InteractivePlatform
          stars={stars}
          xp={xp}
          level={level}
          claimedPrizes={claimedPrizes}
          unlockedAchievements={unlockedAchievements}
          userName={userName}
          userClass={userClass}
          onAddRewards={handleAddRewards}
          onUnlockAchievement={handleUnlockAchievement}
          onClaimPrize={handleClaimPrize}
          onChangeUserName={setUserName}
          onChangeUserClass={setUserClass}
          onResetProgress={handleResetProgress}
        />

        {/* Features / Why Study Task Grid */}
        <Features />

        {/* How It Works Steps */}
        <HowItWorks />

        {/* Parent testimonials */}

        {/* Free Starter Package Info & Sign Up */}
        <FreeTrial onUnlockDiagnosticAchievement={handleUnlockDiagnosticAchievement} />

        {/* Tuition Cost Tariffs & Cost Calculator */}
        <Pricing />

        {/* Quick Contacts details */}
        <ContactForm />
        </Suspense>
        ) : (
          <div className="min-h-[300vh]" aria-hidden="true" />
        )}
      </main>

      {/* Modern footer details */}
      {belowFoldReady && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}

      {/* LEVEL UP POPUP OVERLAY */}
      <AnimatePresence>
        {showLevelUpModal && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              className="clay-card p-8 max-w-sm text-center relative overflow-hidden bg-surface"
            >
              <div className="space-y-6">
                <div className="w-20 h-20 bg-accent-light text-accent rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <Rocket className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full border-2 border-border">
                    Новый уровень!
                  </span>
                  <h3 className="font-display font-extrabold text-foreground text-2xl">
                    Ты вырос до {level}-го уровня
                  </h3>
                  <p className="text-muted text-sm">
                    Отличная работа — открылись новые призы в магазине.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 py-3 bg-primary-light rounded-2xl border-2 border-border">
                  <div className="text-center">
                    <span className="block text-muted text-xs font-medium">Было</span>
                    <span className="text-lg font-display font-bold text-muted">LVL {prevLevel}</span>
                  </div>
                  <span className="text-primary font-bold">→</span>
                  <div className="text-center">
                    <span className="block text-primary text-xs font-bold">Сейчас</span>
                    <span className="text-2xl font-display font-extrabold text-accent">LVL {level}</span>
                  </div>
                </div>

                <p className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                  Загляни в магазин — там что-то новое
                </p>

                <button
                  type="button"
                  onClick={() => setShowLevelUpModal(false)}
                  className="w-full py-3.5 bg-accent hover:bg-accent-dark text-white font-display font-bold rounded-[1.25rem] text-sm clay-btn clay-btn-accent cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
                >
                  Продолжить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
