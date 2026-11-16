import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramNotifier } from '../server/telegram-notify.js';

const accounts = [
  { id: 't1', role: 'teacher', firstName: 'Айгуль', lastName: 'Н', status: 'active' },
  { id: 's1', role: 'student', firstName: 'Али', lastName: 'Б', status: 'active' },
];
function make(sendLog, nowTrials = []) {
  return createTelegramNotifier({
    getSupabase: () => null, dataDir: '/tmp/notify-test-' + Math.random(), getAccounts: () => accounts, refreshAccounts: async () => {},
    sendToAccount: async () => true,
    readSchedule: async () => ({ lessons: [{ id: 'l1', day: 0, hour: 15, title: 'Алгебра', studentId: 's1', teacherId: 't1' }] }),
    readTrialLessons: async () => nowTrials,
    getTrialScheduledAt: (t) => t.scheduledAt,
    nextSlotStart: () => new Date(Date.now() + 30 * 60000).toISOString(),
    getAdminTeacherId: () => 't1',
    sendToAdmins: async (text) => { sendLog.push(text); return 1; },
  });
}

test('назначение пробного урока: уведомление + новое расписание', async () => {
  const log = [];
  const scheduledAt = '2026-11-16T10:00:00.000Z'; // понедельник, 15:00 Алматы
  const trial = { id: 'x', firstName: 'Нурлан', lastName: '', studentClass: '6 класс', teacherId: 't1', day: 0, hour: 15, scheduledAt, status: 'scheduled' };
  const n = make(log, [trial]);
  assert.equal(await n.notifyTeacherTrial(trial), true);
  assert.equal(log.length, 2);
  assert.match(log[0], /Назначен пробный урок/);
  assert.match(log[1], /Новое расписание/);
  assert.match(log[1], /Али Б/);
  assert.match(log[1], /пробный урок/);
});
test('чужой преподаватель — без уведомления', async () => {
  const log = [];
  const n = make(log);
  assert.equal(await n.notifyTeacherTrial({ teacherId: 'other', scheduledAt: '2026-11-16T10:00:00.000Z' }), false);
  assert.equal(log.length, 0);
});
