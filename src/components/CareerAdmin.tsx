import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, MessageCircle, Printer, RotateCw, Search, Sparkles, Trash2, X } from 'lucide-react';
import { CAREER_LETTERS, CAREER_QUESTIONS, CAREER_SCALES, careerLevel } from '../shared/career';

type Status = 'queued' | 'generating' | 'ready' | 'failed';
type Row = { id: string; name: string; phone: string; grade: number | null; scores: number[]; createdAt: string; status: Status; error: string; hasReport: boolean; generatedAt?: string };
type Report = { headline: string; summary: string; strengths: string[]; areas: { scale: number; meaning: string; professions: string[]; develop: string }[]; subjects: string[]; parents: string[]; nextSteps: string[]; note: string };
type Full = Row & { answers: number[]; report: Report | null; model?: string };

const STATUS: Record<Status, { label: string; tone: string }> = {
  queued: { label: 'В очереди', tone: 'bg-slate-100 text-slate-600' },
  generating: { label: 'Отчёт готовится', tone: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Отчёт готов', tone: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Ошибка отчёта', tone: 'bg-rose-100 text-rose-700' },
};
const LEVEL_TONE: Record<string, string> = { high: '#059669', mid: '#2563eb', low: '#d97706', none: '#94a3b8' };

const formatPhone = (digits: string) => {
  const d = digits.replace(/\D/g, '');
  return d.length === 11 ? `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : `+${d}`;
};
const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const ranking = (scores: number[]) => scores.map((score, i) => ({ scale: CAREER_SCALES[i], score })).sort((a, b) => b.score - a.score);
const apiError = async (response: Response, fallback: string) => ((await response.json().catch(() => null))?.error as string) || fallback;

/* ───────── радар по шести шкалам ───────── */
function Radar({ scores }: { scores: number[] }) {
  const size = 360; const c = size / 2; const R = 112;
  const point = (i: number, value: number): [number, number] => {
    const angle = ((-90 + i * 60) * Math.PI) / 180;
    const r = (value / 12) * R;
    return [c + r * Math.cos(angle), c + r * Math.sin(angle)];
  };
  const poly = (value: number) => CAREER_SCALES.map((_, i) => point(i, value).join(',')).join(' ');
  const shape = scores.map((s, i) => point(i, s).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[380px]" role="img" aria-label="Профиль склонностей">
      {[3, 6, 9, 12].map((ring) => <polygon key={ring} points={poly(ring)} fill={ring === 12 ? '#f8faff' : 'none'} stroke="#dbe4ff" strokeWidth={ring === 12 ? 2 : 1.2} />)}
      {CAREER_SCALES.map((_, i) => { const [x, y] = point(i, 12); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#dbe4ff" strokeWidth={1.2} />; })}
      <polygon points={shape} fill="rgba(47,107,255,.22)" stroke="#2f6bff" strokeWidth={3} strokeLinejoin="round" />
      {scores.map((s, i) => { const [x, y] = point(i, s); return <circle key={i} cx={x} cy={y} r={6} fill={CAREER_SCALES[i].color} stroke="#fff" strokeWidth={2.5} />; })}
      {CAREER_SCALES.map((scale, i) => {
        const [x, y] = point(i, 12.2 + 3.4);
        return <text key={scale.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={21}>{scale.emoji}</text>;
      })}
    </svg>
  );
}

/* ───────── полосы баллов ───────── */
function Bars({ scores }: { scores: number[] }) {
  return (
    <div className="space-y-3">
      {ranking(scores).map(({ scale, score }) => {
        const level = careerLevel(score);
        return (
          <div key={scale.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-extrabold text-slate-800">{scale.emoji} {scale.title}</span>
              <span className="shrink-0 font-bold" style={{ color: LEVEL_TONE[level.key] }}>{score} из 12 · {level.label}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${(score / 12) * 100}%`, background: scale.color }} /></div>
          </div>
        );
      })}
    </div>
  );
}

const Chip = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span className="inline-block rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${color}1a`, color }}>{children}</span>
);
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-border bg-white p-5"><h3 className="mb-3 font-display text-base font-extrabold text-slate-800">{title}</h3>{children}</section>
);

/* ───────── отчёт ───────── */
function ReportView({ item, onChanged, onBack }: { item: Full; onChanged: () => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const top = ranking(item.scores).slice(0, 3);
  const report = item.report;
  const pending = item.status === 'queued' || item.status === 'generating';

  const regenerate = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/career/${item.id}/regenerate`, { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error(await apiError(response, 'Не удалось запустить генерацию.'));
      onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось запустить генерацию.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Удалить результат профориентации «${item.name}»? Это нельзя отменить.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/career/${item.id}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) throw new Error(await apiError(response, 'Не удалось удалить.'));
      onBack();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удалить.'); setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <style>{`@media print{body *{visibility:hidden!important}#career-report,#career-report *{visibility:visible!important}#career-report{position:absolute;left:0;top:0;width:100%}.no-print{display:none!important}}`}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-primary-light hover:text-primary"><ArrowLeft className="h-4 w-4" /> К списку</button>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/${item.phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-primary-light hover:text-primary"><Printer className="h-4 w-4" /> Печать / PDF</button>
          <button type="button" onClick={() => void regenerate()} disabled={busy || pending} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-primary-light hover:text-primary disabled:opacity-50"><Sparkles className="h-4 w-4" /> {report ? 'Создать отчёт заново' : 'Создать отчёт'}</button>
          <button type="button" onClick={() => void remove()} disabled={busy} aria-label="Удалить" className="rounded-xl border border-border p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {error && <p role="alert" className="no-print rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">{error}</p>}

      <div id="career-report" className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
          <div className="px-6 py-6 text-white" style={{ background: 'linear-gradient(135deg,#1b2b6b,#2f6bff)' }}>
            <p className="text-xs font-extrabold uppercase tracking-widest opacity-80">Профориентация · StudyTask</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">{item.name}{item.grade ? ` · ${item.grade} класс` : ''}</h2>
            <p className="mt-1 text-sm opacity-90">{formatPhone(item.phone)} · {formatDate(item.createdAt)}</p>
            {report?.headline && <p className="mt-4 inline-block rounded-2xl bg-white/15 px-4 py-2 font-display text-lg font-extrabold">✨ {report.headline}</p>}
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,380px)_1fr] md:items-center">
            <Radar scores={item.scores} />
            <Bars scores={item.scores} />
          </div>
        </div>

        {pending && (
          <div className="no-print flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800"><LoaderCircle className="h-5 w-5 animate-spin" /> ИИ составляет отчёт. Страница обновится сама.</div>
        )}
        {item.status === 'failed' && (
          <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">ИИ-отчёт не создался: {item.error || 'неизвестная ошибка'}. Баллы и описание шкал ниже посчитаны без ИИ. Нажмите «Создать отчёт».</div>
        )}

        {report && (
          <>
            <Section title="Профиль ученика"><p className="leading-relaxed text-slate-700">{report.summary}</p></Section>
            {report.strengths.length > 0 && (
              <Section title="Сильные стороны">
                <ul className="grid gap-2 sm:grid-cols-2">{report.strengths.map((text, i) => <li key={i} className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{text}</li>)}</ul>
              </Section>
            )}
          </>
        )}

        <div className="space-y-4">
          <h3 className="font-display text-lg font-extrabold text-slate-800">Главные склонности</h3>
          {top.map(({ scale, score }, i) => {
            const ai = report?.areas.find((area) => area.scale === scale.id) || report?.areas[i];
            const jobs = ai?.professions?.length ? ai.professions : scale.jobs;
            return (
              <div key={scale.id} className="overflow-hidden rounded-2xl border border-border bg-white" style={{ borderLeft: `6px solid ${scale.color}` }}>
                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-display text-base font-extrabold" style={{ color: scale.color }}>{i + 1}. {scale.emoji} {scale.title}</h4>
                    <span className="text-sm font-bold" style={{ color: LEVEL_TONE[careerLevel(score).key] }}>{score} из 12 · {careerLevel(score).label}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{ai?.meaning || scale.about}</p>
                  <div className="mt-3 flex flex-wrap gap-2">{jobs.map((job) => <Chip key={job} color={scale.color}>{job}</Chip>)}</div>
                  {ai?.develop && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><b>Как развивать:</b> {ai.develop}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {report && report.subjects.length > 0 && <Section title="Предметы и кружки"><div className="flex flex-wrap gap-2">{report.subjects.map((text, i) => <Chip key={i} color="#2563eb">{text}</Chip>)}</div></Section>}
        {report && report.parents.length > 0 && <Section title="Советы родителям"><ul className="space-y-2">{report.parents.map((text, i) => <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700"><span>💙</span>{text}</li>)}</ul></Section>}
        {report && report.nextSteps.length > 0 && (
          <Section title="Следующие шаги">
            <ol className="space-y-2">{report.nextSteps.map((text, i) => <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">{i + 1}</span>{text}</li>)}</ol>
          </Section>
        )}
        {report?.note && <p className="rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">{report.note}</p>}
        <p className="text-center text-xs text-slate-400">Методика Л. Йовайши в модификации Г. Резапкиной. Результат — ориентир, а не приговор.{item.model ? ` Отчёт составлен ИИ (${item.model}).` : ''}</p>
      </div>

      <details className="no-print rounded-2xl border border-border bg-white p-4">
        <summary className="cursor-pointer text-sm font-extrabold text-slate-700">Ответы на 24 вопроса</summary>
        <ol className="mt-3 space-y-2 text-sm">
          {CAREER_QUESTIONS.map((question, i) => (
            <li key={i} className="rounded-xl bg-slate-50 p-3"><span className="font-bold text-slate-700">{i + 1}. {question.q}</span><br /><span className="text-slate-600">{CAREER_LETTERS[item.answers[i]]}) {question.o[item.answers[i]]}</span></li>
          ))}
        </ol>
      </details>
    </div>
  );
}

/* ───────── список ───────── */
export default function CareerAdmin({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [full, setFull] = useState<Full | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/career', { credentials: 'same-origin' });
      if (!response.ok) throw new Error(await apiError(response, 'Не удалось загрузить список.'));
      const data = await response.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить список.'); }
    finally { setLoading(false); }
  }, []);
  const loadOne = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/career/${id}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(await apiError(response, 'Не удалось загрузить отчёт.'));
      setFull(await response.json());
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить отчёт.'); }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { setFull(null); if (openId) void loadOne(openId); }, [openId, loadOne]);
  // пока отчёт создаётся, обновляем его сам
  useEffect(() => {
    if (!full || (full.status !== 'queued' && full.status !== 'generating')) return undefined;
    const timer = window.setInterval(() => void loadOne(full.id), 6000);
    return () => window.clearInterval(timer);
  }, [full, loadOne]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const digits = query.replace(/\D/g, '').replace(/^8/, '7');
    return rows.filter((row) => !text || row.name.toLowerCase().includes(text) || (digits.length > 0 && row.phone.includes(digits)));
  }, [rows, query]);

  if (openId) {
    return (
      <section className="rounded-2xl border border-border bg-slate-50/60 p-4 sm:p-5">
        {full ? <ReportView item={full} onChanged={() => { void loadOne(full.id); void loadList(); }} onBack={() => { setOpenId(null); void loadList(); }} />
          : <div className="space-y-3"><button type="button" onClick={() => setOpenId(null)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted"><ArrowLeft className="h-4 w-4" /> К списку</button>{error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">{error}</p> : <p className="py-12 text-center text-sm text-muted">Загрузка…</p>}</div>}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Назад к источникам" className="rounded-xl border border-border p-2 text-muted hover:bg-primary-light hover:text-primary"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h2 className="font-display text-lg font-extrabold">Профориентация</h2>
            <p className="text-sm text-muted">study-task.kz/career · всего: {rows.length} · отчётов готово: {rows.filter((row) => row.status === 'ready').length}</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadList()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-primary-light hover:text-primary disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />} Обновить
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени или номеру телефона" className="w-full rounded-xl border-2 border-border bg-white py-2.5 pl-10 pr-10 text-sm font-semibold outline-none focus:border-primary" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-primary"><X className="h-4 w-4" /></button>}
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">{error}</p>}
      {loading && !rows.length ? <p className="py-12 text-center text-sm text-muted">Загрузка…</p>
        : filtered.length === 0 ? <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">{rows.length ? 'Никого не найдено.' : 'Пока никто не прошёл профориентацию и не оставил контакты.'}</p>
        : (
          <div className="grid gap-3">
            {filtered.map((row) => {
              const best = ranking(row.scores)[0];
              return (
                <button key={row.id} type="button" onClick={() => setOpenId(row.id)} className="flex w-full flex-wrap items-center gap-3 rounded-2xl border-2 border-border bg-white p-4 text-left transition hover:border-primary">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${best.scale.color}1a` }}>{best.scale.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate font-display text-base font-extrabold">{row.name}{row.grade ? ` · ${row.grade} кл.` : ''}</strong>
                    <span className="block text-sm text-muted">{formatPhone(row.phone)} · {formatDate(row.createdAt)}</span>
                    <span className="mt-1 block text-sm font-bold" style={{ color: best.scale.color }}>{best.scale.title}: {best.score} из 12</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS[row.status].tone}`}>{STATUS[row.status].label}</span>
                </button>
              );
            })}
          </div>
        )}
    </section>
  );
}
