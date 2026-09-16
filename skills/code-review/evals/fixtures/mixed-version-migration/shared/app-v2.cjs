'use strict';
const { response, validateName } = require('./serializer.cjs');
module.exports = {
  get(db, id) { return response(db.prepare('SELECT id, email, full_name FROM customers WHERE id = ?').get(id), 'full_name'); },
  rename(db, id, name) { validateName(name); db.prepare('UPDATE customers SET full_name = ? WHERE id = ?').run(name, id); },
  create(db, id, email, name) { validateName(name); db.prepare('INSERT INTO customers(id, email, full_name) VALUES (?, ?, ?)').run(id, email, name); }
};
