---
name: deployment-operations
description: Prepare, review, execute, or verify an environment deployment with artifact checks, rollout, smoke tests, health evidence, and recovery. Match the requested mode and authorized target; a readiness review does not authorize deployment.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Deployment Operations

Use this skill when shipping a build and proving the release is healthy.

## Workflow

1. Identify whether the request is prepare, read-only review, or execute; establish the exact environment, artifact, deploy path, and authorized effects from the conversation.
2. Inspect configuration, secret references, migrations, access, and recovery evidence without exposing secret values. Prepare local artifacts only when that is within scope.
3. For prepare or review, return readiness evidence and gaps without deploying. For execute, use the documented release path only for the authorized target and artifact; carry forward valid existing authorization without reconfirming it.
4. Run authorized smoke checks on the critical journey and health endpoints, avoiding real payments, messages, or data mutations outside scope.
5. Inspect logs, metrics, and error rates after an authorized deployment.
6. Stop the rollout on failed verification; execute rollback only within the authorized recovery plan, otherwise report the concrete recovery action that needs authority.

## Rules

- Prefer the existing deploy mechanism over ad hoc commands.
- Treat config and migrations as part of the release.
- Keep the rollout scope as small as possible.
- Do not declare success until post-deploy checks pass.

## Handoff

- For repo setup and release automation, use `repo-ready`.
- For schema or data rollout with compatibility, backfill, validation, and recovery stages, use `database-migration-workflow`.
- For an LLM or agent release that requires eval, cost, safety, and observability gates, use `llm-application-delivery-workflow`.
- For local command execution and proof, use `terminal-ops`.
- For GitHub releases or workflow checks, use `github-operations`.
