---
name: design-system
description: Design system generation, live implementation extraction, DTCG-compatible token governance, durable context, drift analysis, and visual audit workflow. Use when starting a project, standardizing or preparing a redesign, extracting observed styles from an authorized running interface, producing cross-platform tokens and preview artifacts, auditing an existing system, reviewing styling changes, or diagnosing when UI feels visually off.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "design-tokens/community-group"
  reference-license: "W3C Software and Document License"
  reference-revision: "191bf0b157cd9d254e992975471a64f90d960a78"
---

# Design System

Use this skill when the task is about the system behind the UI, not just one screen.

## Execution Posture

<!-- CRAFTROSTER_CONTRACT
{
  "id": "design-system.execution",
  "part": "posture",
  "version": 1,
  "type": "write-posture",
  "section": "Execution Posture",
  "parentWorkflows": [
    "web-page-design-to-code.orchestration",
    "website-redesign-to-code.orchestration"
  ],
  "textParts": {
    "posture": {
      "section": "Execution Posture",
      "sha256": "831196f4fcb7bcd326b13a7cf6b32531016325ef5a49a7f3b54bb59a8859c82c"
    }
  },
  "postures": {
    "audit-dry-run": {
      "mayWrite": false,
      "requiresExplicitUserAuthorization": false,
      "returnOwner": "parent-or-owning-task"
    },
    "apply-generate": {
      "mayWrite": true,
      "requiresExplicitUserAuthorization": true,
      "requiresParentGateWhenPresent": true
    }
  },
  "driftKinds": [
    "add",
    "change",
    "rename",
    "alias",
    "deprecate",
    "delete"
  ],
  "completionReference": "skills/design-system/reference/token-extraction-and-drift.md"
}
-->

<!-- CRAFTROSTER_CONTRACT_TEXT_START design-system.execution#posture -->
Choose the write posture separately from the design-system purpose below:

- **Audit/dry-run receipt:** default when a parent workflow has an open approval gate, the user requested no writes, or output paths are not authorized. Inspect allowed sources and return provenance, an in-memory DTCG-compatible candidate graph, observed-versus-approved distinctions, a dry-run drift ledger, destructive-change warnings, unresolved cells, and a versioned receipt. Do not create or overwrite canonical tokens, documentation, previews, generated platform files, or production styles.
- **Apply/generate:** use only after explicit user authorization permits the system change and the canonical output paths and migration scope are authorized. When a parent approval gate exists, that named gate must also permit the change. Write the smallest maintained source, regenerate derived views, and verify representative consumers.

When called by another approval-gated workflow, record the parent workflow, current gate, receipt scope, and return owner. In standalone work, record the owning task and user authorization instead. This Skill owns the bounded system analysis or migration receipt; an existing parent retains scope and gate authority.
<!-- CRAFTROSTER_CONTRACT_TEXT_END design-system.execution#posture -->

## Modes

### 1. Generate or normalize a design system

Use when starting a new project, standardizing a redesign, or extracting tokens from an existing codebase.

- Inspect existing CSS, Tailwind `@theme`, CSS variables, styled-components, or component styles.
- Extract colors, typography, spacing, radii, shadows, borders, breakpoints, and motion rules into primitive, semantic, and narrowly scoped component layers.
- Prefer existing source tokens over inventing new values.
- Keep one canonical token source. Treat CSS, JavaScript, mobile, documentation, and preview outputs as generated views rather than competing authorities.
- Read [reference/generate.md](reference/generate.md) when you need the generation workflow or output contract.

Expected apply/generate outputs, when authorized:

- `design-tokens.json`
- `DESIGN.md`
- `design-preview.html`

### Durable design context

When the system will be reused across sessions or page families, make `DESIGN.md` the portable context contract or extend the repository's existing design document instead of creating a parallel source of truth. Record:

- product versus brand surface, audience, primary tasks, trust and density expectations;
- active visual intent, signature idea, approved direction version, and context-specific anti-references;
- authoritative source files, artifact IDs, owners, status, and last verified revision;
- foundations, semantic tokens, components, states, responsive rules, and accessibility constraints;
- accepted deviations, deprecated decisions, open questions, and conditions that reopen the system.

Link to existing product requirements rather than duplicating them. Generated previews demonstrate the contract; they do not outrank production tokens, approved artifacts, or maintained product behavior.

### 2. Extract an authorized live implementation

Use when a running interface is the available source or when source tokens and rendered behavior may have drifted.

- Confirm authorization, target routes, themes, states, viewports, login requirements, data fixtures, and network-egress policy.
- Collect computed styles, CSS custom properties, loaded fonts, component states, layout measurements, and representative screenshots across the bounded matrix.
- Mark every value as source-declared, runtime-observed, normalized, inferred, or unresolved. Computed styles are evidence, not automatically canonical tokens.
- Compare observed values with maintained tokens and approved design artifacts. Produce an add/change/rename/alias/deprecate/delete drift ledger before editing.
- Require explicit approval for destructive deletion, semantic renaming, alias rewrites, or wide theme changes.
- In audit/dry-run receipt posture, do not persist screenshots, caches, token files, previews, or generated outputs unless the parent separately authorizes that exact artifact and location.
- Read [reference/token-extraction-and-drift.md](reference/token-extraction-and-drift.md) for the DTCG contract, source authority, live sampling, and drift report.

### 3. Audit a visual system

Use when reviewing a codebase, styling PR, or redesign candidate.

- Score the UI across color, typography, spacing, component consistency, responsiveness, dark mode, animation, accessibility, density, and polish.
- Tie every finding to concrete examples and, when possible, `file:line`.
- Read [reference/review.md](reference/review.md) for the audit rubric and reporting format.

### 4. Slop check

Use when the UI feels generic, over-decorated, or visually off.

- Call out AI slop patterns such as gratuitous gradients, glassmorphism with no purpose, generic hero sections, random accents, placeholder typography, and weak hierarchy.
- Prefer a short list of high-signal fixes over vague critique.
- Read [reference/review.md](reference/review.md) for the slop-check checklist.

## Handoff

- For implementing a visible production screen or component, read `frontend-design` before planning; add `tailwind-development` or `css-development` only for the matching styling mechanics.
- Use `taste-skill` when the visual intent or direction version is unresolved, then record only the approved result in the maintained system context.
- Keep the system semantic: use base tokens, semantic tokens, and component tokens only when necessary.
- Prefer DTCG 2025.10-compatible token objects using the standard type, value, optional description, and alias fields. Keep tool-specific provenance or mode data in documented extensions rather than custom ambiguous fields.
- If an existing design system already exists, extend it instead of replacing it.
- In audit/dry-run receipt posture, return the versioned receipt to the named parent when one exists, otherwise to the owning task or user. Do not apply changes, promote a candidate, or close a parent's gate.
