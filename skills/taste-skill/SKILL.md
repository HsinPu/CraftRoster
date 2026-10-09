---
name: taste-skill
description: Context-aware visual direction workflow for turning a web product brief, brand constraints, and existing UI evidence into a distinctive design intent, calibrated visual system, and anti-generic quality review. Use when a page, application, or site needs stronger art direction before implementation; use image-to-code when an image or approved mockup is the primary implementation source.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "Leonxlnx/taste-skill"
  reference-license: "MIT"
  reference-revision: "b17742737e796305d829b3ad39eda3add0d79060"
---

# Taste Skill

Turn subjective design taste into explicit, reviewable decisions. Treat taste as contextual judgment rather than a universal aesthetic: the right interface fits its audience, product task, content, brand, platform, and operational constraints.

## Route the Request

Use this Skill when a visually important interface needs a stronger point of view, a current design feels interchangeable, or several contributors need one shared visual direction.

Do not run it automatically for routine CSS fixes, component maintenance, or a direction that is already approved. Use `design-consultation` instead for a quick bounded palette or spacing decision. When a screenshot, mockup, or generated image is the principal implementation source, route to `image-to-code` instead.

## Workflow

### 1. Read the Product Context

Inspect the smallest useful evidence set:

- product goal, primary user task, audience, and trust expectations;
- real content, content extremes, localization, and information density;
- existing brand assets, design system, shared components, and platform conventions;
- target routes, viewports, themes, accessibility needs, performance limits, and delivery stack;
- reference images and whether each is an exact target, a structural reference, or style inspiration.

For redesigns, record the behavior and identity that must remain stable: routes, navigation meaning, content, forms, analytics, SEO, permissions, and critical journeys. Do not let a visual reference silently redefine product behavior.

### 2. Write the Visual Intent

Summarize the direction in one short statement:

> For **[audience and task]**, the interface should feel **[specific qualities]**, remain **[constraints]**, and be recognizable through **[one signature idea]**.

Replace vague adjectives such as “modern” or “premium” with observable choices. Name one memorable characteristic and one thing the design must not become. Read [references/design-intent-and-calibration.md](references/design-intent-and-calibration.md) when the direction is unclear or several concepts compete.

For work that spans multiple revisions, contributors, or sessions, keep a project-local design decision record using [references/design-decision-log.md](references/design-decision-log.md). Give candidates stable IDs and record the evidence, selection or rejection reason, confidence, approval scope, and conditions that should reopen the decision. Keep the record in task context when the user has not authorized workspace writes, a literal no-write constraint applies, or a durable file would add no maintenance value.

### 3. Calibrate Three Design Dials

Set each dial to low, medium, or high and justify it from the context:

- **Composition freedom:** familiar and regular → varied and editorial.
- **Interaction energy:** quiet and direct → expressive and cinematic.
- **Information density:** spacious and focused → compact and analytical.

The dials describe a choice, not a quality score. A banking form may need low composition freedom and motion but high information clarity; a campaign page may justify the reverse. Do not maximize every dial.

### 4. Lock the Visual System

Define a compact set of rules before producing many screens:

- typography roles, scale, line length, and fallback behavior;
- base and semantic colors, contrast targets, and theme behavior;
- spacing rhythm, grid, content width, alignment, and responsive breakpoints;
- radii, borders, shadows, elevation, and surface treatment;
- icon, illustration, photography, and data-visualization language;
- interaction states, motion purpose, timing family, and reduced-motion behavior.

Reuse a viable existing design system. Extend it deliberately when the visual intent requires a new token or variant; do not create a parallel system just to make one page look different.

### 5. Compose for Meaning

Build the page or screen around the information hierarchy and user journey. Vary layout only when it improves emphasis, pacing, comparison, or comprehension.

Treat repeated centered heroes, equal-card rows, excessive pills, nested surfaces, decorative metrics, and generic glow effects as review signals, not forbidden patterns. Keep them when they are the clearest semantic solution; otherwise choose a composition that better expresses the content.

Use one or two signature moments rather than distributing novelty everywhere. Real text, real data shapes, and actual state constraints should drive the composition.

### 6. Cover the Product States

Specify desktop and mobile reflow, plus tablet when it changes the composition. Include relevant hover, focus, active, selected, disabled, loading, empty, error, success, permission, overflow, long-content, and reduced-motion states.

Visual character never overrides semantic HTML, keyboard access, focus visibility, readable contrast, touch targets, content legibility, or predictable controls.

### 7. Run the Taste Preflight

Before declaring the direction complete, read [references/anti-generic-ui-review.md](references/anti-generic-ui-review.md) and test:

- **Context fit:** can each major choice be explained from the product and audience?
- **Coherence:** do type, color, spacing, shape, imagery, and motion tell the same story?
- **Distinctiveness:** is there a recognizable idea beyond decoration?
- **Restraint:** are effects concentrated where they support hierarchy or feedback?
- **Completeness:** do responsive layouts, content extremes, and non-happy states still feel intentional?
- **Buildability:** can the direction be implemented with maintainable components, assets, and performance?
- **Decision trace:** can another contributor tell which version is active, why alternatives were rejected, and what evidence would justify revisiting the choice?

Record compromises explicitly. Do not hide uncertainty behind subjective language.

## Deliverable

Return a compact direction contract:

```markdown
## Visual Direction
- Product context: <audience, task, constraints>
- Visual intent: <one sentence>
- Dials: composition <low|medium|high>; interaction <low|medium|high>; density <low|medium|high>
- Signature idea: <recognizable visual or interaction principle>
- System locks: <type, color, spacing, grid, shape, imagery, motion>
- Responsive and state rules: <key changes and required states>
- Preserve: <existing contracts that remain unchanged>
- Avoid: <context-specific failure modes>
- Open decisions: <ambiguities or approvals still needed>
- Decision record: <task context or maintained project artifact; active version and approval scope>
```

## Boundaries

- Do not impose one house style on every product.
- Do not ban a font, color, component family, or layout pattern without contextual evidence.
- Do not fabricate logos, customers, testimonials, metrics, names, or product claims to make a mockup feel complete.
- Do not require a generated image for every section or every visual task.
- Do not copy protected branding, trade dress, text, or assets from references.
- Do not replace an approved design direction merely to make it more unusual.
- Do not turn project decisions into a hidden cross-project preference profile. Reuse a preference only when the user or an explicit maintained artifact carries it forward.

## Handoff

- When an approval-gated page or website workflow invoked this Skill, return the direction contract to that workflow and do not reroute or advance its next gate.
- Use `frontend-design` after the visual direction is locked and production UI must be implemented; do not reopen taste exploration unless new evidence invalidates the direction.
- Use `image-to-code` when a supplied image or approved mockup is the main source for implementation.
- From an ungated request, use `web-page-design-to-code` when one page needs an explicit mockup and implementation approval gate.
- From an ungated request, use `website-redesign-to-code` when the work spans navigation, shared design systems, page families, or multiple routes.
- Use `frontend-design-review` for an independent review of the implemented interface.
