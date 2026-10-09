---
name: tailwind-patterns
description: Tailwind CSS pattern guide for building polished layouts, buttons, cards, navigation, forms, typography, and responsive sections with clean utility composition. Use when styling or restyling frontend screens with Tailwind and the task is to make the UI feel balanced, consistent, and production-ready.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Tailwind Patterns

Use this skill for practical Tailwind layout and component styling.

This production-UI styling workflow requires `frontend-design`; read that baseline before planning implementation. If the deliverable is only unresolved visual direction, use the direction owner named below instead.

## Workflow

1. Decide the layout pattern first: stack, grid, split pane, hero, sidebar, or card deck.
2. Set the spacing scale, type scale, and button hierarchy before adding details.
3. Compose utilities deliberately and extract repeated patterns only when they improve readability.
4. Use theme tokens, responsive variants, and dark mode consistently.
5. Check visual balance on desktop and mobile.

## Rules

- Keep button sizes, states, and emphasis consistent.
- Prefer semantic spacing and type scales over ad hoc values.
- Use project tokens or `@theme` values when available.
- Avoid class soups that hide the component structure.

## Handoff

- For Tailwind v4 architecture and build behavior, use `tailwind-development`.
- For unresolved visual direction, use `taste-skill` or `design-consultation`; use `frontend-design` after the direction is approved and Tailwind implementation begins.
