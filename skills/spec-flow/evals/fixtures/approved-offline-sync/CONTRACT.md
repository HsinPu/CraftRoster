# Approved offline document sync: planning inputs

Every approval, product, role, environment, and document in this directory belongs to a **fictional evaluation scenario**. None is a real product decision, an actual person's approval, or permission to operate an external system. No implementation, staging rehearsal, telemetry collection, migration, or release has been performed. The current task is to produce a local implementation-ticket plan only; do not create tracker issues or execute the planned work.

Read `decision.md` and the accompanying structured contracts. `scenario.json` identifies settled decisions, scope, available local planning resources, and exclusions. `open-decisions.json` contains the unresolved facts; their prerequisites should not be silently replaced with guessed values. The contracts and synthetic samples are evidence inputs for planning, not completed engineering work or a prewritten ticket queue.

The samples contain only invented document text. `samples/sync-scenarios.json` presents first uploads, retries, concurrent edits, and post-send edits for acceptance-design purposes. It contains no measured results. `samples/client-store-v1.json` and `samples/client-store-v2.json` allow concrete compatibility and recovery cases without access to a real client database. `samples/telemetry-event.json` is a proposed valid event example, not an event that was collected.

Create your own work-item identities and vertical slices from these sources. The requested output must expose acceptance evidence, dependencies, readiness, and unresolved prerequisites. No expected tickets, complete dependency graph, grading rubric, or model result is bundled here.
