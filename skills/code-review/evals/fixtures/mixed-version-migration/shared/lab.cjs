'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { migrationId } = require('./contract.json');
function createDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, 'initial.sql'), 'utf8'));
  return db;
}
function migrate(db, variant, direction = 'up') {
  if (!['base', 'head'].includes(variant) || !['up', 'down'].includes(direction)) throw new Error('Unknown fixed migration');
  const applied = db.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(migrationId);
  if ((direction === 'up') === Boolean(applied)) return { changed: false };
  db.exec('BEGIN');
  try {
    db.exec(fs.readFileSync(path.join(__dirname, '..', variant, `${direction}.sql`), 'utf8'));
    if (direction === 'up') db.prepare('INSERT INTO schema_migrations(id) VALUES (?)').run(migrationId);
    else db.prepare('DELETE FROM schema_migrations WHERE id = ?').run(migrationId);
    db.exec('COMMIT');
    return { changed: true };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = { createDatabase, migrate };
