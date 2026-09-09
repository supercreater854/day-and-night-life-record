import test from 'node:test';
import assert from 'node:assert/strict';
import { annualPositions, dateKey, makeRecord, readRecords, SLEEP, STORAGE_KEY } from '../src/model.js';

test('all total-score boundaries produce the specified star sizes', () => {
  const expected = [.45, .45, .65, .65, 1, 1, 1, 1.35, 1.35, 1.7, 1.7];
  for (let score = 0; score <= 10; score++) {
    const r = makeRecord('2026-09-04', {}, { sleepScore: Math.min(score, 5), mealScore: Math.max(0, score - 5), mood: 3 });
    assert.equal(r.starSize, expected[score]);
    assert.equal(r.starBrightness, .6);
  }
});
test('brightness depends only on mood', () => {
  for (let mood = 1; mood <= 5; mood++) {
    for (const sleepScore of [0, 5]) {
      const r = makeRecord('2026-09-04', {}, { sleepScore, mealScore: 5, mood });
      assert.equal(r.starBrightness, [.15, .35, .6, .82, 1][mood - 1]);
    }
  }
});
test('unrecorded, partial, and explicitly zero-score days stay distinct', () => {
  const empty = makeRecord('2026-09-04');
  assert.equal(empty.starSize, null);
  assert.equal(empty.starBrightness, null);
  const zero = makeRecord(empty.date, empty, { sleepScore: 0 });
  assert.equal(zero.starSize, .45);
  assert.equal(zero.mealScore, null);
  assert.equal(zero.starBrightness, null);
  const complete = makeRecord(empty.date, zero, { mood: 1, mealScore: 0 });
  assert.equal(complete.starSize, .45);
  assert.equal(complete.starBrightness, .15);
});
test('sleep labels and scores match the specification', () => {
  assert.deepEqual(SLEEP.map(o => o.score), [0, 1, 3, 5, 4]);
});
test('annual map has unique, deterministic positions and handles leap years', () => {
  const ordinary = annualPositions(2026);
  const leap = annualPositions(2028);
  assert.equal(ordinary.length, 365);
  assert.equal(leap.length, 366);
  assert.equal(new Set(ordinary.map(p => p.date)).size, 365);
  assert.equal(new Set(ordinary.map(p => `${p.x},${p.y}`)).size, 365);
  assert.deepEqual(ordinary, annualPositions(2026));
  assert.ok(leap.some(p => p.date === '2028-02-29'));
  assert.ok(!ordinary.some(p => p.date === '2026-02-29'));
  for (const p of ordinary) {
    assert.ok(p.x > 0 && p.x < 640 && p.y > 0 && p.y < 960);
    const same = leap.find(q => q.date.slice(4) === p.date.slice(4));
    assert.equal(same.x, p.x);
    assert.equal(same.y, p.y);
  }
});
test('storage reload preserves records and recalculates derived fields', () => {
  const record = makeRecord('2026-09-04', {}, { sleepScore: 5, mealScore: 5, mood: 5 });
  const storage = { getItem: key => key === STORAGE_KEY ? JSON.stringify({ [record.date]: record }) : null };
  assert.deepEqual(readRecords(storage)[record.date], record);
  assert.equal(dateKey(new Date(2026, 8, 4, 23, 59)), '2026-09-04');
});
