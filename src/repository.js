import { makeRecord, readRecords, STORAGE_KEY } from './model.js';
import { openDB } from './media.js';

export const DRAFT_KEY = 'life-record:drafts:v1';
export const ONBOARDING_KEY = 'life-record:intro:v1';
export const GUEST_RECORDS_KEY = `${STORAGE_KEY}:guest`;
export const ACCOUNT_RECORDS_KEY_PREFIX = `${STORAGE_KEY}:account:`;
export const LEGACY_RECORDS_IMPORT_KEY = 'life-record:legacy-records-import:v1';

export function recordsStorageKey(uid) {
  return typeof uid === 'string' && uid
    ? `${ACCOUNT_RECORDS_KEY_PREFIX}${encodeURIComponent(uid)}`
    : GUEST_RECORDS_KEY;
}

export function readLocalRecords(uid, storage = localStorage) {
  return readRecords(storage, recordsStorageKey(uid));
}

export function visibleRecords(uid, localOwnerKey, localRecords, cloudOwnerUid, cloudRecords) {
  return {
    ...(localOwnerKey === recordsStorageKey(uid) ? localRecords : {}),
    ...(uid && cloudOwnerUid === uid ? cloudRecords : {}),
  };
}

export function saveRecord(date, patch, baseRecord, uid = null, storage = localStorage) {
  const key = recordsStorageKey(uid);
  const records = readRecords(storage, key);
  const next = { ...records, [date]: makeRecord(date, baseRecord ?? records[date], patch) };
  storage.setItem(key, JSON.stringify(next));
  return next;
}

export function legacyRecordsCandidate(storage = localStorage) {
  if (storage.getItem(LEGACY_RECORDS_IMPORT_KEY)) return null;
  const dates = Object.keys(readRecords(storage, STORAGE_KEY)).sort();
  return dates.length ? { count: dates.length, first: dates[0], last: dates.at(-1) } : null;
}

export function importLegacyRecords(uid, existingRecords = {}, storage = localStorage, importedAt = new Date().toISOString()) {
  if (typeof uid !== 'string' || !uid) throw new Error('登录状态无效，无法导入旧记录。');
  const current = readLocalRecords(uid, storage);
  if (storage.getItem(LEGACY_RECORDS_IMPORT_KEY)) return { records: current, imported: {} };
  const legacy = readRecords(storage, STORAGE_KEY);
  const imported = {};
  const next = { ...current };
  for (const [date, record] of Object.entries(legacy)) {
    if (Object.hasOwn(existingRecords, date) || Object.hasOwn(current, date)) continue;
    next[date] = record;
    imported[date] = record;
  }
  storage.setItem(recordsStorageKey(uid), JSON.stringify(next));
  storage.setItem(LEGACY_RECORDS_IMPORT_KEY, JSON.stringify({
    version: 1,
    ownerUid: uid,
    importedAt,
    importedDates: Object.keys(imported).sort(),
  }));
  return { records: next, imported };
}
export function readDrafts() { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); }
export function readDraft(date) { return readDrafts()[date] ?? null; }
export function writeDraft(date, value) {
  const drafts = readDrafts();
  if (value === null) delete drafts[date]; else drafts[date] = value;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

// Restore writes media and its pending record snapshot in one IDB transaction.
// If the page closes before the localStorage mirror is updated, startup completes it.
export async function recoverRestore() {
  const db = await openDB();
  try {
    const pending = await new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readonly');
      const request = tx.objectStore('meta').get('pendingRestore');
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
    if (!pending) return;
    localStorage.setItem(pending.recordsKey || STORAGE_KEY, JSON.stringify(pending.records));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(pending.drafts));
    await new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').delete('pendingRestore');
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function commitRestore(records, drafts, media, selectedDates, recordsKey = STORAGE_KEY) {
  const db = await openDB();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['media', 'meta'], 'readwrite');
      const store = tx.objectStore('media');
      const selected = new Set(selectedDates);
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const item = cursor.result;
        if (item) { if (selected.has(item.value.date)) item.delete(); item.continue(); }
        else {
          for (const item of media) store.add({ ...item, id: crypto.randomUUID() });
          tx.objectStore('meta').put({ records, recordsKey, drafts }, 'pendingRestore');
        }
      };
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('恢复失败，原记录仍保留。'));
    });
  } finally { db.close(); }
  try { await recoverRestore(); }
  catch (cause) {
    const error = new Error('媒体已恢复，文字与记录还在等待写入。请腾出浏览器存储空间，然后继续恢复。', { cause });
    error.recoveryPending = true;
    throw error;
  }
}
