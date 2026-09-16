---
name: test-driven-development
description: Implement observable behavior through RED-GREEN-REFACTOR when the user or repository requires TDD, or a focused failing regression or contract test is the appropriate way to lead the change. Use proportionate verification for other work; skip forced cycles for documentation and exploratory throwaway work.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "obra/superpowers"
  reference-license: "MIT"
  reference-revision: "d884ae04edebef577e82ff7c4e143debd0bbec99"
---

# Test-Driven Development

Let an observable behavior and its failing test lead each implementation increment.

## Choose the Verification Approach

Honor an explicit user or repository TDD requirement. Otherwise use `testing-strategy` to judge whether a new failing test adds confidence beyond existing coverage and evidence. Document a reasoned alternative for low-impact reversible work, an already-covered regression, inherited changes, or a failure that cannot be reproduced automatically; selecting an alternative does not itself require user approval.

An alternative must still prove the affected behavior and disclose limitations. Preserve existing implementation and valid evidence when taking over work; do not undo a correct change or manufacture a failure merely to recreate RED. If strict TDD is required but unavailable, explain the specific unmet requirement and continue independent work without silently waiving it.

## Red-Green-Refactor Cycle

1. Define one externally meaningful behavior and choose the smallest test level that can prove it.
2. Write one focused test against the public contract or stable boundary.
3. Run the test and confirm RED for the intended reason. Repair the test setup when it fails for an unrelated reason.
4. Write the minimum production code required to satisfy that behavior.
5. Run the focused test and confirm GREEN, then run the nearest affected suite.
6. Refactor only while the relevant checks remain green.
7. Repeat with the next behavior until the acceptance criteria are covered.

## Existing-Code Rules

- Add a characterization test before changing poorly documented behavior when preserving it matters.
- For a chosen TDD cycle, add a regression test that reproduces a confirmed bug before implementing its fix. When meaningful coverage already exists or automatic reproduction is unavailable, apply the verification approach above instead of duplicating tests or hiding the gap.
- Keep one behavior per cycle so a failure identifies the responsible increment.
- Prefer public outcomes over private implementation details.

## Guardrails

- In a required or chosen TDD cycle, observe the intended test fail before writing its production increment. Any alternative must follow the verification approach above and cannot silently override an explicit TDD requirement.
- Do not weaken assertions, over-mock the behavior under test, or encode the current implementation merely to obtain GREEN.
- Do not continue when RED has the wrong cause or GREEN cannot be explained.
- Keep documentation, generated files, exploratory spikes, and non-executable configuration outside a forced TDD cycle.

## Handoff

- Use `testing-strategy` to choose the appropriate test level, fixtures, and overall test mix.
- Use `python-testing-engineering` for Python RED-GREEN test implementation and `python-development` for the corresponding production-code increment.
- Use `typescript-development` for TypeScript RED-GREEN production increments and typed test boundaries; add `frontend-testing` for React or browser-component tests and `vue-testing` for Vue tests.
- Use `java-testing` for Java RED-GREEN test implementation and `java-development` for the corresponding production-code, type, exception, resource, and public-contract increment.
- Use the relevant language or framework testing skill for other implementation details.
- Use `code-change-workflow` to identify the owner path and affected boundaries before the first cycle.
- Use `incremental-implementation` when the work requires several independently verified slices.
- Use `systematic-debugging` when a test fails for an unknown reason or the implementation does not produce the predicted result.
- Use `verification-before-completion` after all cycles to run the broader acceptance checks and inspect repository state.
