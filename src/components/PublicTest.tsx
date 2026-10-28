import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Lock, MessageCircle, RotateCcw, Share2, Sparkles, XCircle } from 'lucide-react';
import { ALL_GRADES, DIFFICULTY, PUBLIC_TESTS, PublicQuestion, isGradeAvailable, resultLevel } from '../data/publicTests';
import { whatsappUrl } from '../constants';
import { Rich, TestVisual } from './TestVisual';

type Stage = 'pick' | 'intro' | 'quiz' | 'result';
type Prepared = PublicQuestion & { order: number[]; correct: number };

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
};

function shuffled(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function prepare(grade: number): Prepared[] {
  return (PUBLIC_TESTS[grade]?.questions ?? []).map((q) => {
    const order = shuffled(q.options.length);
    return { ...q, order, correct: order.indexOf(q.answer) };
  });
}

const gradeFromPath = () => {
  const m = window.location.pathname.match(/^\/test\/(\d{1,2})\/?$/);
  return m ? Number(m[1]) : null;
};

export default function PublicTest() {
  const initial = gradeFromPath();
  const [grade, setGrade] = useState<number | null>(initial && isGradeAvailable(initial) ? initial : null);
  const [stage, setStage] = useState<Stage>(initial && isGradeAvailable(initial) ? 'intro' : 'pick');
  const [questions, setQuestions] = useState<Prepared[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => { document.title = 'Тест по математике 5–11 класс — Study Task'; }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [stage, index]);

  const total = questions.length;
  const score = useMemo(() => answers.reduce<number>((s, a, i) => (a !== null && a === questions[i]?.correct ? s + 1 : s), 0), [answers, questions]);

  const choose = (g: number) => {
    if (!isGradeAvailable(g)) return;
    setGrade(g);
    setStage('intro');
    window.history.pushState({}, '', `/test/${g}`);
  };
  const start = () => {
    if (!grade) return;
    const prepared = prepare(grade);
    setQuestions(prepared);
    setAnswers(Array(prepared.length).fill(null));
    setIndex(0);
    setPicked(null);
    setStage('quiz');
  };
  const back = () => {
    setGrade(null);
    setStage('pick');
    window.history.pushState({}, '', '/test');
  };
  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setAnswers((prev) => prev.map((v, k) => (k === index ? i : v)));
  };
  const next = () => {
    if (index + 1 >= total) { setStage('result'); return; }
    setIndex(index + 1);
    setPicked(null);
  };
  const share = async () => {
    const url = `${window.location.origin}/test`;
    try {
      if (navigator.share) await navigator.share({ title: 'Тест по математике', url });
      else { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    } catch { /* пользователь закрыл окно */ }
  };

  const q = questions[index];
  const level = resultLevel(score, total || 10);
  const missed = Array.from(new Set(questions.filter((item, i) => answers[i] !== item.correct).map((item) => item.topic)));

  return (
    <div className="min-h-screen bg-surface text-foreground font-sans antialiased">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <a href="/" className="font-display text-xl font-extrabold text-navy">Study<span className="text-primary">Task</span></a>
        {stage !== 'pick' && <button onClick={back} className="text-sm font-bold text-muted hover:text-primary">Выбрать другой класс</button>}
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16">
        <AnimatePresence mode="wait">
          {stage === 'pick' && (
            <motion.section key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 pt-4">
              <div className="space-y-3 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-primary"><Sparkles className="h-4 w-4" /> Бесплатно · 10 вопросов · 5 минут</span>
                <h1 className="font-display text-3xl font-extrabold text-navy sm:text-5xl">Проверь свой уровень математики</h1>
                <p className="mx-auto max-w-xl text-base text-muted sm:text-lg">Выбери класс. Вопросы идут от простых к сложным — узнаешь, какие темы идут уверенно, а что стоит подтянуть.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {ALL_GRADES.map((g) => {
                  const ok = isGradeAvailable(g);
                  return (
                    <button key={g} disabled={!ok} onClick={() => choose(g)} aria-label={ok ? `${g} класс` : `${g} класс — скоро`}
                      className={`clay-card-sm relative flex min-h-28 flex-col items-center justify-center gap-1 p-4 text-center transition ${ok ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary' : 'cursor-not-allowed opacity-60'}`}>
                      <span className="font-display text-4xl font-extrabold text-navy">{g}</span>
                      <span className="text-sm font-bold text-muted">класс</span>
                      {!ok && <span className="absolute right-3 top-3 flex items-center gap-1 text-[11px] font-extrabold uppercase text-muted"><Lock className="h-3 w-3" />скоро</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-sm text-muted">Тесты для остальных классов добавляем — они откроются на этой же странице.</p>
            </motion.section>
          )}

          {stage === 'intro' && grade && (
            <motion.section key="intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="clay-card mt-4 space-y-6 p-7 sm:p-10">
              <div className="space-y-2">
                <p className="text-sm font-extrabold uppercase tracking-wide text-primary">{grade} класс</p>
                <h1 className="font-display text-3xl font-extrabold text-navy sm:text-4xl">Тест по математике</h1>
                <p className="text-muted">10 вопросов с вариантами ответа. Они становятся сложнее от первого к последнему, а часть задач с рисунками и диаграммами. После каждого ответа покажем разбор. Калькулятор не нужен — считай в уме или на бумаге.</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-3">
                {[['Лёгкие', '1–3'], ['Средние', '4–6'], ['Сложные', '7–10']].map(([a, b]) => (
                  <li key={a} className="rounded-2xl border-2 border-border bg-primary-light px-4 py-3 text-center"><p className="font-display text-lg font-extrabold text-navy">{a}</p><p className="text-xs font-bold text-muted">вопросы {b}</p></li>
                ))}
              </ul>
              <button onClick={start} className="clay-btn inline-flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-lg font-extrabold text-white hover:bg-primary-dark">Начать тест <ArrowRight className="h-5 w-5" /></button>
            </motion.section>
          )}

          {stage === 'quiz' && q && (
            <motion.section key={`q${index}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="mt-2 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-muted">
                  <span>Вопрос {index + 1} из {total}</span>
                  <span className={`rounded-full border px-3 py-0.5 text-xs font-extrabold ${TONES[DIFFICULTY(index, total).tone]}`}>{DIFFICULTY(index, total).label}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-accent-light" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + (picked !== null ? 1 : 0)}>
                  <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${((index + (picked !== null ? 1 : 0)) / total) * 100}%` }} />
                </div>
              </div>

              <div className="clay-card space-y-6 p-6 sm:p-9">
                <h2 className="whitespace-pre-line font-display text-2xl font-extrabold leading-snug text-navy sm:text-3xl"><Rich text={q.text} /></h2>
                {q.visual && <TestVisual visual={q.visual} />}
                <div className="grid gap-3 sm:grid-cols-2">
                  {q.order.map((optIndex, i) => {
                    const isPicked = picked === i;
                    const isCorrect = i === q.correct;
                    const reveal = picked !== null;
                    const style = !reveal ? 'border-border bg-white hover:border-primary hover:bg-primary-light'
                      : isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : isPicked ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-border bg-white opacity-60';
                    return (
                      <button key={i} onClick={() => answer(i)} disabled={reveal}
                        className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 px-5 py-3 text-left text-lg font-extrabold transition ${style}`}>
                        <span><Rich text={q.options[optIndex]} /></span>
                        {reveal && isCorrect && <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />}
                        {reveal && isPicked && !isCorrect && <XCircle className="h-6 w-6 shrink-0 text-rose-500" />}
                      </button>
                    );
                  })}
                </div>

                {picked !== null && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border-2 p-4 text-sm sm:text-base ${picked === q.correct ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <p className="font-extrabold text-navy">{picked === q.correct ? 'Верно!' : 'Не совсем.'} <span className="font-semibold text-muted">{q.topic}</span></p>
                    <p className="mt-1 text-foreground"><Rich text={q.explanation} /></p>
                  </motion.div>
                )}

                <button onClick={next} disabled={picked === null} className="clay-btn inline-flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-lg font-extrabold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40">
                  {index + 1 >= total ? 'Узнать результат' : 'Дальше'} <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </motion.section>
          )}

          {stage === 'result' && (
            <motion.section key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-6">
              <div className="clay-card space-y-5 p-7 text-center sm:p-10">
                <div className="text-6xl" aria-hidden>{level.emoji}</div>
                <p className="text-sm font-extrabold uppercase tracking-wide text-primary">{grade} класс · результат</p>
                <h1 className="font-display text-5xl font-extrabold text-navy sm:text-6xl">{score}<span className="text-muted"> / {total}</span></h1>
                <h2 className="font-display text-2xl font-extrabold text-navy">{level.title}</h2>
                <p className="mx-auto max-w-xl text-muted">{level.text}</p>
                {missed.length > 0 && (
                  <div className="mx-auto max-w-xl rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-left">
                    <p className="text-sm font-extrabold text-navy">Стоит подтянуть:</p>
                    <div className="mt-2 flex flex-wrap gap-2">{missed.map((t) => <span key={t} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">{t}</span>)}</div>
                  </div>
                )}
              </div>

              <div className="clay-card space-y-3 p-6 sm:p-8">
                <h3 className="font-display text-xl font-extrabold text-navy">Разбор по вопросам</h3>
                <ol className="space-y-2">
                  {questions.map((item, i) => {
                    const ok = answers[i] === item.correct;
                    return (
                      <li key={i} className="flex items-start gap-3 rounded-xl bg-primary-light px-3 py-2">
                        {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />}
                        <div className="text-sm"><p className="font-bold text-navy">{i + 1}. {item.topic}</p>{!ok && <p className="text-muted">Верный ответ: <Rich text={item.options[item.answer]} /></p>}</div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="clay-card space-y-4 bg-primary p-7 text-center sm:p-9" style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary-dark)' }}>
                <h3 className="font-display text-2xl font-extrabold text-white">Закрыть пробелы вместе с Study Task</h3>
                <p className="text-white/85">Бесплатный пробный урок: разберём ваши слабые темы и составим план. Математика 5–9 классов, онлайн.</p>
                <a href={whatsappUrl(`Здравствуйте! Прошёл(ла) тест на study-task.kz для ${grade} класса: ${score} из ${total}. Хочу записаться на бесплатный пробный урок.`)} target="_blank" rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-lg font-extrabold text-primary shadow-lg transition hover:-translate-y-0.5 sm:w-auto"><MessageCircle className="h-5 w-5" /> Записаться на пробный урок</a>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={start} className="clay-card-sm inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 font-extrabold text-navy hover:border-primary"><RotateCcw className="h-5 w-5" /> Пройти заново</button>
                <button onClick={share} className="clay-card-sm inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 font-extrabold text-navy hover:border-primary"><Share2 className="h-5 w-5" /> {copied ? 'Ссылка скопирована' : 'Поделиться тестом'}</button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
