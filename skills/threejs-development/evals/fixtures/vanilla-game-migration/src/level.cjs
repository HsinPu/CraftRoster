'use strict';
const { validateLevel } = require('./game.cjs');
async function loadLevel(url, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(url, { signal });
  if (!response.ok) throw new Error(`Level unavailable (${response.status})`);
  return validateLevel(await response.json());
}
module.exports = { loadLevel };
