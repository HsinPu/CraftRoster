'use strict';
const fs = require('node:fs');
function timeout() { const error = new Error('Provider response timed out'); error.code = 'PROVIDER_TIMEOUT'; return error; }

// An explicit local ledger simulator, with no network or payment capability.
// An accepted key is durable even if the response never reaches its caller.
class LocalProvider {
  constructor(file, faults = []) {
    this.file = file;
    this.faults = [...faults];
    if (this.faults.some(f => !['timeout-before-accept', 'timeout-after-accept', 'declined', 'none'].includes(f))) throw new Error('Unknown fault');
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ charges: [] }) + '\n');
  }
  submitPayment({ orderId, amountCents, idempotencyKey }) {
    if (typeof idempotencyKey !== 'string' || !idempotencyKey) throw new Error('Missing idempotency key');
    const ledger = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    const existing = ledger.charges.find(c => c.idempotencyKey === idempotencyKey);
    if (existing) {
      if (existing.orderId !== orderId || existing.amountCents !== amountCents) throw new Error('Idempotency payload conflict');
      return existing.receipt;
    }
    const fault = this.faults.shift() || 'none';
    if (fault === 'timeout-before-accept') throw timeout();
    if (fault === 'declined') { const error = new Error('Synthetic decline'); error.code = 'PROVIDER_DECLINED'; throw error; }
    const receipt = { paymentId: `fake-payment-${ledger.charges.length + 1}`, orderId, amountCents };
    ledger.charges.push({ idempotencyKey, orderId, amountCents, receipt });
    fs.writeFileSync(this.file, JSON.stringify(ledger, null, 2) + '\n');
    if (fault === 'timeout-after-accept') throw timeout();
    return receipt;
  }
  charges() { return JSON.parse(fs.readFileSync(this.file, 'utf8')).charges; }
}
module.exports = { LocalProvider };
