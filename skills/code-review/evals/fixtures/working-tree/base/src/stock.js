'use strict';
function reserveStock(available, requested) {
  if (!Number.isSafeInteger(available) || available < 0) throw new RangeError('available must be a nonnegative integer');
  if (!Number.isSafeInteger(requested) || requested <= 0) throw new RangeError('requested must be a positive integer');
  if (requested > available) return { accepted: false, remaining: available };
  return { accepted: true, remaining: available - requested };
}
module.exports = { reserveStock };
