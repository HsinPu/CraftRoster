# Web Page Design-to-Code Deliverables

Use only the sections that improve traceability for the current task. Keep small redesigns in task context; persist these artifacts when another implementer must continue the work or the repository treats design decisions as maintained documentation.

## Authorization Checkpoint Record

Keep this record in task context unless durable documentation is requested or maintained by the project. Authorization mode is separate from visual comparison mode. Resolve each actual decision using the request and prior valid authorization:

| Situation | Mode and action |
| --- | --- |
| "Show two mockups; do not change code until I choose" | `gated`: prepare the requested artifacts and stop at the reserved review. |
| "Redesign this checkout page using our current brand; choose the layout and implement it; preserve payment behavior" | `delegated`: choose and record the direction, satisfy readiness evidence, and implement within the page boundary. |
| "Implement approved checkout-v3 at /checkout" with desktop/mobile coverage and prior scope approval | `already-approved`: inspect that authority, retain its version, and resume implementation without reapproval. |
| "Make the page nicer" with consequential scope or design decisions unresolved | `gated` for those decisions; inspect and prepare independently useful evidence first. |
| Prior delegation followed by "pause coding; show me the mobile version first" | The newer explicit checkpoint controls the dependent work until released. |
| Approved desktop-only design with missing mobile behavior | Resolve the missing coverage within delegated discretion, or ask only for the undecided mobile choice. Do not reopen the approved desktop decision. |
| Support Skill receives a bounded `parent-receipt` task | Return the evidence to the parent; do not use the parent's delegation as independent authority to edit or close its gate. |

Example record below describes an unresolved checkpoint, not an approval. A delegated or already-approved record must cite the actual request or decision, scope, and selected artifact revision. Passing checks supplies evidence; it does not grant authority. A valid earlier approval is retained unless the user changes it or the scope/target changes.

```json
{
  "mode": "gated",
  "checkpoint": "implementation",
  "posture": "implementation",
  "scopeVersion": "scope-to-resolve",
  "directionVersion": "candidate-to-review",
  "authorizationEvidence": "user decision still required",
  "explicitUserCheckpoint": "pending",
  "implementationAuthorized": false,
  "requiredEvidence": "missing",
  "pilotEvidence": "not-applicable",
  "baselineOwner": "named-project-owner",
  "baselineAction": "unchanged",
  "baselineChangeApproval": "not-requested",
  "externalActionAuthorization": "none",
  "nextAction": "wait"
}
```

Do not turn a delegated checkpoint into another user question merely because an internal gate name was not mentioned. Do not infer deployment, product migrations, live transactions, external uploads, or baseline replacement from implementation permission. Literal no-write constraints remain binding; continue other authorized work when a particular decision or capability is blocked.

Use `checkpoint: implementation` for page readiness and `pilot-rollout` only when a site orchestrator asks for the pilot handoff. `pilotEvidence: not-applicable` fits a standalone page; the site parent owns rollout. In `read-only` posture the next action remains `read-only` or `wait`; `parent-receipt` returns evidence or waits, without independent production changes. A baseline can remain `unchanged` or a new capture can be a `propose-candidate`; `replace` requires the named owner's separate approval. These fields document the actual decisions and evidence; a structurally valid record is not proof of user authorization or runtime success.

## Intake and Audit

```markdown
# Page redesign audit

- Target route:
- Page goal and audience:
- Current framework and route owner:
- Styling system and reusable primitives:
- Content and data sources:
- Required viewports:
- Source authority: brief/current page | structured Figma | raster/recording | generated artifact | hybrid
- Source artifact IDs/revisions, states, and viewports:
- Visual approval authority and product-behavior authority:
- Reference images and their role:
- Source conflicts and resolution owner:
- Must-preserve behavior:
- Required states:
- Accessibility, SEO, analytics, and performance constraints:
- Out of scope:
- Unknowns or blocked access:
```

## Direction Summary and Approval Record

```markdown
# Visual direction

- Direction name:
- Artifact version/identifier:
- Artifact type: image mockup | non-raster prototype
- Exact viewport and covered states for each artifact:
- Hierarchy and section order:
- Palette and typography:
- Grid, spacing, and surfaces:
- Imagery and iconography:
- Interaction and motion intent:
- Desktop-to-mobile reflow:
- Preserved behavior:

## Design-intelligence receipt, when used

- Query and filters:
- Dataset revision and dataset/script SHA-256 values:
- Selected record IDs, evidence levels, and reasons:
- Rejected records and counter-signals:
- Product evidence that overrode a candidate:
- Downstream decision owner:

## Candidate comparison

| Candidate ID | Artifact/viewports | Shared criteria | Decision | Reason | Confidence |
| --- | --- | --- | --- | --- | --- |

## Approval

- Status: proposed | approved | rejected | superseded
- Authorization mode and checkpoint record:
- Approved by:
- Approval evidence:
- Implementation explicitly authorized: yes | no
- Approved artifacts:
- Figma/image receipt ID, revision, and ownership mode, when used:
- Receipt authorization scope and acquired/missing states:
- Unresolved source inferences:
- Substitute explicitly authorized, if applicable:
- Approved deviations:
```

Do not infer approval from silence or from general encouragement.

## Implementation Contract

```markdown
# Page implementation contract

## Target
- Route:
- Content/data source:
- Existing contracts to preserve:

## Tokens
- Canonical token source/revision:
- Token path: reuse | extract/reconcile | scoped candidate
- DTCG compatibility/version:
- Colors:
- Typography:
- Spacing/grid:
- Radius/shadow:

## Token extraction and drift, when used
- Evidence sources and representative route/state/viewport matrix:
- Observed versus approved values:
- Dry-run changes: add | change | rename | alias | deprecate | delete
- Destructive changes and approval owner:
- Unverified cells and drift owner:

## Sections and components
| Section/component | Layout constraint | Content source | States | Interaction |
| --- | --- | --- | --- | --- |

## Component and state ownership
| Responsibility | Existing owner | Reuse/extend/compose/new | Data source | State owner | Required contract change |
| --- | --- | --- | --- | --- | --- |

## Responsive behavior
| Viewport | Reflow and priority rules | Navigation/control changes | Content limits |
| --- | --- | --- | --- |

## Assets
| Asset | Source/license | Treatment | Fallback |
| --- | --- | --- | --- |

## Acceptance criteria
- Functional:
- Visual:
- Responsive:
- Accessibility:
- Performance:
- Allowed tolerance or intentional deviation:
- Machine-gate authority: mode, referenceId, baselineId, baseline approver
- Machine-gate environment: matrix cells, browser, device scale, theme, locale, state, fixture
- Machine-gate policy: channels, thresholds, warn/error handling
- Privacy contract: redaction, retention, cache, and network egress
```

## Visual QA Report

<!-- CRAFTROSTER_CONTRACT
{
  "id": "web-page-design-to-code.orchestration",
  "part": "deliverable",
  "version": 2,
  "type": "machine-receipt-template",
  "section": "Visual QA Report",
  "authorizationRecordFields": [
    "mode",
    "checkpoint",
    "posture",
    "scopeVersion",
    "directionVersion",
    "authorizationEvidence",
    "explicitUserCheckpoint",
    "implementationAuthorized",
    "requiredEvidence",
    "pilotEvidence",
    "baselineOwner",
    "baselineAction",
    "baselineChangeApproval",
    "externalActionAuthorization",
    "nextAction"
  ],
  "machineReceiptFields": [
    "mode",
    "matrixCell",
    "referenceId",
    "baselineId",
    "verdict",
    "nextAction",
    "baselineAction"
  ],
  "machineContractFields": {
    "authority": [
      "mode",
      "referenceId",
      "baselineId",
      "baselineApprover"
    ],
    "environment": [
      "matrixCell",
      "browser",
      "deviceScale",
      "theme",
      "locale",
      "state",
      "fixture"
    ],
    "policy": [
      "channels",
      "thresholds",
      "warnHandling",
      "errorHandling",
      "retention",
      "cache",
      "networkEgress"
    ]
  }
}
-->

```markdown
# Page visual QA

| Viewport/state | Approved reference | Rendered evidence | Machine result/contract ID | Severity | Finding/status |
| --- | --- | --- | --- | --- | --- |

## Fidelity evidence
| Dimension | Method/tolerance | Result | Accepted deviation |
| --- | --- | --- | --- |
| Structure | | | |
| Text | | | |
| Position | | | |
| Color | | | |

- Environment and commit:
- Fonts/data/theme stabilized:
- Validation mode: pixel comparison | constraint-based comparison
- Canonical result location/ID:
- Contract: mode, matrixCell, referenceId, baselineId
- Machine verdict: pass | warn | fail | error
- Next action: done | revise | review | rerun
- Baseline action: unchanged | candidate | approved | rejected
- Provider/version/command and retry count:
- Evidence channels and unverified cells:
- Artifact retention and network-egress result:
- Console/network result:
- Functional checks:
- Accessibility checks:
- Remaining deviations:
- Iteration stop reason, if not passed:
- Final decision: pass | pass with accepted deviations | blocked
```
