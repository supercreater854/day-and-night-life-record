export const PRO_PRODUCT = Object.freeze({
  id: 'day-night-pro-monthly',
  name: 'Day & Night Pro',
  amount: 4.9,
  priceLabel: '¥4.90 / 月',
  durationDays: 30,
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUid(uid) {
  if (typeof uid !== 'string' || !uid) throw new Error('请先登录账号。');
}

function assertResult(result) {
  if (result?.error) throw result.error;
  return result;
}

function firstRow(result) {
  const data = assertResult(result)?.data;
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

export function normalizeOrder(row, uid) {
  if (!row || row.owner_id !== uid || row.product_id !== PRO_PRODUCT.id) throw new Error('订单返回结果无效。');
  return { ...row, amount: Number(row.amount) };
}

export function normalizeEntitlement(row, uid) {
  if (!row || row.owner_id !== uid || row.product_id !== PRO_PRODUCT.id) throw new Error('权益返回结果无效。');
  return row;
}

export function isEntitlementActive(entitlement, now = Date.now()) {
  const expiresAt = Date.parse(entitlement?.expires_at ?? '');
  return entitlement?.product_id === PRO_PRODUCT.id
    && entitlement?.status === 'active'
    && Number.isFinite(expiresAt)
    && expiresAt > now;
}

export async function loadEntitlement(db, uid, now = new Date()) {
  if (!uid) return null;
  const result = await db.from('entitlements')
    .select('owner_id,product_id,status,expires_at,created_at,updated_at')
    .eq('owner_id', uid)
    .eq('product_id', PRO_PRODUCT.id)
    .eq('status', 'active')
    .gt('expires_at', now.toISOString())
    .maybeSingle();
  const row = firstRow(result);
  return row ? normalizeEntitlement(row, uid) : null;
}

export async function createOrder(db, uid) {
  requireUid(uid);
  const result = await db.from('orders').insert({
    product_id: PRO_PRODUCT.id,
    amount: PRO_PRODUCT.amount,
    status: 'pending',
  }).select('id,owner_id,product_id,amount,status,created_at,paid_at').single();
  return normalizeOrder(firstRow(result), uid);
}

export async function markOrderPaid(db, uid, orderId) {
  requireUid(uid);
  if (!UUID_PATTERN.test(orderId)) throw new Error('订单编号无效。');
  const result = await db.rpc('simulate_pro_payment', { p_order_id: orderId });
  return normalizeEntitlement(firstRow(result), uid);
}

export async function cancelOrder(db, uid, orderId) {
  requireUid(uid);
  if (!UUID_PATTERN.test(orderId)) throw new Error('订单编号无效。');
  const result = await db.rpc('cancel_pro_order', { p_order_id: orderId });
  return normalizeOrder(firstRow(result), uid);
}
