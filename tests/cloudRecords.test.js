import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_RECORDS_COLLECTION,
  cloudDocumentsToRecords,
  cloudRecordKey,
  cloudRecordPayload,
  loadCloudRecords,
  syncCloudRecord,
} from '../src/cloudRecords.js';
import { makeRecord } from '../src/model.js';
import { saveRecord } from '../src/repository.js';

const UID = 'user_abc-123';

test('cloud record key is stable and unique by user plus date', () => {
  assert.equal(cloudRecordKey(UID, '2026-09-07'), 'user_abc-123:2026-09-07');
  assert.notEqual(cloudRecordKey(UID, '2026-09-07'), cloudRecordKey('user_other', '2026-09-07'));
  assert.notEqual(cloudRecordKey(UID, '2026-09-07'), cloudRecordKey(UID, '2026-09-08'));
});

test('cloud payload keeps the daily record schema and omits local media state', () => {
  const record = makeRecord('2026-09-07', {}, {
    sleepStart: '23:30', sleepEnd: '07:00', mealCount: 3, mealTiming: 2,
    mealTimes: ['08:00', '12:30', '18:30'], mood: 5, diaryText: '今天很好',
  });
  const payload = cloudRecordPayload({ ...record, hasMedia: true, media: ['local-only'] });
  assert.equal(payload.date, record.date);
  assert.equal(payload.sleepScore, 5);
  assert.equal(payload.mealScore, 5);
  assert.equal(payload.starSize, 1.65);
  assert.equal(payload.starBrightness, 1);
  assert.equal(payload.diaryText, '今天很好');
  assert.equal(Object.hasOwn(payload, 'hasMedia'), false);
  assert.equal(Object.hasOwn(payload, 'media'), false);
});

test('cloud documents only hydrate records owned by the current user', () => {
  const own = makeRecord('2026-09-07', {}, { mood: 4, mealCount: 2, mealTiming: 1 });
  const other = makeRecord('2026-09-08', {}, { mood: 1 });
  const records = cloudDocumentsToRecords([
    { owner_id: UID, record_date: own.date, record_data: cloudRecordPayload(own) },
    { owner_id: 'user_other', record_date: other.date, record_data: cloudRecordPayload(other) },
  ], UID);
  assert.deepEqual(Object.keys(records), ['2026-09-07']);
  assert.equal(records['2026-09-07'].mood, 4);
});

test('cloud loading scopes the query to the authenticated uid and paginates', async () => {
  const documents = Array.from({ length: 101 }, (_, index) => {
    const day = new Date(2026, 0, index + 1);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const record = makeRecord(date, {}, { mood: index % 5 + 1 });
    return { owner_id: UID, record_date: date, record_data: cloudRecordPayload(record) };
  });
  const calls = [];
  const db = {
    from(name) {
      assert.equal(name, CLOUD_RECORDS_COLLECTION);
      let start = 0;
      let end = 0;
      return {
        select(columns) { calls.push({ columns }); return this; },
        eq(field, value) { calls.at(-1).filter = { field, value }; return this; },
        range(from, to) { start = from; end = to; return Promise.resolve({ data: documents.slice(start, end + 1), error: null }); },
      };
    },
  };
  const records = await loadCloudRecords(db, UID);
  assert.equal(Object.keys(records).length, 101);
  assert.deepEqual(calls.map(call => call.filter), [
    { field: 'owner_id', value: UID },
    { field: 'owner_id', value: UID },
  ]);
});

test('cloud saving upserts by owner and date without accepting an owner from the client', async () => {
  const record = makeRecord('2026-09-07', {}, { sleepStart: '00:00', sleepEnd: '07:30', mood: 3 });
  let call;
  const db = {
    from(name) {
      return {
        async upsert(payload, options) {
          call = { name, payload, options };
          return { data: null, error: null };
        },
      };
    },
  };
  await syncCloudRecord(db, UID, record);
  assert.equal(call.name, CLOUD_RECORDS_COLLECTION);
  assert.equal(call.payload.record_date, record.date);
  assert.equal(call.payload.record_data.date, record.date);
  assert.equal(Object.hasOwn(call.payload, 'owner_id'), false);
  assert.deepEqual(call.options, { onConflict: 'owner_id,record_date' });
});

test('editing a cloud-loaded record preserves it in localStorage without bulk migration', () => {
  const values = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    const cloudRecord = makeRecord('2026-09-07', {}, { mealCount: 3, mealTiming: 2, mood: 4 });
    const records = saveRecord(cloudRecord.date, { mood: 5 }, cloudRecord);
    assert.equal(records[cloudRecord.date].mealScore, 5);
    assert.equal(records[cloudRecord.date].mood, 5);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test('resolved CloudBase errors are treated as sync failures', async () => {
  const record = makeRecord('2026-09-07', {}, { mood: 3 });
  const db = { from: () => ({ upsert: async () => ({ data: null, error: new Error('denied') }) }) };
  await assert.rejects(syncCloudRecord(db, UID, record), /denied/);
});
