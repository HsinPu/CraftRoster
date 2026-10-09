---
name: design-system-patterns
description: Design system architecture guidance for design tokens, theming infrastructure, component patterns, and theme switching in frontend codebases. Use when creating or extending a design system, standardizing UI variants, or aligning colors, spacing, typography, and surface styles across components.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Design System Patterns

Use this skill to build the structure behind a consistent UI.

Read `frontend-design` before planning visible production components or theme changes. Token architecture or naming analysis that does not change visible UI may use this Skill alone.

## Workflow

1. Define base tokens, semantic tokens, and component tokens.
2. Decide how themes, variants, and surface styles should be represented.
3. Standardize shared patterns for buttons, forms, cards, navigation, and feedback states.
4. Keep theme switching and token naming semantic.
5. Verify the system stays consistent across components and screens.

## Rules

- Prefer tokens over hardcoded values.
- Keep variants finite and predictable.
- Reuse primitives before creating new abstractions.
- Extend the existing system instead of replacing it.

## Handoff

- For visual system review, use `design-system`.
- For implementation with utilities, use `tailwind-development`.
- For component styling, use `ui-styling`.
