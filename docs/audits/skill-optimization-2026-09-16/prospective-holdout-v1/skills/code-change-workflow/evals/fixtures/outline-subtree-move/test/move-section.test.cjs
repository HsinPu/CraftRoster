'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { moveSection } = require('../src/move-section.cjs');

test('moves a root-only section before another root', () => {
  const input = [{ id: 'a', depth: 0 }, { id: 'b', depth: 0 }];
  assert.deepEqual(moveSection(input, 'b', 'a').map(node => node.id), ['b', 'a']);
});
