'use strict';
function summarizeOrder(lines) {
  return lines.reduce((summary, line) => {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 0 || !Number.isSafeInteger(line.unitCents) || line.unitCents < 0) throw new RangeError('quantity and unitCents must be nonnegative integers');
    return { itemCount: summary.itemCount + line.quantity, totalCents: summary.totalCents + line.quantity * line.unitCents };
  }, { itemCount: 0, totalCents: 0 });
}
module.exports = { summarizeOrder };
