import test from 'node:test';
import assert from 'node:assert/strict';
import { machineResult } from '../src/statisticsModel.js';

test('mechanical reveal always returns stored scores and never invents missing values', () => {
  const complete = machineResult({ mealScore: 5, sleepScore: 3, mood: 4 });
  assert.deepEqual({ meal: complete.meal, sleep: complete.sleep, mood: complete.mood, dayScore: complete.dayScore }, { meal: 5, sleep: 3, mood: 4, dayScore: 78 });
  assert.deepEqual(complete.missing, []);
  const partial = machineResult({ mealScore: 0, mood: 1 });
  assert.equal(partial.meal, 0); assert.equal(partial.sleep, null); assert.equal(partial.dayScore, null);
  assert.deepEqual(partial.missing, ['睡眠']);
});
