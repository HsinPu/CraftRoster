'use strict';
const { decodeOrder } = require('../generated/orders-client.cjs');
function orderView(payload) {
  const order = decodeOrder(payload);
  const estimate = order.estimatedDeliveryAtMs == null
    ? 'Estimate unavailable'
    : new Date(order.estimatedDeliveryAtMs * 1000).toISOString();
  return { orderId: order.id, status: order.status, estimate };
}
module.exports = { orderView };
