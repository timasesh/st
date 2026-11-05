import { useEffect, useState } from 'react';
import { crmApi } from './api';
import { useCrm } from './store';
import type { Analytics, AnalyticsRow } from './types';
import { Empty } from './ui';
import { TYPE_LABEL, sourceLabel } from './util';

const GROUPS: [string, string][] = [['source', 'Источник'], ['campaign', 'Кампания'], ['medium', 'Канал (medium)'], ['content', 'Объявление'], ['type', 'Тип заявки'], ['channel', 'Мессенджер'], ['grade', 'Класс']];
const PERIODS: [string, string][] = [['7', '7 дней'], ['30', '30 дней'], ['90', '90 дней'], ['all', 'Всё время']];

const label = (group: string, key: string) => (group === 'source' ? sourceLabel(key) : group === 'type' ? (TYPE_LABEL as Record<string, string>)[key] || key : key);

function Kpi({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return <div className="crm-card crm-pad"><span className="crm-label">{title}</span><strong style={{ fontSize: 28 }}>{value}</strong>{hint && <span className="crm-muted" style={{ display: 'block', fontSize: 12 }}>{hint}</span>}</div>;
}

export function AnalyticsView() {
  const { toast } = useCrm();
  const [groupBy, setGroupBy] = useState('source');
  const [days, setDays] = useState('30');
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    crmApi<Analytics>(`/analytics?days=${days}&groupBy=${groupBy}`).then((d) => { if (alive) setData(d); }).catch((reason) => { toast(reason.message, 'bad'); });
    return () => { alive = false; };
  }, [groupBy, days, toast]);

  const max = data ? Math.max(1, ...data.series.map((s) => s.leads)) : 1;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const total: AnalyticsRow | undefined = data?.total;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="crm-toolbar" style={{ marginBottom: 0 }}>
        <div className="crm-tabs" aria-label="Период">{PERIODS.map(([v, l]) => <button key={v} type="button" className="crm-tab" aria-selected={days === v} onClick={() => setDays(v)}>{l}</button>)}</div>
        <label className="crm-row"><span className="crm-muted">Группировать по</span>
          <select className="crm-select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>{GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
      </div>
      {!data || !total ? <p className="crm-muted">Считаем…</p> : (
        <>
          <div className="crm-grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <Kpi title="Заявок" value={total.leads} />
            <Kpi title="Записались на пробный" value={total.booked} hint={total.leads ? pct(total.booked / total.leads) : ''} />
            <Kpi title="Провели пробный" value={total.done} />
            <Kpi title="Оплатили" value={total.paid} hint={`конверсия ${pct(total.conversion)}`} />
            <Kpi title="Потеряно" value={total.lost} />
          </div>
          {data.series.length > 1 && (
            <div className="crm-card crm-pad">
              <span className="crm-label">Заявки по дням</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }} role="img" aria-label="График заявок по дням">
                {data.series.map((s) => <div key={s.day} title={`${s.day}: ${s.leads}`} style={{ flex: 1, minWidth: 2, height: `${Math.max(3, (s.leads / max) * 100)}%`, background: 'var(--brand)', borderRadius: 3, opacity: s.leads ? 1 : 0.2 }} />)}
              </div>
            </div>
          )}
          {data.rows.length ? (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead><tr><th>{GROUPS.find(([v]) => v === groupBy)?.[1]}</th><th>Заявок</th><th>Записались</th><th>Провели</th><th>Оплатили</th><th>Потеряно</th><th>Конверсия</th></tr></thead>
                <tbody>{data.rows.map((r) => (
                  <tr key={r.key} style={{ cursor: 'default' }}>
                    <td><strong>{label(groupBy, r.key)}</strong></td><td>{r.leads}</td><td>{r.booked}</td><td>{r.done}</td><td>{r.paid}</td><td>{r.lost}</td>
                    <td style={{ minWidth: 130 }}><div className="crm-row"><div className="crm-bar" style={{ flex: 1 }}><i style={{ width: pct(r.conversion) }} /></div><span>{pct(r.conversion)}</span></div></td>
                  </tr>))}</tbody>
              </table>
            </div>
          ) : <div className="crm-card"><Empty title="Нет данных за период" text="Заявки появятся здесь сразу после первых обращений." /></div>}
          <p className="crm-muted" style={{ margin: 0, fontSize: 12 }}>Конверсия — доля заявок, дошедших до оплаты. Источник определяется по UTM-меткам, а если их нет — по сайту, с которого пришёл человек.</p>
        </>
      )}
    </div>
  );
}
