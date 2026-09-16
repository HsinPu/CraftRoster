# Website Redesign-to-Code Deliverables

Use these templates when a full-site redesign needs a durable handoff, multiple implementation slices, or auditable approval. Adapt them to repository conventions rather than creating duplicate documentation systems.

## Authorization Checkpoint Record

Authorization mode is independent of visual/product redesign mode. Resolve each checkpoint against current and prior valid user instructions, with the same preservation and evidence requirements in all modes:

| Situation | Mode and action |
| --- | --- |
| "Audit the site and show directions; wait before implementation" | `gated`: complete discovery and the requested presentation, then stop at the reserved review. |
| "Redesign these three named routes using our current brand, choose layout details, and finish the frontend changes; preserve behavior" | `delegated`: record scope and selected direction, establish readiness, implement an isolated pilot, then apply the verified changes across only those routes. |
| "Continue site-v3 for the approved route manifest; implementation is approved" | `already-approved`: verify scope/artifact revisions and resume the next eligible slice without reopening satisfied gates. |
| "Redesign the whole site" with unknown routes or consequential decisions | `gated` only for unresolved scope/design/implementation choices; do independent discovery first. |
| Earlier delegation followed by "I want to inspect the pilot before other families change" | Keep the new pilot review open until the user releases it. |
| Pilot passes but candidate globals affect an unapproved family | Keep isolation; seek only the new scope decision, not reapproval of the authorized pilot. |
| A source Skill is asked for a `parent-receipt` | It returns evidence without editing production, approving a baseline, closing a program gate, or expanding scope. |

Example record below is an unresolved checkpoint, not approval. Delegated/already-approved records must cite the actual user decision, bounded routes/shared surfaces, and selected artifact version. Passing the pilot never authorizes deployment. An explicit human review, missing required evidence, or failed threshold cannot be skipped by changing the mode label.

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
  "pilotEvidence": "pending",
  "baselineOwner": "named-project-owner",
  "baselineAction": "unchanged",
  "baselineChangeApproval": "not-requested",
  "externalActionAuthorization": "none",
  "nextAction": "wait"
}
```

The user need not say "Gate 1" or "Gate 4" for a bounded delegation to cover the corresponding decision. Reassess when scope, target, or side effects change. Route/IA/backend/SEO/analytics/data migrations, external publication, destructive changes, and baseline replacement retain their separate authorization boundaries. Honor literal read-only requests and preserve pilot isolation until both evidence and scope permit continuing.

Use `checkpoint: implementation` when readiness permits starting or repairing the isolated pilot; its `pilotEvidence` may still be `pending` or `failed`. Use `pilot-rollout` before applying shared changes or migrating another family: only `pilotEvidence: passed`, complete required evidence, and valid rollout authority permit `proceed`. Record a reserved pilot review in the `pilot-rollout` record; a future review does not forbid an already-authorized pilot implementation. In `read-only` posture the next action remains `read-only` or `wait`; `parent-receipt` returns evidence or waits. A baseline stays `unchanged` or a capture remains a `propose-candidate`; `replace` requires the named owner's separate approval. These fields document decisions and evidence; structural validation does not prove user authorization or runtime success.

## Redesign Program Ledger

```markdown
# Redesign program ledger

- Scope version:
- Authorization mode and checkpoint record:
- Active design version:
- Current gate:
- Gate authority/evidence:
- Canonical route denominator:
- Source-authority manifest version:
- Design-intelligence receipt revision:
- Token/DTCG and drift receipt revision:
- Machine-gate matrix status:
- Completed and approved page families:
- Current bounded slice:
- Last verified evidence:
- Rollback point/status:
- Next eligible slice:
- Open decisions and blockers:
- Last updated/owner:
```

Update this ledger only after verified evidence or an explicit decision. It records status but never promotes a design, pilot, or rollout gate by itself.

## Site Audit and Page-Family Matrix

```markdown
# Site redesign audit

- Redesign mode: visual | product
- Framework/build/styling:
- Routing and layouts:
- CMS/data/API:
- Auth/roles/permissions:
- Analytics/consent/third parties:
- Supported viewports/browsers/locales/themes:
- Current design-system owner:
- Runtime crawl coverage:
- Canonical route/URL count:
- Reconciliation sources and result:
- Known access gaps:

| Concrete URL or route pattern | Page family | Source authority/artifact revision | Layout | Data source | Auth/role | Critical states | SEO contract | Risk | Representative route |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- Manifest completeness: complete | blocked | accepted exclusions
- Original denominator:
- Accounted-for entries:
```

## Preservation and Migration Contract

```markdown
# Preservation contract

## Invariants
- URLs, slugs, query parameters, and deep links:
- Navigation hierarchy, labels, ordering, taxonomy, breadcrumbs, and footer links:
- Metadata, canonicals, robots, structured data, and sitemap:
- Content identity and headings:
- API, form, auth, role, and permission behavior:
- Analytics events and payloads:
- Consent, cookies, local storage, and third parties:
- Critical journeys and failure behavior:
- Commerce and external side-effect controls:

## Approved migrations
| Current contract | New contract | Redirect/event/data mapping | Validation | Rollback |
| --- | --- | --- | --- | --- |

## Scope approval
- Status:
- Approval evidence:
- Representative routes/states:
- Out of scope:
- Blocking gaps or accepted exclusions:
```

## Design-System and Page-Family Contract

```markdown
# Approved site design contract

## Foundations
- Canonical token source/revision:
- DTCG compatibility/version:
- Extraction sources and representative route/state/viewport matrix:
- Observed versus approved values:
- Dry-run drift: add | change | rename | alias | deprecate | delete
- Destructive migration approval and rollback:
- Base and semantic colors:
- Typography:
- Spacing/grid:
- Radius/shadow:
- Breakpoints:
- Motion/reduced motion:

## Components
| Component | Owner | Variants | Required states | Migration source |
| --- | --- | --- | --- | --- |

## Component reuse map
| Responsibility | Existing owner | Decision: reuse/extend/compose/replace/new | Migration boundary | Confidence/evidence |
| --- | --- | --- | --- | --- |

## Data-binding map
| Surface | Source and contract | Read/write behavior | Loading/empty/error | Auth/permission | Mock/fallback and removal condition |
| --- | --- | --- | --- | --- | --- |

## Page families
| Family | Authority type and artifact revision | Figma/image evidence receipt | Shared shell | Unique components | Responsive rules | Critical states |
| --- | --- | --- | --- | --- | --- | --- |

## Design-intelligence receipt, when used
- Query and filters:
- Dataset revision and dataset/script SHA-256 values:
- Selected record IDs, evidence levels, and reasons:
- Rejected records and counter-signals:
- Product evidence that overrode a candidate:

## Approval
- Selected direction:
- Approved artifacts:
- Intentional deviations:
- Implementation slice order:
- Pass/fail thresholds:
- Machine-gate contract: mode, source/baseline IDs, matrix cells, environment, channels, thresholds
- Machine-gate policy: warn/error handling, baseline approver, retention, cache, and network egress
- Readiness decision:
```

## Rollout and Validation Matrix

<!-- CRAFTROSTER_CONTRACT
{
  "id": "website-redesign-to-code.orchestration",
  "part": "deliverable",
  "version": 2,
  "type": "machine-receipt-template",
  "section": "Rollout and Validation Matrix",
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
# Redesign rollout

| Slice | File/component owner | Page families | Preconditions | Exit criteria/checks | Rollback point | Status |
| --- | --- | --- | --- | --- | --- | --- |

# Cross-site validation

| Route/family | Viewport | State/journey | Functional | Visual verdict | Machine contract/result ID | Next action | Baseline action | Accessibility | SEO | Runtime/performance | Evidence/unverified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- Canonical normalized results: result ID/path -> mode, matrixCell, referenceId, baselineId, issues, artifacts, unverified
- Machine-gate provider/version/command:
- Required channels, thresholds, and warning policy:
- Baseline owner and candidate approvals:
- Artifact retention, redaction, cache, and network-egress result:
- Unverified routes/integrations:
- Accepted deviations:
- Legacy paths safe to remove:
- Canonical route/URL manifest result:
- Pilot acceptance evidence:
- Release decision: pass | pass with accepted deviations | blocked
```
