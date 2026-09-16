'use strict';
function readStock(payload) {
  if (!payload || typeof payload.sku !== 'string' || !payload.sku || !Number.isSafeInteger(payload.quantityUnits) || payload.quantityUnits < 0) throw new TypeError('Unsupported allocation stock response');
  return { sku: payload.sku, availableUnits: payload.quantityUnits };
}
module.exports = { readStock };
