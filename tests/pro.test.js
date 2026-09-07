import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  cancelOrder,
  createOrder,
  isEntitlementActive,
  loadEntitlement,
  markOrderPaid,
  PRO_PRODUCT,
} from '../src/pro.js';

const UID_A = 'account-a';
const UID_B = 'account-b';
const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const FUTURE = '2026-10-07T00:00:00.000Z';

const entitlement = owner_id => ({
  owner_id,
  product_id: PRO_PRODUCT.id,
  status: 'active',
  expires_at: FUTURE,
  created_at: '2026-09-07T00:00:00.000Z',
  updated_at: '2026-09-07T00:00:00.000Z',
});

test('Pro product keeps the fixed test price and duration', () => {
  assert.deepEqual(PRO_PRODUCT, {
    id: 'day-night-pro-monthly', name: 'Day & Night Pro', amount: 4.9,
    priceLabel: '¥4.90 / 月', durationDays: 30,
  });
});

test('entitlement is active only before its actual expiry', () => {
  assert.equal(isEntitlementActive(entitlement(UID_A), Date.parse('2026-09-08T00:00:00Z')), true);
  assert.equal(isEntitlementActive(entitlement(UID_A), Date.parse(FUTURE)), false);
  assert.equal(isEntitlementActive({ ...entitlement(UID_A), status: 'expired' }, Date.parse('2026-09-08T00:00:00Z')), false);
});

test('loading Pro scopes every filter to the current account and active product', async () => {
  const filters = [];
  const db = { from(name) {
    assert.equal(name, 'entitlements');
    return {
      select() { return this; },
      eq(field, value) { filters.push(['eq', field, value]); return this; },
      gt(field, value) { filters.push(['gt', field, value]); return this; },
      async maybeSingle() { return { data: entitlement(UID_A), error: null }; },
    };
  } };
  assert.equal((await loadEntitlement(db, UID_A, new Date('2026-09-08T00:00:00Z'))).owner_id, UID_A);
  assert.deepEqual(filters.slice(0, 3), [
    ['eq', 'owner_id', UID_A], ['eq', 'product_id', PRO_PRODUCT.id], ['eq', 'status', 'active'],
  ]);
  assert.equal(filters[3][0], 'gt');
  assert.equal(filters[3][1], 'expires_at');
});

test('A cannot accept B account entitlement data', async () => {
  const db = { from: () => ({ select() { return this; }, eq() { return this; }, gt() { return this; }, maybeSingle: async () => ({ data: entitlement(UID_B), error: null }) }) };
  await assert.rejects(loadEntitlement(db, UID_A), /权益返回结果无效/);
});

test('creating an order relies on server owner binding and only sends the fixed pending product', async () => {
  let inserted;
  const row = { id: ORDER_ID, owner_id: UID_A, product_id: PRO_PRODUCT.id, amount: '4.90', status: 'pending', created_at: '2026-09-07T00:00:00Z', paid_at: null };
  const db = { from: name => ({
    insert(payload) { assert.equal(name, 'orders'); inserted = payload; return this; },
    select() { return this; }, single: async () => ({ data: row, error: null }),
  }) };
  const order = await createOrder(db, UID_A);
  assert.deepEqual(inserted, { product_id: PRO_PRODUCT.id, amount: 4.9, status: 'pending' });
  assert.equal(Object.hasOwn(inserted, 'owner_id'), false);
  assert.equal(order.amount, 4.9);
});

test('payment and cancellation use explicit server function boundaries', async () => {
  const calls = [];
  const pending = { id: ORDER_ID, owner_id: UID_A, product_id: PRO_PRODUCT.id, amount: '4.90', status: 'cancelled', created_at: '2026-09-07T00:00:00Z', paid_at: null };
  const db = { rpc: async (name, args) => {
    calls.push([name, args]);
    return { data: [name === 'simulate_pro_payment' ? entitlement(UID_A) : pending], error: null };
  } };
  assert.equal((await markOrderPaid(db, UID_A, ORDER_ID)).owner_id, UID_A);
  assert.equal((await cancelOrder(db, UID_A, ORDER_ID)).status, 'cancelled');
  assert.deepEqual(calls, [
    ['simulate_pro_payment', { p_order_id: ORDER_ID }],
    ['cancel_pro_order', { p_order_id: ORDER_ID }],
  ]);
});

test('the migration enforces own-row RLS and keeps entitlement writes off the table API', async () => {
  const sql = await readFile(new URL('../cloudbase/migrations/202609070002_pro_orders_entitlements.sql', import.meta.url), 'utf8');
  assert.match(sql, /ALTER TABLE public\.orders ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE public\.entitlements ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /owner_id = \(current_setting\('request\.jwt\.claims'/);
  assert.match(sql, /GRANT SELECT, INSERT ON public\.orders TO authenticated/);
  assert.match(sql, /GRANT SELECT ON public\.entitlements TO authenticated/);
  assert.doesNotMatch(sql, /GRANT (?:INSERT|UPDATE|ALL).*public\.entitlements TO authenticated/);
  assert.match(sql, /expires_at = GREATEST\(public\.entitlements\.expires_at, now\(\)\) \+ interval '30 days'/);
});
