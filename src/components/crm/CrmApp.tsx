import { useEffect, useState } from 'react';
import { BarChart3, Copy, Inbox, ListChecks, Plus, Users, UserPlus } from 'lucide-react';
import './crm.css';
import { CrmProvider, useCrm, type Tab } from './store';
import { LeadsView } from './LeadsView';
import { ContactsView } from './ContactsView';
import { InboxView } from './InboxView';
import { DuplicatesView } from './DuplicatesView';
import { AnalyticsView } from './AnalyticsView';
import { TasksView, useAlmatyNow } from './TasksView';
import { TaskModal } from './TaskModal';
import { isOverdue, loadTasks, useTasks } from './tasksStore';

function Shell() {
  const { ready, error, live, nav, go, unreadTotal, dupCount, reload, toast } = useCrm();
  const [adding, setAdding] = useState(false);
  const tasks = useTasks();
  const now = useAlmatyNow();
  const overdue = tasks.filter((t) => isOverdue(t, now) && t.date >= now.day).length;
  useEffect(() => { void loadTasks().catch(() => {}); }, []);
  useEffect(() => { document.title = unreadTotal > 0 ? `(${unreadTotal}) Study Task` : 'Study Task'; return () => { document.title = 'Study Task'; }; }, [unreadTotal]);
  const tabs: { id: Tab; label: string; icon: typeof Inbox; badge?: number }[] = [
    { id: 'leads', label: 'Заявки', icon: UserPlus },
    { id: 'contacts', label: 'Контакты', icon: Users },
    { id: 'inbox', label: 'Сообщения', icon: Inbox, badge: unreadTotal },
    { id: 'duplicates', label: 'Дубли', icon: Copy, badge: dupCount },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'tasks', label: 'Задачи', icon: ListChecks, badge: overdue },
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
        <div className="crm-row" style={{ gap: 12 }}>
          <span className="crm-muted" style={{ fontSize: 12 }} title={live ? 'Новые заявки и сообщения появляются сами' : 'Нет живого соединения — обновляем раз в минуту'}>{live ? '● онлайн' : '○ обновление раз в минуту'}</span>
          <button type="button" className="crm-btn task" onClick={() => setAdding(true)}><Plus size={16} /> Добавить задачу</button>
        </div>
      </div>
      {error && <div className="crm-card crm-pad" style={{ marginBottom: 12 }}><strong>{error}</strong> <button type="button" className="crm-btn sm" onClick={() => void reload()}>Повторить</button></div>}
      {nav.tab === 'leads' && <LeadsView />}
      {nav.tab === 'contacts' && <ContactsView />}
      {nav.tab === 'inbox' && <InboxView />}
      {nav.tab === 'duplicates' && <DuplicatesView />}
      {nav.tab === 'analytics' && <AnalyticsView />}
      {nav.tab === 'tasks' && <TasksView onAdd={() => setAdding(true)} />}
      {adding && <TaskModal onClose={() => setAdding(false)} onDone={(m) => toast(m)} />}
    </div>
  );
}

export default function CrmApp() {
  return <div className="crm-app"><CrmProvider><Shell /></CrmProvider></div>;
}
