import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Gamepad2, MessageCircle, Send, Star, Trophy, Users, Video } from 'lucide-react';
import '../tg/tg.css';
import PhoneInput from '../shared/PhoneInput';
import { fullPhone, phoneProblem, prefixOk } from '../shared/phone';

/* Страница записи на бесплатный интенсив (study-task.kz/intensive, /intensive/5, /intensive/9) — в стиле кабинета ученика.
   Темы, даты и программа задаются на сервере (INTENSIVE в server.js); здесь только запасной вариант, если сервер не ответил. */
type Track = { grade: number; topic: string; headline: string; blurb: string; days: string[] };
type Config = { startDate: string; tracks: Track[] };

const FALLBACK: Config = {
  startDate: '04.11.2026',
  tracks: [
    { grade: 5, topic: 'Дроби', headline: 'Дроби за 3 дня', blurb: 'Научишься уверенно решать дроби.', days: [] },
    { grade: 9, topic: 'Интенсив для 9 класса', headline: 'Интенсив для 9 класса', blurb: 'Три дня занятий с опытным преподавателем.', days: [] },
  ],
};
const WHATSAPP = 'https://wa.me/77000373431';

function gradeFromUrl(): number {
  const match = window.location.pathname.match(/\/intensive\/(\d+)/);
  const raw = match ? Number(match[1]) : Number(new URLSearchParams(window.location.search).get('grade'));
  return raw === 9 ? 9 : 5;
}

export default function IntensiveSignup() {
  const [config, setConfig] = useState<Config>(FALLBACK);
  const [grade, setGrade] = useState<number>(gradeFromUrl);
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<null | { already: boolean }>(null);

  useEffect(() => { document.title = 'Бесплатный интенсив по математике — StudyTask'; }, []);
  useEffect(() => {
    fetch('/api/public/intensive').then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (data && Array.isArray(data.tracks) && data.tracks.length) setConfig(data);
    }).catch(() => undefined);
  }, []);

  const track = useMemo(() => config.tracks.find((item) => item.grade === grade) || config.tracks[0], [config, grade]);

  const chooseGrade = (value: number) => {
    setGrade(value);
    try { window.history.replaceState(null, '', `/intensive/${value}`); } catch { /* не критично */ }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const problem = phoneProblem(phone);
    if (problem) { if (prefixOk(phone)) setError(problem); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/public/intensive-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentName, parentName, grade, phone: fullPhone(phone) }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Не удалось отправить заявку.');
      setDone({ already: Boolean(data?.already) });
      window.scrollTo({ top: 0 });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось отправить заявку.'); }
    finally { setBusy(false); }
  };

  const perks: Array<[typeof Video, string]> = [
    [Video, 'Живые занятия онлайн с опытным преподавателем — понятно и не скучно'],
    [Users, 'Группы по 3–5 человек: внимание каждому'],
    [Send, 'Приложение внутри Telegram — без логина и пароля'],
    [Star, 'Тесты и звёзды за каждое задание'],
    [Gamepad2, 'Игры Sky Quest и «Школьный спринт»: ставь рекорды'],
    [Trophy, 'Рейтинг интенсива. Победитель получит скидку 50% на первый месяц обучения'],
  ];

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div className="row" style={{ margin: '6px 0 14px' }}>
        <img src="/static/ST.webp" alt="StudyTask" width={46} height={46} style={{ borderRadius: 12, border: '2.5px solid var(--navy)' }} />
        <div className="grow"><h3>StudyTask</h3><p className="muted small">математика 1–11 классы · Алматы</p></div>
      </div>

      {done ? (
        <div className="stack">
          <div className="card ok" style={{ textAlign: 'center', padding: '26px 18px' }}>
            <CheckCircle2 size={56} color="var(--green)" style={{ margin: '0 auto 8px' }} />
            <h2>{done.already ? 'Вы уже в списке!' : 'Вы в списке интенсива!'}</h2>
            <p style={{ marginTop: 8 }}>{grade} класс · «{track.topic}» · старт {config.startDate}. Мы напишем вам до начала и пришлём ссылку на занятие и доступ к приложению.</p>
          </div>
          <a className="btn gold block" href={WHATSAPP} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><MessageCircle size={20} /> Написать в WhatsApp</a>
          <a className="btn ghost block" href="/" style={{ textDecoration: 'none' }}>На главную</a>
        </div>
      ) : (
        <div className="stack">
          <div className="card blue">
            <p className="tiny" style={{ letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gold)' }}>Бесплатный интенсив · старт {config.startDate}</p>
            <h1 style={{ marginTop: 4 }}>Интенсив по математике</h1>
            <p className="muted" style={{ marginTop: 6 }}>3 дня занятий онлайн. Мы первые, кто делает такой интенсив бесплатно!</p>
          </div>

          <div className="seg" role="radiogroup" aria-label="Класс" style={{ gridTemplateColumns: `repeat(${config.tracks.length}, 1fr)` }}>
            {config.tracks.map((item) => <button key={item.grade} type="button" role="radio" aria-checked={grade === item.grade} className={grade === item.grade ? 'on' : ''} onClick={() => chooseGrade(item.grade)}>{item.grade} класс</button>)}
          </div>

          <div className="card warn">
            <p className="tiny" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Тема интенсива · {track.grade} класс</p>
            <h2 style={{ marginTop: 2 }}>{track.headline}</h2>
            <p style={{ marginTop: 6 }}>{track.blurb}</p>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <span className="pill gold"><CalendarDays size={14} /> старт {config.startDate}</span>
              <span className="pill blue">3 дня</span>
              <span className="pill green">онлайн</span>
              <span className="pill green">бесплатно</span>
            </div>
            {track.days.length > 0 && (
              <ol style={{ margin: '12px 0 0', paddingLeft: 22, display: 'grid', gap: 4 }}>
                {track.days.map((day, index) => <li key={index}><b>День {index + 1}.</b> {day}</li>)}
              </ol>
            )}
          </div>

          <div className="card flat stack">
            <h3>Что вас ждёт</h3>
            {perks.map(([Icon, text]) => <div className="row" key={text} style={{ alignItems: 'flex-start' }}><Icon size={22} color="var(--ink)" style={{ flexShrink: 0, marginTop: 1 }} /><p className="grow">{text}</p></div>)}
          </div>

          <form className="card stack" onSubmit={submit}>
            <h2>Записаться на интенсив · {grade} класс</h2>
            <label className="field"><span>Имя и фамилия ученика</span><input className="input" autoComplete="name" maxLength={80} value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Например, Алия Серикова" required /></label>
            <label className="field"><span>Имя родителя</span><input className="input" autoComplete="off" maxLength={80} value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Например, Мадина" required /></label>
            <label className="field"><span>Номер телефона для связи</span><PhoneInput className="input" value={phone} onChange={(d) => { setPhone(d); setError(''); }} invalid={Boolean(phoneProblem(phone, Boolean(error)))} /></label>
            {error && <div className="card bad" role="alert" style={{ padding: '10px 12px' }}>{error}</div>}
            <button className="btn gold block" disabled={busy}>{busy ? 'Отправляем…' : 'Участвовать бесплатно'}</button>
            <p className="tiny muted" style={{ textAlign: 'center' }}>Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</p>
          </form>
        </div>
      )}
    </div>
  );
}
