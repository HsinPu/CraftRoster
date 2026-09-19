---
name: project-architecture-review
description: Review existing repository architecture using behavior paths, dependency evidence, and operational constraints to decide whether to retain, locally improve, or restructure it. Use for project architecture health checks, 專案架構不好 or 架構設計需要調整, architecture comparisons, and incremental migration planning. Route behavior-preserving implementation with an already chosen target to code-refactoring.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Project Architecture Review

Use this skill before implementation when the user wants to understand whether a project's architecture is healthy and how it should evolve.

## Workflow

1. Frame the decision: identify the reported pain, review scope, compatibility constraints, and observable success condition. For a general health check, use representative behavior and documented constraints. Inspect available code and project guidance before asking only for missing facts that could change the decision; label provisional assumptions.
2. Map the relevant source, generated files, runtime, entry points, module ownership, dependencies, tests, and deployment boundaries. In large repositories, select a bounded feature or representative paths and state what is outside the review; do not imply exhaustive coverage.
3. Trace at least one in-scope behavior from entry through validation, policy, persistence or external effects, and response or failure handling, where applicable. Verify suspected dependencies at actual imports or call sites. Separate runtime, build, and type-only edges when their effects differ; folder names alone are not evidence.
4. Diagnose each candidate issue against the user's pain or a concrete failure mechanism. Record source locations, observed behavior, impact, and confidence; distinguish confirmed issues from hypotheses and uninspected areas. Treat framework conventions and architecture smells as investigation leads, not automatic defects.
5. Choose retain, local improvement, or boundary restructuring. Compare alternatives only when there is a material tradeoff, including retaining the current shape. Fit the recommendation to project size, actual change patterns, ownership, operations, and migration cost. If no justified change is found, explain the evidence and limits, then stop without manufacturing a migration plan.
6. For justified changes, plan ordered slices with affected boundaries, behavior and public contracts to preserve, dependencies, acceptance checks, and rollback or stopping conditions. Discover validation commands from the repository; distinguish proposed checks from checks actually run. Hand off the selected direction and evidence to implementation without treating the review as authorization to edit.

## Incomplete Evidence And Review Boundary

- If source access or critical constraints are missing, provide a bounded provisional assessment, name the missing evidence and the next check that could resolve it, and defer decisions that depend on it. Absence of evidence does not establish architectural health.
- If a test or analysis tool is unavailable, record the attempted command and limitation when applicable. Continue with available static evidence; do not invent execution results or install dependencies merely to finish a review.
- Return the assessment inline by default. Persist a report only when requested or owned by the active workflow, using repository conventions. Avoid implementation changes, temporary artifacts, or background processes for a review alone; account for any retained artifacts if they were necessary.

## Review Areas

- Repo shape, package layout, build scripts, and generated vs source files.
- Dependency direction and whether coupling causes concrete change, testing, or operational costs.
- Feature, module, layer, and bounded-context boundaries.
- Data flow across request handlers, commands, jobs, events, persistence, and external APIs.
- Configuration, secrets, constants, environment loading, and hardcoded values.
- Test boundaries, fixtures, integration points, and architecture guardrails.
- Deployment, migration, observability, and operational constraints.

## Output Shape

- **Scope and current state**: decision, constraints, inspected behavior paths, and coverage limits.
- **Findings**: prioritized issues with source locations, mechanism, impact, and confidence; separate hypotheses from confirmed issues.
- **Decision**: retain, locally improve, restructure, or defer pending evidence, with rationale and alternatives only where useful.
- **Migration plan, if needed**: slices linked to findings, preserved behavior, acceptance checks, and rollback conditions.
- **Verification and handoff**: checks run and their results, proposed or unavailable checks, unresolved questions, and the next owner with the evidence they need.

## Handoff

- Use `domain-modeling` when architecture boundaries depend on business language, invariants, lifecycle, or consistency ownership.
- Use `code-change-workflow` when tracing an existing behavior path before edits.
- Use `code-refactoring` when the target architecture is chosen and the work is behavior-preserving cleanup.
- Use `python-development`, `java-architecture`, `typescript-development`, `vue-development`, `spring-development`, or another stack skill for language/framework details.
- Use `database-design` for schema ownership, persistence boundaries, or data migration design.
- Use `api-contract-design` for public API boundaries, versioning, pagination, idempotency, and compatibility.
- Use `spec-flow` or `specification-authoring` when the recommendation should become a formal implementation spec.
- Use `product-pitch-writing` when verified system capabilities, tradeoffs, and limitations should become an audience-facing presentation speech or product pitch.

Read [reference/architecture-review.md](reference/architecture-review.md) when evaluating suspected smells, comparing architecture options, or detailing migration acceptance. Maintainers can use [evals/evals.json](evals/evals.json) for behavioral regression scenarios and [evals/routing.json](evals/routing.json) for selection cases; case definitions do not establish runtime success.
