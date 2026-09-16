'use strict';
const { normalizeSku } = require('./normalize-sku');
const { findProduct } = require('./catalog');

function importPartnerRow(row) {
  if (!row || typeof row.item_code !== 'string' || !Number.isSafeInteger(row.units) || row.units < 1) {
    return { status: 400, error: 'invalid-row' };
  }
  const product = findProduct(normalizeSku(row.item_code));
  if (!product) return { status: 404, error: 'unknown-item' };
  return { status: 200, line: { sku: product.sku, productId: product.productId, quantity: row.units } };
}
module.exports = { importPartnerRow };
