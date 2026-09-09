import test from 'node:test';
import assert from 'node:assert/strict';
import { annualPositions, calculateDayScore, dateKey, deriveMealTiming, deriveStarAppearance, makeRecord, readRecords, SLEEP, STORAGE_KEY } from '../src/model.js';

test('weighted day score and all visual tier boundaries are exact', () => {
  assert.equal(calculateDayScore({ sleepScore: 5, mealScore: 5, mood: 5 }).dayScore, 100);
  assert.equal(calculateDayScore({ sleepScore: 3, mealScore: 3, mood: 3 }).dayScore, 56);
  assert.equal(calculateDayScore({ sleepScore: 0, mealScore: 0, mood: 1 }).dayScore, 0);
  for (const [score, size, brightness] of [[0,.55,.28],[19,.55,.28],[20,.75,.42],[39,.75,.42],[40,1,.62],[59,1,.62],[60,1.3,.82],[79,1.3,.82],[80,1.65,1],[100,1.65,1]]) {
    const appearance = deriveStarAppearance(score, 3);
    assert.equal(appearance.size, size); assert.equal(appearance.brightness, brightness);
  }
});
test('meal rhythm derives windows and three-to-seven-hour gaps', () => {
  assert.equal(deriveMealTiming(0, []), 0);
  assert.equal(deriveMealTiming(1, ['12:15']), 2);
  assert.equal(deriveMealTiming(3, ['08:00', '12:30', '18:30']), 2);
  assert.equal(deriveMealTiming(3, ['01:00', '02:00', '03:00']), 0);
  assert.equal(deriveMealTiming(4, ['08:00', '12:00', '18:00', '21:00']), 2);
  assert.equal(deriveMealTiming(2, ['08:00']), null);
});
test('unrecorded, partial, and explicitly zero-score days stay distinct', () => {
  const empty = makeRecord('2026-09-04');
  assert.equal(empty.starSize, null);
  assert.equal(empty.starBrightness, null);
  const zero = makeRecord(empty.date, empty, { sleepScore: 0 });
  assert.equal(zero.starSize, null);
  assert.equal(zero.mealScore, null);
  assert.equal(zero.starBrightness, null);
  const complete = makeRecord(empty.date, zero, { mood: 1, mealScore: 0 });
  assert.equal(complete.starSize, .55);
  assert.equal(complete.starBrightness, .28);
  assert.equal(calculateDayScore(zero).completeness, 1);
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
  assert.equal(record.starRuleVersion, 2);
  const storage = { getItem: key => key === STORAGE_KEY ? JSON.stringify({ [record.date]: record }) : null };
  assert.deepEqual(readRecords(storage)[record.date], record);
  assert.equal(dateKey(new Date(2026, 8, 4, 23, 59)), '2026-09-04');
});
