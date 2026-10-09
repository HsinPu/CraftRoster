---
name: ui-styling
description: Visible shadcn, Radix, or Tailwind React UI changes require frontend-design plus this styling specialist. Use for polished colors, buttons, forms, layouts, states, spacing, themes, and accessible visual treatment.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# UI Styling

Use this skill when refining React UI components. Its visible production-UI workflow requires `frontend-design`; read that baseline before planning the styling change.

## Workflow

1. Pick the base component and decide the variant hierarchy.
2. Define colors, border, radius, shadow, and button states from the theme.
3. Tune spacing, alignment, labels, and content density so the component reads cleanly.
4. Verify hover, focus, disabled, loading, and active states.
5. Keep the styling consistent with the surrounding screen and design system.

## Rules

- Keep variants small and intentional.
- Prefer theme tokens and existing component primitives.
- Make primary buttons visually distinct from secondary actions.
- Avoid over-styled components that fight the system.

## Handoff

- For shadcn-specific composition, use `shadcn-ui`.
- For broader Tailwind utilities, use `tailwind-patterns` or `tailwind-development`.
- Use `frontend-design` as the baseline for visible production UI. Use `taste-skill` or `design-consultation` only when direction itself is the requested deliverable or blocks implementation.
