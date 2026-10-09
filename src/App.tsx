import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import InteractivePlatform from './components/InteractivePlatform';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Testimonials from './components/Testimonials';
import Pricing from './components/Pricing';
import Leaderboard from './components/Leaderboard';
import FreeTrial from './components/FreeTrial';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';

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
  stars: 5,
  xp: 45,
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
    return { ...DEFAULT_PROGRESS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const initialProgress = loadStoredProgress();

  // Global gamified state
  const [stars, setStars] = useState<number>(initialProgress.stars);
  const [xp, setXp] = useState<number>(initialProgress.xp);
  const [level, setLevel] = useState<number>(initialProgress.level);
  const [claimedPrizes, setClaimedPrizes] = useState<string[]>(initialProgress.claimedPrizes);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(initialProgress.unlockedAchievements);
  
  // Custom user profile state
  const [userName, setUserName] = useState<string>(initialProgress.userName);
  const [userClass, setUserClass] = useState<string>(initialProgress.userClass);

  // Modals / Overlays
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
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
    } catch (e) {
      console.warn('Could not save localStorage progress:', e);
    }
  }, [stars, xp, level, claimedPrizes, unlockedAchievements, userName, userClass]);

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
  const handleLoginSuccess = (name: string, studentClass: string) => {
    setUserName(name);
    setUserClass(studentClass);
    // Give a small login reward
    handleAddRewards(10, 40);
  };

  // Reset simulator
  const handleResetProgress = () => {
    if (window.confirm('Вы действительно хотите сбросить прогресс симулятора на лендинге?')) {
      setStars(5);
      setXp(45);
      setLevel(1);
      setClaimedPrizes([]);
      setUnlockedAchievements([]);
      setUserName('Юный Самурай');
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

  const handleOpenQuizTab = () => scrollToId('interactive');
  const handleBookTrial = () => scrollToId('free-trial');

  // Trigger from the Free Trial Section
  const handleUnlockDiagnosticAchievement = () => {
    handleUnlockAchievement('ach-level-up');
    handleAddRewards(15, 100); // 100 XP triggers high progress
  };

  return (
    <div className="min-h-screen bg-surface text-foreground font-sans antialiased overflow-x-hidden selection:bg-primary-light selection:text-primary">
      
      {/* Sticky Navigation */}
      <Navbar
        stars={stars}
        xp={xp}
        level={level}
        userName={userName}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenQuizTab={handleOpenQuizTab}
      />

      {/* Main Sections */}
      <main>
        {/* Hero Banner Section */}
        <Hero onBookTrial={handleBookTrial} stars={stars} />

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
        <Testimonials />

        {/* Free Starter Package Info & Sign Up */}
        <FreeTrial onUnlockDiagnosticAchievement={handleUnlockDiagnosticAchievement} />

        {/* Live dynamic Leaderboard */}
        <Leaderboard stars={stars} level={level} userName={userName} />

        {/* Tuition Cost Tariffs & Cost Calculator */}
        <Pricing />

        {/* Quick Contacts details */}
        <ContactForm />
      </main>

      {/* Modern footer details */}
      <Footer />

      {/* Student Authorization Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

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
