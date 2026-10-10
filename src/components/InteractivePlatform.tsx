import React, { useState } from 'react';
import {
  Calculator,
  Code2,
  Atom,
  Languages,
  BookMarked,
  Smile,
  Crown,
  CupSoda,
  Shirt,
  Headphones,
  Tablet,
  Compass,
  CheckCircle2,
  Sparkles,
  Trophy,
  ShoppingBag,
  Star,
  Zap,
  Play,
  Check,
  X,
  RefreshCw,
  Gift,
  ArrowRight,
  Paperclip,
  BookOpen,
  AlertCircle,
  Rocket,
  Gamepad2,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SUBJECTS } from '../data';
import { Subject } from '../types';
import { KIT_1 } from './GiftKit';
import { GRADE_OPTIONS } from '../constants';
import FlappyBirdGame from './FlappyBirdGame';

type KitItem = (typeof KIT_1)[number];

// Map icon names to Lucide icons
const IconMap: Record<string, React.ComponentType<any>> = {
  Calculator,
  Code2,
  Atom,
  Languages,
  BookMarked,
  Smile,
  Crown,
  CupSoda,
  Shirt,
  Headphones,
  Tablet,
  Compass,
  CheckCircle2,
  Sparkles,
  Trophy,
  ShoppingBag,
};

interface InteractivePlatformProps {
  stars: number;
  xp: number;
  level: number;
  claimedPrizes: string[];
  unlockedAchievements: string[];
  userName: string;
  userClass: string;
  onAddRewards: (starsAdded: number, xpAdded: number) => void;
  onUnlockAchievement: (id: string) => void;
  onClaimPrize: (id: string, cost: number) => void;
  onChangeUserName: (name: string) => void;
  onChangeUserClass: (userClass: string) => void;
  onResetProgress: () => void;
}

export default function InteractivePlatform({
  stars,
  xp,
  level,
  claimedPrizes,
  unlockedAchievements,
  userName,
  userClass,
  onAddRewards,
  onUnlockAchievement,
  onClaimPrize,
  onChangeUserName,
  onChangeUserClass,
  onResetProgress,
}: InteractivePlatformProps) {
  const [activeTab, setActiveTab] = useState<'game' | 'quizzes' | 'shop'>('game');
  const [selectedSubject, setSelectedSubject] = useState<Subject>(SUBJECTS[0]);
  
  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResultStars, setQuizResultStars] = useState(0);
  const [quizResultXp, setQuizResultXp] = useState(0);
  const [errorStreak, setErrorStreak] = useState(0);

  // Shop state
  const [justPurchased, setJustPurchased] = useState<string | null>(null);

  // Homework modal
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);

  // Profile Edit
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  // Start a Quiz
  const handleStartQuiz = (subject: Subject) => {
    if (subject.comingSoon) return;
    setSelectedSubject(subject);
    setQuizActive(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
    setErrorStreak(0);
  };

  // Answer Quiz Option
  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(index);
  };

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || isAnswerSubmitted) return;
    
    const question = selectedSubject.quiz[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswerIndex;
    
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    
    setIsAnswerSubmitted(true);
  };

  // Next Question or Finish
  const handleNextQuestion = () => {
    const question = selectedSubject.quiz[currentQuestionIndex];
    
    if (currentQuestionIndex + 1 < selectedSubject.quiz.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      // Finish Quiz! Calculate rewards
      const totalQuestions = selectedSubject.quiz.length;
      const isPerfect = score + (selectedAnswer === question.correctAnswerIndex ? 1 : 0) === totalQuestions;
      const finalScore = score + (selectedAnswer === question.correctAnswerIndex ? 1 : 0);
      
      const earnedStars = isPerfect ? 1 : 0; // звезда только за результат без ошибок (10 из 10)
      const earnedXp = finalScore * 25 + (isPerfect ? 25 : 0);

      setQuizResultStars(earnedStars);
      setQuizResultXp(earnedXp);
      setQuizCompleted(true);
      setQuizActive(false);

      // Add to global profile
      onAddRewards(earnedStars, earnedXp);

      // Achievements Checks
      onUnlockAchievement('ach-first'); // Earned first quest completion
      if (isPerfect) {
        onUnlockAchievement('ach-nerd'); // Perfect score
      }
    }
  };

  // Buy Item in Shop
  const handleBuyItem = (prize: KitItem) => {
    if (stars < prize.stars) return;
    onClaimPrize(prize.id, prize.stars);
    onUnlockAchievement('ach-shopper'); // Unlock shooper achievement
    setJustPurchased(prize.name);
  };

  // Save Name
  const handleSaveName = () => {
    if (tempName.trim()) {
      onChangeUserName(tempName.trim());
      setIsEditingName(false);
    }
  };

  // Render proper icon
  const renderIcon = (name: string, className: string = "w-5 h-5") => {
    const IconComponent = IconMap[name] || AlertCircle;
    return <IconComponent className={className} />;
  };

  return (
    <section id="interactive" className="py-16 bg-primary-light border-y-2 border-border relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Block */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center space-x-2 bg-accent-light border-2 border-border rounded-full px-4 py-1.5 mb-4"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary-dark">
              Интерактивный симулятор
            </span>
          </motion.div>
          <h2 className="font-display font-extrabold text-foreground text-3xl sm:text-4xl mb-4">
            Попробуй геймификацию в действии
          </h2>
          <p className="text-muted">
            Пройди демо-квиз по математике для 5–9 классов, заработай звёзды и посмотри, на какие призы их можно обменять.
          </p>
        </div>

        {/* Dashboard Frame */}
        <div className="clay-card overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[520px] bg-surface">
          
          {/* Dashboard Left Sidebar */}
          <div className="lg:col-span-3 bg-navy text-white p-6 flex flex-col justify-between border-r-2 border-blue-900">
            <div className="space-y-8">
              
              {/* User mini profile block */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <img src="/static/ST.webp" alt="Study Task" className="w-12 h-12 rounded-2xl object-contain bg-white p-1 shadow-md shrink-0" />
                  <div className="flex-1">
                    {isEditingName ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="bg-blue-950/80 text-white border border-blue-800 text-xs rounded px-2 py-1 w-full focus:outline-none focus:border-blue-500 font-medium"
                          maxLength={20}
                        />
                        <button onClick={handleSaveName} className="text-emerald-400 p-1 hover:text-emerald-300">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 group">
                        <h4 className="font-bold text-slate-100 text-sm truncate max-w-[130px]">{userName}</h4>
                        <button
                          onClick={() => {
                            setTempName(userName);
                            setIsEditingName(true);
                          }}
                          className="text-muted/80 hover:text-white text-[10px] underline cursor-pointer"
                        >
                          Изм.
                        </button>
                      </div>
                    )}
                    <span className="block text-xs text-muted/80 font-medium">{userClass}</span>
                  </div>
                </div>

                {/* Grade Selection */}
                <div className="pt-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Класс ученика
                  </label>
                  <select
                    value={userClass}
                    onChange={(e) => onChangeUserClass(e.target.value)}
                    className="bg-blue-950/80 text-slate-200 border border-blue-800 text-xs rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-semibold"
                  >
                    {GRADE_OPTIONS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    setQuizActive(false);
                    setQuizCompleted(false);
                    setActiveTab('game');
                  }}
                  className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all text-left relative overflow-hidden ${
                    activeTab === 'game'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-900/30 ring-2 ring-amber-300/50'
                      : 'text-blue-300/70 hover:bg-blue-950/80 hover:text-white border border-amber-400/30'
                  }`}
                >
                  <Gamepad2 className="w-4.5 h-4.5" />
                  <span>Sky Quest</span>
                  <span className="ml-auto bg-white/25 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                    NEW
                  </span>
                </button>

                <button
                  onClick={() => {
                    setQuizActive(false);
                    setQuizCompleted(false);
                    setActiveTab('quizzes');
                  }}
                  className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all text-left ${
                    activeTab === 'quizzes'
                      ? 'bg-primary text-white shadow-md shadow-blue-900/30'
                      : 'text-blue-300/70 hover:bg-blue-950/80 hover:text-white'
                  }`}
                >
                  <Trophy className="w-4.5 h-4.5" />
                  <span>Задания & Тесты</span>
                  {activeTab !== 'quizzes' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setQuizActive(false);
                    setQuizCompleted(false);
                    setActiveTab('shop');
                  }}
                  className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all text-left ${
                    activeTab === 'shop'
                      ? 'bg-primary text-white shadow-md shadow-blue-900/30'
                      : 'text-blue-300/70 hover:bg-blue-950/80 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  <span>Магазин призов</span>
                  <span className="ml-auto bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                    МЕРЧ
                  </span>
                </button>
              </div>

            </div>

            {/* Live Wallet status inside Sidebar */}
            <div className="pt-6 border-t border-blue-900 space-y-4">
              <div className="bg-blue-950/80 p-3.5 rounded-2xl border border-blue-800/50 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted/80 font-medium">Твой Баланс</span>
                  <span className="text-accent font-bold font-mono">LVL {level}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span className="text-2xl font-black text-white font-mono tracking-tight">{stars}</span>
                  <span className="text-xs text-amber-400/80 font-bold">звезд</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted/80">
                    <span>Опыт: {xp} XP</span>
                    <span>{level * 100} XP до LVL UP</span>
                  </div>
                  <div className="w-full bg-blue-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-accent h-full rounded-full transition-all duration-500"
                      style={{ width: `${(xp / (level * 100)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <button
                onClick={onResetProgress}
                className="flex items-center justify-center space-x-1 text-muted hover:text-rose-400 text-xs w-full py-1 cursor-pointer transition-colors"
                title="Сбросить прогресс симулятора"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Начать заново</span>
              </button>
            </div>

          </div>

          {/* Dashboard Right Main Content Frame */}
          <div className="lg:col-span-9 p-6 sm:p-8 flex flex-col justify-between">
            
            <AnimatePresence mode="wait">

              {/* FLAPPY BIRD MINI GAME */}
              {activeTab === 'game' && (
                <motion.div
                  key="game-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  <FlappyBirdGame onReward={onAddRewards} />
                </motion.div>
              )}
              
              {/* QUIZZES TAB */}
              {activeTab === 'quizzes' && !quizActive && !quizCompleted && (
                <motion.div
                  key="quizzes-select"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6"
                >
                  <div className="space-y-6 flex flex-col justify-between min-w-0">

                  {/* Как получить звезду: 10 из 10 */}
                  <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-[0_4px_0_#FCD34D]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="font-display font-extrabold text-foreground text-base">Пройди тест на 10 из 10 — получи звезду</p>
                        <div className="flex flex-wrap gap-1.5" aria-label="10 правильных ответов из 10">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span key={i} className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                              <Check className="w-4 h-4" />
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted">Ответь правильно на все 10 вопросов и получи звезду.</p>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:gap-1">
                        <ArrowRight className="w-6 h-6 text-amber-600" />
                        <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center shadow-lg ring-4 ring-amber-200">
                          <Star className="w-9 h-9 text-white fill-white" />
                        </div>
                        <span className="font-mono font-black text-amber-700 text-lg">+1 ★</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Subject Map Card from Artistic Flair */}
                  <div className="clay-card-sm p-6 relative overflow-hidden bg-surface">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-blue-900">
                        <Compass className="w-32 h-32" />
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-black text-xl text-foreground">Карта Знаний</h3>
                          <p className="text-sm text-muted/80">Математика · 5–9 классы · {selectedSubject.name}</p>
                        </div>
                        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-xs font-black">
                          {level >= 3 ? '4/5 КВЕСТОВ ПРОЙДЕНО' : '2/5 КВЕСТОВ ПРОЙДЕНО'}
                        </span>
                      </div>
                      <div className="relative h-28 flex items-center justify-between px-6 sm:px-10">
                        {/* Connection Lines */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-1 border-t-2 border-dashed border-border"></div>
                        </div>
                        {/* Nodes */}
                        <div className="z-10 bg-primary w-12 h-12 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white font-bold cursor-pointer transition-transform hover:scale-110">1</div>
                        <div className="z-10 bg-primary w-12 h-12 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white font-bold cursor-pointer transition-transform hover:scale-110">2</div>
                        <div className={`z-10 ${level >= 2 ? 'bg-primary' : 'bg-blue-400'} w-12 h-12 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white font-bold cursor-pointer transition-transform hover:scale-110`}>3</div>
                        <div className={`z-10 ${level >= 3 ? 'bg-primary text-white' : 'bg-slate-200 text-muted/80'} w-12 h-12 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center font-bold cursor-pointer transition-transform hover:scale-110`}>4</div>
                        <div className={`z-10 ${level >= 4 ? 'bg-accent text-white animate-pulse' : 'bg-primary-light text-muted/60'} w-12 h-12 rounded-2xl border-4 border-white flex items-center justify-center font-bold`}>5</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <h3 className="text-xl font-bold text-foreground font-display">Квест по математике:</h3>
                      <span className="text-xs font-semibold text-primary bg-primary-light px-2.5 py-1 rounded-full border-2 border-border flex items-center gap-1">
                        <Zap className="w-3 h-3" /> +15 XP за квиз
                      </span>
                    </div>

                    {/* Detailed info of selected subject */}
                    <div className={`p-6 rounded-2xl border ${selectedSubject.borderClass} ${selectedSubject.bgClass} grid grid-cols-1 md:grid-cols-12 gap-6 items-center transition-all`}>
                      <div className="md:col-span-8 space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white shadow-sm border ${selectedSubject.borderClass} ${selectedSubject.textClass}`}>
                            Сложность: {selectedSubject.difficulty}
                          </span>
                          <span className="text-xs text-muted font-medium">• 10 вопросов</span>
                        </div>
                        <h4 className="text-lg font-bold text-foreground">{selectedSubject.name}</h4>
                        <p className="text-muted text-sm leading-relaxed">{selectedSubject.description}</p>
                        
                        {/* Interactive Quests List */}
                        <div className="pt-2 space-y-2">
                          <span className="block text-xs font-bold text-muted uppercase tracking-wider">
                            Активные квесты предмета:
                          </span>
                          {selectedSubject.quests.map((quest) => (
                            <div key={quest.id} className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-border shadow-xs">
                              <Compass className="w-4 h-4 text-blue-500" />
                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-bold text-foreground truncate">{quest.title}</h5>
                                <p className="text-[10px] text-muted/80 truncate">{quest.description}</p>
                              </div>
                              <div className="flex items-center space-x-1.5 text-right font-mono">
                                <span className="text-[10px] font-bold text-primary">
                                  +{quest.xpReward} XP
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Call to action button box */}
                      <div className="md:col-span-4 flex justify-center">
                        <button
                          onClick={() => handleStartQuiz(selectedSubject)}
                          className={`flex flex-col items-center justify-center p-6 w-full rounded-2xl bg-gradient-to-br ${selectedSubject.colorClass} hover:opacity-95 text-white shadow-xl shadow-blue-100 cursor-pointer transition-transform transform hover:-translate-y-1`}
                        >
                          <Play className="w-10 h-10 bg-white/20 p-2.5 rounded-full animate-pulse mb-3" />
                          <span className="font-extrabold text-sm text-center">Пройти Викторину</span>
                          <span className="text-[10px] opacity-80 mt-1 flex items-center gap-0.5">
                            <Zap className="w-3 h-3" /> 10 из 10 = +1 звезда
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Interactive grid: Guidelines & Daily Quest card from Artistic Flair */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {/* Rules/Tip Card */}
                    <div className="bg-primary-light p-5 rounded-3xl border border-border flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs text-muted space-y-2">
                        <p className="font-black text-foreground text-sm">Правила игры StudyTask</p>
                        <p className="leading-relaxed">
                          Ответь на <strong className="text-primary">все вопросы без ошибок</strong> (10 из 10) и получи <strong className="text-amber-600">1 звезду</strong>.
                          Ещё одна звезда — за прикреплённую домашку. Звёзды можно обменять на призы набора 1 в магазине.
                        </p>
                      </div>
                    </div>

                    {/* Daily Quest Card from Artistic Flair */}
                    <div className="bg-blue-900 rounded-3xl p-5 shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
                      <div className="relative z-10 space-y-3">
                        <div>
                          <h3 className="font-black text-lg mb-0.5 tracking-tight">Ежедневный Квест</h3>
                          <p className="text-blue-300 text-[10px] uppercase font-bold tracking-wider">Заверши до полуночи</p>
                        </div>
                        <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                          <p className="text-xs font-semibold italic text-slate-100">
                            "Пройти квиз по предмету {selectedSubject.name} без ошибок!"
                          </p>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-xs font-extrabold text-blue-200 font-mono">+100 XP & +1 ЗВЕЗДА</span>
                          <button 
                            onClick={() => handleStartQuiz(selectedSubject)}
                            className="bg-accent hover:bg-accent-dark px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-md shadow-blue-950/50"
                          >
                            В бой!
                          </button>
                        </div>
                      </div>
                      {/* Decorative circles */}
                      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-800 rounded-full opacity-50 -z-0"></div>
                      <div className="absolute top-0 right-10 w-12 h-12 bg-blue-700 rounded-full opacity-30 -z-0"></div>
                    </div>
                  </div>
                  </div>

                  {/* Домашнее задание (справа) */}
                  <aside className="clay-card-sm p-5 bg-surface flex flex-col gap-4 self-start">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <h4 className="font-display font-extrabold text-foreground text-base">Домашнее задание</h4>
                    </div>

                    <div className="rounded-xl bg-primary-light border-2 border-border p-3 text-xs text-muted leading-relaxed">
                      Здесь появляется задание от преподавателя после урока. Реши его в тетради и прикрепи фото.
                    </div>

                    <button
                      type="button"
                      aria-disabled="true"
                      onClick={() => setShowHomeworkModal(true)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-200 text-slate-500 font-bold text-sm cursor-pointer hover:bg-slate-300 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                      Прикрепить домашку
                    </button>

                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 border-2 border-amber-200 px-3 py-2">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-amber-800">За прикреплённую домашку — 1 звезда</span>
                    </div>
                  </aside>
                </motion.div>
              )}

              {/* ACTIVE QUIZ SCREEN */}
              {activeTab === 'quizzes' && quizActive && (
                <motion.div
                  key="quiz-engine"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    {/* Progress headers */}
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-tr ${selectedSubject.colorClass}`}>
                          {renderIcon(selectedSubject.iconName, "w-4 h-4")}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-muted/80 block uppercase tracking-wider">Викторина</span>
                          <span className="text-sm font-extrabold text-foreground">{selectedSubject.name}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold bg-primary-light text-muted px-3 py-1 rounded-full">
                        Вопрос {currentQuestionIndex + 1} из {selectedSubject.quiz.length}
                      </span>
                    </div>

                    {/* Question Box */}
                    <div className="bg-primary-light p-6 rounded-2xl border border-border">
                      <h4 className="text-base sm:text-lg font-bold text-foreground leading-relaxed font-sans">
                        {selectedSubject.quiz[currentQuestionIndex].question}
                      </h4>
                    </div>

                    {/* Options list */}
                    <div className="space-y-2.5">
                      {selectedSubject.quiz[currentQuestionIndex].options.map((option, idx) => {
                        const isSelected = selectedAnswer === idx;
                        const isCorrect = idx === selectedSubject.quiz[currentQuestionIndex].correctAnswerIndex;
                        
                        let btnStyle = "border-border bg-white hover:border-slate-300 hover:bg-primary-light text-slate-700";
                        if (isAnswerSubmitted) {
                          if (isCorrect) {
                            btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                          } else if (isSelected) {
                            btnStyle = "border-rose-500 bg-rose-50 text-rose-900 font-bold";
                          } else {
                            btnStyle = "border-border bg-white text-muted/80 opacity-60";
                          }
                        } else if (isSelected) {
                          btnStyle = "border-primary bg-primary-light/50 text-blue-900 font-bold";
                        }

                        return (
                          <button
                            key={idx}
                            disabled={isAnswerSubmitted}
                            onClick={() => handleSelectOption(idx)}
                            className={`flex items-center justify-between w-full p-4 rounded-xl border-2 text-left text-sm transition-all cursor-pointer ${btnStyle}`}
                          >
                            <span>{option}</span>
                            <div className="flex items-center space-x-1">
                              {isAnswerSubmitted && isCorrect && <Check className="w-5 h-5 text-emerald-600" />}
                              {isAnswerSubmitted && isSelected && !isCorrect && <X className="w-5 h-5 text-rose-600" />}
                              {!isAnswerSubmitted && isSelected && <span className="w-3 h-3 rounded-full bg-primary"></span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation box */}
                    <AnimatePresence>
                      {isAnswerSubmitted && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl text-xs text-emerald-900 space-y-1"
                        >
                          <span className="font-extrabold flex items-center gap-1">
                            <Sparkles className="w-4.5 h-4.5 text-emerald-600 fill-emerald-100" />
                            Пояснение преподавателя:
                          </span>
                          <p className="leading-relaxed">{selectedSubject.quiz[currentQuestionIndex].explanation}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end pt-4 border-t border-border">
                    {!isAnswerSubmitted ? (
                      <button
                        disabled={selectedAnswer === null}
                        onClick={handleSubmitAnswer}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${
                          selectedAnswer === null
                            ? 'bg-primary-light text-muted/80 cursor-not-allowed'
                            : 'bg-navy hover:bg-blue-950/80 text-white cursor-pointer'
                        }`}
                      >
                        <span>Проверить ответ</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-sm transition-all flex items-center space-x-2 cursor-pointer"
                      >
                        <span>
                          {currentQuestionIndex + 1 === selectedSubject.quiz.length
                            ? 'Завершить викторину'
                            : 'Следующий вопрос'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* QUIZ COMPLETED SUMMARY SCREEN */}
              {activeTab === 'quizzes' && quizCompleted && (
                <motion.div
                  key="quiz-finished"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-6 py-8 flex flex-col justify-between h-full"
                >
                  <div className="space-y-4">
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
                      <Trophy className="w-10 h-10" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-foreground font-display">Квест успешно завершен!</h3>
                      <p className="text-muted text-sm max-w-md mx-auto">
                        Поздравляем! Ты блестяще справился с испытанием по предмету <strong>{selectedSubject.name}</strong>. Твой результат записан на платформе.
                      </p>
                    </div>

                    {/* Rewards Summary Row */}
                    <div className="flex justify-center gap-4 py-4 max-w-sm mx-auto">
                      <div className="flex-1 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                        <span className="block text-2xl font-black text-amber-700 font-mono tracking-tight">
                          +{quizResultStars}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 uppercase">Звезд на баланс</span>
                      </div>
                      
                      <div className="flex-1 bg-accent-light border-2 border-border rounded-2xl p-4 text-center">
                        <span className="block text-2xl font-black text-primary-dark font-mono tracking-tight">
                          +{quizResultXp} XP
                        </span>
                        <span className="text-[10px] font-bold text-primary uppercase font-sans">Опыта получено</span>
                      </div>
                    </div>

                    {quizResultStars === 0 && (
                      <p className="text-xs text-amber-700 font-semibold">Звезда выдаётся только за тест без ошибок — попробуй ещё раз!</p>
                    )}

                    {/* Fun note */}
                    <p className="text-xs text-muted/80 italic">
                      Ты можешь сразу перейти в <strong className="text-primary">"Магазин призов"</strong> и потратить звезды на классный мерч!
                    </p>
                  </div>

                  <div className="flex justify-center space-x-3 pt-6 border-t border-border">
                    <button
                      onClick={() => {
                        setQuizCompleted(false);
                        setQuizActive(false);
                        setActiveTab('shop');
                      }}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-all flex items-center space-x-2 cursor-pointer shadow-md shadow-amber-100"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Потратить звезды в магазине</span>
                    </button>

                    <button
                      onClick={() => {
                        setQuizCompleted(false);
                        setQuizActive(false);
                        setActiveTab('quizzes');
                      }}
                      className="px-6 py-3 bg-navy hover:bg-blue-950/80 text-white rounded-xl font-bold text-sm transition-all cursor-pointer"
                    >
                      <span>Вернуться к квизу</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SHOP TAB */}
              {activeTab === 'shop' && (
                <motion.div
                  key="shop-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="inline-block text-[10px] font-bold text-primary bg-primary-light px-2.5 py-0.5 rounded-full border-2 border-border mb-1">Набор 1</span>
                      <h3 className="text-xl font-bold text-foreground font-display">Магазин призов Study Task</h3>
                      <p className="text-xs text-muted">Копи звёзды за тесты и домашку и обменивай их на призы!</p>
                    </div>
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-2 text-center shadow-[0_3px_0_#FCD34D]">
                      <div className="text-[10px] font-bold text-amber-700">Весь набор</div>
                      <div className="font-display font-extrabold text-amber-700 text-xl leading-tight">
                        {KIT_1.reduce((sum, g) => sum + g.stars, 0)} ★
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {KIT_1.map((prize) => {
                      const isClaimed = claimedPrizes.includes(prize.id);
                      const canAfford = stars >= prize.stars;
                      const variants = prize.images.length ? prize.images : [undefined];

                      return (
                        <div
                          key={prize.id}
                          className={`bg-white border-2 rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                            isClaimed ? 'border-emerald-200' : 'border-border hover:border-blue-200 hover:shadow-md'
                          }`}
                        >
                          <div className={`grid gap-2 ${variants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {variants.map((src, v) => (
                              <div key={v} className="aspect-square rounded-xl bg-primary-light border-2 border-border overflow-hidden flex items-center justify-center">
                                {src ? (
                                  <img
                                    src={src}
                                    alt={`${prize.name}${variants.length > 1 ? `, вариант ${v + 1}` : ''}`}
                                    loading="lazy"
                                    className="w-full h-full object-contain p-2"
                                  />
                                ) : (
                                  <Gift className="w-8 h-8 text-muted/50" />
                                )}
                              </div>
                            ))}
                          </div>
                          {variants.length > 1 && (
                            <span className="text-[11px] text-muted">Вариантов на выбор: {variants.length}</span>
                          )}

                          <h4 className="font-bold text-foreground text-sm">{prize.name}</h4>

                          <div className="border-t border-border pt-3 mt-auto flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                              <span className="font-black text-foreground text-base font-mono">{prize.stars}</span>
                            </div>

                            {isClaimed ? (
                              <button disabled className="px-3.5 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl cursor-not-allowed">
                                В профиле
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBuyItem(prize)}
                                disabled={!canAfford}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                  canAfford
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-md shadow-amber-100'
                                    : 'bg-primary-light text-muted/80 cursor-not-allowed'
                                }`}
                              >
                                {canAfford ? 'Заказать' : 'Не хватает звёзд'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </div>

      <AnimatePresence>
        {justPurchased && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm"
            onClick={() => setJustPurchased(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-confirmation-title"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              onClick={(event) => event.stopPropagation()}
              className="clay-card relative w-full max-w-md space-y-5 bg-surface p-7 text-center"
            >
              <button
                type="button"
                aria-label="Закрыть окно"
                onClick={() => setJustPurchased(null)}
                className="absolute right-3 top-3 rounded-lg p-2 text-muted hover:bg-primary-light hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <Gift className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 id="order-confirmation-title" className="font-display text-xl font-extrabold text-foreground">
                  Заказ оформлен!
                </h3>
                <p className="font-semibold text-primary">{justPurchased}</p>
                <p className="text-sm leading-relaxed text-muted">
                  Мы собираем ваш заказ. Доставка займёт до 24 часов.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJustPurchased(null)}
                className="w-full rounded-xl bg-primary px-5 py-3 font-display text-sm font-bold text-white hover:bg-primary-dark"
              >
                Понятно
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHomeworkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowHomeworkModal(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="clay-card bg-surface p-7 max-w-sm w-full text-center space-y-4"
            >
              <div className="text-4xl">😏</div>
              <p className="font-display font-extrabold text-foreground text-lg leading-snug">
                Ну ты и хитрый, сначала запишись на занятия)
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="#free-trial"
                  onClick={() => setShowHomeworkModal(false)}
                  className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm"
                >
                  Записаться на пробный урок
                </a>
                <button
                  onClick={() => setShowHomeworkModal(false)}
                  className="px-5 py-2.5 rounded-xl text-muted hover:text-foreground font-semibold text-sm cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
