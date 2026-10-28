import { useMemo, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import MathText from '../shared/MathText';

/* Ручное создание квиза: текст вопроса, варианты, число и выбор правильных ответов, необязательное объяснение. */

export type ManualQuestion = { question: string; choices: string[]; correctIndex: number; correctIndexes?: number[]; explanation?: string };
type Draft = { question: string; choices: string[]; need: number; correct: number[]; explanation: string };

const blank = (): Draft => ({ question: '', choices: ['', '', '', ''], need: 1, correct: [], explanation: '' });
const LETTERS = 'ABCDEF';

export default function ManualQuizBuilder({ assigning, submitLabel, onSubmit }: { assigning: boolean; submitLabel: string; onSubmit: (title: string, questions: ManualQuestion[]) => void }) {
  const [title, setTitle] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>(() => Array.from({ length: 5 }, blank));
  const patch = (index: number, change: Partial<Draft>) => setDrafts((list) => list.map((item, i) => (i === index ? { ...item, ...change } : item)));

  const problems = useMemo(() => {
    const list: string[] = [];
    if (drafts.length < 5) list.push('Нужно минимум 5 вопросов.');
    drafts.forEach((draft, index) => {
      const n = index + 1;
      if (!draft.question.trim()) list.push(`Вопрос ${n}: введите текст.`);
      else if (draft.choices.some((choice) => !choice.trim())) list.push(`Вопрос ${n}: заполните все варианты ответа или удалите лишние.`);
      else if (draft.correct.length !== draft.need) list.push(`Вопрос ${n}: отметьте правильных ответов — ${draft.need} (сейчас ${draft.correct.length}).`);
    });
    return list;
  }, [drafts]);

  const toggleCorrect = (index: number, choiceIndex: number) => {
    const draft = drafts[index];
    if (draft.need === 1) { patch(index, { correct: [choiceIndex] }); return; }
    if (draft.correct.includes(choiceIndex)) { patch(index, { correct: draft.correct.filter((value) => value !== choiceIndex) }); return; }
    const next = [...draft.correct, choiceIndex];
    patch(index, { correct: next.length > draft.need ? next.slice(next.length - draft.need) : next });
  };

  const setNeed = (index: number, need: number) => patch(index, { need, correct: drafts[index].correct.slice(0, need) });
  const addChoice = (index: number) => patch(index, { choices: [...drafts[index].choices, ''] });
  const removeChoice = (index: number, choiceIndex: number) => {
    const draft = drafts[index];
    const choices = draft.choices.filter((_, i) => i !== choiceIndex);
    const need = Math.min(draft.need, choices.length - 1);
    const correct = draft.correct.filter((value) => value !== choiceIndex).map((value) => (value > choiceIndex ? value - 1 : value)).slice(0, need);
    patch(index, { choices, correct, need });
  };

  const submit = () => {
    if (problems.length || assigning) return;
    onSubmit(title.trim() || 'Квиз', drafts.map((draft) => {
      const correct = [...draft.correct].sort((a, b) => a - b);
      return { question: draft.question.trim(), choices: draft.choices.map((choice) => choice.trim()), correctIndex: correct[0], ...(correct.length > 1 ? { correctIndexes: correct } : {}), ...(draft.explanation.trim() ? { explanation: draft.explanation.trim() } : {}) };
    }));
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold">Название квиза
        <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Например: Дроби — закрепление" className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-primary" />
      </label>
      <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
        {drafts.map((draft, index) => (
          <article key={index} className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-primary">Вопрос {index + 1}</span>
              <button type="button" disabled={drafts.length <= 5} onClick={() => setDrafts((list) => list.filter((_, i) => i !== index))} title={drafts.length <= 5 ? 'Минимум 5 вопросов' : 'Удалить вопрос'} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Удалить</button>
            </div>
            <textarea value={draft.question} rows={2} maxLength={700} onChange={(event) => patch(index, { question: event.target.value })} placeholder="Текст вопроса" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
            {/[\\^_]/.test(draft.question) && <p className="mt-1 rounded-lg bg-primary-light px-3 py-1.5 text-sm"><MathText text={draft.question} /></p>}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold">Правильных ответов:</span>
              <select value={draft.need} onChange={(event) => setNeed(index, Number(event.target.value))} className="rounded-lg border border-border bg-white px-2 py-1.5 font-bold outline-none focus:border-primary" aria-label="Количество правильных ответов">
                {Array.from({ length: draft.choices.length - 1 }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <span className={`text-xs font-bold ${draft.correct.length === draft.need ? 'text-emerald-700' : 'text-amber-700'}`}>Отмечено {draft.correct.length} из {draft.need}</span>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {draft.choices.map((choice, choiceIndex) => {
                const right = draft.correct.includes(choiceIndex);
                return (
                  <div key={choiceIndex} className={`flex items-center gap-2 rounded-lg border p-2 ${right ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-primary-light/60'}`}>
                    <button type="button" onClick={() => toggleCorrect(index, choiceIndex)} aria-pressed={right} aria-label={`Вариант ${LETTERS[choiceIndex]} ${right ? 'правильный' : 'отметить правильным'}`} title="Нажмите, чтобы отметить правильный ответ" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${right ? 'bg-emerald-600 text-white' : 'border border-border bg-white text-muted hover:border-emerald-400'}`}>{LETTERS[choiceIndex]}</button>
                    <input value={choice} maxLength={300} onChange={(event) => patch(index, { choices: draft.choices.map((item, i) => (i === choiceIndex ? event.target.value : item)) })} placeholder={`Вариант ${choiceIndex + 1}`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    <button type="button" disabled={draft.choices.length <= 2} onClick={() => removeChoice(index, choiceIndex)} aria-label="Удалить вариант" title="Удалить вариант" className="shrink-0 rounded-md p-1 text-muted hover:text-rose-600 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
            <button type="button" disabled={draft.choices.length >= 6} onClick={() => addChoice(index)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Добавить вариант</button>

            <label className="mt-3 block text-xs font-bold text-muted">Объяснение решения (необязательно) — ученик увидит его после теста
              <textarea value={draft.explanation} rows={2} maxLength={2500} onChange={(event) => patch(index, { explanation: event.target.value })} placeholder="Например: 1) приводим дроби к общему знаменателю; 2) складываем числители…" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-primary" />
            </label>
          </article>
        ))}
      </div>
      <p className="text-xs text-muted">Формулы можно писать в LaTeX: \frac{'{1}{2}'}, x^{'{2}'}, \sqrt{'{x}'}. Если правильных ответов несколько, ученик должен выбрать ровно столько же.</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={drafts.length >= 40} onClick={() => setDrafts((list) => [...list, blank()])} className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary-light disabled:opacity-50"><Plus className="h-4 w-4" />Добавить вопрос</button>
        <button type="button" disabled={Boolean(problems.length) || assigning} onClick={submit} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50">{assigning ? 'Отправляем…' : submitLabel}</button>
      </div>
      {problems.length > 0 && <ul className="space-y-0.5 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{problems.slice(0, 4).map((problem) => <li key={problem}>• {problem}</li>)}{problems.length > 4 && <li>…и ещё {problems.length - 4}</li>}</ul>}
    </div>
  );
}
