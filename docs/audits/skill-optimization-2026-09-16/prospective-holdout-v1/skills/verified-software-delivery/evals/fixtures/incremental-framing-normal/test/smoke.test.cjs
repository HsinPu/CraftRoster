'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { collect } = require('../src/collect.cjs');

test('collects one complete ordinary record', () => {
  assert.deepEqual(collect([[2, 65, 66]]), ['4142']);
});
