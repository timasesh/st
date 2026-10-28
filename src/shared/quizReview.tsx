import { Check, X } from 'lucide-react';
import MathText, { QuestionFigure } from './MathText';

/* Разбор теста после сдачи: к каждому заданию — верные ответы, ответ ученика и подробное решение. */

export type ReviewQuestion = { question: string; choices: string[]; figure?: string; pick?: number; correct?: number[]; explanation?: string };
export type AnswerValue = number | number[] | null | undefined;

export const answerList = (answer: AnswerValue): number[] => (Array.isArray(answer) ? answer : typeof answer === 'number' && answer >= 0 ? [answer] : []);

export const isAnswerCorrect = (question: ReviewQuestion, answer: AnswerValue) => {
  const correct = question.correct ?? [];
  const mine = answerList(answer);
  return correct.length > 0 && correct.length === mine.length && correct.every((index) => mine.includes(index));
};

const LETTERS = 'ABCDEF';

export function TestExplanationModal({ title, questions, answers, onClose }: { title: string; questions: ReviewQuestion[]; answers?: AnswerValue[]; onClose: () => void }) {
  const results = questions.map((question, index) => isAnswerCorrect(question, answers?.[index]));
  const score = results.filter(Boolean).length;
  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="test-explanation-title" className="my-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-700">Разбор теста · верно {score} из {questions.length}</p>
            <h2 id="test-explanation-title" className="font-display text-2xl font-extrabold text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть разбор" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <ol className="space-y-4">
          {questions.map((question, index) => {
            const ok = results[index];
            const mine = answerList(answers?.[index]);
            const correct = question.correct ?? [];
            return (
              <li key={index} className={`rounded-2xl border-2 p-4 ${ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-300 bg-rose-50'}`}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="font-bold text-slate-900"><span className={ok ? 'text-emerald-700' : 'text-rose-700'}>{index + 1}.</span> <MathText text={question.question} /></div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{ok ? 'Верно' : 'Неверно'}</span>
                </div>
                <QuestionFigure figure={question.figure} />
                {correct.length > 1 && <p className="mt-2 text-xs font-bold text-slate-500">Нужно было выбрать {correct.length} ответа</p>}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {question.choices.map((choice, choiceIndex) => {
                    const isRight = correct.includes(choiceIndex);
                    const picked = mine.includes(choiceIndex);
                    const wrongPick = picked && !isRight;
                    return (
                      <div key={choiceIndex} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${isRight ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : wrongPick ? 'border-rose-400 bg-rose-100 text-rose-950' : 'border-slate-200 bg-white text-slate-600'}`}>
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${isRight ? 'bg-emerald-600 text-white' : wrongPick ? 'bg-rose-600 text-white' : 'border border-slate-300 text-slate-500'}`}>{LETTERS[choiceIndex]}</span>
                        <span className="min-w-0 flex-1 break-words"><MathText text={choice} /></span>
                        {(picked || isRight) && <span className="ml-1 shrink-0 text-[10px] font-extrabold uppercase">{picked && isRight ? 'ваш ответ · верно' : picked ? 'ваш ответ' : 'верный'}</span>}
                      </div>
                    );
                  })}
                </div>
                {!mine.length && <p className="mt-2 text-xs font-bold text-rose-700">Ответ не выбран.</p>}
                <div className={`mt-3 rounded-xl border p-3 text-sm ${ok ? 'border-emerald-200 bg-white' : 'border-rose-200 bg-white'}`}>
                  <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">Решение</p>
                  {question.explanation
                    ? <div className="whitespace-pre-line leading-relaxed text-slate-800"><MathText text={question.explanation} /></div>
                    : <p className="text-slate-600">Подробное объяснение к этому заданию не добавлено. Верный ответ: {correct.map((index) => LETTERS[index]).join(', ') || '—'}.</p>}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Закрыть</button></div>
      </section>
    </div>
  );
}
