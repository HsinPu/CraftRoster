# Mixed-version migration review

This is a fictional, read-only source review. `base/` contains the previous migration proposal; `head/` contains the changed proposal. The unchanged v1 and v2 application modules, API serializer, initial rows, runner and deployment plan are supplied under `shared/`. These folders are source views, not Git commits or a live database.

The approved requirement is uninterrupted customer reads and writes during a rolling transition from `display_name` to `full_name`. Both application versions remain active during the mixed stage. Existing names and the public JSON `displayName` field must survive. Inspect the actual SQL, both producers and consumers, migration retry bookkeeping, rollback order and indexes. An ordinary v2-only test does not establish mixed-version acceptance.

`node test/migration.test.cjs base` and `node test/migration.test.cjs head` run only ordinary project checks against an in-memory SQLite database. The fixture requires Node with `node:sqlite` (the fixture package declares Node >=22.13). It has no third-party dependencies, external database, credentials or network. Missing SQLite capability must be disclosed; a JSON simulation is not equivalent evidence. No production lock duration, large backfill, deployment or model result is claimed.

No repair, schema change to any real database, commit or deployment is authorized by this review fixture. The SQL may be exercised only inside its isolated author/evaluation database. Private compatibility probes and expected findings are not part of this directory.
