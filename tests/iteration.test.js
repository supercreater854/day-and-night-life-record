import test from 'node:test';
import assert from 'node:assert/strict';
import { clockAngle, clockPoint, defaultSleep, formatDuration, makeRecord, periodFor, readRecords, shiftPeriod, sleepArc, sleepMinutes, sleepScoreFor, statistics, TIME_OPTIONS, timeMinutes } from '../src/model.js';

test('clock maps local 00/06/12/18 hours exactly and advances each minute', () => {
  for (const [hour, angle] of [[0, 0], [3, 90], [6, 180], [9, 270], [12, 0], [18, 180]]) assert.equal(clockAngle(new Date(2026, 8, 4, hour)), angle);
  assert.equal(clockAngle(new Date(2026, 8, 4, 6, 1)), 180.5);
  assert.deepEqual(clockPoint(180, 100), { x: 340, y: 240 });
});
test('time selectors enforce half-hour intervals and shortcuts preserve wake time', () => {
  assert.equal(TIME_OPTIONS.length, 48);
  assert.equal(timeMinutes('23:30'), 1410);
  for (const invalid of ['24:00', '08:15', '08:60', '', null]) assert.equal(timeMinutes(invalid), null);
  assert.deepEqual(defaultSleep(3), { sleepStart: '00:00', sleepEnd: '07:30' });
  assert.deepEqual(defaultSleep(0, '07:00'), { sleepStart: '02:30', sleepEnd: '07:00' });
  assert.deepEqual(defaultSleep(4, '07:30'), { sleepStart: '23:00', sleepEnd: '07:30' });
});
test('cross-midnight sleep, zero hours, and arc sweep are correct', () => {
  assert.equal(sleepMinutes('23:30', '07:00'), 450);
  assert.equal(sleepMinutes('00:00', '00:00'), 0);
  assert.equal(sleepMinutes(null, null), null);
  assert.match(sleepArc('23:30', '07:00'), / 0 1 1 /);
  assert.match(sleepArc('18:00', '07:00'), / 0 1 1 /);
  assert.equal(sleepArc('00:00', '00:00'), '');
  assert.equal(formatDuration(432), '7h 12m');
});
test('final sleep interval and meal choices recalculate the unchanged star rules', () => {
  for (const [minutes, score] of [[270, 0], [300, 1], [360, 3], [420, 5], [480, 4]]) assert.equal(sleepScoreFor(minutes), score);
  const max = makeRecord('2026-09-04', {}, { sleepStart: '23:30', sleepEnd: '07:00', mealCount: 3, mealTiming: 2, mealTimes: ['08:00', '12:30', '18:30'], mood: 5 });
  assert.equal(max.sleepScore, 5); assert.equal(max.mealScore, 5); assert.equal(max.starSize, 1.7);
  const edited = makeRecord(max.date, max, { sleepEnd: '03:30', mealCount: 0, mealTiming: 0, mood: 1 });
  assert.equal(edited.starSize, .45); assert.equal(edited.starBrightness, .15); assert.deepEqual(edited.mealTimes, []);
});
test('week starts Monday; month/year navigation and leap-day totals are correct', () => {
  assert.equal(periodFor('week', '2026-09-04').start, '2026-08-31');
  assert.equal(periodFor('week', '2026-09-06').end, '2026-09-06');
  assert.equal(periodFor('week', '2027-01-01').start, '2026-12-28');
  assert.equal(periodFor('month', '2028-02-15').days.length, 29);
  assert.equal(periodFor('year', '2028-02-15').days.length, 366);
  assert.equal(shiftPeriod('month', '2026-01-31', 1), '2026-02-01');
  assert.equal(shiftPeriod('year', '2026-01-01', -1), '2025-01-01');
});
test('statistics use metric-specific recorded days, preserve zero, and exclude missing data', () => {
  const days = periodFor('week', '2026-09-04').days;
  const records = {
    '2026-09-01': makeRecord('2026-09-01', {}, { mood: 5, sleepStart: '23:30', sleepEnd: '07:00', mealCount: 3, mealTiming: 2 }),
    '2026-09-02': makeRecord('2026-09-02', {}, { mood: 4, sleepStart: '22:30', sleepEnd: '07:00', mealCount: 2, mealTiming: 2 }),
    '2026-09-03': makeRecord('2026-09-03', {}, { mood: 3, sleepStart: '01:00', sleepEnd: '07:00', mealCount: 1, mealTiming: 0 }),
    '2026-09-04': makeRecord('2026-09-04', {}, { mood: 1, sleepStart: '03:00', sleepEnd: '07:00', mealCount: 0, mealTiming: 0 }),
    '2026-09-05': makeRecord('2026-09-05'),
  };
  const stats = statistics(records, days);
  assert.equal(stats.recorded, 4); assert.equal(stats.total, 7);
  assert.deepEqual([stats.happy, stats.neutral, stats.unhappy], [50, 25, 25]);
  assert.deepEqual(stats.distribution, [25, 0, 25, 25, 25]);
  assert.equal(stats.sleepGood, 50); assert.equal(stats.mealGood, 50);
  assert.equal(stats.averageSleep, 390); assert.equal(stats.averageMeals, 1.5);
  const legacy = { ...records, '2026-08-31': makeRecord('2026-08-31', {}, { sleepScore: 4, diaryText: '旧记录' }) };
  const mixed = statistics(legacy, days);
  assert.equal(mixed.sleepGood, 60); assert.equal(mixed.averageSleep, 390); assert.equal(mixed.happy, 50);
  assert.equal(statistics({}, days).averageSleep, null); assert.equal(statistics({}, days).happy, null);
  assert.equal(statistics({ '2026-09-01': { hasMedia: true } }, days).recorded, 1);
});
test('legacy JSON is read without fabricating sleep or meal times and retains diary text', () => {
  const old = { date: '2026-09-04', sleepScore: 5, mealScore: 3, mood: 4, starSize: 1.35, starBrightness: .82 };
  const result = readRecords({ getItem: () => JSON.stringify({ [old.date]: old }) })[old.date];
  assert.equal(result.sleepScore, 5); assert.equal(result.sleepStart, null); assert.equal(result.sleepEnd, null);
  assert.deepEqual(result.mealTimes, []); assert.equal(result.schemaVersion, 3);
  const diary = makeRecord(old.date, result, { diaryText: '一行\n两行' });
  assert.equal(diary.diaryText, '一行\n两行'); assert.equal(diary.starSize, 1.35);
});
