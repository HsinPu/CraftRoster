'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'evidence/checks.json'), 'utf8'));
if (evidence.digestAlgorithm !== 'sha256-utf8-lf') throw new Error('Unsupported evidence digest algorithm');
function digest(relative) {
  const text = fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(text).digest('hex');
}
const checks = evidence.checks.map((check) => {
  const inputs = Object.entries(check.inputs).map(([file, expected]) => {
    const actual = fs.existsSync(path.join(root, file)) ? digest(file) : null;
    return { file, expected, actual, unchanged: actual === expected };
  });
  return { id: check.id, recordedStatus: check.status, scopeStatus: inputs.every((input) => input.unchanged) ? 'current' : 'stale', inputs, execution: check.execution };
});
console.log(JSON.stringify({ fixtureOnly: true, inspectionOnly: true, digestAlgorithm: evidence.digestAlgorithm, checks }, null, 2));
