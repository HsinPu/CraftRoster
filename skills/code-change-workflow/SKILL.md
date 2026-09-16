---
name: code-change-workflow
description: Default pre-edit workflow for modifying existing code safely. Use before bug fixes, feature changes, refactors, behavior adjustments, or multi-file edits to inspect entry points, call chains, data flow, tests, constraints, and verification paths, then make the smallest safe change.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Code Change Workflow

Use this as the default first skill for existing-code changes. It answers: what code owns this behavior, what can break, and how will the edit be verified?

## When To Use

- Any request to modify code in an existing repository, unless the owner code path and verification are already obvious
- Bug fixes, feature changes, refactors, and behavior adjustments in existing code
- Tasks with unclear entry points, data flow, state flow, or side effects
- Multi-file changes where a small edit can affect callers, tests, APIs, UI, or persistence
- Codebases where local conventions matter more than generic implementation advice

## Routing Rules

- Start here for existing-code edits before choosing language, framework, refactoring, or testing details.
- If the inspection shows the change is broad, risky, or multi-step, add `incremental-implementation` to split the work into verified slices.
- If the requested change is behavior-preserving cleanup, use `code-refactoring` for the refactor rules after the current behavior and verification path are known.
- When the requested change or diagnostic evidence involves Python code, runtime behavior, package configuration, or a Python traceback, read `python-development` and let its routing gate select the smallest required Python specialist.
- When the requested change or diagnostic evidence involves TypeScript code, compiler configuration, typed APIs, or a `tsc` or `vue-tsc` diagnostic, read `typescript-development` and let its routing gate select the smallest required specialist. A Python or TypeScript dependency elsewhere in the repository is a discovery signal, not sufficient activation evidence.
- When the target contains Java source, `.java`, Java source sets, a `javac` diagnostic, or a Java or JVM stack trace, read `java-development` before planning and let its routing gate select the smallest required architecture, framework, persistence, testing, build, debugging, or refactoring specialist. For Maven or Gradle configuration with no Java source or runtime change, use `jvm-build-tooling` without forcing the Java baseline.
- Use stack-specific skills only after the owner code path is understood.
- Use `code-review` or `security-code-review` instead when the task is only to review an existing diff.

## Workflow

1. Read the request and local instructions such as `AGENTS.md`.
2. Inspect repository state and avoid mixing unrelated user changes into the task.
3. Locate the entry point: route, command, component, handler, service, job, test, or config.
4. Trace the current flow through callers, callees, data models, state, side effects, and error paths.
5. Identify existing tests, fixtures, scripts, logs, docs, or manual checks that prove behavior.
6. Define the smallest safe change that fits existing patterns.
7. Edit only the files needed for that change.
8. Run the narrowest useful verification, then broaden only if risk justifies it.
9. Report what flow was understood, what changed, and what was verified.

## What To Inspect First

- Entry points: routes, controllers, commands, event handlers, UI pages, jobs, hooks, or scripts.
- Boundaries: API contracts, database schema, auth checks, feature flags, environment variables, and external services.
- Data flow: input shape, validation, transformation, persistence, caching, and output shape.
- State flow: local state, stores, context, sessions, queues, transactions, retries, and background work.
- Error flow: exceptions, fallback behavior, user-visible errors, logging, metrics, and rollback behavior.
- Tests: unit, integration, e2e, snapshots, fixtures, mocks, smoke commands, and CI checks.

## Change Rules

- Do not edit before finding the relevant owner code path.
- Prefer local patterns over a new abstraction.
- Keep changes surgical; every edited line should trace to the request.
- Do not refactor adjacent code unless it is required to make the requested change safe.
- Preserve public contracts unless the user explicitly asked for a breaking change.
- If the change affects persistence, auth, billing, security, or public APIs, state the impact before editing when possible.

## Verification Rules

- For bug fixes, reproduce or identify the failing path before fixing when feasible.
- For UI changes, verify the affected screen or interaction, not only compile success.
- For API changes, verify request, response, error, and auth behavior.
- For data changes, verify migration/backfill/rollback assumptions.
- If tests are missing, use the best available smoke check and state the gap.
- Do not claim success without naming the verification that passed.

## Decisions and Authorization

Use security, billing, persistence, and public-contract impact to choose inspection and verification depth. Those domains alone do not require another confirmation.

- Carry forward authorization already established for the target, operation, environment, and material effects. Continue authorized inspection, reversible implementation, and safe verification without asking again.
- Ask when a material requirement remains unresolved after inspecting available evidence, or the next action exceeds that authority. Name the specific decision or action and what is missing.
- Keep an unapproved destructive operation, real payment, production mutation, or new credential access pending; continue independent work that does not depend on it.
- For low-risk ambiguity, state the repository-grounded assumption and proceed. Reassess if evidence changes the scope or consequences.

## Handoff

- Use `karpathy-guidelines` for broader coding behavior, simplicity, and assumption handling.
- Use `terminal-ops` for command-driven proof and repo state checks.
- Use `systematic-debugging` first when the failure is reproducible but its root cause is unknown or disputed.
- Use `incremental-implementation` when the change needs multiple safe slices, checkpoints, or commits.
- Use `test-driven-development` when the user or repository requires it, or a failing regression or contract test is the appropriate way to lead the change. Use `testing-strategy` to judge proportionate alternatives; a reasoned exception is not automatically a new approval gate.
- Use `pipeline-review` after a meaningful implementation stage needs an independent read-only acceptance gate.
- Use `receiving-code-review` when this edit is remediation for an existing finding or review comment.
- Use `verification-before-completion` immediately before claiming the requested change is complete.
- Use `code-refactoring` when the goal is behavior-preserving cleanup.
- Use `testing-strategy` when deciding how much verification is enough.
- Use language or framework skills for implementation details after the current flow is understood.
