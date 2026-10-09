---
name: command-palette
description: Command palette guidance for designing, implementing, and reviewing quick switchers, fuzzy action launchers, and Spotlight-style menus in web apps. Use when building palettes that search, rank, and execute navigation or commands, or when tuning discoverability, empty states, scope, and keyboard-first interaction.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Command Palette

Use this skill when the work is about a command palette or quick launcher.

Read `frontend-design` before planning visible web palette implementation or interaction-state changes. Action inventory and shortcut planning without a visible UI change may use this Skill alone.

## Workflow

1. Define whether the palette is for navigation, commands, or both.
2. Choose the actions, scopes, and search terms it should surface.
3. Keep results short, ranked, and stable.
4. Make the open, search, and execute paths obvious.
5. Verify keyboard, mouse, and empty-state behavior together.

## Rules

- Prefer a small set of high-value actions over exhaustive coverage.
- Keep labels imperative and scannable.
- Show the shortcut or entry point where users can find it.
- Do not use search results as the only route to critical actions.
- Separate command execution from plain text search when the behaviors differ.

## Handoff

- For shortcut design, use `hotkey`.
- For focus, keyboard access, and accessible interaction states, use `frontend-design`.
- For async execution states owned by React components, use `react-ui-patterns`. In other frameworks, preserve the host framework's state model and use its matching owner only when needed.
- For surrounding navigation or transitions, use `interaction-patterns`.
