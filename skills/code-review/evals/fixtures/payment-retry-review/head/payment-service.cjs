'use strict';
const { validateRequest, checkExisting } = require('../shared/request.cjs');
function submit(request, { store, provider, newKey, maxAttempts = 2 }) {
  validateRequest(request);
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 2) throw new Error('Invalid attempt limit');
  const existing = store.get(request.orderId);
  checkExisting(request, existing);
  if (existing?.status === 'completed') return existing.receipt;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const idempotencyKey = newKey();
    const pending = { ...request, idempotencyKey, status: 'pending' };
    store.put(request.orderId, pending);
    try {
      const receipt = provider.submitPayment({ ...request, idempotencyKey });
      store.put(request.orderId, { ...pending, status: 'completed', receipt });
      return receipt;
    } catch (error) {
      if (error.code !== 'PROVIDER_TIMEOUT' || attempt === maxAttempts) throw error;
    }
  }
}
module.exports = { submit };
