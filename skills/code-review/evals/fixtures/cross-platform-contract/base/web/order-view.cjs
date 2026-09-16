'use strict';
const { decodeOrder } = require('../generated/orders-client.cjs');
function orderView(payload) {
  const order = decodeOrder(payload);
  return { orderId: order.id, status: order.status, estimate: 'Estimate unavailable' };
}
module.exports = { orderView };
