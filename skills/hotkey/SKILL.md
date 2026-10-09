---
name: hotkey
description: Keyboard shortcut guidance for web and React UI work, covering hotkey design, keybinding registration, shortcut conflict resolution, and discoverability. Use when implementing or reviewing keyboard shortcuts, command bindings, or keyboard-driven actions in an application.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Hotkey

Use this skill when the work is about keyboard shortcuts.

Read `frontend-design` before planning changes to visible web UI, focus behavior, or user-facing shortcut states. Keybinding inventory or conflict analysis without those UI changes may use this Skill alone.

## Workflow

1. Map the action set to a small, memorable shortcut set.
2. Check conflicts with browser, OS, and app shortcuts.
3. Keep trigger keys consistent across related screens.
4. Expose shortcuts in help text, menus, or command palettes.
5. Verify keyboard-only users can complete the flow.

## Rules

- Prefer common modifier patterns before exotic combos.
- Do not hide critical actions behind shortcuts only.
- Keep shortcuts consistent between desktop views.
- Respect accessibility and focus order.

## Handoff

- For keyboard navigation, focus order, and accessible UI states, use `frontend-design`.
- For UI state behavior owned by React components, use `react-ui-patterns`. For another framework, preserve its state model and load its matching owner only when that state work is needed.
