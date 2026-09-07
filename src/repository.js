import { makeRecord, readRecords, STORAGE_KEY } from './model.js';
import { openDB } from './media.js';

export const DRAFT_KEY = 'life-record:drafts:v1';
export const ONBOARDING_KEY = 'life-record:intro:v1';

export function saveRecord(date, patch) {
  const records = readRecords();
  const next = { ...records, [date]: makeRecord(date, records[date], patch) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending.records));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(pending.drafts));
    await new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').delete('pendingRestore');
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function commitRestore(records, drafts, media, selectedDates) {
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
          tx.objectStore('meta').put({ records, drafts }, 'pendingRestore');
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
