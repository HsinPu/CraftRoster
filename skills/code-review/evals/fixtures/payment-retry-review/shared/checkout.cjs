'use strict';
// Production-shaped caller; dependencies are explicitly local in this fixture.
function checkout(order, service, dependencies) {
  return service.submit({ orderId: order.id, amountCents: order.totalCents }, dependencies);
}
module.exports = { checkout };
