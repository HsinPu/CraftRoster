---
name: responsive-design
description: Visible responsive UI changes require frontend-design plus this responsive specialist. Use for building, modifying, or fixing mobile, tablet, and desktop layouts with breakpoints, fluid sizing, container queries, adaptive components, touch targets, and intentional reflow.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Responsive Design

Use this skill to make layouts adapt cleanly across viewports. Its visible production-UI workflow requires `frontend-design`; read that baseline before planning the responsive change.

## Workflow

1. Map the key viewport ranges and the screens that matter most.
2. Decide where the layout should stack, split, collapse, or reflow.
3. Set spacing, type scale, and component sizing for each breakpoint.
4. Prefer container queries for component-level adaptation when useful.
5. Verify touch targets, reading order, and density on small screens.

## Rules

- Do not just shrink desktop UI.
- Reorder hierarchy when mobile needs a different structure.
- Keep buttons, inputs, and nav usable with touch.
- Make responsive behavior intentional, not accidental.

## Handoff

- For Tailwind layout work, use `tailwind-patterns`.
- For CSS-level implementation, use `css-development`.
- Use `frontend-design` as the implementation baseline. Use `taste-skill` or `design-consultation` only when direction itself is the requested deliverable or blocks implementation.
