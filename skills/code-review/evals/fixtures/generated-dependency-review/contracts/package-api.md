# Offline depot package and application boundary

This fixture uses its own exact-version package resolver. Only the two releases in the local registry exist. Registry source hashes use UTF-8 text normalized to LF. There are no remote fetches, version ranges, install scripts, native binaries, credentials or optional dependencies. A source digest mismatch or missing exact release must stop resolution. Hashes identify the fixed local inputs; they do not assert real upstream provenance.

The adapter exports `listDepots(records)` and `getDepot(records, depotId)`. Listing returns all records in seed order. Lookup returns the matching record or `null`. Records contain exactly `depotId`, `label` and integer `capacity`. Returned records are copies: callers may edit their copy without changing subsequent lookup results. Capacity and identifiers retain the seed values. Both release sources are supplied for comparison.

The application consumer exposes `listDepots()`, `getDepot(id)` and `canReserve(id, units)`. Reservation eligibility is a local calculation only: a known depot, positive safe-integer units, and units no greater than that depot's capacity. No reservation is persisted or sent. An unknown depot or invalid unit value is ineligible. Changing field names, values or export semantics can affect this boundary even when a package smoke test passes.

Every generated data node has a unique fully qualified ID and content digest. Exactly one dependency edge connects the selected adapter to each data node. The JSONL artifact is derived, while the manifest, fixed registry, data seed, source and generator are canonical. Each node exists to serve an independently queryable depot; each edge defines that package's inclusion in the selected graph.
