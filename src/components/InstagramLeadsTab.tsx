import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarCheck, ChevronRight, ClipboardCheck, LoaderCircle, MessageCircle, RotateCw, Search, X } from 'lucide-react';
import { resultLevel } from '../data/publicTests';

type TestLead = {
  id: string; name: string; phone: string; grade: number;
  status: 'started' | 'finished'; score: number | null; total: number | null;
  missedTopics: string[]; startedAt: string; finishedAt: string | null;
};

const GRADES = [5, 6, 7, 8, 9, 10, 11];
const STATUS_FILTERS = [['all', 'Все'], ['finished', 'Прошли тест'], ['started', 'Не дошли до конца']] as const;
const LEVEL_TONE: Record<string, string> = {
  'Отличный уровень': 'bg-emerald-100 text-emerald-700',
  'Хороший уровень': 'bg-sky-100 text-sky-700',
  'Средний уровень': 'bg-amber-100 text-amber-700',
  'Нужна поддержка': 'bg-rose-100 text-rose-700',
};

const formatPhone = (digits: string) => {
  const d = digits.replace(/\D/g, '');
  return d.length === 11 ? `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : `+${d}`;
};
const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function InstagramLeadsTab() {
  const [source, setSource] = useState<'menu' | 'level-test' | 'trial'>('menu');
  const [leads, setLeads] = useState<TestLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number][0]>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/test-leads', { credentials: 'same-origin' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Не удалось загрузить список.');
      setLeads(Array.isArray(data) ? data : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить список.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (source === 'level-test') void load(); }, [source, load]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const digits = query.replace(/\D/g, '').replace(/^8/, '7');
    return leads.filter((lead) => {
      if (grade !== null && lead.grade !== grade) return false;
      if (status !== 'all' && lead.status !== status) return false;
      if (!text) return true;
      return lead.name.toLowerCase().includes(text) || (digits.length > 0 && lead.phone.includes(digits));
    });
  }, [leads, query, grade, status]);

  const finishedCount = leads.filter((lead) => lead.status === 'finished').length;
  const filtersActive = query !== '' || grade !== null || status !== 'all';

  if (source === 'menu') {
    return (
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-extrabold">Лиды с инстаграма</h2>
        <p className="mb-5 text-sm text-muted">Кто оставил контакты, перейдя по ссылке из Instagram.</p>
        <button type="button" onClick={() => setSource('level-test')} className="flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-primary-light/50 p-4 text-left transition hover:border-primary sm:max-w-md">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-white"><ClipboardCheck className="h-6 w-6" /></span>
          <span className="flex-1"><strong className="block font-display text-base font-extrabold">Тест на определение уровня</strong><span className="text-sm text-muted">study-task.kz/test · классы 5–11</span></span>
          <ChevronRight className="h-5 w-5 text-muted" />
        </button>
        <button type="button" onClick={() => setSource('trial')} className="mt-3 flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-primary-light/50 p-4 text-left transition hover:border-primary sm:max-w-md">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><CalendarCheck className="h-6 w-6" /></span>
          <span className="flex-1"><strong className="block font-display text-base font-extrabold">Записи на пробный урок</strong><span className="text-sm text-muted">study-task.kz/trial · классы 5–9</span></span>
          <ChevronRight className="h-5 w-5 text-muted" />
        </button>
      </section>
    );
  }
  if (source === 'trial') return <TrialRequestsView onBack={() => setSource('menu')} />;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSource('menu')} aria-label="Назад к источникам" className="rounded-xl border border-border p-2 text-muted hover:bg-primary-light hover:text-primary"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h2 className="font-display text-lg font-extrabold">Тест на определение уровня</h2>
            <p className="text-sm text-muted">Всего: {leads.length} · прошли до конца: {finishedCount}</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-primary-light hover:text-primary disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />} Обновить
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени или номеру телефона" className="w-full rounded-xl border-2 border-border bg-white py-2.5 pl-10 pr-10 text-sm font-semibold outline-none focus:border-primary" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-primary"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold uppercase text-muted">Класс</span>
          {[null, ...GRADES].map((g) => (
            <button key={g ?? 'all'} type="button" onClick={() => setGrade(g)} className={`rounded-full border px-3 py-1 text-sm font-bold transition ${grade === g ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-primary hover:text-primary'}`}>{g ?? 'Все'}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold uppercase text-muted">Статус</span>
          {STATUS_FILTERS.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-full border px-3 py-1 text-sm font-bold transition ${status === value ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-primary hover:text-primary'}`}>{label}</button>
          ))}
          {filtersActive && <button type="button" onClick={() => { setQuery(''); setGrade(null); setStatus('all'); }} className="ml-auto text-sm font-bold text-primary hover:underline">Сбросить фильтры</button>}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">{error}</p>}

      {loading && !leads.length ? (
        <p className="py-12 text-center text-sm text-muted">Загрузка…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">{leads.length ? 'Никого не найдено — измените поиск или фильтры.' : 'Пока никто не проходил тест.'}</p>
      ) : (
        <>
          <p className="text-xs font-bold text-muted">Показано: {filtered.length}</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-primary-light text-xs uppercase text-muted">
                <tr><th className="px-4 py-3">Имя</th><th className="px-4 py-3">Телефон</th><th className="px-4 py-3">Класс</th><th className="px-4 py-3">Результат</th><th className="px-4 py-3">Слабые темы</th><th className="px-4 py-3">Дата</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((lead) => {
                  const level = lead.status === 'finished' && lead.score !== null && lead.total ? resultLevel(lead.score, lead.total) : null;
                  return (
                    <tr key={lead.id} className="align-top hover:bg-primary-light/40">
                      <td className="px-4 py-3 font-bold">{lead.name}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" title="Написать в WhatsApp" className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"><MessageCircle className="h-4 w-4" />{formatPhone(lead.phone)}</a>
                      </td>
                      <td className="px-4 py-3 font-bold">{lead.grade}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {level ? <span className="inline-flex items-center gap-2"><strong>{lead.score}/{lead.total}</strong><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${LEVEL_TONE[level.title] || 'bg-slate-100 text-slate-700'}`}>{level.title}</span></span>
                          : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Не закончил</span>}
                      </td>
                      <td className="px-4 py-3">{lead.missedTopics?.length ? <div className="flex flex-wrap gap-1">{lead.missedTopics.map((topic) => <span key={topic} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{topic}</span>)}</div> : <span className="text-muted">—</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(lead.finishedAt || lead.startedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

type TrialRequest = { id: string; studentName: string; parentName: string; grade: number; phone: string; status: 'new' | 'contacted' | 'done'; createdAt: string };
const TR_STATUS: Record<TrialRequest['status'], string> = { new: 'Новая', contacted: 'Связались', done: 'Записан' };
const TR_TONE: Record<TrialRequest['status'], string> = { new: 'bg-amber-100 text-amber-800', contacted: 'bg-sky-100 text-sky-700', done: 'bg-emerald-100 text-emerald-700' };

function TrialRequestsView({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<TrialRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | TrialRequest['status']>('all');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/trial-requests', { credentials: 'same-origin' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Не удалось загрузить заявки.');
      setItems(Array.isArray(data) ? data : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить заявки.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const setItemStatus = async (id: string, next: TrialRequest['status']) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, status: next } : item)));
    try {
      const response = await fetch(`/api/admin/trial-requests/${id}`, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
      if (!response.ok) throw new Error('Не удалось сохранить статус.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить статус.'); void load(); }
  };
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const digits = query.replace(/\D/g, '').replace(/^8/, '7');
    return items.filter((item) => (status === 'all' || item.status === status) && (!text || item.studentName.toLowerCase().includes(text) || item.parentName.toLowerCase().includes(text) || (digits.length > 0 && item.phone.includes(digits))));
  }, [items, query, status]);
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Назад к источникам" className="rounded-xl border border-border p-2 text-muted hover:bg-primary-light hover:text-primary"><ArrowLeft className="h-5 w-5" /></button>
          <div><h2 className="font-display text-lg font-extrabold">Записи на пробный урок</h2><p className="text-sm text-muted">Всего: {items.length} · новых: {items.filter((item) => item.status === 'new').length}</p></div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted hover:bg-primary-light hover:text-primary disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />} Обновить</button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени ученика, родителя или телефону" className="w-full rounded-xl border-2 border-border bg-white py-2.5 pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-extrabold uppercase text-muted">Статус</span>
        {([['all', 'Все'], ['new', 'Новые'], ['contacted', 'Связались'], ['done', 'Записаны']] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-full border px-3 py-1 text-sm font-bold transition ${status === value ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-primary hover:text-primary'}`}>{label}</button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">{error}</p>}
      {loading && !items.length ? <p className="py-12 text-center text-sm text-muted">Загрузка…</p> : filtered.length === 0 ? <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">{items.length ? 'Ничего не найдено.' : 'Заявок пока нет.'}</p> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-primary-light text-xs uppercase text-muted"><tr><th className="px-4 py-3">Ученик</th><th className="px-4 py-3">Класс</th><th className="px-4 py-3">Родитель</th><th className="px-4 py-3">Телефон</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Дата</th></tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3 font-bold">{item.studentName}</td>
                  <td className="px-4 py-3 font-bold">{item.grade}</td>
                  <td className="px-4 py-3">{item.parentName}</td>
                  <td className="whitespace-nowrap px-4 py-3"><a href={`https://wa.me/${item.phone}`} target="_blank" rel="noreferrer" title="Написать в WhatsApp" className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"><MessageCircle className="h-4 w-4" />{formatPhone(item.phone)}</a></td>
                  <td className="px-4 py-3"><select value={item.status} onChange={(e) => void setItemStatus(item.id, e.target.value as TrialRequest['status'])} className={`rounded-full border-0 px-2 py-1 text-xs font-bold ${TR_TONE[item.status]}`}>{(Object.keys(TR_STATUS) as TrialRequest['status'][]).map((key) => <option key={key} value={key}>{TR_STATUS[key]}</option>)}</select></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
