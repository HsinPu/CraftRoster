ALTER TABLE customers ADD COLUMN full_name TEXT;
UPDATE customers SET full_name = display_name WHERE full_name IS NULL;
CREATE TRIGGER customers_insert_name AFTER INSERT ON customers BEGIN
  UPDATE customers
  SET display_name = COALESCE(NEW.full_name, NEW.display_name),
      full_name = COALESCE(NEW.full_name, NEW.display_name)
  WHERE id = NEW.id;
END;
CREATE TRIGGER customers_v1_name AFTER UPDATE OF display_name ON customers
WHEN NEW.display_name IS NOT OLD.display_name BEGIN
  UPDATE customers SET full_name = NEW.display_name WHERE id = NEW.id;
END;
CREATE TRIGGER customers_v2_name AFTER UPDATE OF full_name ON customers
WHEN NEW.full_name IS NOT OLD.full_name BEGIN
  UPDATE customers SET display_name = NEW.full_name WHERE id = NEW.id;
END;
