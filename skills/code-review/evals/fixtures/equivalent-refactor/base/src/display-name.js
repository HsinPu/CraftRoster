'use strict';
function displayName(firstName, lastName) {
  const name = [firstName, lastName].filter((part) => part.length > 0).join(' ');
  return name || 'Guest';
}
module.exports = { displayName };
