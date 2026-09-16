'use strict';
function response(row, column) {
  if (!row) return null;
  return { id: row.id, email: row.email, displayName: row[column] };
}
function validateName(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 100) throw new Error('Invalid name');
}
module.exports = { response, validateName };
