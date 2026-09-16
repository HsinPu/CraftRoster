'use strict';
function joinNonempty(parts) {
  return parts.filter((part) => part.length > 0).join(' ');
}
function displayName(firstName, lastName) {
  const name = joinNonempty([firstName, lastName]);
  return name || 'Guest';
}
module.exports = { displayName };
