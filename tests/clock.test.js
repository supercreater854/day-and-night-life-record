import test from 'node:test';
import assert from 'node:assert/strict';
import { clockHands, clockPoint, sleepArc } from '../src/model.js';

test('all three hands follow conventional local time, including partial hours and minutes', () => {
  assert.deepEqual(clockHands(new Date(2026, 8, 4, 15, 30, 30)), { hour: 105.25, minute: 183, second: 180 });
  assert.deepEqual(clockHands(new Date(2026, 8, 4, 12, 0, 0)), { hour: 0, minute: 0, second: 0 });
  assert.deepEqual(clockHands(new Date(2026, 8, 5, 0, 0, 0)), { hour: 0, minute: 0, second: 0 });
  const end = clockHands(new Date(2026, 8, 4, 23, 59, 59));
  assert.ok(Math.abs(end.hour - 359.9916666667) < .00001);
  assert.equal(end.minute, 359.9); assert.equal(end.second, 354);
});
test('record overlays use the same 12-hour geometry; full turns remain visible', () => {
  assert.deepEqual(clockPoint(8 * 60), clockPoint(20 * 60));
  assert.deepEqual(clockPoint(12 * 60), { x: 240, y: 46 });
  assert.match(sleepArc('23:30', '07:00'), / 0 1 1 /);
  assert.match(sleepArc('01:00', '04:00'), / 0 0 1 /);
  assert.equal((sleepArc('19:00', '07:00').match(/ A/g) || []).length, 2);
  assert.equal((sleepArc('18:00', '07:00').match(/ A/g) || []).length, 2);
  assert.equal(sleepArc('07:00', '07:00'), '');
});
