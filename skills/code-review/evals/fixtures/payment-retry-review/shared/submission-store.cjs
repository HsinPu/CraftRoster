'use strict';
const fs = require('node:fs');
class SubmissionStore {
  constructor(file) { this.file = file; if (!fs.existsSync(file)) fs.writeFileSync(file, '{}\n'); }
  get(orderId) {
    const records = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    return Object.hasOwn(records, orderId) ? records[orderId] : null;
  }
  put(orderId, value) {
    const records = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    records[orderId] = value;
    fs.writeFileSync(this.file, JSON.stringify(records, null, 2) + '\n');
  }
}
module.exports = { SubmissionStore };
