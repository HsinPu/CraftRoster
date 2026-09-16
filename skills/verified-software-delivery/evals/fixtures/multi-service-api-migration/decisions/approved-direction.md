# Approved fictional direction

Introduce a structured public stock quantity so future count units can be named explicitly. Version 1 exposes `{ sku, quantityUnits }`; the new structured representation is `{ sku, quantity: { value, unit: "item" } }`. Counts remain integer item counts with no scaling or rounding.

The rollout may span independently deployed consumers. Allocation clients using the existing representation remain supported throughout the compatibility window. The planning candidate must remain operable if the inventory producer rolls back to the preserved legacy image. Contraction of the older public representation is a later, separate decision after supported consumers migrate; it is not authorized by this task.

The direction and local synthetic target are approved. No task breakdown or sequence of accepted implementation slices is supplied. The agreed acceptance gates below remain mandatory; a passing sample or the user's deployment request does not replace them. Production topology, timing and real rollout observations are intentionally absent.
