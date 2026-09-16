# Fictional decision record: offline editing for already-opened documents

Scenario `FICTIONAL-OFFLINE-SYNC-1` concerns a small text-document editor. Product direction is settled for this evaluation: a user can open an existing document while connected, edit its title and body without a connection, restart the client without losing the draft, and reconcile changes after reconnecting. A local “saved on this device” state must remain distinguishable from a server acknowledgement. Existing online-only clients continue to work during the compatibility window.

The scenario approval covers this direction and local synthetic-data implementation work. It does not approve production execution. The actual evaluation request is to turn the direction into tickets; do not execute implementation or publish those tickets. The named owner roles below are fictional organizational responsibilities, not contactable people.

## Scope and operating limits

The first release covers existing plain-text documents already cached by an authenticated user, title/body editing, a durable outbox, retry, explicit conflict resolution, and visible sync state. Cached editing must work across a restart. A server acknowledgement can mark only the exact immutable operation that was sent; edits made while it is in flight must remain a newer local draft.

Assume up to 50 cached documents, each at most 262,144 UTF-8 bytes including title and body. Local storage can fail or become full. Surface that failure and preserve the last durable draft rather than displaying a false saved state. No background synchronization after logout is allowed. Authentication and permission checks still apply at reconnection; a rejected upload must not erase the local draft.

New-document creation, document deletion, binary attachments, shared live cursors, real-time collaborative merging, cross-account draft transfer, and a new authentication system are outside this release. Attachments and live collaboration may be considered in a later product phase; their presence in a planning backlog does not expand this scope.

## Conflict and retry decision

Use revision-based optimistic concurrency, not last-write-wins or automatic text merging. A matching base revision can be accepted; a stale base revision returns a conflict without changing the server document. Keep both the local draft and the latest server snapshot available to the user. “Use server” requires the user's explicit choice before discarding the local pending version. “Keep mine” creates a new operation against the latest observed server revision; it is not a blind overwrite of a newer unseen revision.

Each operation has a stable client mutation ID. A retry of the same ID and same payload returns the original receipt without applying the edit again. Reusing that ID with different contents is invalid. Once sent, the operation's contents cannot change. A subsequent local edit becomes a separate draft linked to its predecessor and must not be acknowledged by the predecessor's receipt. Structured details are in `contracts/sync-policy.json`.

## Compatibility and privacy decisions

Preserve the existing v1 online read/write contract and document fields. Add v2 sync support before rolling out v2 clients. Keep the v1 storage namespace readable and do not destructively rewrite or remove it. Store the v2 durable outbox in its own namespace. During a rollback to the old client, preserve that namespace even when the old client cannot read it; restoring the old executable alone does not recover pending offline drafts.

The minimum mixed-client/rollback window is seven days after the v2 public rollout begins. Elapsed time alone does not permit contraction: old-client use, pending drafts, recovery evidence, and an explicit contraction decision must also be resolved. Required compatibility cases and recovery constraints are in `contracts/schema-compatibility.json` and `operations/rollout-recovery.json`.

Telemetry uses coarse outcome counts and duration buckets only. Do not collect document titles, bodies, content hashes, document IDs, mutation IDs, account IDs, device IDs, email addresses, URLs, exception stacks, or arbitrary free-text messages. Local schema and redaction tests can use synthetic inputs. Live collection additionally requires a retention decision and assigned privacy owner; neither exists yet in this scenario. The allowed schema and unresolved retention reference are in `contracts/telemetry-policy.json`.

## Rollout and recovery boundaries

Plan progressive exposure only after compatible server support, local durability/retry/conflict checks, mixed-client staging evidence, privacy prerequisites, and an assigned release decision owner. Public expansion must stop on draft loss, duplicate application, incorrect acknowledgement, or a failed recovery rehearsal. Metrics are planned gate inputs, not results that have already been observed.

A bad client release must be containable by rejecting new sync uploads from the affected version while preserving pending local data. Re-enable uploads only after a fixed build passes the same gates. Before a client downgrade or destructive storage repair, preserve a byte-for-byte local backup and prove how pending v2 drafts remain recoverable. A recovery utility should inspect a copy first and must not publish recovered text in telemetry. Do not invent approval to discard drafts, contract the schema, or access production.

The source material intentionally leaves three facts unresolved: telemetry retention and its accountable owner, the release decision owner, and availability of the isolated mixed-client staging environment. These facts do not erase the settled product direction or prevent planning independent local verification work.
