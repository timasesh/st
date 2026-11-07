export type CareerQuestion = { q: string; o: [string, string, string] };
export type CareerScale = { id: number; title: string; color: string; emoji: string; about: string; jobs: string[] };
export const CAREER_QUESTIONS: CareerQuestion[];
export const CAREER_KEY: number[][];
export const CAREER_SCALES: CareerScale[];
export const CAREER_LETTERS: string[];
export function scoreCareer(answers: number[]): number[];
export function careerLevel(score: number): { key: 'high' | 'mid' | 'low' | 'none'; label: string };
export function validCareerAnswers(answers: unknown): answers is number[];
