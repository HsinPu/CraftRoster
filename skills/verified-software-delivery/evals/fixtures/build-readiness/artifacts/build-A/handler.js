'use strict';
function greet(name) {
  const label = typeof name === 'string' ? name.trim() : '';
  return { status: 200, body: `Hello ${label || 'Guest'}` };
}
module.exports = { greet };
