import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { isActiveTrial, activeTrialsInSlot } from '../src/shared/trials.js';

test('только назначенный пробный урок занимает слот', () => {
  for (const status of ['scheduled', 'trial', undefined, null]) assert.equal(isActiveTrial({ status }), true, String(status));
  for (const status of ['declined', 'no_show', 'attended', 'enrolled']) assert.equal(isActiveTrial({ status }), false, status);
  assert.equal(isActiveTrial(null), false);
});

test('слот преподавателя: отказавшийся и завершённые пробные не показываются', () => {
  const trials = [
    { id: 'a', teacherId: 't1', day: 2, hour: 15, status: 'declined' },
    { id: 'b', teacherId: 't1', day: 2, hour: 15, status: 'no_show' },
    { id: 'c', teacherId: 't1', day: 2, hour: 15, status: 'enrolled' },
    { id: 'd', teacherId: 't1', day: 2, hour: 15, status: 'attended' },
    { id: 'e', teacherId: 't1', day: 2, hour: 15, status: 'scheduled' },
    { id: 'f', teacherId: 't2', day: 2, hour: 15, status: 'scheduled' },
    { id: 'g', teacherId: 't1', day: 3, hour: 15, status: 'scheduled' },
  ];
  assert.deepEqual(activeTrialsInSlot(trials, 't1', 2, 15).map((l) => l.id), ['e']);
  assert.deepEqual(activeTrialsInSlot(trials, 't1', 4, 9), []);
  assert.deepEqual(activeTrialsInSlot(undefined, 't1', 2, 15), []);
});

test('защита от регрессии: расписание преподавателя и сервер берут слоты только через общий хелпер', async () => {
  const ui = await fs.readFile(new URL('../src/components/AuthPages.tsx', import.meta.url), 'utf8');
  const server = await fs.readFile(new URL('../server.js', import.meta.url), 'utf8');
  assert.match(ui, /trialSlotLessons = activeTrialsInSlot(?:<TrialLesson>)?\(/, 'расписание преподавателя должно фильтровать пробные через activeTrialsInSlot');
  assert.doesNotMatch(ui, /const isActiveTrial = /, 'не определяйте isActiveTrial заново в компоненте');
  assert.match(server, /from '\.\/src\/shared\/trials\.js'/);
  assert.doesNotMatch(server, /\(trial\.status === 'scheduled' \|\| trial\.status === 'trial' \|\| !trial\.status\) && trial\.teacherId/, 'проверка занятости слота должна идти через activeTrialsInSlot');
});
