// Generated from schema/order.json by shared/generate-clients.cjs; do not hand edit.
'use strict';
function decodeOrder(value) {
  if (!value || typeof value.id !== 'string' || !['placed', 'shipped', 'delivered'].includes(value.status)) throw new Error('Invalid order');
  const result = { id: value.id, status: value.status };
  if (Object.hasOwn(value, 'estimatedDeliveryAtMs')) {
    const eta = value.estimatedDeliveryAtMs;
    if (eta !== null && (!Number.isSafeInteger(eta) || eta < 0 || eta > 8640000000000000)) throw new Error('Invalid estimate');
    result.estimatedDeliveryAtMs = eta;
  }
  return result;
}
module.exports = { decodeOrder };
