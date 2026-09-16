// Generated from schema/order.json by shared/generate-clients.cjs; do not hand edit.
'use strict';
function decodeOrder(value) {
  if (!value || typeof value.id !== 'string' || !['placed', 'shipped', 'delivered'].includes(value.status)) throw new Error('Invalid order');
  const result = { id: value.id, status: value.status };
  return result;
}
module.exports = { decodeOrder };
