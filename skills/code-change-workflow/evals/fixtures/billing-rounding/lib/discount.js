'use strict';

function applyDiscount(amountCents, discountBasisPoints) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || amountCents > 100000000) {
    throw new RangeError('amountCents must be an integer from 0 through 100000000');
  }
  if (!Number.isInteger(discountBasisPoints) || discountBasisPoints < 0 || discountBasisPoints > 10000) {
    throw new RangeError('discountBasisPoints must be an integer from 0 through 10000');
  }
  const discountCents = Math.floor(amountCents * discountBasisPoints / 10000);
  return amountCents - discountCents;
}

module.exports = { applyDiscount };
