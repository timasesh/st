import React, { useEffect, useRef, useState } from 'react';

interface LoopVideoProps {
  name: string; // file name without extension, lives in /static/video
  alt: string;
  className?: string;
  aspect?: string; // tailwind aspect class, e.g. aspect-square
  webm?: boolean;
}

/**
 * Muted looping video made in OpenMontage (Remotion).
 * - shows the poster while loading and for users who prefer reduced motion
 * - plays only while on screen, so it costs nothing off-screen
 */
export default function LoopVideo({ name, alt, className = '', aspect = 'aspect-square', webm = true }: LoopVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  const poster = `/static/video/${name}.jpg`;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  if (reduced) {
    return <img src={poster} alt={alt} className={`${aspect} w-full object-cover ${className}`} loading="lazy" />;
  }

  return (
    <video
      ref={ref}
      className={`${aspect} w-full object-cover ${className}`}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt}
      disablePictureInPicture
    >
      {webm && <source src={`/static/video/${name}.webm`} type="video/webm" />}
      <source src={`/static/video/${name}.mp4`} type="video/mp4" />
    </video>
  );
}
