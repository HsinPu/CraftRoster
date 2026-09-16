# Local stock reservation contract

`reserveStock(available, requested)` accepts a nonnegative safe integer stock count and a positive safe integer requested quantity. Invalid arguments throw RangeError. A request can be accepted when its quantity does not exceed available stock; on acceptance subtract that quantity. An unavailable request leaves stock unchanged. Results are `{accepted, remaining}`.

`submitOrder(order, inventory)` uses this helper. Accepted orders update that SKU's count in the supplied local object and return status 201; rejected orders return status 409 without changing inventory. Unknown SKUs have zero stock. All SKUs and orders are synthetic; no real order is placed.
