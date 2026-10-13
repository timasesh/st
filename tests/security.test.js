import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStudentProgress } from '../server/student-progress.js';
import { validateHomeworkUpload } from '../server/homework-files.js';

test('browser progress updates preserve the authoritative star balance', () => {
  const progress = mergeStudentProgress({ stars: 12, trialAccount: true }, {
    stars: 10_000_000,
    xp: 35,
    level: 2,
    claimedPrizes: ['notebook', 'notebook'],
    unlockedAchievements: [],
  });
  assert.equal(progress.stars, 12);
  assert.equal(progress.trialAccount, true);
  assert.deepEqual(progress.claimedPrizes, ['notebook']);
});

test('new student progress starts with no stars', () => {
  assert.equal(mergeStudentProgress(null, { xp: 0, level: 1, claimedPrizes: [], unlockedAchievements: [] }).stars, 0);
});

test('homework upload validates content signatures and strips path components', () => {
  const pdf = Buffer.from('%PDF-1.7\nexample').toString('base64');
  const file = validateHomeworkUpload({ filename: '../solution.pdf', mimeType: 'application/pdf', data: pdf });
  assert.equal(file.filename, 'solution.pdf');
  assert.equal(file.buffer.subarray(0, 5).toString(), '%PDF-');
  assert.throws(() => validateHomeworkUpload({ filename: 'not-a-pdf.pdf', mimeType: 'application/pdf', data: Buffer.from('not pdf').toString('base64') }), /содержимым/);
  assert.throws(() => validateHomeworkUpload({ filename: 'misleading.jpg', mimeType: 'application/pdf', data: pdf }), /формат/);
});

test('homework upload enforces the five megabyte limit', () => {
  const tooLarge = Buffer.alloc(5 * 1024 * 1024 + 1);
  tooLarge.write('%PDF-');
  assert.throws(() => validateHomeworkUpload({ filename: 'large.pdf', mimeType: 'application/pdf', data: tooLarge.toString('base64') }), /5 МБ/);
});
