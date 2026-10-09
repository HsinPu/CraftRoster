---
name: interaction-patterns
description: Navigation interaction guidance for web UIs, covering tab overflow, scroll behavior, view transitions, progressive disclosure, and other movement-heavy interface patterns. Use when designing or fixing navigation, scrolling, or transition interactions that need to feel coherent across desktop and mobile.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Interaction Patterns

Use this skill when the work is about navigation and movement.

Read `frontend-design` before planning visible web navigation, scrolling, transition, or interaction-state changes. Read-only interaction analysis may use this Skill alone.

## Workflow

1. Identify the interaction surface: tabs, scroll regions, panels, or transitions.
2. Decide how overflow should behave on desktop and mobile.
3. Keep the transition readable and predictable.
4. Preserve keyboard and touch access for every interaction.
5. Verify motion, focus, and scroll behavior together.

## Rules

- Prefer clear defaults over clever motion.
- Keep active and selected state obvious.
- Avoid horizontal overflow unless it is intentional.
- Do not let transitions hide available content.

## Handoff

- For motion polish, use `animation-best-practices`.
- For responsive layout, use `responsive-design`.
- For state and loading behavior owned by React components, use `react-ui-patterns`; keep other frameworks with their matching state owner.
