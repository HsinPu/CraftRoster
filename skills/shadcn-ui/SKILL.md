---
name: shadcn-ui
description: shadcn/ui integration guide for installing components, composing forms, handling theming, and building React UI patterns with Tailwind and Radix. Use when the user wants to add, customize, or reason about shadcn/ui components or project conventions.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# shadcn/ui

Use this skill when building with shadcn/ui components.

Read `frontend-design` before planning any visible production UI implementation or modification. Component inventory, installation, or tooling-only configuration may use this Skill alone.

## Workflow

1. Identify the component set, layout, and theme constraints.
2. Choose the right shadcn component and supporting primitives.
3. Compose the UI with Tailwind classes and keep variants consistent.
4. Handle forms, validation, dark mode, and responsive behavior deliberately.
5. Verify the output matches the project's design language.

## Rules

- Prefer existing shadcn patterns before custom wrappers.
- Keep class composition explicit and readable.
- Coordinate with the project's theme tokens and design system.
- Use component-driven patterns for forms, dialogs, nav, and tables.

## Handoff

- For Tailwind-specific styling rules, use `tailwind-development`.
- For visible production UI implementation, use `frontend-design` as the baseline, including forms, dialogs, navigation, and visual polish.
