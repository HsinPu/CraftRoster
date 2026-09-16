'use strict';
const { validateRequest, checkExisting } = require('../shared/request.cjs');
function submit(request, { store, provider, newKey }) {
  validateRequest(request);
  const existing = store.get(request.orderId);
  checkExisting(request, existing);
  if (existing?.status === 'completed') return existing.receipt;
  const idempotencyKey = existing?.idempotencyKey || newKey();
  const pending = { ...request, idempotencyKey, status: 'pending' };
  store.put(request.orderId, pending);
  const receipt = provider.submitPayment({ ...request, idempotencyKey });
  store.put(request.orderId, { ...pending, status: 'completed', receipt });
  return receipt;
}
module.exports = { submit };
