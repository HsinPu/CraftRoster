'use strict';
const { reserveStock } = require('./stock');
function submitOrder(order, inventory) {
  const reservation = reserveStock(inventory[order.sku] ?? 0, order.quantity);
  if (!reservation.accepted) return { status: 409, message: 'Unavailable' };
  inventory[order.sku] = reservation.remaining;
  return { status: 201, order: { sku: order.sku, quantity: order.quantity } };
}
module.exports = { submitOrder };
