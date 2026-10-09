import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function Testimonials() {
  return (
    <section id="trust" className="py-16 bg-surface relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-light border-2 border-border flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <span className="text-xs font-bold text-primary">Доверие</span>
            <p className="font-display font-bold text-foreground text-lg sm:text-xl leading-snug mt-1">
              Занятия ведут опытные преподаватели, которые умеют объяснять просто и интересно.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
