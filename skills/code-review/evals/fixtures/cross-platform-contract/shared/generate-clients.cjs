'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const fixtureRoot = path.resolve(__dirname, '..');
// This is a deliberately small fixture generator, not a general OpenAPI tool.
function render(schema) {
  assert.equal(schema.title, 'FictionalOrder');
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, true);
  assert.deepEqual(schema.required, ['id', 'status']);
  assert.deepEqual(schema.properties.id, { type: 'string' });
  assert.deepEqual(schema.properties.status, { type: 'string', enum: ['placed', 'shipped', 'delivered'] });
  assert.ok(Object.keys(schema.properties).every(k => ['id', 'status', 'estimatedDeliveryAtMs'].includes(k)));
  const eta = schema.properties.estimatedDeliveryAtMs;
  if (eta) {
    assert.deepEqual(eta.type, ['integer', 'null']);
    assert.equal(eta.minimum, 0);
    assert.equal(eta.maximum, 8640000000000000);
  }
  const js = [
    '// Generated from schema/order.json by shared/generate-clients.cjs; do not hand edit.',
    "'use strict';",
    'function decodeOrder(value) {',
    "  if (!value || typeof value.id !== 'string' || !['placed', 'shipped', 'delivered'].includes(value.status)) throw new Error('Invalid order');",
    '  const result = { id: value.id, status: value.status };',
    ...(eta ? [
      "  if (Object.hasOwn(value, 'estimatedDeliveryAtMs')) {",
      '    const eta = value.estimatedDeliveryAtMs;',
      "    if (eta !== null && (!Number.isSafeInteger(eta) || eta < 0 || eta > 8640000000000000)) throw new Error('Invalid estimate');",
      '    result.estimatedDeliveryAtMs = eta;',
      '  }'
    ] : []),
    '  return result;', '}', 'module.exports = { decodeOrder };', ''
  ].join('\n');
  const swift = [
    '// Generated from schema/order.json by shared/generate-clients.cjs; do not hand edit.',
    'import Foundation',
    'struct FictionalOrder: Decodable {',
    '    let id: String', '    let status: String',
    ...(eta ? ['    let estimatedDeliveryAtMs: Int64?'] : []),
    '}', ''
  ].join('\n');
  return { 'orders-client.cjs': js, 'OrdersClient.swift': swift };
}
function generate(variant, write = false) {
  if (!['base', 'head'].includes(variant)) throw new Error('Unknown source view');
  const root = path.join(fixtureRoot, variant);
  const outputs = render(JSON.parse(fs.readFileSync(path.join(root, 'schema/order.json'))));
  if (write) fs.mkdirSync(path.join(root, 'generated'), { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    const file = path.join(root, 'generated', name);
    if (write) fs.writeFileSync(file, content);
    else assert.equal(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), content, `Derived file drift: ${name}`);
  }
  return Object.keys(outputs);
}
if (require.main === module) {
  if (process.argv.length !== 4 || !['--check', '--write'].includes(process.argv[2])) throw new Error('Use --check or --write plus base or head');
  console.log(JSON.stringify({ variant: process.argv[3], mode: process.argv[2], files: generate(process.argv[3], process.argv[2] === '--write') }));
}
module.exports = { render, generate };
