import { dateKey, localDate, makeRecord, timeMinutes } from './model.js';
import { allMedia } from './media.js';
import { commitRestore, readDrafts, readLocalRecords, recordsStorageKey } from './repository.js';

export const MAX_BACKUP_BYTES = 150 * 1024 * 1024;
const validDate = key => typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(localDate(key)) === key;
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
function assert(ok, message) { if (!ok) throw new Error(message); }
export function validateBackup(input) {
  const data = input?.format === 'day-and-night-backup' ? input : { records: input, media: [], drafts: {}, version: 1 };
  assert(data.version === 1, '此备份版本暂不支持，请使用匹配的应用版本。');
  assert(plain(data.records) && Array.isArray(data.media) && plain(data.drafts ?? {}), '文件不是有效的日与夜备份。');
  const records = {};
  for (const [date, value] of Object.entries(data.records)) {
    assert(validDate(date) && plain(value) && value.date === date, '备份中有无效日期。');
    assert(!value.schemaVersion || value.schemaVersion <= 3, '备份来自更新的应用版本，请先更新应用。');
    assert(value.sleepScore === null || [0, 1, 3, 4, 5].includes(value.sleepScore), '睡眠记录格式无效。');
    assert(value.mealScore === null || [0, 1, 2, 3, 4, 5].includes(value.mealScore), '吃饭记录格式无效。');
    assert(value.mood === null || [1, 2, 3, 4, 5].includes(value.mood), '心情记录格式无效。');
    for (const key of ['sleepStart', 'sleepEnd']) assert(value[key] == null || timeMinutes(value[key]) !== null, '睡眠时间格式无效。');
    assert(value.mealCount == null || (Number.isInteger(value.mealCount) && value.mealCount >= 0 && value.mealCount <= 100), '顿数无效。');
    assert(value.mealTiming == null || [0, 1, 2].includes(value.mealTiming), '吃饭时间评分无效。');
    assert(value.mealTimes == null || (Array.isArray(value.mealTimes) && value.mealTimes.every(t => timeMinutes(t) !== null)), '吃饭时间格式无效。');
    assert(value.diaryText == null || typeof value.diaryText === 'string', '文字记录格式无效。');
    assert(value.extensions == null || plain(value.extensions), '扩展记录格式无效。');
    records[date] = makeRecord(date, value);
  }
  const drafts = {};
  for (const [date, value] of Object.entries(data.drafts ?? {})) {
    assert(validDate(date) && typeof value === 'string', '草稿格式无效。'); drafts[date] = value;
  }
  const media = data.media.map(item => {
    assert(plain(item) && validDate(item.date) && ['image', 'video'].includes(item.kind) && typeof item.name === 'string', '媒体记录格式无效。');
    assert(typeof item.type === 'string' && item.type.startsWith(item.kind + '/') && typeof item.base64 === 'string', '媒体文件格式无效。');
    assert(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.base64), '媒体文件已损坏。');
    const bytes = Uint8Array.from(atob(item.base64), c => c.charCodeAt(0));
    assert(bytes.length === item.size, '媒体文件大小不匹配。');
    return { date: item.date, kind: item.kind, name: item.name, type: item.type, size: bytes.length, createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(), blob: new Blob([bytes], { type: item.type }) };
  });
  return { records, media, drafts, dates: [...new Set([...Object.keys(records), ...Object.keys(drafts), ...media.map(item => item.date)])].sort() };
}

export async function createBackup(ownerUid = null) {
  const items = await allMedia();
  assert(items.reduce((sum, item) => sum + item.blob.size * 4 / 3, 0) < MAX_BACKUP_BYTES, '媒体较多，当前原型支持 150 MB 以内的备份。');
  const media = [];
  for (const { blob, ...item } of items) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob);
    });
    media.push({ ...item, base64 });
  }
  const blob = new Blob([JSON.stringify({ format: 'day-and-night-backup', version: 1, exportedAt: new Date().toISOString(), records: readLocalRecords(ownerUid), drafts: readDrafts(), media })], { type: 'application/json' });
  assert(blob.size <= MAX_BACKUP_BYTES, '当前原型支持 150 MB 以内的备份。');
  return blob;
}

export async function inspectConflicts(backup, ownerUid = null) {
  const existing = new Set([...Object.keys(readLocalRecords(ownerUid)), ...Object.keys(readDrafts()), ...(await allMedia()).map(item => item.date)]);
  return backup.dates.filter(date => existing.has(date));
}

export async function restoreBackup(backup, policy = 'keep', ownerUid = null) {
  const conflicts = new Set(await inspectConflicts(backup, ownerUid));
  const selected = backup.dates.filter(date => policy === 'replace' || !conflicts.has(date));
  const records = readLocalRecords(ownerUid), drafts = readDrafts();
  for (const date of selected) {
    delete records[date]; delete drafts[date];
    if (backup.records[date]) records[date] = backup.records[date];
    if (Object.hasOwn(backup.drafts, date)) drafts[date] = backup.drafts[date];
  }
  // Check localStorage capacity before touching media. The durable IDB journal
  // still covers a later write failure or a tab closing during the final step.
  const recordsKey = recordsStorageKey(ownerUid);
  const original = localStorage.getItem(recordsKey);
  localStorage.setItem(recordsKey + ':restore-check', JSON.stringify(records));
  localStorage.removeItem(recordsKey + ':restore-check');
  await commitRestore(records, drafts, backup.media.filter(item => selected.includes(item.date)), selected, recordsKey);
  return { count: selected.length, previous: original !== null };
}
