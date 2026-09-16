'use strict';
const { response, validateName } = require('./serializer.cjs');
module.exports = {
  get(db, id) { return response(db.prepare('SELECT id, email, display_name FROM customers WHERE id = ?').get(id), 'display_name'); },
  rename(db, id, name) { validateName(name); db.prepare('UPDATE customers SET display_name = ? WHERE id = ?').run(name, id); },
  create(db, id, email, name) { validateName(name); db.prepare('INSERT INTO customers(id, email, display_name) VALUES (?, ?, ?)').run(id, email, name); }
};
