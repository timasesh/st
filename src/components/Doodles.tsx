import React from 'react';

/** Hand-drawn decorations in the StudyTask whiteboard style (decorative only). */
const INK = '#1649E8';
const GOLD = '#FFD34F';
const SKY = '#38BDF8';

export function Spark({ className = '', color = SKY }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
      <path d="M40 6 V26 M40 54 V74 M6 40 H26 M54 40 H74 M16 16 L28 28 M52 52 L64 64 M64 16 L52 28 M28 52 L16 64" />
    </svg>
  );
}

export function Star({ className = '', fill = GOLD }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill={fill} stroke="#12266F" strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

export function Squiggle({ className = '', color = INK }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 220 26" className={className} aria-hidden fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
      <path d="M6 14 Q 22 -2 38 14 T 70 14 T 102 14 T 134 14 T 166 14 T 214 12" />
    </svg>
  );
}

export function CurlyArrow({ className = '', color = '#E5484D' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 160 140" className={className} aria-hidden fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16 C 70 0, 130 30, 110 74 C 96 104, 56 96, 70 70 C 82 50, 120 70, 128 112" />
      <path d="M104 96 L128 116 L146 90" />
    </svg>
  );
}

export default function Doodles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
      <Spark className="doodle doodle-wiggle w-14 h-14 left-[3%] top-[22%]" />
      <Star className="doodle doodle-wiggle w-12 h-12 left-[46%] top-[15%]" />
      <Spark className="doodle w-10 h-10 right-[4%] top-[46%]" color="#FFD34F" />
      <Squiggle className="doodle w-44 left-[4%] bottom-[10%]" />
      <Star className="doodle doodle-wiggle w-9 h-9 right-[9%] bottom-[12%]" fill="#FFF1B8" />
    </div>
  );
}
