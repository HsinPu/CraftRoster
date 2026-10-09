---
name: desktop-development
description: Electron desktop development guide for implementing desktop features, IPC handlers, preload scripts, window management, menu configuration, and desktop-local tooling. Use when building or maintaining Electron apps, native-like desktop UIs, or app-specific desktop integrations rather than browser automation or front-end pages.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Desktop Development

Use this skill when the task is to build or maintain an Electron desktop application.

## Workflow

1. Identify the desktop platform, app shell, target OS, and user-facing desktop behavior.
2. Map the feature to the right layer: main process, preload, renderer, IPC, or shared code.
3. Keep desktop-specific boundaries explicit, especially around filesystem, menus, windows, notifications, and permissions.
4. Validate startup, window lifecycle, IPC contracts, packaging, and platform differences.
5. Prefer small, testable desktop interactions over large cross-process responsibilities.

## Rules

- Keep main-process logic minimal and focused on orchestration.
- Use IPC contracts that are explicit and easy to version.
- Avoid mixing browser automation concerns with desktop app implementation.
- Check platform differences for macOS, Windows, and Linux when behavior is user-visible.

## Handoff

- For browser automation against a running Electron app, use `browser-automation`.
- For visible web-renderer UI implementation, read `frontend-design` before planning; add `ui-styling` only when the renderer's React/shadcn/Radix/Tailwind scope matches that specialist. Main-process, preload, or IPC-only work does not activate the UI baseline.
- For app packaging and release workflows, use `deployment-operations`.
