---
name: pipeline-review
description: Run an independent, read-only review gate between implementation stages using three-level findings, a stable review-report artifact, explicit ownership, and repeatable review loops. Use after a change set or delivery stage is complete and before merge, release, or the next pipeline stage.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "wshobson/agents"
  reference-license: "MIT"
  reference-revision: "b6af3711058190e4b5c5274b9758498fe626ec5a"
---

# Pipeline Review

Use this workflow to separate implementation from acceptance. Keep the reviewer read-only: the reviewer reports defects and evidence but never repairs, stages, commits, or publishes the reviewed change.

## Umbrella Contract

1. Read the sibling [`../code-review/SKILL.md`](../code-review/SKILL.md) before running the gate.
2. Keep this Skill responsible for stage identity, reviewer independence, stable finding IDs, report persistence, re-review rounds, and risk exceptions.
3. Keep `code-review` responsible for review depth, intent and implementation passes, finding evidence, severity, confidence, coverage, and the cross-domain verdict.

## Roles

- **Implementer:** supplies the completed change, intent, test evidence, and known limitations; fixes accepted findings in a separate remediation pass.
- **Reviewer:** independently inspects current files, diffs, contracts, and tests; produces findings without editing the change.
- **Coordinator:** preserves the report, routes findings, and starts another review after remediation.
- **Decision owner:** accepts residual risk or authorizes a gate exception. Neither reviewer nor implementer may self-approve an exception.

## Review packet

Require these inputs before review:

- target revision, diff, or explicit file scope;
- intended behavior and acceptance criteria;
- repository guidance and affected public contracts;
- tests and checks actually run, including failures or omissions;
- known risks, migrations, operational effects, and rollback expectations.

If material inputs are missing, record a verification gap instead of guessing.

## Workflow

1. Freeze the review baseline and identify the current stage and next gate.
2. Read the implementation directly; do not rely only on the implementer's summary.
3. Classify review depth and perform separate intent/specification and implementation-safety passes through the sibling `code-review` contract.
4. Trace changed behavior through callers, data, errors, permissions, compatibility, tests, deployment, and rollback where relevant.
5. Report only reproducible or well-supported findings. Group repeated symptoms under one root cause.
6. Classify every finding using the three levels below and assign a stable ID.
7. Return the structured report with a coverage ledger. Have the coordinator persist it as the agreed `review-report` artifact.
8. Route accepted findings to an implementer. Do not let the reviewer apply fixes.
9. Re-review the updated baseline, verify each prior finding, inspect remediation regressions, and append a new review round.
10. Pass the gate only when blocking findings are resolved and required acceptance evidence is satisfied, or the decision owner records an explicit risk exception for the outstanding item.

## Finding levels

- **Blocker:** likely correctness, security, data-loss, compatibility, or release failure. The gate is closed.
- **Major:** a supported material defect that can harm users or operations. The gate stays closed unless the decision owner records a reasoned, time-bounded exception.
- **Advisory:** useful non-blocking improvement. It must not be promoted to a gate failure by preference alone.

Each finding must include location, evidence, failure scenario, impact, acceptance criterion, and confidence. Keep questions and unverified risks outside the finding list.

## Gate Evidence

Keep missing evidence separate from confirmed defects. Record each material gap against the acceptance claim it limits, its required or optional status, the current baseline, and the smallest check that would resolve it. A predeclared required check that is missing or unavailable can block the gate with zero confirmed findings; do not relabel that gap as a Major defect. Optional evidence does not become a blocker by preference alone.

Use `satisfied`, `missing`, or `unavailable` for required evidence. Preserve the decision owner's reason and expiry for any accepted exception. Review the actual evidence after remediation instead of changing the acceptance requirement to obtain a pass.

## `review-report` artifact

Use this stable structure in the response or in a coordinator-owned file:

```markdown
# Review Report

- Review ID:
- Round:
- Baseline:
- Scope:
- Intended behavior:
- Review profile:
- Checks reviewed or run:

## Findings

| ID | Level | Location | Evidence and failure | Acceptance criterion | Status |
|---|---|---|---|---|---|

## Verification gaps

| Acceptance claim | Required? | Evidence status | Baseline | Next check or exception |
|---|---|---|---|---|

## Review coverage

## Resolved findings

## Decision

- Verdict: block | conditional | pass
- Required owner actions:
- Risk exceptions and expiry:
- Next review trigger:
```

Append a round or preserve prior finding IDs rather than overwriting history. Only the reviewer may mark a finding verified; only the decision owner may mark risk accepted.

## Loop controls

- Reopen a resolved finding when evidence shows the acceptance criterion no longer holds.
- Stop and escalate when the same finding repeats without new remediation, required evidence is unavailable, or authority for an exception is missing.
- Do not weaken acceptance criteria merely to end the loop.
- Do not run destructive tests, mutate external systems, or exceed the review's authorized scope.
- Do not auto-fix, silently patch, or combine review and implementation in one role.

## Handoff

- Use `code-change-workflow` to route accepted findings back to the implementation owner.
- Use `receiving-code-review` to triage, remediate, and report the status of accepted findings before re-review.
- Use `testing-strategy` to close verification gaps with the smallest meaningful test level.
- Use `verification-before-completion` for fresh implementer-side evidence; keep the reviewer-side acceptance decision in this skill.
- Use `github-code-review` when the review packet lives in a pull request and needs GitHub context.
- Use `repo-ready` after the gate passes and repository release readiness still needs work.
