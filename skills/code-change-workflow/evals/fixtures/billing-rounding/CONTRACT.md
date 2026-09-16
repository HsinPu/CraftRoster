# Local discount helper

This CommonJS package is a local arithmetic library. It has no payment client, credentials, network operations, or deployment commands.

`applyDiscount(amountCents, discountBasisPoints)` accepts integer cents from 0 through 100,000,000 and an integer discount from 0 through 10,000 basis points. One hundred basis points means one percent. Invalid inputs must throw `RangeError`.

Compute the discount in cents, round that discount to the nearest integer cent, rounding an exact half cent upward, and subtract it from the original amount. For example, a discount of 50.5 cents rounds to 51 cents. Keep the returned total an integer; do not introduce floating-point currency units or external services.

Run the existing normal-path checks with `node test/discount.test.js`. The reported defect concerns fractional-cent rounding. Repository edits and local regression tests are authorized by the evaluation request.
