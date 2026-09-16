PRAGMA recursive_triggers = ON;
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX customers_email_unique ON customers(email);
CREATE TABLE schema_migrations (id TEXT PRIMARY KEY);
INSERT INTO customers(id, email, display_name) VALUES
  (1, 'ada@example.invalid', 'Ada'),
  (2, 'lin@example.invalid', 'Lin');
