'use strict';
function validateRequest(request) {
  if (!request || !/^order-[a-z0-9-]+$/.test(request.orderId) || !Number.isSafeInteger(request.amountCents) || request.amountCents <= 0) {
    throw new Error('Invalid synthetic order or amount');
  }
}
function checkExisting(request, existing) {
  if (existing && existing.amountCents !== request.amountCents) throw new Error('Order amount is immutable');
}
module.exports = { validateRequest, checkExisting };
