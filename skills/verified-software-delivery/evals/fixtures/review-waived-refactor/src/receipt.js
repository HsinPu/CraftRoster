'use strict';
function formatRetailReceipt(items) {
  let total = 0;
  const lines = items.map((item) => {
    const lineTotal = item.quantity * item.unitCents;
    total += lineTotal;
    return `${item.name}: ${item.quantity} x ${item.unitCents} = ${lineTotal}`;
  });
  return ['RETAIL', ...lines, `Total cents: ${total}`].join('\n');
}
function formatWholesaleReceipt(items) {
  let total = 0;
  const lines = items.map((item) => {
    const lineTotal = item.quantity * item.unitCents;
    total += lineTotal;
    return `${item.name}: ${item.quantity} x ${item.unitCents} = ${lineTotal}`;
  });
  return ['WHOLESALE', ...lines, `Total cents: ${total}`].join('\n');
}
module.exports = { formatRetailReceipt, formatWholesaleReceipt };
