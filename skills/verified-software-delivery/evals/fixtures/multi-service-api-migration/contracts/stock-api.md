# Stock response and consumer contract

The producer input is a stock record with a nonempty string `sku` and `availableUnits`, a nonnegative safe integer. JSON responses preserve that SKU and exact count. Version 1 represents the count in `quantityUnits`. The structured representation uses `quantity.value` with `quantity.unit` exactly `item`. A transitional response may include both representations, but if both are supplied they must describe the same count.

The allocation and planning services each expose `readStock(payload)` and return `{ sku, availableUnits }`. Unsupported units, negative/noninteger/unsafe counts and malformed representations must be rejected. Consumers must not coerce numeric strings or silently scale item counts. Old allocation consumers remain unchanged during this task.

Compatibility evidence must cover current inventory with both consumers and legacy inventory with both consumers. Include zero and positive counts. The legacy producer image and allocation service are retained comparison inputs, not sources to rewrite to make a test pass. Rollback readiness requires actual current-consumer observations after switching the local rehearsal back to that same legacy image. There is no persistent data migration in this fixture.
