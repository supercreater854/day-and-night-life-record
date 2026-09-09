import { calculateDayScore } from './model.js';

export function machineResult(record = {}) {
  const score = calculateDayScore(record);
  const values = { meal: record.mealScore ?? null, sleep: record.sleepScore ?? null, mood: record.mood ?? null };
  const missing = Object.entries({ sleep: '睡眠', meal: '吃饭', mood: '心情' }).filter(([key]) => values[key] == null).map(([, label]) => label);
  return { ...values, dayScore: score.dayScore, completeness: score.completeness, missing };
}
