'use strict';
function readStock(payload) {
  if (!payload || typeof payload.sku !== 'string' || !payload.sku) throw new TypeError('Invalid stock identity');
  const quantity = payload.quantity;
  if (!quantity || quantity.unit !== 'item' || !Number.isSafeInteger(quantity.value) || quantity.value < 0) throw new TypeError('Unsupported planning stock response');
  return { sku: payload.sku, availableUnits: quantity.value };
}
module.exports = { readStock };
