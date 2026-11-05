/* Задачи CRM: общее хранилище вне React-дерева, чтобы им пользовались и вкладка «Задачи», и глобальные уведомления. */
import { useSyncExternalStore } from 'react';
import { crmApi } from './api';
import type { Task, TaskStatus } from './types';

const TZ = 'Asia/Almaty';
const byTime = (a: Task, b: Task) => `${a.date} ${a.start} ${a.end}`.localeCompare(`${b.date} ${b.start} ${b.end}`);

let tasks: Task[] = [];
let loaded = false;
const subs = new Set<() => void>();
const publish = () => { tasks = [...tasks].sort(byTime); subs.forEach((fn) => fn()); };
const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };

export const useTasks = () => useSyncExternalStore(subscribe, () => tasks);
export const tasksLoaded = () => loaded;
export function applyTask(task: Task) { tasks = [...tasks.filter((t) => t.id !== task.id), task]; publish(); }
export function removeTask(id: string) { tasks = tasks.filter((t) => t.id !== id); publish(); }
export async function loadTasks() { const data = await crmApi<{ tasks: Task[] }>('/tasks'); tasks = data.tasks; loaded = true; publish(); }
export async function createTask(body: Pick<Task, 'text' | 'date' | 'start' | 'end'>) { const task = await crmApi<Task>('/tasks', { body }); applyTask(task); return task; }
export async function patchTask(id: string, body: Partial<Pick<Task, 'text' | 'date' | 'start' | 'end' | 'status'>>) {
  const before = tasks.find((t) => t.id === id);
  if (before && body.status) applyTask({ ...before, status: body.status as TaskStatus }); /* сразу показываем результат, сервер подтвердит */
  try { const task = await crmApi<Task>(`/tasks/${id}`, { method: 'PATCH', body }); applyTask(task); return task; }
  catch (error) { if (before) applyTask(before); throw error; }
}
export async function deleteTask(id: string) { await crmApi(`/tasks/${id}`, { method: 'DELETE' }); removeTask(id); }

/* ───── время (Алматы) ───── */
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export function almatyNow(at = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) };
}
export function addDays(day: string, n: number) { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
/* минут от начала «сегодня» до события: отрицательное — уже прошло */
const minutesFrom = (now: { day: string; min: number }, day: string, min: number) => dayDiff(day, now.day) * 1440 + min - now.min;
export const startsIn = (t: Task, now: { day: string; min: number }) => minutesFrom(now, t.date, toMin(t.start));
export const endsIn = (t: Task, now: { day: string; min: number }) => minutesFrom(now, t.date, toMin(t.end));
export const isOverdue = (t: Task, now: { day: string; min: number }) => t.status === 'open' && endsIn(t, now) <= 0;
export const isActive = (t: Task, now: { day: string; min: number }) => t.status === 'open' && startsIn(t, now) <= 0 && endsIn(t, now) > 0;

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEK = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
export function dayTitle(day: string, today: string) {
  const d = new Date(`${day}T12:00:00Z`);
  const label = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${WEEK[d.getUTCDay()]}`;
  const diff = dayDiff(day, today);
  return diff === 0 ? `Сегодня · ${label}` : diff === 1 ? `Завтра · ${label}` : diff === -1 ? `Вчера · ${label}` : label;
}
export const timeLabel = (hhmm: string) => (hhmm === '24:00' ? '00:00' : hhmm);
