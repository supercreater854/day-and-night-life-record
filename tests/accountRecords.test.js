import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRecord, STORAGE_KEY } from '../src/model.js';
import {
  GUEST_RECORDS_KEY,
  importLegacyRecords,
  LEGACY_RECORDS_IMPORT_KEY,
  legacyRecordsCandidate,
  readLocalRecords,
  recordsStorageKey,
  saveRecord,
  visibleRecords,
} from '../src/repository.js';

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('A and B local records stay isolated across sign-out and account switching', () => {
  const storage = memoryStorage();
  const aUid = 'cloud-user-A';
  const bUid = 'cloud-user-B';
  saveRecord('2026-09-01', { mood: 5 }, null, aUid, storage);
  saveRecord('2026-09-02', { mood: 1 }, null, bUid, storage);

  assert.deepEqual(Object.keys(readLocalRecords(aUid, storage)), ['2026-09-01']);
  assert.deepEqual(Object.keys(readLocalRecords(bUid, storage)), ['2026-09-02']);
  assert.deepEqual(readLocalRecords(null, storage), {});
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.notEqual(recordsStorageKey(aUid), recordsStorageKey(bUid));

  const aLocal = readLocalRecords(aUid, storage);
  const aCloud = { '2026-09-03': makeRecord('2026-09-03', {}, { mood: 4 }) };
  assert.deepEqual(Object.keys(visibleRecords(aUid, recordsStorageKey(aUid), aLocal, aUid, aCloud)).sort(), ['2026-09-01', '2026-09-03']);
  assert.deepEqual(visibleRecords(null, recordsStorageKey(aUid), aLocal, aUid, aCloud), {});
  assert.deepEqual(visibleRecords(bUid, recordsStorageKey(aUid), aLocal, aUid, aCloud), {});

  const bLocal = readLocalRecords(bUid, storage);
  const bCloud = { '2026-09-04': makeRecord('2026-09-04', {}, { mood: 2 }) };
  assert.deepEqual(Object.keys(visibleRecords(bUid, recordsStorageKey(bUid), bLocal, bUid, bCloud)).sort(), ['2026-09-02', '2026-09-04']);
  assert.deepEqual(Object.keys(visibleRecords(aUid, recordsStorageKey(aUid), readLocalRecords(aUid, storage), aUid, aCloud)).sort(), ['2026-09-01', '2026-09-03']);
});

test('legacy unowned records require an explicit one-time claim and are never deleted', () => {
  const legacyA = makeRecord('2026-08-30', {}, { mood: 4 });
  const legacyConflict = makeRecord('2026-08-31', {}, { mood: 1 });
  const legacyJson = JSON.stringify({ [legacyA.date]: legacyA, [legacyConflict.date]: legacyConflict });
  const storage = memoryStorage({ [STORAGE_KEY]: legacyJson });
  const uid = 'cloud-user-A';
  const existing = { [legacyConflict.date]: makeRecord(legacyConflict.date, {}, { mood: 5 }) };

  assert.deepEqual(readLocalRecords(uid, storage), {});
  assert.deepEqual(readLocalRecords('cloud-user-B', storage), {});
  assert.deepEqual(legacyRecordsCandidate(storage), {
    count: 2,
    first: '2026-08-30',
    last: '2026-08-31',
  });

  const result = importLegacyRecords(uid, existing, storage, '2026-09-07T00:00:00.000Z');
  assert.deepEqual(Object.keys(result.imported), ['2026-08-30']);
  assert.equal(result.records['2026-08-30'].mood, 4);
  assert.equal(result.records['2026-08-31'], undefined);
  assert.equal(storage.getItem(STORAGE_KEY), legacyJson);
  assert.equal(storage.getItem(GUEST_RECORDS_KEY), null);
  assert.deepEqual(JSON.parse(storage.getItem(LEGACY_RECORDS_IMPORT_KEY)), {
    version: 1,
    ownerUid: uid,
    importedAt: '2026-09-07T00:00:00.000Z',
    importedDates: ['2026-08-30'],
  });
  assert.equal(legacyRecordsCandidate(storage), null);

  const other = importLegacyRecords('cloud-user-B', {}, storage, '2026-09-08T00:00:00.000Z');
  assert.deepEqual(other, { records: {}, imported: {} });
  assert.equal(storage.getItem(STORAGE_KEY), legacyJson);
});
