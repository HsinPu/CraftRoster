---
name: receiving-code-review
description: Code-review remediation workflow for triaging incoming findings, validating each claim against the current code and requirements, resolving ambiguity, implementing accepted changes, and returning evidence for re-review. Use when review comments, pull-request feedback, a review report, or requested changes must be evaluated and addressed; do not use to perform the original review.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "obra/superpowers"
  reference-license: "MIT"
  reference-revision: "d884ae04edebef577e82ff7c4e143debd0bbec99"
---

# Receiving Code Review

Turn incoming review findings into traceable remediation without blindly accepting or dismissing feedback.

## Workflow

1. Freeze the reviewed baseline and collect each finding's identifier, location, evidence, severity, and acceptance criterion.
2. Classify each finding as accepted, unclear, duplicate, stale, disputed, or out of scope. Preserve the reviewer's original identifier.
3. Inspect the current code, requirements, and tests to validate the claim. Ask a focused question when the required behavior or evidence is ambiguous.
4. Order accepted findings by blocking severity, dependency, and regression risk.
5. Address one independently verifiable finding or related root cause at a time.
6. Run focused checks for each remediation, then run the broader affected suite.
7. Return a remediation record with the change, evidence, remaining gap, and requested re-review action for every finding.

## Response Rules

- Acknowledge technically valid feedback with the evidence and planned correction.
- Explain a disputed finding with concrete code, contract, or test evidence rather than preference.
- Separate clarification questions from claims that are ready for remediation.
- Preserve unresolved findings until the reviewer verifies them or the decision owner explicitly accepts the risk.
- Keep public replies, thread resolution, approvals, and external mutations behind explicit authorization.

## Boundaries

- Do not implement feedback before understanding its failure scenario and intended outcome.
- Do not mark a finding reviewer-verified from the implementer role.
- Do not combine unrelated findings into a broad refactor that obscures proof.
- Do not change requirements merely to make a finding disappear.

## Handoff

- Use `github-operations` to inspect or update pull-request discussions when GitHub interaction is authorized.
- Use `code-change-workflow` to trace the affected owner path and implement an accepted remediation safely.
- Use `systematic-debugging` when the reported failure cannot be reproduced or its cause remains disputed.
- Use `test-driven-development` when an accepted correction needs new regression coverage to lead the change.
- Use `verification-before-completion` to prepare fresh remediation evidence.
- Return to the original independent reviewer for re-review and finding closure. Use `pipeline-review` only when the original review is a pipeline gate or the requested outcome calls for a new independent stage gate; preserve that gate's finding identifiers and rounds. Findings from another review source do not require a pipeline installation merely to return remediation evidence.
