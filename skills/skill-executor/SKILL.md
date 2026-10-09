---
name: skill-executor
description: Execute a Skill, bundled script, or representative task inside an explicit isolation and authority boundary, then capture reproducible runtime evidence, side effects, failures, cleanup, and repeated-run behavior. Use when static lint or audit cannot prove tool behavior before adoption or release; do not use real secrets, production systems, or consequential external actions without separate explicit authority.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Skill Executor

Prove only the behavior that was actually observed inside a declared run boundary.

## Run Packet

Define before execution:

- Skill source, revision, package hash, entry command, prompt, fixtures, and expected invariant;
- allowed read and write paths, commands, tools, subprocesses, network destinations, and external systems;
- credential policy, using synthetic values or empty credential stores by default;
- timeout, cancellation signal, process cleanup, temporary directory, and retained evidence;
- baseline: no Skill, prior Skill revision, or known-good artifact when effectiveness or regression is being judged.

## Isolation Levels

1. **Static only**: do not run content when provenance, permission, or package safety is unresolved.
2. **Read-only local**: allow deterministic inspection commands with no writes, network, credentials, or external actions.
3. **Disposable sandbox**: copy the minimum package and fixtures to a temporary boundary; block real secrets and network by default; observe filesystem and process changes.
4. **Controlled staging**: permit named external systems or network destinations only after explicit authority, least-privilege credentials, rollback, and stop conditions are recorded.

Use the lowest level that can prove the requested behavior.

## Workflow

1. Before executable content crosses the runtime boundary, require matching scan, lint, and applicable security verdicts. Reuse valid reports under the identity rules below; use `skill-scan`, `skill-lint`, `skill-audit`, or `skill-security-review` only for the evidence still missing. An available repository-native validator may supply the structural verdict if it covers the required checks. Do not execute while a required gate is failed, blocked, incomplete, or unavailable.
2. Snapshot the allowed filesystem, processes, environment shape, and external state needed to detect side effects.
3. Execute the exact run packet once. Capture command, working directory, start and end time, exit status, stdout, stderr, tool calls, file changes, network attempts, timeout, and cancellation behavior.
4. Compare observed actions and outputs with the Skill's declared capability, permissions, completion claim, and residue contract.
5. Clean up processes and temporary artifacts. Verify cleanup instead of assuming it.
6. Repeat the same packet after a change; run multiple trials when output is nondeterministic.
7. Compare against the baseline when the question is whether the Skill improves selection or task results.
8. Classify the proof as pass, fail, blocked, or inconclusive and state the untested surface.

## Reusing Gate Evidence

Verify each report against the run packet's source revision, full package inventory and file hashes, dependency identity, inspected scope, target tool and version, and permission boundary. Also check the validator or reviewer version, actual commands or observations, and recorded status. A static report must explicitly identify runtime checks as not applicable or unrun; it cannot supply runtime proof for the packet.

Changes to the package, dependencies, target tool, relevant environment, or authority boundary invalidate affected reports. Keep failed, blocked, and incomplete verdicts intact; report availability never establishes a pass. If an evidence producer is unavailable, remain in static-only mode and name only that missing prerequisite.

## Stop Conditions

- Stop before execution when provenance is mutable, content is opaque, package boundaries escape, or required authority is missing.
- Stop a run on timeout, unexpected network or secret access, path escape, destructive behavior, privilege expansion, or an external action outside the packet.
- Preserve failure evidence without retaining real credentials or sensitive payloads.
- Do not widen permissions merely to make the test pass.

## Rules

- Use synthetic data and disposable locations by default.
- Keep each run small enough to reproduce and attribute.
- Separate a Skill instruction failure from a harness, dependency, tool, or environment failure.
- Do not claim general reliability from one happy-path run.
- Do not leave servers, browser sessions, mounts, branches, temporary credentials, or generated artifacts without an explicit owner.

## Output

Return the run packet, isolation level, commands, observations, baseline comparison, per-trial results, side-effect diff, cleanup proof, verdict, confidence, and remaining uncertainty.

## Handoff

- For repo shell commands and git state checks, use `terminal-ops`.
- For a run packet that verifies a local application's UI behavior, use `webapp-testing`.
- For an authorized browser interaction or retrieval task in the run packet, use `browser-automation` or `playwright-automation`; browser transport alone does not make the task local application QA.
- For a missing deterministic package structure verdict, use `skill-lint` or an equivalent repository-native validator.
- For missing provenance, safety, or maintenance evidence, use `skill-audit` or `skill-security-review` according to the unresolved review scope.
- For release certification after the execution proof passes, use `skillforge`.
