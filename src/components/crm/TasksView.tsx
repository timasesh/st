import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowLeft, Check, CalendarClock, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useCrm } from './store';
import { Empty } from './ui';
import { TaskModal } from './TaskModal';
import { addDays, almatyNow, dayTitle, deleteTask, isActive, isOverdue, loadTasks, patchTask, tasksLoaded, timeLabel, useTasks } from './tasksStore';
import type { Task } from './types';

export function useAlmatyNow() {
  const [now, setNow] = useState(() => almatyNow());
  useEffect(() => { const t = window.setInterval(() => setNow(almatyNow()), 15000); return () => window.clearInterval(t); }, []);
  return now;
}

function TaskCard({ task, now, onMove }: { task: Task; now: ReturnType<typeof almatyNow>; onMove: (t: Task) => void }) {
  const { toast } = useCrm();
  const overdue = isOverdue(task, now);
  const active = isActive(task, now);
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (reason) { toast(reason instanceof Error ? reason.message : 'Не получилось', 'bad'); } };
  const cls = task.status === 'done' ? 'done' : task.status === 'failed' ? 'failed' : overdue ? 'overdue' : active ? 'active' : '';
  return (
    <div className={`crm-task ${cls}`}>
      <div className="crm-task-time"><strong>{timeLabel(task.start)}</strong><span>{timeLabel(task.end)}</span></div>
      <div className="crm-task-body">
        <p className="crm-task-text">{task.text}</p>
        <div className="crm-task-meta">
          {task.status === 'done' && <span className="crm-task-tag ok">Выполнена</span>}
          {task.status === 'failed' && <span className="crm-task-tag bad">Не выполнена</span>}
          {task.status === 'open' && overdue && <span className="crm-task-tag bad">Время вышло — отметьте результат</span>}
          {task.status === 'open' && active && <span className="crm-task-tag blue">Идёт сейчас</span>}
        </div>
      </div>
      <div className="crm-task-actions">
        {task.status === 'open' ? (
          <>
            <button type="button" className="crm-btn sm ok" onClick={() => void act(() => patchTask(task.id, { status: 'done' }))}><Check size={14} /> Выполнено</button>
            <button type="button" className="crm-btn sm danger" onClick={() => void act(() => patchTask(task.id, { status: 'failed' }))}><X size={14} /> Не выполнено</button>
          </>
        ) : (
          <button type="button" className="crm-btn sm" onClick={() => void act(() => patchTask(task.id, { status: 'open' }))}><RotateCcw size={14} /> Вернуть</button>
        )}
        <button type="button" className="crm-btn sm" onClick={() => onMove(task)}><CalendarClock size={14} /> Перенести</button>
        <button type="button" className="crm-btn sm icon" aria-label="Удалить задачу" title="Удалить" onClick={() => { if (window.confirm('Удалить задачу?')) void act(() => deleteTask(task.id)); }}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function groupByDay(list: Task[], desc: boolean) {
  const map = new Map<string, Task[]>();
  list.forEach((t) => map.set(t.date, [...(map.get(t.date) || []), t]));
  return [...map.entries()].sort((a, b) => (desc ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])));
}

export function TasksView({ onAdd }: { onAdd: () => void }) {
  const tasks = useTasks();
  const now = useAlmatyNow();
  const [archive, setArchive] = useState(false);
  const [moving, setMoving] = useState<Task | null>(null);
  const { toast } = useCrm();
  useEffect(() => { void loadTasks().catch(() => {}); }, []);

  const horizon = addDays(now.day, 31);
  const current = useMemo(() => tasks.filter((t) => t.date >= now.day && t.date <= horizon), [tasks, now.day, horizon]);
  const past = useMemo(() => tasks.filter((t) => t.date < now.day), [tasks, now.day]);
  const overdueCount = current.filter((t) => isOverdue(t, now)).length;
  const days = groupByDay(archive ? past : current, archive);

  return (
    <div>
      <div className="crm-row" style={{ justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20 }}>{archive ? 'Архив задач' : 'Задачи'}</h2>
          <p className="crm-muted" style={{ margin: '2px 0 0' }}>
            {archive ? 'Прошедшие задачи хранятся 30 дней, потом удаляются.' : `Сегодня и ближайший месяц.${overdueCount ? ` Требуют отметки: ${overdueCount}.` : ''}`}
          </p>
        </div>
        <div className="crm-row" style={{ gap: 8 }}>
          {archive
            ? <button type="button" className="crm-btn" onClick={() => setArchive(false)}><ArrowLeft size={16} /> К задачам</button>
            : <button type="button" className="crm-btn" onClick={() => setArchive(true)}><Archive size={16} /> Архив задач{past.length ? ` · ${past.length}` : ''}</button>}
          {!archive && <button type="button" className="crm-btn task" onClick={onAdd}><Plus size={16} /> Добавить задачу</button>}
        </div>
      </div>

      {!tasksLoaded() && !tasks.length ? <p className="crm-muted">Загружаем задачи…</p> : !days.length ? (
        <div className="crm-card">
          {archive
            ? <Empty title="Архив пуст" text="Сюда попадают задачи за прошедшие дни." />
            : <Empty title="Задач пока нет" text="Поставьте первую — например, перезвонить клиенту." action={<button type="button" className="crm-btn task" onClick={onAdd}><Plus size={16} /> Добавить задачу</button>} />}
        </div>
      ) : days.map(([day, list]) => (
        <section key={day} className="crm-task-day">
          <h3>{dayTitle(day, now.day)} <span className="crm-muted">· {list.length}</span></h3>
          <div style={{ display: 'grid', gap: 8 }}>{list.map((t) => <TaskCard key={t.id} task={t} now={now} onMove={setMoving} />)}</div>
        </section>
      ))}
      {moving && <TaskModal task={moving} onClose={() => setMoving(null)} onDone={(m) => toast(m)} />}
    </div>
  );
}
