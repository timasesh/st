import React, { useEffect, useRef } from 'react';
import { Star, Zap } from 'lucide-react';

interface FlappyBirdGameProps {
  onReward: (stars: number, xp: number) => void;
}

export default function FlappyBirdGame({ onReward }: FlappyBirdGameProps) {
  const rewardedRef = useRef<number>(0);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'FLAPPY_GAME_OVER') return;
      const score = Number(event.data.score) || 0;
      if (score <= rewardedRef.current) return;
      rewardedRef.current = score;

      const xp = score * 8;
      // Sky Quest stars belong to the game's own balance; only XP is a study reward.
      onReward(0, xp);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onReward]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-foreground text-xl">Sky Quest</h3>
          <p className="text-sm text-muted">Мини-игра Study Task — собирай звёзды и бей рекорды</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border-2 border-amber-200">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            Игровые звёзды
          </span>
          <span className="inline-flex items-center gap-1 bg-accent-light text-primary px-3 py-1.5 rounded-full border-2 border-border">
            <Zap className="w-3.5 h-3.5" />
            +8 XP за очко
          </span>
        </div>
      </div>

      <div className="flex justify-center">
        <iframe
          src="/flappy/index.html?autostart=1"
          title="Study Task Sky Quest"
          className="w-full max-w-[400px] h-[min(650px,75vh)] rounded-2xl border-2 border-border shadow-lg bg-navy"
          allow="autoplay"
        />
      </div>
    </div>
  );
}
