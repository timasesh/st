import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Sparkles, User, Medal } from 'lucide-react';
import { INITIAL_LEADERBOARD } from '../data';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  stars: number;
  level: number;
  userName: string;
}

export default function Leaderboard({ stars, level, userName }: LeaderboardProps) {
  // Compute leaderboard with user inserted dynamically
  const computedLeaderboard = useMemo(() => {
    // Create copy of pre-defined leaders
    const leaders = [...INITIAL_LEADERBOARD];
    
    // Create user entry
    const userEntry: LeaderboardEntry = {
      id: 'user-active',
      rank: 0, // calculated later
      name: userName || 'Юный Самурай',
      stars: stars + 15, // start user with a small headstart offset for display
      level: level,
      avatarSeed: 'astronaut',
      isUser: true,
    };

    // Push user entry and sort descending by stars
    leaders.push(userEntry);
    leaders.sort((a, b) => b.stars - a.stars);

    // Re-calculate ranks
    return leaders.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }, [stars, level, userName]);

  return (
    <section className="py-20 bg-primary-light border-t-2 border-border relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">

        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-amber-50 border-2 border-amber-200 rounded-full px-4 py-1.5 text-amber-800 font-bold text-sm">
            <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Рейтинг недели</span>
          </div>
          <h2 className="font-display font-extrabold text-foreground text-2xl sm:text-3xl">
            Кто собрал больше звёзд
          </h2>
          <p className="text-muted text-sm">
            Пройди квизы в симуляторе выше — и твоё имя поднимется в списке.
          </p>
        </div>

        <div className="clay-card overflow-hidden bg-surface p-0">
          <div className="bg-navy text-blue-200/80 px-6 py-4 grid grid-cols-12 text-xs font-bold">
            <div className="col-span-2 text-center">Ранг</div>
            <div className="col-span-6">Ученик</div>
            <div className="col-span-2 text-center">Уровень</div>
            <div className="col-span-2 text-right">Звезды</div>
          </div>

          {/* Leaderboard entries */}
          <div className="divide-y divide-border/50">
            <AnimatePresence initial={false}>
              {computedLeaderboard.map((entry) => {
                const isTopThree = entry.rank <= 3;
                
                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`px-6 py-4 grid grid-cols-12 items-center text-sm transition-colors ${
                      entry.isUser
                        ? 'bg-accent-light/70 border-y-2 border-border'
                        : 'hover:bg-primary-light'
                    }`}
                  >
                    {/* Rank indicator */}
                    <div className="col-span-2 flex justify-center">
                      {entry.rank === 1 && (
                        <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm" title="1-е место">
                          <Medal className="w-4 h-4 fill-amber-400" />
                        </span>
                      )}
                      {entry.rank === 2 && (
                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shadow-sm" title="2-е место">
                          <Medal className="w-4 h-4" />
                        </span>
                      )}
                      {entry.rank === 3 && (
                        <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm" title="3-е место">
                          <Medal className="w-4 h-4 fill-orange-300" />
                        </span>
                      )}
                      {entry.rank > 3 && (
                        <span className="text-muted/80 font-mono font-bold">{entry.rank}</span>
                      )}
                    </div>

                    {/* Name + avatar details */}
                    <div className="col-span-6 flex items-center space-x-3">
                      {/* Placeholder dynamic avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                        entry.isUser
                          ? 'bg-gradient-to-tr from-accent to-blue-400 text-white'
                          : isTopThree
                          ? 'bg-accent-light text-accent border-2 border-blue-200'
                          : 'bg-primary-light text-muted border-2 border-border'
                      }`}>
                        {entry.isUser ? <User className="w-4 h-4" /> : entry.name.charAt(0)}
                      </div>
                      
                      <div className="min-w-0">
                        <span className={`block truncate text-sm font-bold ${
                          entry.isUser ? 'text-accent font-extrabold flex items-center gap-1' : 'text-foreground'
                        }`}>
                          {entry.name}
                          {entry.isUser && (
                            <span className="bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5 fill-white" /> ты
                            </span>
                          )}
                        </span>
                <span className="block text-[10px] text-muted font-medium">
                          {entry.isUser ? 'Твой активный сеанс' : 'Лидер Study Task'}
                        </span>
                      </div>
                    </div>

                    {/* Level marker */}
                    <div className="col-span-2 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                        entry.isUser
                          ? 'bg-accent-light text-primary'
                          : 'bg-primary-light text-muted'
                      }`}>
                        LV {entry.level}
                      </span>
                    </div>

                    {/* Stars Balance */}
                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <span className={`font-mono font-black text-sm ${
                          entry.isUser ? 'text-primary' : 'text-foreground'
                        }`}>
                          {entry.stars}
                        </span>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom micro tip */}
        <p className="text-center text-xs text-muted mt-4">
          *Рейтинг обновляется раз в неделю. Каждый понедельник ученики, занявшие топ-3, получают суперприз от центра!
        </p>

      </div>
    </section>
  );
}
