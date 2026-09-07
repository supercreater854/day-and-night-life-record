export const STORAGE_KEY = 'life-record:v1';
export const SLEEP = [
  { label: '<5h', score: 0 }, { label: '5–6h', score: 1 },
  { label: '6–7h', score: 3 }, { label: '7–8h', score: 5 }, { label: '8h+', score: 4 },
];
export const MEALS = [{ label: '0', score: 0 }, { label: '1', score: 1 }, { label: '2', score: 2 }, { label: '3+', score: 3 }];
export const TIMING = [{ label: '很乱', score: 0 }, { label: '一般', score: 1 }, { label: '基本按时', score: 2 }];
export const MOODS = ['很差', '较差', '一般', '不错', '很好'];
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => minutesToTime(i * 30));
export const DEFAULT_MEAL_TIMES = [[], ['12:30'], ['08:00', '18:30'], ['08:00', '12:30', '18:30']];
const BRIGHTNESS = [0.15, 0.35, 0.6, 0.82, 1];

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localDate(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function fullDate(key) { const date = localDate(key); return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`; }
export function minutesToTime(minutes) {
  const value = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function timeMinutes(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):(00|30)$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
export function sleepMinutes(start, end) {
  const a = timeMinutes(start), b = timeMinutes(end);
  return a === null || b === null ? null : (b - a + 1440) % 1440;
}
export function sleepScoreFor(minutes) { return minutes < 300 ? 0 : minutes < 360 ? 1 : minutes < 420 ? 3 : minutes < 480 ? 5 : 4; }
export function defaultSleep(index, wakeTime = '07:30') {
  const end = timeMinutes(wakeTime) ?? 450;
  return { sleepStart: minutesToTime(end - [270, 330, 390, 450, 510][index]), sleepEnd: minutesToTime(end) };
}
export function clockHands(now) {
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  return { hour: (now.getHours() % 12 + minutes / 60) * 30, minute: minutes * 6, second: seconds * 6 };
}
export function clockAngle(now) { return clockHands(now).hour; }
export function clockPoint(minutes, radius = 194) {
  const angle = (minutes % 720) / 720 * Math.PI * 2;
  return { x: 240 + Math.sin(angle) * radius, y: 240 - Math.cos(angle) * radius };
}
export function sleepArc(start, end, radius = 194) {
  const duration = sleepMinutes(start, end);
  if (!duration) return '';
  const a = clockPoint(timeMinutes(start), radius), b = clockPoint(timeMinutes(end), radius);
  // A duration of at least twelve hours covers the entire conventional dial.
  // Keep its exact 24-hour start/end times in the record and accessible title.
  if (duration >= 720) return `M${a.x},${a.y} A${radius},${radius} 0 1 1 ${480 - a.x},${480 - a.y} A${radius},${radius} 0 1 1 ${a.x},${a.y}`;
  return `M${a.x},${a.y} A${radius},${radius} 0 ${duration > 360 ? 1 : 0} 1 ${b.x},${b.y}`;
}
export function formatDuration(minutes) {
  if (minutes === null) return '暂无数据';
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
}

export function makeRecord(date, previous = {}, patch = {}) {
  const record = { date, sleepScore: null, mealScore: null, mood: null, starSize: null, starBrightness: null, sleepStart: null, sleepEnd: null, mealCount: null, mealTiming: null, mealTimes: [], diaryText: '', extensions: {}, ...previous, ...patch, schemaVersion: 3, starRuleVersion: 1 };
  const duration = sleepMinutes(record.sleepStart, record.sleepEnd);
  record.mealCountAtLeast = Object.hasOwn(patch, 'mealCount') ? false : previous.mealCountAtLeast ?? (previous.mealCount === 3 && (previous.schemaVersion ?? 1) < 3);
  if (duration !== null) record.sleepScore = sleepScoreFor(duration);
  if (Number.isInteger(record.mealCount) && record.mealCount >= 0 && [0, 1, 2].includes(record.mealTiming)) record.mealScore = Math.min(record.mealCount, 3) + record.mealTiming;
  record.mealTimes = Array.isArray(record.mealTimes) ? record.mealTimes.filter(t => timeMinutes(t) !== null).slice(0, record.mealCount ?? 3) : [];
  record.diaryText = typeof record.diaryText === 'string' ? record.diaryText : '';
  return { ...record, ...generateStar(record) };
}

// Extensions describe the day; only these three core values affect the star.
export function generateStar({ sleepScore, mealScore, mood }) {
  const hasActivity = sleepScore != null || mealScore != null;
  const score = (sleepScore ?? 0) + (mealScore ?? 0);
  return {
    starSize: hasActivity ? score <= 1 ? .45 : score <= 3 ? .65 : score <= 6 ? 1 : score <= 8 ? 1.35 : 1.7 : null,
    starBrightness: mood == null ? null : BRIGHTNESS[mood - 1],
  };
}

export function suggestedSleep(records, date) {
  const recent = Object.keys(records).filter(key => key < date && sleepMinutes(records[key].sleepStart, records[key].sleepEnd) !== null).sort().at(-1);
  return recent ? { sleepStart: records[recent].sleepStart, sleepEnd: records[recent].sleepEnd, source: '沿用上次时间，可直接调整' }
    : { sleepStart: '00:00', sleepEnd: '07:30', source: '预填时间，可按昨晚实际情况调整' };
}

export function hasData(record) {
  return !!record && (record.sleepScore != null || record.mealScore != null || record.mood != null || !!record.diaryText?.trim() || record.hasMedia === true);
}

export function periodFor(scale, anchor) {
  const start = localDate(anchor);
  if (scale === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  else if (scale === 'month') start.setDate(1);
  else { start.setMonth(0, 1); }
  const stop = new Date(start);
  if (scale === 'week') stop.setDate(stop.getDate() + 7);
  else if (scale === 'month') stop.setMonth(stop.getMonth() + 1);
  else stop.setFullYear(stop.getFullYear() + 1);
  const days = [];
  for (const d = new Date(start); d < stop; d.setDate(d.getDate() + 1)) days.push(dateKey(d));
  const label = scale === 'year' ? `${start.getFullYear()}年` : scale === 'month' ? `${start.getFullYear()}年${start.getMonth() + 1}月` : `${days[0].replaceAll('-', '.')} – ${days.at(-1).slice(5).replace('-', '.')}`;
  return { start: days[0], end: days.at(-1), days, label };
}
export function shiftPeriod(scale, anchor, direction) {
  const date = localDate(periodFor(scale, anchor).start);
  if (scale === 'week') date.setDate(date.getDate() + direction * 7);
  else if (scale === 'month') date.setMonth(date.getMonth() + direction);
  else date.setFullYear(date.getFullYear() + direction);
  return dateKey(date);
}
export function statistics(records, days) {
  const data = days.map(date => records[date]).filter(hasData);
  const moods = data.filter(r => r.mood != null);
  const sleeps = data.filter(r => r.sleepScore != null);
  const meals = data.filter(r => r.mealScore != null);
  const durations = sleeps.map(r => sleepMinutes(r.sleepStart, r.sleepEnd)).filter(n => n !== null);
  const counts = meals.map(r => r.mealCount).filter(n => n != null);
  const ratio = (count, total) => total ? count / total * 100 : null;
  const distribution = MOODS.map((_, i) => ratio(moods.filter(r => r.mood === i + 1).length, moods.length));
  return {
    recorded: data.length, total: days.length, moodDays: moods.length, sleepDays: sleeps.length, mealDays: meals.length,
    distribution, happy: ratio(moods.filter(r => r.mood >= 4).length, moods.length), neutral: ratio(moods.filter(r => r.mood === 3).length, moods.length), unhappy: ratio(moods.filter(r => r.mood <= 2).length, moods.length),
    sleepGood: ratio(sleeps.filter(r => r.sleepScore >= 4).length, sleeps.length),
    mealGood: ratio(meals.filter(r => r.mealScore >= 4).length, meals.length),
    durationDays: durations.length, countDays: counts.length,
    averageSleep: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
    averageMeals: counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : null,
  };
}

// Validate individual days so one damaged entry cannot discard the other days.
export function readRecords(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return {};
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid saved data');
  return Object.fromEntries(Object.entries(data).filter(([date, r]) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && r && r.date === date
      && (r.sleepScore === null || [0, 1, 3, 4, 5].includes(r.sleepScore))
      && (r.mealScore === null || [0, 1, 2, 3, 4, 5].includes(r.mealScore))
      && (r.mood === null || [1, 2, 3, 4, 5].includes(r.mood));
  }).map(([date, r]) => [date, makeRecord(date, r)]));
}

export function starPoints(cx, cy, radius, innerRatio = 0.46, points = 5) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / points;
    const r = i % 2 ? radius * innerRatio : radius;
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(' ');
}

// A single fixed annual composition. Months follow adjoining regions along a
// winding route. The same date always has the same position, including Feb 29.
const REGIONS = [
  [142, 125], [335, 100], [495, 180], [450, 345],
  [255, 285], [120, 400], [205, 545], [400, 490],
  [495, 645], [350, 740], [145, 695], [185, 850],
];
export function annualPositions(year) {
  const points = [];
  let seed = 8317;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let month = 0; month < 12; month++) {
    const [cx, cy] = REGIONS[month];
    // Reserve 29 February even in common years to keep all later positions fixed.
    const slots = new Date(2024, month + 1, 0).getDate();
    const days = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= slots; day++) {
      let x, y;
      for (let attempt = 0; attempt < 600; attempt++) {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random());
        x = cx + Math.cos(angle) * radius * 111;
        y = cy + Math.sin(angle) * radius * 97;
        if (points.every(p => Math.hypot(p.x - x, p.y - y) > 20)) break;
      }
      points.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, x, y, valid: day <= days });
    }
  }
  return points.filter(p => p.valid);
}
