import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpen, CheckCircle2, Loader2, Lock, MessageCircle, RotateCcw, Share2, SkipForward, Sparkles, XCircle } from 'lucide-react';
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

const CONTACT_KEY = 'study_task_test_contact';
const readContact = () => {
  try { const v = JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}'); return { name: String(v.name || ''), phone: String(v.phone || '') }; }
  catch { return { name: '', phone: '' }; }
};
// +7 (700) 123-45-67 по мере ввода; первая цифра 8 заменяется на 7
function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('8')) d = `7${d.slice(1)}`;
  if (d && !d.startsWith('7')) d = `7${d}`;
  d = d.slice(0, 11);
  if (!d) return '';
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  return `+7${p[0] ? ` (${p[0]}` : ''}${p[0].length === 3 ? ')' : ''}${p[1] ? ` ${p[1]}` : ''}${p[2] ? `-${p[2]}` : ''}${p[3] ? `-${p[3]}` : ''}`;
}

export default function PublicTest() {
  const initial = gradeFromPath();
  const [grade, setGrade] = useState<number | null>(initial && isGradeAvailable(initial) ? initial : null);
  const [stage, setStage] = useState<Stage>(initial && isGradeAvailable(initial) ? 'intro' : 'pick');
  const [questions, setQuestions] = useState<Prepared[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => readContact().name);
  const [phone, setPhone] = useState(() => formatPhone(readContact().phone));
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [showSolutions, setShowSolutions] = useState(false);

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
  const begin = () => {
    if (!grade) return;
    const prepared = prepare(grade);
    setQuestions(prepared);
    setAnswers(Array(prepared.length).fill(null));
    setIndex(0);
    setPicked(null);
    setShowSolutions(false);
    setStage('quiz');
  };
  // проверка контактов + создание записи на сервере, затем запуск теста
  const start = async (silent = false) => {
    if (!grade || sending) return;
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const digits = phone.replace(/\D/g, '');
    if (cleanName.length < 2) { setFormError('Введите ваше имя.'); return; }
    if (digits.length !== 11) { setFormError('Введите номер телефона полностью — 11 цифр, например +7 700 123 45 67.'); return; }
    setFormError('');
    setSending(true);
    try {
      const response = await fetch('/api/public/test-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cleanName, phone: digits, grade }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить данные. Попробуйте ещё раз.');
      setLeadId(data.id);
      try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: cleanName, phone: digits })); } catch { /* хранилище недоступно */ }
      begin();
    } catch (error) {
      if (silent) { begin(); return; }
      setFormError(error instanceof Error ? error.message : 'Не удалось сохранить данные. Попробуйте ещё раз.');
    } finally { setSending(false); }
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
  // «Пропустить»: вопрос сразу засчитывается как неверный (ответ −1), переходим дальше
  const skip = () => {
    if (picked !== null) return;
    setAnswers((prev) => prev.map((v, k) => (k === index ? -1 : v)));
    next();
  };
  const share = async () => {
    const url = `${window.location.origin}/test`;
    try {
      if (navigator.share) await navigator.share({ title: 'Тест по математике', url });
      else { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    } catch { /* пользователь закрыл окно */ }
  };

  useEffect(() => {
    if (stage !== 'result' || !leadId) return;
    const topics = Array.from(new Set(questions.filter((item, i) => answers[i] !== item.correct).map((item) => item.topic)));
    void fetch(`/api/public/test-leads/${leadId}/result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score, total: questions.length, missedTopics: topics }), keepalive: true }).catch(() => undefined);
    setLeadId(null); // результат отправляется один раз; повторное прохождение создаёт новую запись
  }, [stage, leadId, score, questions, answers]);

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
              <form noValidate onSubmit={(e) => { e.preventDefault(); void start(); }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-extrabold text-navy">Ваше имя</span>
                    <input value={name} onChange={(e) => { setName(e.target.value); setFormError(''); }} autoComplete="given-name" maxLength={80} placeholder="Например, Айдар" aria-invalid={Boolean(formError) && name.trim().length < 2}
                      className="w-full rounded-2xl border-2 border-border bg-white px-4 py-3 text-lg font-bold text-foreground outline-none transition placeholder:font-semibold placeholder:text-muted/60 focus:border-primary" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-extrabold text-navy">Номер телефона</span>
                    <input value={phone} onChange={(e) => { setPhone(formatPhone(e.target.value)); setFormError(''); }} type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (700) 123-45-67" aria-invalid={Boolean(formError) && phone.replace(/\D/g, '').length !== 11}
                      className="w-full rounded-2xl border-2 border-border bg-white px-4 py-3 text-lg font-bold text-foreground outline-none transition placeholder:font-semibold placeholder:text-muted/60 focus:border-primary" />
                  </label>
                </div>
                {formError && <p role="alert" className="rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">{formError}</p>}
                <button type="submit" disabled={sending} className="clay-btn inline-flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-lg font-extrabold text-white hover:bg-primary-dark disabled:cursor-wait disabled:opacity-70">
                  {sending ? <><Loader2 className="h-5 w-5 animate-spin" /> Сохраняем…</> : <>Начать тест <ArrowRight className="h-5 w-5" /></>}
                </button>
                <p className="text-center text-xs leading-relaxed text-muted">Указывая имя и номер телефона, вы соглашаетесь на обработку персональных данных.</p>
              </form>
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
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border-2 px-4 py-3 text-sm font-extrabold sm:text-base ${picked === q.correct ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    {picked === q.correct ? 'Верно!' : 'Не совсем.'} <span className="font-semibold text-muted">{q.topic} · подробный разбор — после теста</span>
                  </motion.p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button onClick={next} disabled={picked === null} className="clay-btn inline-flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-lg font-extrabold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40 sm:flex-1">
                    {index + 1 >= total ? 'Узнать результат' : 'Дальше'} <ArrowRight className="h-5 w-5" />
                  </button>
                  {picked === null && (
                    <button onClick={skip} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-white px-6 py-4 text-base font-extrabold text-muted transition hover:border-primary hover:text-primary sm:w-auto" title="Вопрос будет засчитан как неверный">
                      <SkipForward className="h-5 w-5" /> Пропустить
                    </button>
                  )}
                </div>
                {picked === null && <p className="-mt-3 text-center text-xs text-muted">Пропущенный вопрос засчитывается как неверный.</p>}
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
                        <div className="text-sm"><p className="font-bold text-navy">{i + 1}. {item.topic}</p>{answers[i] === -1 && <p className="font-bold text-amber-700">Пропущен — засчитан как неверный</p>}{!ok && <p className="text-muted">Верный ответ: <Rich text={item.options[item.answer]} /></p>}</div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="clay-card space-y-4 p-6 text-center sm:p-8">
                <button onClick={() => setShowSolutions((v) => !v)} aria-expanded={showSolutions} className="clay-btn inline-flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-lg font-extrabold text-white hover:bg-primary-dark sm:w-auto"><BookOpen className="h-5 w-5" /> {showSolutions ? 'Скрыть объяснение' : 'Показать объяснение'}</button>
                <p className="text-sm text-muted">Подробное решение каждого задания — даже тех, что вы решили верно. Неверные и пропущенные выделены красным.</p>
              </div>

              {showSolutions && (
                <section aria-label="Подробное объяснение" className="space-y-4">
                  {questions.map((item, i) => {
                    const ok = answers[i] === item.correct;
                    const skipped = answers[i] === -1;
                    return (
                      <article key={i} className={`clay-card space-y-4 p-5 sm:p-7 ${ok ? '' : '!border-rose-300 !bg-rose-50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="whitespace-pre-line font-display text-xl font-extrabold leading-snug text-navy"><span className={ok ? 'text-emerald-600' : 'text-rose-600'}>{i + 1}.</span> <Rich text={item.text} /></h4>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold text-white ${ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>{ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{ok ? 'Верно' : skipped ? 'Пропущен' : 'Неверно'}</span>
                        </div>
                        {item.visual && <TestVisual visual={item.visual} />}
                        <div className="grid gap-2 sm:grid-cols-2">
                          {item.order.map((optIndex, k) => {
                            const right = k === item.correct;
                            const wrongPick = answers[i] === k && !right;
                            return (
                              <div key={k} className={`flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-2.5 text-base font-extrabold ${right ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : wrongPick ? 'border-rose-400 bg-rose-100 text-rose-800' : 'border-border bg-white text-muted'}`}>
                                <span><Rich text={item.options[optIndex]} /></span>
                                <span className="shrink-0 text-[11px] font-extrabold uppercase">{right ? (answers[i] === k ? 'ваш ответ · верно' : 'верный') : wrongPick ? 'ваш ответ' : ''}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className={`rounded-2xl border-2 p-4 ${ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-white'}`}>
                          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-muted">Решение · {item.topic}</p>
                          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground sm:text-base"><Rich text={item.solution} /></p>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}

              <div className="clay-card space-y-4 bg-primary p-7 text-center sm:p-9" style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary-dark)' }}>
                <h3 className="font-display text-2xl font-extrabold text-white">Закрыть пробелы вместе с Study Task</h3>
                <p className="text-white/85">Бесплатный пробный урок: разберём ваши слабые темы и составим план. Математика 5–9 классов, онлайн.</p>
                <a href={whatsappUrl(`Здравствуйте! Прошёл(ла) тест на study-task.kz для ${grade} класса: ${score} из ${total}. Хочу записаться на бесплатный пробный урок.`)} target="_blank" rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-lg font-extrabold text-primary shadow-lg transition hover:-translate-y-0.5 sm:w-auto"><MessageCircle className="h-5 w-5" /> Записаться на пробный урок</a>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => void start(true)} className="clay-card-sm inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 font-extrabold text-navy hover:border-primary"><RotateCcw className="h-5 w-5" /> Пройти заново</button>
                <button onClick={share} className="clay-card-sm inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 font-extrabold text-navy hover:border-primary"><Share2 className="h-5 w-5" /> {copied ? 'Ссылка скопирована' : 'Поделиться тестом'}</button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
