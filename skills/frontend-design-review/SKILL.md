---
name: frontend-design-review
description: Frontend UI review workflow that separates experience critique, production web audit, and optical polish while evaluating implemented pages, components, and PRs for usability, accessibility, responsive behavior, design-system compliance, state completeness, performance, and visual craft. Use for web UI, UX, accessibility, responsive, theme, or design-quality reviews after implementation exists.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Frontend Design Review

Use this skill when the review target is user-visible UI quality. Use `frontend-code-review` for functional frontend bugs, `design-system` for broader token/system audits, and `webapp-testing` for local browser verification.

This is the web review entry; its polish lens produces findings. Native Windows/macOS/iOS/Android review or a combined cross-platform repair flow belongs to `ui-improvement` when available. Authorized web implementation belongs to `frontend-design`; a read-only reviewer does not gain write permission from a Skill mode.

## Choose the Review Lens

- **Experience critique:** evaluate product-task fit, hierarchy, comprehension, flow, visual intent, and coherence. Label subjective judgment and tie it to product evidence.
- **Production audit:** evaluate semantic HTML, keyboard and focus behavior, forms, navigation and URL state, responsive and content resilience, accessibility, performance, hydration, themes, and localization.
- **Polish pass:** evaluate optical alignment, type rhythm, spacing, color, imagery, motion, and consistency after blocking behavior passes.

Use more than one lens when requested, but report them separately. Do not disguise a stylistic preference as a technical defect.

## Review Focus

- **Frictionless flow**: primary action clarity, task completion path, empty/loading/error states, navigation exits.
- **Quality craft**: hierarchy, spacing, alignment, typography, color contrast, motion restraint, responsive fit.
- **Design-system compliance**: tokens, component variants, theme support, density, focus states, disabled states.
- **Trustworthy UX**: clear errors, transparent AI-generated content, safe destructive actions, predictable confirmations.
- **Accessibility**: keyboard flow, focus visibility, semantic markup, labels, contrast, reduced motion, screen-reader behavior.

## Workflow

1. Identify the screen, component, or flow and the user task it supports.
2. Define the selected lens, source of truth, supported matrix, and available code, browser, screenshot, accessibility, or performance evidence.
3. Compare implementation against the design system, approved artifacts or specs, existing product behavior, and authoritative content.
4. Check desktop, mobile, overflow, long and localized content, loading, error, empty, disabled, hover, focus, active, permission, and reduced-motion states when relevant.
5. Apply [references/production-web-checklist.md](references/production-web-checklist.md) for the technical audit; load only sections relevant to the changed surface.
6. Separate blocking usability, accessibility, and behavior regressions from major design inconsistencies and optional optical polish.
7. Report issues with file/line references when reviewing code, and include UI state, viewport, evidence, confidence, impact, and smallest viable fix when line references are not enough.

## Blocking Issues

- Primary task cannot be completed or has no clear next action.
- Keyboard users cannot reach or operate interactive controls.
- Focus state is missing on custom controls.
- Contrast is too low for essential text or controls.
- Responsive layout clips, overlaps, or hides essential content.
- Design-system component is bypassed in a way that breaks consistency or accessibility.
- Error or destructive-action flow can cause user data loss without clear recovery.

## Design Quality Checks

- Keep one dominant primary action per view unless the workflow truly needs alternatives.
- Preserve spacing rhythm and alignment across cards, forms, tables, and navigation.
- Use tokens and CSS variables instead of hardcoded colors, shadows, radii, and spacing when the project has a system.
- Check all component variants touched by the change, not only the happy path.
- Avoid generic AI-looking layouts: indistinct gradients, interchangeable cards, random glow effects, and weak hierarchy.

## Finding Quality

- **Blocking:** prevents task completion, access, safe recovery, or release on a required surface.
- **Major:** materially harms comprehension, consistency, state behavior, responsive use, or the approved direction.
- **Minor:** bounded optical or consistency improvement with no material task failure.

Use high, medium, or low confidence. A finding needs observable evidence and user or product impact; otherwise present it as a question or preference, not a defect. Reviewers report and prioritize findings but do not silently redesign or repair the implementation unless separately authorized.

## Output

```markdown
## Frontend Design Review

### Blocking
- `file:line` <lens; viewport/state; evidence; impact; confidence; smallest fix>

### Major
- `file:line` <lens; viewport/state; evidence; impact; confidence; smallest fix>

### Minor
- `file:line` <polish evidence, value, confidence, and bounded suggestion>

### Checks
- Reviewed states: <states/viewports>
- Evidence used: <code/browser/screenshots/a11y/performance>
- Not checked: <gaps and why>
```

If no issues are found, state the reviewed scope and any states or viewports not verified.
