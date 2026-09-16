import assert from 'node:assert/strict';
import test from 'node:test';
import { catalog } from '../dist/catalog.js';

test('catalog entries have unique IDs and supported statuses', () => {
  assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length);
  assert.ok(catalog.length > 0);
  for (const item of catalog) {
    assert.match(item.id, /^[a-z][a-z0-9-]{0,39}$/);
    assert.ok(item.title.length > 0);
    assert.ok(['active', 'maintenance'].includes(item.status));
  }
});

test('catalog and entries resist accidental mutation', () => {
  assert.ok(Object.isFrozen(catalog));
  assert.ok(catalog.every(Object.isFrozen));
  assert.throws(() => { catalog[0].title = 'changed'; }, TypeError);
});
