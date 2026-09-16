'use strict';
const assert = require('node:assert/strict');
const level = require('../assets/level.json');
const { createGame, move, tick, reset, snapshot } = require('../src/game.cjs');
function run() {
  const game = createGame(level); move(game, 1, 0);
  for (let index = 0; index < 10; index += 1) tick(game, 0.05);
  assert.equal(game.score, 1); assert.equal(game.x, 1); assert.equal(game.moving, false);
  const idle = snapshot(game); tick(game, 1); assert.deepEqual(snapshot(game), idle);
  reset(game); assert.deepEqual(snapshot(game), { x: 0, z: 0, toX: 0, toZ: 0, score: 0, target: [1, 0], moving: false });
  return { status: 'passed', scope: 'deterministic game logic only; no browser, renderer or model' };
}
module.exports = { run };
if (require.main === module) console.log(JSON.stringify(run()));
