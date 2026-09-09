import test from 'node:test';
import assert from 'node:assert/strict';
import { initialStarMapScale, isFirstStar, recordExperience, successfulSaveHaptic } from '../src/experience.js';
import { makeRecord } from '../src/model.js';

const date = '2026-09-09';

test('daily experience derives sleep, meal, waiting, and ready states without stored fields', () => {
  assert.deepEqual(recordExperience(), { sleepRecorded: false, mealRecorded: false, starReady: false, starWaiting: false });
  const sleep = makeRecord(date, {}, { sleepStart: '23:30', sleepEnd: '07:00' });
  assert.deepEqual(recordExperience(sleep), { sleepRecorded: true, mealRecorded: false, starReady: false, starWaiting: true });
  const both = makeRecord(date, sleep, { mealCount: 3, mealTiming: 2 });
  assert.deepEqual(recordExperience(both), { sleepRecorded: true, mealRecorded: true, starReady: false, starWaiting: true });
  const ready = makeRecord(date, both, { mood: 4 });
  assert.deepEqual(recordExperience(ready), { sleepRecorded: true, mealRecorded: true, starReady: true, starWaiting: false });
});

test('only the transition from no complete star to complete star counts as a first star', () => {
  const activity = makeRecord(date, {}, { mealCount: 2, mealTiming: 1 });
  const ready = makeRecord(date, activity, { mood: 3, sleepScore: 3 });
  assert.equal(isFirstStar(activity, ready), true);
  assert.equal(isFirstStar(ready, makeRecord(date, ready, { mood: 5 })), false);
  assert.equal(isFirstStar(undefined, activity), false);
});

test('early accounts open the current month and established accounts open the year', () => {
  const records = {};
  for (let day = 1; day <= 30; day++) {
    const key = `2026-09-${String(day).padStart(2, '0')}`;
    records[key] = makeRecord(key, {}, { mood: 4, mealCount: 2, mealTiming: 1, sleepScore: 3 });
  }
  assert.equal(initialStarMapScale(Object.fromEntries(Object.entries(records).slice(0, 29)), date), 'month');
  assert.equal(initialStarMapScale(records, date), 'year');
  assert.equal(initialStarMapScale({ ...records, '2025-01-01': { ...records[date], date: '2025-01-01' } }, date), 'year');
});

test('save haptic is optional and uses a short pulse', () => {
  let duration = null;
  successfulSaveHaptic({ vibrate: value => { duration = value; } });
  assert.equal(duration, 12);
  assert.doesNotThrow(() => successfulSaveHaptic({}));
});
