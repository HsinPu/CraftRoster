'use strict';
function publishStock(stock) {
  if (!stock || typeof stock.sku !== 'string' || !stock.sku || !Number.isSafeInteger(stock.availableUnits) || stock.availableUnits < 0) throw new TypeError('Invalid source stock');
  return { sku: stock.sku, quantity: { value: stock.availableUnits, unit: 'item' } };
}
module.exports = { publishStock };
