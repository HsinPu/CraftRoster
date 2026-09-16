'use strict';
const products = new Map([
  ['KIT-07', Object.freeze({ sku: 'KIT-07', productId: 'product-kit-07' })],
  ['PAD-02', Object.freeze({ sku: 'PAD-02', productId: 'product-pad-02' })]
]);
function findProduct(sku) { return products.get(sku); }
module.exports = { findProduct };
