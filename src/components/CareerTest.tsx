import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Compass, Gift, MessageCircle, Send, Sparkles, UserRound } from 'lucide-react';
import PhoneInput from '../shared/PhoneInput';
import { fullPhone, phoneProblem, prefixOk } from '../shared/phone';
import { getAttribution } from '../shared/attribution';
import { CAREER_LETTERS, CAREER_QUESTIONS } from '../shared/career';

/* Страница профориентации (study-task.kz/career): 24 вопроса → экран «ответы направлены профориентологу» → имя и телефон.
   Пока контакты не оставлены, на сервер ничего не уходит: отчёт и заявка в CRM создаются только после отправки формы. */
const WHATSAPP = 'https://wa.me/77000373431';
const DRAFT_KEY = 'st_career_v1';
const TOTAL = CAREER_QUESTIONS.length;

type Draft = { answers: number[]; name?: string };
const readDraft = (): Draft | null => {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return value && Array.isArray(value.answers) && value.answers.every((a: unknown) => Number.isInteger(a) && (a as number) >= 0 && (a as number) <= 2) && value.answers.length <= TOTAL ? value : null;
  } catch { return null; }
};
const writeDraft = (draft: Draft | null) => { try { if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); else localStorage.removeItem(DRAFT_KEY); } catch { /* хранилище недоступно */ } };

const CSS = `
.ct{--navy:#1b2b6b;--blue:#2f6bff;--gold:#ffc94a;--green:#12a150;--ink:#16204f;--muted:#5b6690;--line:#dfe6fb;--bg:#f4f7ff;min-height:100vh;background:radial-gradient(900px 500px at 85% -10%,#e3ebff 0,transparent 60%),radial-gradient(700px 420px at -10% 10%,#fff1cf 0,transparent 60%),var(--bg);color:var(--ink);font-family:'Nunito','Segoe UI',system-ui,-apple-system,sans-serif;padding:20px 16px 48px}
.ct *{box-sizing:border-box}
.ct-wrap{max-width:560px;margin:0 auto}
.ct-brand{display:flex;align-items:center;gap:12px;margin:4px 0 18px}
.ct-brand img{width:46px;height:46px;border-radius:14px;border:2.5px solid var(--navy);background:#fff}
.ct-brand b{display:block;font-size:19px;font-weight:900;color:var(--navy)}
.ct-brand span{font-size:13px;color:var(--muted)}
.ct-card{background:#fff;border:2.5px solid var(--navy);border-radius:24px;padding:22px 20px;box-shadow:0 6px 0 var(--navy)}
.ct h1{margin:8px 0 6px;font-size:30px;line-height:1.1;font-weight:900;color:var(--navy)}
.ct h2{margin:0 0 6px;font-size:23px;line-height:1.2;font-weight:900;color:var(--navy)}
.ct p{margin:0;line-height:1.5}
.ct-muted{color:var(--muted)}
.ct-pills{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 4px}
.ct-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:800;background:#eef3ff;color:var(--navy);border:1.5px solid var(--line)}
.ct-pill.gold{background:#fff3cf;border-color:#ffdf8f}
.ct-pill.green{background:#e3f7ea;border-color:#b6e7c8;color:#0b7a3b}
.ct-list{margin:16px 0 0;padding:0;list-style:none;display:grid;gap:10px}
.ct-list li{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.4}
.ct-list svg{flex:none;margin-top:2px;color:var(--blue)}
.ct-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border:2.5px solid var(--navy);border-radius:18px;padding:15px 18px;font:inherit;font-size:17px;font-weight:900;cursor:pointer;background:var(--gold);color:var(--navy);box-shadow:0 4px 0 var(--navy);text-decoration:none;transition:transform .08s,box-shadow .08s}
.ct-btn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--navy)}
.ct-btn:disabled{opacity:.6;cursor:default}
.ct-btn.ghost{background:#fff;margin-top:12px}
.ct-btn.green{background:#25d366;color:#fff;border-color:#0b7a3b;box-shadow:0 4px 0 #0b7a3b}
.ct-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.ct-back{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px;border:2px solid var(--line);background:#fff;color:var(--navy);cursor:pointer}
.ct-back:disabled{opacity:.35;cursor:default}
.ct-bar{flex:1;height:14px;border-radius:999px;background:#e8eeff;border:2px solid var(--navy);overflow:hidden}
.ct-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--blue),#6aa0ff);border-radius:999px;transition:width .3s}
.ct-count{font-size:13px;font-weight:800;color:var(--muted);min-width:48px;text-align:right}
.ct-q{font-size:21px;line-height:1.3;font-weight:900;color:var(--navy);margin:6px 0 16px}
.ct-opts{display:grid;gap:10px}
.ct-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:2.5px solid var(--line);border-radius:18px;background:#fff;padding:14px;font:inherit;font-size:16px;line-height:1.35;font-weight:700;color:var(--ink);cursor:pointer;transition:border-color .12s,background .12s,transform .08s}
.ct-opt:hover{border-color:var(--blue);background:#f5f8ff}
.ct-opt.on{border-color:var(--navy);background:#fff3cf}
.ct-opt:active{transform:scale(.99)}
.ct-letter{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:#eef3ff;border:2px solid var(--line);font-weight:900;color:var(--navy)}
.ct-opt.on .ct-letter{background:var(--gold);border-color:var(--navy)}
.ct-hero{display:grid;place-items:center;width:78px;height:78px;margin:0 auto 12px;border-radius:26px;background:linear-gradient(135deg,#fff3cf,#e3ebff);border:2.5px solid var(--navy)}
.ct-center{text-align:center}
.ct-form{display:grid;gap:14px;margin-top:18px}
.ct label{display:grid;gap:6px;font-size:13px;font-weight:900;color:var(--navy);text-transform:uppercase;letter-spacing:.04em}
.ct input,.ct select{width:100%;border:2.5px solid var(--line);border-radius:16px;padding:13px 14px;font:inherit;font-size:17px;font-weight:700;color:var(--ink);background:#fff;outline:none}
.ct input:focus,.ct select:focus{border-color:var(--blue)}
.ct-err{border:2px solid #fecaca;background:#fff1f2;color:#be123c;border-radius:14px;padding:10px 14px;font-weight:800;font-size:14px}
.ct-note{font-size:13px;color:var(--muted);text-align:center;margin-top:18px;line-height:1.45}
.ct-banner{display:flex;gap:12px;align-items:flex-start;background:#e3f7ea;border:2px solid #b6e7c8;border-radius:18px;padding:12px 14px;margin-top:14px;font-weight:700;font-size:15px;line-height:1.4;color:#0b5f31}
`;

type Step = 'intro' | 'quiz' | 'contact' | 'done';

export default function CareerTest() {
  const [step, setStep] = useState<Step>('intro');
  const [answers, setAnswers] = useState<number[]>([]);
  const [saved, setSaved] = useState<Draft | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'Профориентация для школьников — бесплатно | StudyTask'; setSaved(readDraft()); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step, answers.length]);

  const index = Math.min(answers.length, TOTAL - 1);
  const current = CAREER_QUESTIONS[index];
  const progress = useMemo(() => Math.round((answers.length / TOTAL) * 100), [answers.length]);

  const start = (resume: boolean) => {
    const draft = resume ? saved : null;
    const list = draft ? draft.answers : [];
    setAnswers(list);
    setStep(list.length >= TOTAL ? 'contact' : 'quiz');
    if (!draft) writeDraft(null);
  };
  const pick = (option: number) => {
    const next = [...answers.slice(0, index), option];
    setAnswers(next);
    writeDraft({ answers: next });
    window.setTimeout(() => { if (next.length >= TOTAL) setStep('contact'); }, 220);
  };
  const back = () => {
    if (step === 'contact') { setStep('quiz'); setAnswers((list) => list.slice(0, TOTAL - 1)); return; }
    if (answers.length > 0) setAnswers((list) => list.slice(0, -1));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (name.trim().length < 2) { setError('Укажите имя.'); return; }
    const problem = phoneProblem(phone);
    if (problem) { if (prefixOk(phone)) setError(problem); else setError('Введите номер полностью: +7 и код 700–709, 747, 771, 775–778.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/public/career', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: fullPhone(phone), grade: grade ? Number(grade) : null, answers, attribution: getAttribution() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Не удалось отправить ответы.');
      writeDraft(null);
      setStep('done');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось отправить ответы.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="ct">
      <style>{CSS}</style>
      <div className="ct-wrap">
        <div className="ct-brand">
          <img src="/static/ST.webp" alt="StudyTask" width={46} height={46} />
          <div><b>StudyTask</b><span>математика 1–11 классы · Алматы</span></div>
        </div>

        {step === 'intro' && (
          <div className="ct-card">
            <div className="ct-hero"><Compass size={38} color="#1b2b6b" /></div>
            <div className="ct-center">
              <h1>Профориентация</h1>
              <p className="ct-muted">Узнайте, к каким профессиям у ребёнка есть склонности. Профориентолог разберёт ответы и пришлёт результат.</p>
            </div>
            <div className="ct-pills" style={{ justifyContent: 'center' }}>
              <span className="ct-pill gold"><Gift size={14} /> бесплатно</span>
              <span className="ct-pill"><Clock size={14} /> 5–7 минут</span>
              <span className="ct-pill green">24 вопроса</span>
            </div>
            <ul className="ct-list">
              <li><Sparkles size={18} /> Методика Л. Йовайши: шесть видов профессиональных склонностей</li>
              <li><UserRound size={18} /> Отвечайте так, как хочется вам, а не как «правильно»: верных ответов нет</li>
              <li><Send size={18} /> Результат придёт в WhatsApp: сильные стороны, подходящие профессии и советы родителям</li>
            </ul>
            <div style={{ marginTop: 20 }}>
              {saved && saved.answers.length > 0 && saved.answers.length < TOTAL && (
                <button type="button" className="ct-btn" onClick={() => start(true)} style={{ marginBottom: 12, background: '#fff' }}>Продолжить с вопроса {saved.answers.length + 1}</button>
              )}
              <button type="button" className="ct-btn" onClick={() => start(false)}>{saved && saved.answers.length > 0 ? 'Начать заново' : 'Начать тест'}</button>
            </div>
          </div>
        )}

        {step === 'quiz' && (
          <div className="ct-card">
            <div className="ct-top">
              <button type="button" className="ct-back" onClick={back} disabled={answers.length === 0} aria-label="Назад"><ArrowLeft size={20} /></button>
              <div className="ct-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }} /></div>
              <span className="ct-count">{Math.min(answers.length + 1, TOTAL)} / {TOTAL}</span>
            </div>
            <p className="ct-q">{index + 1}. {current.q}</p>
            <div className="ct-opts">
              {current.o.map((text, option) => (
                <button key={option} type="button" className={`ct-opt${answers[index] === option ? ' on' : ''}`} onClick={() => pick(option)}>
                  <span className="ct-letter">{CAREER_LETTERS[option]}</span><span>{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'contact' && (
          <div className="ct-card">
            <div className="ct-top">
              <button type="button" className="ct-back" onClick={back} aria-label="Назад к вопросам"><ArrowLeft size={20} /></button>
              <div className="ct-bar"><i style={{ width: '100%' }} /></div>
              <span className="ct-count">{TOTAL} / {TOTAL}</span>
            </div>
            <div className="ct-center">
              <div className="ct-hero"><Send size={34} color="#1b2b6b" /></div>
              <h2>Ваши ответы направлены профориентологу</h2>
              <p className="ct-muted">Чтобы получить результат, оставьте имя и номер телефона. Это абсолютно бесплатно.</p>
            </div>
            <form className="ct-form" onSubmit={submit} noValidate>
              <label>Имя<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Айдана" autoComplete="given-name" maxLength={80} /></label>
              <label>Номер телефона (WhatsApp)<PhoneInput value={phone} onChange={setPhone} /></label>
              <label>Класс ученика (необязательно)
                <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="">Не указывать</option>
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g} класс</option>)}
                </select>
              </label>
              {error && <p role="alert" className="ct-err">{error}</p>}
              <button className="ct-btn" type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Получить результат'}</button>
            </form>
            <p className="ct-note">Без номера телефона мы не сможем отправить результат, поэтому ответы не сохраняются.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="ct-card ct-center">
            <CheckCircle2 size={64} color="#12a150" style={{ margin: '0 auto 10px' }} />
            <h2>Спасибо{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}!</h2>
            <p className="ct-muted">Профориентолог изучает ваши ответы.</p>
            <div className="ct-banner" style={{ textAlign: 'left' }}><Clock size={22} style={{ flex: 'none' }} /><span>Пожалуйста, подождите примерно 15–20 минут: результат придёт на указанный номер в WhatsApp.</span></div>
            <a className="ct-btn green" style={{ marginTop: 18 }} href={WHATSAPP} target="_blank" rel="noreferrer"><MessageCircle size={20} /> Написать в WhatsApp</a>
            <a className="ct-btn ghost" href="/">На главную</a>
          </div>
        )}
      </div>
    </div>
  );
}
