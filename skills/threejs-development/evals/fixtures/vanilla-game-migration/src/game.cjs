'use strict';
function validateLevel(level) {
  if (!level || level.id !== 'synthetic-grid-1' || level.limit !== 2 || level.speed !== 4 || !Array.isArray(level.targets) || level.targets.length < 1) throw new Error('Invalid level');
  for (const target of level.targets) if (!Array.isArray(target) || target.length !== 2 || target.some(value => !Number.isInteger(value) || Math.abs(value) > level.limit)) throw new Error('Invalid level target');
  if (!level.colors || ['board', 'player', 'target', 'background'].some(key => !/^#[0-9a-f]{6}$/i.test(level.colors[key]))) throw new Error('Invalid level colors');
  return level;
}
function createGame(level) {
  validateLevel(level);
  return { level, x: 0, z: 0, toX: 0, toZ: 0, score: 0, targetIndex: 0, moving: false };
}
function move(game, dx, dz) {
  if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(pair => pair[0] === dx && pair[1] === dz)) throw new Error('Expected one cardinal step');
  const clamp = value => Math.max(-game.level.limit, Math.min(game.level.limit, value));
  game.toX = clamp(game.toX + dx); game.toZ = clamp(game.toZ + dz);
  game.moving = game.x !== game.toX || game.z !== game.toZ;
  return game.moving;
}
function tick(game, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid frame delta');
  if (!game.moving) return false;
  const distance = game.level.speed * Math.min(seconds, 0.05);
  const approach = (value, target) => value + Math.sign(target - value) * Math.min(Math.abs(target - value), distance);
  game.x = approach(game.x, game.toX); game.z = approach(game.z, game.toZ);
  game.moving = game.x !== game.toX || game.z !== game.toZ;
  if (!game.moving) {
    const target = game.level.targets[game.targetIndex];
    if (game.x === target[0] && game.z === target[1]) { game.score += 1; game.targetIndex = (game.targetIndex + 1) % game.level.targets.length; }
  }
  return true;
}
function reset(game) { Object.assign(game, createGame(game.level)); }
function snapshot(game) {
  return { x: game.x, z: game.z, toX: game.toX, toZ: game.toZ, score: game.score, target: [...game.level.targets[game.targetIndex]], moving: game.moving };
}
module.exports = { validateLevel, createGame, move, tick, reset, snapshot };
