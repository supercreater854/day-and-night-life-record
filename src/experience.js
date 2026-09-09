export function recordExperience(record) {
  const sleepRecorded = record?.sleepScore != null || (record?.sleepStart != null && record?.sleepEnd != null);
  const mealRecorded = record?.mealScore != null || record?.mealCount != null;
  const starReady = record?.starSize != null && record?.starBrightness != null;
  return {
    sleepRecorded,
    mealRecorded,
    starReady,
    starWaiting: (sleepRecorded || mealRecorded) && !starReady,
  };
}

export function isFirstStar(before, after) {
  return !recordExperience(before).starReady && recordExperience(after).starReady;
}

export function initialStarMapScale(records, today, threshold = 30) {
  const year = today.slice(0, 4);
  const litDays = Object.values(records).filter(record => record?.date?.startsWith(year) && recordExperience(record).starReady).length;
  return litDays < threshold ? 'month' : 'year';
}

export function successfulSaveHaptic(navigatorObject = globalThis.navigator) {
  try { navigatorObject?.vibrate?.(12); } catch { /* Haptics are optional. */ }
}
