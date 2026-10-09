---
name: frontend-testing
description: Frontend testing guide for unit, component, and RTL-style tests in React and TypeScript projects. Use when writing or reviewing frontend tests, testing UI behavior, or deciding how to cover component and hook logic without full browser E2E.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Frontend Testing

Use this skill to test frontend logic close to the component.

## TypeScript Baseline Gate

When tests or production targets use `.ts`, `.tsx`, typed props, typed hooks, typed mocks, or TypeScript diagnostics, read `typescript-development` before planning. Keep this skill responsible for frontend test behavior and runner choices while `typescript-development` owns type-safe fixtures, contracts, and production TypeScript changes.

JavaScript-only component or hook tests can use this Skill alone. If the affected tests activate the TypeScript gate but that baseline is unavailable, identify the missing Skill and leave typed implementation pending; continue independent test inspection instead of activating it from an unrelated repository dependency.

## Workflow

1. Identify the component, hook, or UI behavior that needs proof.
2. Choose the smallest test level that proves the behavior.
3. Cover loading, error, empty, interaction, and state transition cases when relevant.
4. Mock external services and keep the test deterministic.
5. Verify the test names explain the behavior.

## Rules

- Prefer component or hook tests before jumping to browser E2E.
- Test behavior, not implementation details.
- Add regression coverage for bug fixes.
- Keep fixtures minimal and readable.

## Handoff

- For browser-level validation, use `webapp-testing`.
- For async UI state patterns, use `react-ui-patterns`.
- For TypeScript implementation, compiler configuration, and typed public boundaries, use `typescript-development`.
