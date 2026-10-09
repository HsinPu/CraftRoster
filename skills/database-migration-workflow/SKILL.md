---
name: database-migration-workflow
description: Approval-gated database migration orchestration workflow for expanding schemas, backfilling data, cutting over application traffic, validating invariants, and retiring old structures with rollback or forward-recovery plans. Use for production or production-like schema and data migrations where compatibility, lock impact, data integrity, observability, or zero-downtime sequencing matters; use database-design for schema modeling and engine or ORM skills for concrete commands.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "wshobson/agents"
  reference-license: "MIT"
  reference-revision: "b6af3711058190e4b5c5274b9758498fe626ec5a"
---

# Database Migration Workflow

Coordinate risky schema and data changes through reversible stages, explicit evidence, and authorized gates.

This stage-completion workflow requires `verification-before-completion`; load it before declaring any stage or the full migration complete. Engine, ORM, pipeline, and rollout companions below apply only to the migration branch they own.

## Plan

1. Identify the database engine and version, environment, migration owner, application owners, dependent jobs, consumers, replicas, and deployment order.
2. Freeze the intended schema or data outcome. Record current volume, growth, write rate, critical queries, maintenance constraints, and compatibility window.
3. Classify lock, table-rewrite, data-loss, replication, performance, and rollback risk. Assign decision owners and abort thresholds.
4. Define data invariants, application acceptance criteria, service-level guardrails, and the evidence required at each stage.
5. Select a staged migration pattern and build a compatibility matrix for old and new application versions against old, expanded, and contracted schemas.
6. Define backup, restore, rollback, and forward-recovery paths. Prove that the chosen recovery path is operationally usable rather than merely documented.
7. Rehearse the migration with production-like schema, representative data volume, concurrency, and failure injection when risk justifies it.

## Execute

1. Apply only the additive or compatibility-preserving expansion authorized for the first stage.
2. Verify schema state, locks, replication, application health, and old-version compatibility before continuing.
3. Deploy compatible application code and begin an idempotent, restartable, throttled backfill with checkpoints.
4. Reconcile source and target data continuously. Stop on invariant violations, unexplained drift, excessive lag, lock pressure, or service degradation.
5. Cut reads or writes over in a reversible step. Observe the agreed soak window and compare old and new paths when both remain available.
6. Remove old columns, tables, code paths, or compatibility behavior only after every consumer has migrated and the rollback window has explicitly closed.
7. Preserve the final schema revision, migration history, verification evidence, exceptions, incidents, and follow-up ownership.

## Gate Artifact

Record the baseline and target revisions, pattern, compatibility matrix, stage owner, commands, evidence, abort thresholds, recovery decision, approval, and next permitted transition. Treat each stage as pending until its evidence is current and its decision owner authorizes continuation.

## Boundaries

- Do not execute production or externally mutating migration steps without explicit authorization.
- Do not assume a down migration can recover deleted or transformed data.
- Do not perform a destructive contract step while old binaries, jobs, replicas, or consumers still depend on the old structure.
- Do not introduce dual writes without precedence, reconciliation, retry, and partial-failure rules.
- Do not hide lock, replication, performance, validation, or restore gaps behind a successful migration command.
- Stop rather than weakening an invariant or abort threshold merely to finish the rollout.

## References

- Read [zero-downtime-migration-patterns.md](references/zero-downtime-migration-patterns.md) when selecting expand-contract, shadow-copy, dual-path, online-index, constraint, or backfill sequencing.
- Read [migration-verification-and-recovery.md](references/migration-verification-and-recovery.md) when defining stage evidence, cutover gates, rollback, forward repair, restore, or incident escalation.

## Handoff

- Use `database-design` to model the target schema, constraints, indexes, and integrity rules.
- Use `prisma-drizzle`, `jpa-hibernate-development`, `mybatis-development`, or another persistence skill for ORM migration artifacts.
- Use `postgres-operations`, `mongodb-development`, or the relevant engine skill for locking, backup, restore, replication, and provider-specific commands.
- Use `data-pipeline-orchestration` when the backfill behaves like a large governed data pipeline with partitions, retries, or lineage requirements.
- Use `observability-engineering` to define migration dashboards, alerts, and service guardrails.
- Use `deployment-operations` to coordinate application rollout, canary stages, rollback, and post-cutover health.
- Use `incident-response-postmortems` when the migration causes an active reliability or security incident.
- Use `pipeline-review` for an independent gate over the migration plan or completed stage.
- Use `verification-before-completion` before declaring a stage or the full migration complete.
