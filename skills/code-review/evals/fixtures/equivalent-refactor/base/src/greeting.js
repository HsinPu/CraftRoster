'use strict';
const { displayName } = require('./display-name');
function greeting(profile = {}) {
  const first = typeof profile.firstName === 'string' ? profile.firstName.trim() : '';
  const last = typeof profile.lastName === 'string' ? profile.lastName.trim() : '';
  return `Hello, ${displayName(first, last)}!`;
}
module.exports = { greeting };
