import { useEffect } from 'react';
import { BarChart3, Copy, Inbox, Users, UserPlus } from 'lucide-react';
import './crm.css';
import { CrmProvider, useCrm, type Tab } from './store';
import { LeadsView } from './LeadsView';
import { ContactsView } from './ContactsView';
import { InboxView } from './InboxView';
import { DuplicatesView } from './DuplicatesView';
import { AnalyticsView } from './AnalyticsView';

function Shell() {
  const { ready, error, live, nav, go, unreadTotal, dupCount, reload } = useCrm();
  useEffect(() => { document.title = unreadTotal > 0 ? `(${unreadTotal}) Study Task` : 'Study Task'; return () => { document.title = 'Study Task'; }; }, [unreadTotal]);
  const tabs: { id: Tab; label: string; icon: typeof Inbox; badge?: number }[] = [
    { id: 'leads', label: 'Заявки', icon: UserPlus },
    { id: 'contacts', label: 'Контакты', icon: Users },
    { id: 'inbox', label: 'Сообщения', icon: Inbox, badge: unreadTotal },
    { id: 'duplicates', label: 'Дубли', icon: Copy, badge: dupCount },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  ];
  if (!ready) return <p className="crm-muted">Загружаем CRM…</p>;
  return (
    <div>
      <div className="crm-toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="crm-tabs" role="tablist" aria-label="Разделы CRM">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} type="button" role="tab" className="crm-tab" aria-selected={nav.tab === id} onClick={() => go({ tab: id })}>
              <Icon size={16} /> {label}{!!badge && <span className="crm-badge">{badge}</span>}
            </button>
          ))}
        </div>
        <span className="crm-muted" style={{ fontSize: 12 }} title={live ? 'Новые заявки и сообщения появляются сами' : 'Нет живого соединения — обновляем раз в минуту'}>{live ? '● онлайн' : '○ обновление раз в минуту'}</span>
      </div>
      {error && <div className="crm-card crm-pad" style={{ marginBottom: 12 }}><strong>{error}</strong> <button type="button" className="crm-btn sm" onClick={() => void reload()}>Повторить</button></div>}
      {nav.tab === 'leads' && <LeadsView />}
      {nav.tab === 'contacts' && <ContactsView />}
      {nav.tab === 'inbox' && <InboxView />}
      {nav.tab === 'duplicates' && <DuplicatesView />}
      {nav.tab === 'analytics' && <AnalyticsView />}
    </div>
  );
}

export default function CrmApp() {
  return <div className="crm-app"><CrmProvider><Shell /></CrmProvider></div>;
}
