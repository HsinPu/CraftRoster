'use strict';
// Unchanged, deliberately excluded from the requested review boundary.
function exportOrder(order) { return JSON.stringify({ id: order.id, status: order.status }); }
module.exports = { exportOrder };
