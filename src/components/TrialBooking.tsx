import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import '../tg/tg.css';
import PhoneInput from '../shared/PhoneInput';
import { fullPhone, phoneProblem, prefixOk } from '../shared/phone';

/* Страница записи на пробный урок (study-task.kz/trial) — в стиле мини-приложения StudyTask («доска»). */
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const WHATSAPP = 'https://wa.me/77000373431';

export default function TrialBooking() {
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => { document.title = 'Запись на пробный урок — StudyTask'; }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (grade === null) { setError('Выберите класс.'); return; }
    const problem = phoneProblem(phone);
    if (problem) { if (prefixOk(phone)) setError(problem); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/public/trial-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentName, parentName, grade, phone: fullPhone(phone) }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Не удалось отправить заявку.');
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось отправить заявку.'); }
    finally { setBusy(false); }
  };

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
            <h2>Заявка отправлена!</h2>
            <p style={{ marginTop: 8 }}>Мы свяжемся с вами в ближайшее время, чтобы выбрать удобное время пробного урока.</p>
          </div>
          <a className="btn gold block" href={WHATSAPP} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><MessageCircle size={20} /> Написать в WhatsApp</a>
          <a className="btn ghost block" href="/" style={{ textDecoration: 'none' }}>На главную</a>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <div className="card blue">
            <h1>Пробный урок — бесплатно</h1>
            <p className="muted" style={{ marginTop: 6 }}>Оставьте данные — мы свяжемся и подберём удобное время. Знакомимся с учителем, проверяем уровень и составляем план.</p>
          </div>
          <div className="card stack">
            <label className="field"><span>Имя и фамилия ученика</span><input className="input" autoComplete="name" maxLength={80} value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Например, Алия Серикова" required /></label>
            <label className="field"><span>Имя родителя</span><input className="input" autoComplete="off" maxLength={80} value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Например, Мадина" required /></label>
            <div className="field"><span>Класс</span>
              <div className="seg" role="radiogroup" aria-label="Класс" style={{ gridAutoFlow: 'row', gridTemplateColumns: 'repeat(6, 1fr)' }}>{GRADES.map((g) => <button key={g} type="button" role="radio" aria-checked={grade === g} className={grade === g ? 'on' : ''} onClick={() => setGrade(g)}>{g}</button>)}</div>
            </div>
            <label className="field"><span>Номер телефона для связи</span><PhoneInput className="input" value={phone} onChange={(d) => { setPhone(d); setError(''); }} invalid={Boolean(phoneProblem(phone, Boolean(error)))} /></label>
            {error && <div className="card bad" role="alert" style={{ padding: '10px 12px' }}>{error}</div>}
            <button className="btn gold block" disabled={busy}>{busy ? 'Отправляем…' : 'Записаться на пробный урок'}</button>
            <p className="tiny muted" style={{ textAlign: 'center' }}>Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</p>
          </div>
        </form>
      )}
    </div>
  );
}
