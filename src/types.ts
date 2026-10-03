export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  starsReward: number;
  xpReward: number;
  isCompleted: boolean;
}

export interface Subject {
  id: string;
  name: string;
  iconName: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  difficulty: 'Легкий' | 'Средний' | 'Продвинутый';
  quests: Quest[];
  quiz: QuizQuestion[];
}

export interface Prize {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlockedAtLevel: number;
  iconName: string; // e.g., 'Gift', 'Shield', 'Sparkles'
  category: 'Стикеры' | 'Мерч' | 'Гаджеты';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  unlocked: boolean;
  requiredStars?: number;
  requiredLevel?: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  stars: number;
  level: number;
  avatarSeed: string; // simple string for generating nice placeholder avatars
  isUser?: boolean;
}
