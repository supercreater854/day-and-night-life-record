export const MEDIA_DB = 'life-record-media';
export const MEDIA_DB_VERSION = 2;

// LAN HTTP previews do not expose randomUUID; getRandomValues is available.
function mediaId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB, MEDIA_DB_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('media')) {
        const store = request.result.createObjectStore('media', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!request.result.objectStoreNames.contains('meta')) request.result.createObjectStore('meta');
    };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('请关闭其他页面后重试媒体存储。')); };
  });
}

async function transact(mode, operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media', mode);
    let result;
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error || new Error('媒体保存失败')); };
    try { operation(transaction.objectStore('media'), value => { result = value; }); }
    catch (error) { transaction.abort(); db.close(); reject(error); }
  });
}

export function listMedia(date) {
  return transact('readonly', (store, done) => {
    const request = store.index('date').getAll(date);
    request.onsuccess = () => done(request.result.sort((a, b) => a.createdAt - b.createdAt));
  });
}
export function listMediaDates() {
  return transact('readonly', (store, done) => {
    const dates = [];
    const request = store.index('date').openKeyCursor(null, 'nextunique');
    request.onsuccess = () => {
      if (request.result) { dates.push(request.result.key); request.result.continue(); }
      else done(dates);
    };
  });
}
export function addMedia(date, files, kind) {
  if (files.some(file => !file.type.startsWith(`${kind}/`))) return Promise.reject(new Error('文件格式不匹配，请重新选择。'));
  return transact('readwrite', (store, done) => {
    for (const file of files) store.add({ id: mediaId(), date, kind, name: file.name, type: file.type, size: file.size, createdAt: Date.now(), blob: file });
    done();
  });
}
export function deleteMedia(id) { return transact('readwrite', (store, done) => { store.delete(id); done(); }); }

export function allMedia() {
  return transact('readonly', (store, done) => { const request = store.getAll(); request.onsuccess = () => done(request.result); });
}
