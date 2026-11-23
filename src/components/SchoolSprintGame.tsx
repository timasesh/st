import React, { useEffect, useRef, useState } from 'react';

export default function SchoolSprintGame() {
  const holderRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setMounted(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setMounted(true); io.disconnect(); }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the game asks to be closed from its menu: just restart it from the title screen
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SPRINT_CLOSE') setRun((n) => n + 1);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-bold text-foreground text-xl">School Sprint</h3>
        <p className="text-sm text-muted">Школьный забег Study Task — беги, решай и бей рекорды</p>
      </div>
      <div className="flex justify-center" ref={holderRef}>
        {mounted ? (
          <iframe
            key={run}
            src="/school-sprint/index.html"
            title="Study Task School Sprint"
            className="w-full max-w-[420px] h-[min(680px,80vh)] rounded-2xl border-2 border-border shadow-lg bg-navy"
            allow="autoplay"
          />
        ) : (
          <div className="w-full max-w-[420px] h-[min(680px,80vh)] rounded-2xl border-2 border-border bg-navy" aria-hidden />
        )}
      </div>
    </div>
  );
}
