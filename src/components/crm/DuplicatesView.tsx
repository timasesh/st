import { useCallback, useEffect, useState } from 'react';
import { GitMerge, X } from 'lucide-react';
import { crmApi } from './api';
import { useCrm } from './store';
import type { Contact, DuplicatePair } from './types';
import { Avatar, Empty, PhoneLink } from './ui';
import { displayName } from './util';

const REASON: Record<string, string> = { phone: 'Одинаковый телефон', telegram: 'Один Telegram', instagram: 'Один Instagram', name: 'Похожее имя' };

function Card({ contact, keep, onKeep }: { contact: Contact; keep: boolean; onKeep: () => void }) {
  return (
    <button type="button" className="crm-card crm-pad" aria-pressed={keep} onClick={onKeep} style={{ textAlign: 'left', cursor: 'pointer', outline: keep ? '2px solid var(--brand)' : 'none' }}>
      <div className="crm-row"><Avatar contact={contact} name={displayName(contact)} /><div><strong>{displayName(contact)}</strong><span className="crm-muted" style={{ display: 'block', fontSize: 12 }}>{contact.kind === 'parent' ? 'Родитель' : 'Ученик'}</span></div></div>
      <div className="crm-muted" style={{ marginTop: 8, fontSize: 13, display: 'grid', gap: 2 }}>
        {contact.phones.map((p) => <PhoneLink key={p} phone={p} />)}
        {contact.telegram?.username && <span>Telegram @{contact.telegram.username}</span>}
        {contact.instagram && <span>Instagram {contact.instagram}</span>}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: keep ? 'var(--brand)' : 'var(--muted)' }}>{keep ? '✓ Оставить эту карточку' : 'Нажмите, чтобы оставить эту'}</p>
    </button>
  );
}

export function DuplicatesView() {
  const { setDupCount, reload, toast } = useCrm();
  const [pairs, setPairs] = useState<DuplicatePair[] | null>(null);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try { const data = await crmApi<DuplicatePair[]>('/duplicates'); setPairs(data); setDupCount(data.length); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось загрузить', 'bad'); setPairs([]); }
  }, [setDupCount, toast]);
  useEffect(() => { void load(); }, [load]);

  const merge = async (pair: DuplicatePair) => {
    const keepId = keep[pair.key] || pair.a.id;
    const dropId = keepId === pair.a.id ? pair.b.id : pair.a.id;
    setBusy(pair.key);
    try { await crmApi('/duplicates/merge', { body: { keepId, dropId } }); toast('Контакты объединены'); await load(); await reload(); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Не удалось объединить', 'bad'); } finally { setBusy(''); }
  };
  const dismiss = async (pair: DuplicatePair) => {
    setBusy(pair.key);
    try { await crmApi('/duplicates/dismiss', { body: { a: pair.a.id, b: pair.b.id } }); await load(); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Ошибка', 'bad'); } finally { setBusy(''); }
  };

  if (!pairs) return <p className="crm-muted">Ищем дубли…</p>;
  if (!pairs.length) return <div className="crm-card"><Empty title="Дублей не найдено" text="CRM сама сравнивает телефоны, мессенджеры и имена. Если найдёт похожие карточки — предложит их объединить." /></div>;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p className="crm-muted" style={{ margin: 0 }}>CRM нашла возможные дубли. Выберите карточку, которую оставить, — заявки, диалоги и связи второй перейдут в неё. Решение за вами.</p>
      {pairs.map((pair) => (
        <div key={pair.key} className="crm-card crm-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="crm-row" style={{ flexWrap: 'wrap' }}>{pair.reasons.map((r) => <span key={r} className="crm-chip amber">{REASON[r] || r}</span>)}</div>
          <div className="crm-grid2">
            <Card contact={pair.a} keep={(keep[pair.key] || pair.a.id) === pair.a.id} onKeep={() => setKeep((k) => ({ ...k, [pair.key]: pair.a.id }))} />
            <Card contact={pair.b} keep={(keep[pair.key] || pair.a.id) === pair.b.id} onKeep={() => setKeep((k) => ({ ...k, [pair.key]: pair.b.id }))} />
          </div>
          <div className="crm-row">
            <button type="button" className="crm-btn primary" disabled={busy === pair.key} onClick={() => void merge(pair)}><GitMerge size={16} /> Объединить</button>
            <button type="button" className="crm-btn" disabled={busy === pair.key} onClick={() => void dismiss(pair)}><X size={16} /> Это разные люди</button>
          </div>
        </div>
      ))}
    </div>
  );
}
