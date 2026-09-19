# Project Architecture Review Reference

Use this reference when a project needs architecture diagnosis, not just code cleanup.

## Investigation Leads

| Lead | Evidence to inspect | When the current design may be appropriate |
|---|---|---|
| Rules in controllers, UI, ORM models, or SDK wrappers | Trace callers, duplicated invariants, transaction ownership, and the dependencies required to test a rule | Framework-native models or small handlers keep one rule in one place with reliable tests |
| Cross-layer imports or suspected cycles | Identify the complete cycle at import/call sites; distinguish runtime initialization from type-only or build edges and show the failure or change cost | A deliberate framework dependency or type reference does not create the alleged runtime cycle |
| Broad `utils`, `services`, or `common` folders | Inspect actual responsibilities, consumers, ownership, and unrelated changes that must move together | Shared helpers are cohesive and independently testable despite a generic folder name |
| Scattered policy or configuration values | Check whether values represent the same policy, can drift, or must vary by environment; avoid exposing secret values | Similar literals belong to independent concepts, or framework configuration already provides a clear owner |
| Only full-stack tests | Measure setup requirements and locate rules with costly or unreliable feedback | A small integration application has fast, reliable end-to-end coverage and little independent policy |
| A feature touches many folders | Follow a representative change and separate necessary contract updates from accidental coupling | Coordinated schema, client, and UI changes are an intentional contract boundary |
| Generated files beside source | Inspect generation scripts, source-of-truth rules, and edit/release failures | Colocation is deliberate and generated ownership is enforced |
| Jobs or deployment are absent from the folder map | Inspect configuration, entry scripts, schedules, transaction and retry ownership | Operational definitions live in another documented package or repository; unavailable evidence remains a coverage limit |

## Scope Variants

- **Small application or script**: inspect its main path and failure behavior; evaluate whether a new abstraction would solve an observed problem. A healthy design can end with a concise retain decision.
- **Large repository or monorepo**: follow the requested feature across package exports and relevant build/deployment boundaries. Inspect direct consumers where contracts cross the scope; label other packages as unreviewed. Do not infer repository-wide health from one path.
- **Partial source or unavailable execution**: identify which conclusions static evidence supports and which require runtime or operational evidence. Propose the smallest discriminating check; avoid choosing a migration that depends on unresolved assumptions.

## Architecture Options

These are composable choices at different levels, not mutually exclusive templates. Feature modules may live inside a modular monolith and use ports only at selected integration boundaries. Compare only choices that address the observed problem; retaining the current design needs no new guardrails unless evidence justifies them.

| Option | Good Fit | Avoid When |
|---|---|---|
| Keep current shape, optionally add focused guardrails | Healthy paths, low churn, or mostly local pain | Existing boundaries demonstrably cause repeated failures that guardrails cannot address |
| Layered architecture | CRUD or service apps with clear UI/application/data layers | Features cut across layers so often that ownership becomes vague |
| Feature-based modules | Product surfaces with independent feature ownership | Shared domain rules need stronger central modeling |
| Modular monolith | Growing backend with several bounded contexts but one deployable | Teams need independent release schedules now |
| Clean/Hexagonal architecture | Domain rules, external systems, and testability matter | The app is mostly simple glue or short-lived automation |
| Plugin/adapter architecture | External providers, tools, commands, or integrations vary often | Variability is speculative and adds indirection |
| Microservices | Independent ownership, scaling, release, and data boundaries are proven | The main problem is code organization inside one repo |

## Audit Questions

### Project Shape

- What are the entry points: web, CLI, jobs, workers, tests, scripts, or package exports?
- Which folders are source, generated output, vendored content, assets, or local artifacts?
- Does the repo layout match the way users, teams, or domains talk about the product?

### Boundaries

- Which module owns core policy and business rules?
- Would isolating a rule from HTTP, UI, ORM, SDK, or filesystem dependencies resolve a demonstrated testing or change problem?
- Which dependency direction is intended, and which observed edge violates that contract or creates a concrete cost?
- Are shared helpers truly shared concepts, or just unrelated convenience functions?

### Data Flow

- How does data enter, get validated, move through policy, persist, and leave the system?
- Where are transactions, retries, idempotency, caching, and error mapping handled?
- Are DTOs, persistence models, domain models, and API responses separate when they need to be?

### Configuration

- Are environment variables parsed in one visible place?
- Are magic values replaced with named constants, typed config, or domain policies?
- Are secrets and environment-specific settings isolated from reusable logic?

### Tests

- Does framework setup make core-rule tests slow, unreliable, or unable to isolate the relevant behavior?
- Are adapters tested where protocol, serialization, persistence, or integration behavior matters?
- Is there a cheap regression test for each migration slice?

## Recommendation Criteria

Prefer the target architecture that:

1. Removes the user's current pain with the least new ceremony.
2. Matches the actual change pattern of the project.
3. Makes boundaries visible in folders, imports, and tests.
4. Can be migrated one slice at a time.
5. Has clear verification commands after each slice.

## Migration Planning

For each proposed slice, capture:

| Field | Required detail |
|---|---|
| Reason and scope | Finding addressed, owned boundary, affected callers, and dependencies on earlier slices |
| Preserved behavior | Public request/response or export contract, errors, side effects, transaction semantics, and persisted data compatibility as applicable |
| Change | Smallest useful extraction or dependency correction; keep existing entry points delegating when compatibility requires it |
| Acceptance | Existing targeted check and its expected observable outcome; add characterization coverage only where existing checks cannot protect the behavior |
| Rollback or stop | What can be reverted, the signal to stop, and the last known compatible state |

Sequence compatibility work before switching consumers. For schema or deployment changes, assess old/new version coexistence and data reversibility; a code revert alone may not restore data. If recovery cannot be established, defer that slice and identify the evidence needed. These are planning requirements, not instructions to execute migrations during review.

## Output Template

```markdown
## Architecture Review

### Scope And Current State
- [Decision, pain or health-check scope, constraints, inspected path, unreviewed boundaries]

### Key Risks
- [Confirmed issue or hypothesis; source location, mechanism, impact, confidence, next check if uncertain]

### Options (only for material tradeoffs)
| Option | Problem addressed | Benefits and costs | Compatibility and migration risk |
|---|---|---|---|

### Recommendation
[Retain / local improvement / restructure / defer, with evidence and limits]

### Migration Plan (omit for retain or unresolved diagnosis)
1. [Finding, boundary, preserved contract, prerequisite, acceptance check, rollback or stop condition]

### Verification
- [Checks actually run and observed results]
- [Proposed checks, unavailable tools, and unresolved evidence; do not report these as passes]

### Handoffs
- [Next owner or available Skill, selected direction, evidence, constraints, and remaining decisions]
```
