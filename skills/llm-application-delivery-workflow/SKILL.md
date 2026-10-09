---
name: llm-application-delivery-workflow
description: Stage-gated orchestration workflow for taking an LLM feature from a product outcome through architecture routing, data and safety contracts, evaluation evidence, operational readiness, rollout, and post-release learning. Use when an AI application spans two or more of model APIs, agents, RAG, evals, security, observability, API contracts, data migrations, or deployment; do not use for a narrow single-component implementation.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "github/awesome-copilot"
  reference-license: "MIT"
  reference-revision: "2c2461a7fa383f664bb75546f03a2c6087f3819d"
---

# LLM Application Delivery Workflow

Coordinate existing specialist skills through explicit artifacts and gates. Keep provider APIs, retrieval algorithms, graders, security controls, and deployment mechanics in their owning skills.

## Delivery Flow

1. Define the user outcome, unacceptable outcomes, authority boundary, latency and cost envelope, data sensitivity, and measurable acceptance criteria.
2. Choose the smallest architecture that satisfies the outcome. Route direct model integration to `openai-api-development`, tool-using orchestration to `agents-sdk-development`, and grounded knowledge access to `rag-vector-search`.
3. Record input, output, tool, API, persistence, and authorization contracts. Route public service contracts to `api-contract-design` and `api-contract-testing`.
4. Model abuse, prompt injection, data leakage, excessive agency, and unsafe side effects with `threat-modeling`; route implementation findings to `security-code-review`.
5. Build representative evaluation data and a current baseline with `llm-evals`. Include task success, refusal or escalation behavior, tool use, grounding, latency, and cost where applicable.
6. Implement in reviewable increments through the relevant component skills. Route durable schema or data transitions through `database-migration-workflow`.
7. Define traces, logs, metrics, budgets, dashboards, alerts, and failure ownership with `observability-engineering` and `logging-patterns`.
8. Prepare rollout, feature controls, rollback or disablement, smoke checks, and post-release monitoring with `deployment-operations`.
9. Review live outcomes against the approved gates. Send trace-level failures to `agent-introspection-debugging`, recurring quality failures to `llm-evals`, and measurable optimization opportunities to `autoresearch`.

Read [references/delivery-stage-gates.md](references/delivery-stage-gates.md) and preserve the applicable artifact at every gate.

## Orchestration Rules

- Start at the earliest unresolved gate; reuse existing evidence only after verifying its current source revision and artifact hashes, input and dependency lineage, inspected or tested scope, tool and environment target, evaluator version, authority boundary, and actual gate status. A blocked, incomplete, stale, or unrun report cannot become a pass. Load only the producer needed for missing evidence; accepted matching artifacts need no rerun.
- Prefer one model call or one agent with narrow tools until evidence justifies added retrieval, memory, handoffs, or loops.
- Keep application authorization and deterministic business rules outside model discretion.
- Record every skipped gate with its reason, evidence, owner, and residual risk.
- Return to an earlier gate when an eval, security review, migration, or production trace invalidates an assumption.
- Stop when evidence, authority, rollback capability, or an accountable owner is missing.

## Completion Standard

Claim delivery only when the released revision is identified, required gates pass, rollback or disablement is usable, critical observability is live, and post-release evidence supports the user outcome. Do not substitute a successful demo for production readiness.

## Handoff

- Use `todo-first` to track stages, artifacts, owners, and gate status.
- Use `verified-software-delivery` for the inner software implementation and review loop.
- Use `subagent-architecture` to delegate independent component work without overlapping ownership.
- Use `incident-response-postmortems` when a released AI feature causes an active incident or requires coordinated recovery.
