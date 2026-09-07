import { makeRecord, readRecords, STORAGE_KEY } from './model.js';

export const CLOUD_RECORDS_COLLECTION = 'daily_records';
export const CLOUD_RECORD_SCHEMA_VERSION = 1;
const PAGE_SIZE = 100;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RECORD_FIELDS = [
  'sleepScore', 'sleepStart', 'sleepEnd',
  'mealScore', 'mealCount', 'mealCountAtLeast', 'mealTiming', 'mealTimes',
  'mood', 'diaryText', 'extensions',
  'starSize', 'starBrightness', 'schemaVersion', 'starRuleVersion',
];

export function cloudRecordKey(uid, date) {
  if (typeof uid !== 'string' || !uid || !DATE_PATTERN.test(date)) throw new Error('Missing CloudBase user or record date');
  return `${uid}:${date}`;
}

export function cloudRecordPayload(record) {
  if (!record || !DATE_PATTERN.test(record.date)) throw new Error('Invalid daily record');
  const canonical = makeRecord(record.date, record);
  const payload = { date: canonical.date, cloudSchemaVersion: CLOUD_RECORD_SCHEMA_VERSION };
  for (const field of RECORD_FIELDS) payload[field] = canonical[field];
  return payload;
}

export function cloudDocumentsToRecords(documents, uid) {
  const raw = {};
  for (const document of documents) {
    const record = document?.record_data;
    if (!document || document.owner_id !== uid || !DATE_PATTERN.test(document.record_date) || !record) continue;
    if (record.date !== document.record_date) continue;
    raw[document.record_date] = record;
  }
  return readRecords({ getItem: key => key === STORAGE_KEY ? JSON.stringify(raw) : null });
}

function assertCloudResult(result) {
  if (result?.error) throw result.error;
  return result;
}

export async function loadCloudRecords(db, uid) {
  if (!uid) return {};
  const documents = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = assertCloudResult(await db.from(CLOUD_RECORDS_COLLECTION)
      .select('owner_id,record_date,record_data').eq('owner_id', uid).range(offset, offset + PAGE_SIZE - 1));
    const page = Array.isArray(result?.data) ? result.data : [];
    documents.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return cloudDocumentsToRecords(documents, uid);
}

export async function syncCloudRecord(db, uid, record) {
  cloudRecordKey(uid, record.date);
  const result = assertCloudResult(await db.from(CLOUD_RECORDS_COLLECTION).upsert({
    record_date: record.date,
    record_data: cloudRecordPayload(record),
  }, { onConflict: 'owner_id,record_date' }));
  return result;
}
