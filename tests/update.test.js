import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRecord, suggestedSleep, statistics } from '../src/model.js';
import { validateBackup } from '../src/backup.js';

const date = '2026-09-04';
test('extra meals store actual counts but never inflate stars beyond existing rules', () => {
  const r = makeRecord(date, {}, { mealCount: 5, mealTiming: 2, mealTimes: ['07:00', '10:30', '12:30', '18:00', '21:00'], sleepScore: 5, mood: 5, extensions: { reading: { completed: true } } });
  assert.equal(r.mealScore, 5); assert.equal(r.starSize, 1.65); assert.equal(r.mealTimes.length, 5);
  assert.equal(statistics({ [date]: r }, [date]).averageMeals, 5);
  assert.deepEqual(makeRecord(date, r, { diaryText: 'hello' }).extensions, r.extensions);
});
test('default sleep uses most recent earlier sleep and never a future entry', () => {
  assert.equal(suggestedSleep({}, date).sleepEnd, '07:30');
  assert.equal(suggestedSleep({ '2026-09-01': { sleepStart: '23:00', sleepEnd: '06:30' }, '2026-09-06': { sleepStart: '04:00', sleepEnd: '12:00' } }, date).sleepEnd, '06:30');
});
test('legacy 3+ keeps its meaning until the user confirms an actual count', () => {
  const legacy = makeRecord(date, { mealCount: 3, mealTiming: 2, schemaVersion: 2 });
  assert.equal(legacy.mealCountAtLeast, true);
  assert.equal(makeRecord(date, legacy, { mood: 4 }).mealCountAtLeast, true);
  assert.equal(makeRecord(date, legacy, { mealCount: 3 }).mealCountAtLeast, false);
});
test('backup validates all content before import and rejects damaged dates, future schema, and media', () => {
  const record = makeRecord(date, {}, { mood: 2, sleepScore: 1 });
  assert.equal(validateBackup({ [date]: record }).records[date].starBrightness, null);
  assert.throws(() => validateBackup({ '2026-02-31': { ...record, date: '2026-02-31' } }));
  assert.throws(() => validateBackup({ [date]: { ...record, schemaVersion: 100 } }));
  assert.throws(() => validateBackup({ [date]: { ...record, sleepStart: 'oops' } }));
  const complete = { format: 'day-and-night-backup', version: 1, records: { [date]: record }, drafts: { [date]: '草稿' }, media: [{ date, kind: 'image', name: 'test.png', type: 'image/png', size: 3, base64: 'AQID' }] };
  assert.equal(validateBackup(complete).media[0].blob.size, 3);
  assert.equal(validateBackup(complete).drafts[date], '草稿');
  complete.media[0].size = 4;
  assert.throws(() => validateBackup(complete));
  assert.equal(makeRecord(date, {}, { extensions: { reading: { completed: true } } }).starSize, null);
});
