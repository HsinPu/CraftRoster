---
name: vue-testing
description: Vue testing guide for Vitest, Vue Test Utils, component tests, composable tests, Pinia store setup, async rendering, Suspense, Teleport, browser versus jsdom runners, and Playwright end-to-end checks. Use when writing, reviewing, or fixing tests for Vue 3 components, composables, routes, stores, or user flows.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Vue Testing

Use this skill when Vue behavior needs test coverage or a Vue test is failing. Pair with `testing-strategy` for test-level choices, `pinia-state-management` for store design, and `webapp-testing` for local browser verification.

## TypeScript Baseline Gate

When Vue tests or production targets use `<script setup lang="ts">`, `.ts`, typed props or emits, typed stores, typed mocks, `vue-tsc`, or TypeScript diagnostics, read `typescript-development` before planning. Keep this skill responsible for Vue test behavior and runner details while `typescript-development` owns type-safe contracts and production TypeScript changes.

JavaScript-only Vue tests can use this Skill alone. Check the baseline only for the affected typed tests or targets. If it is unavailable, identify the missing Skill and leave typed implementation pending while continuing independent test inspection.

## Workflow

1. Identify the behavior under test and the smallest useful level: composable, component, store, route, or browser flow.
2. Mount through public inputs such as props, slots, plugins, router, Pinia, and user events.
3. Assert visible DOM, emitted events, navigation, store effects, and API outcomes rather than private refs.
4. Cover async states with `nextTick`, `flushPromises`, semantic waits, or Playwright waits instead of fixed sleeps.
5. Run the narrowest relevant test first, then broaden when the touched behavior is shared.

## Test Level Choices

- Use Vitest unit tests for pure composables, formatters, validators, stores, and component logic with limited DOM needs.
- Use Vue Test Utils component tests for emitted events, slots, conditional rendering, forms, and parent-child contracts.
- Use Playwright for routing flows, real browser APIs, accessibility-critical interactions, visual regressions, and cross-page behavior.
- Prefer behavior-focused assertions over snapshots as the only signal.

## Component Tests

- Mount the component through public inputs: props, slots, global plugins, route state, and user events.
- Assert visible DOM, emitted events, navigation effects, and store/API outcomes rather than internal refs.
- Use `findBy`/semantic queries where available; avoid brittle class and implementation selectors unless they are stable test hooks.
- Stub heavy child components only when their behavior is irrelevant to the parent contract.
- Keep tests resilient to component internals so refactors do not rewrite the suite.

## Async Behavior

- Await user events, `nextTick`, and pending promises before asserting async DOM updates.
- Use `flushPromises` when the component awaits external promises or mocked API calls.
- Avoid fixed sleeps; wait for a specific UI state or promise boundary.
- Test loading, success, empty, error, cancellation, and retry states when the component fetches data.

## Pinia And Plugins

- Install Pinia in tests before mounting components that call stores.
- Use `@pinia/testing` when component tests should mock actions and focus on rendering or interaction.
- Use a real Pinia store when testing store behavior, getters, subscriptions, or cross-store interactions.
- Reset store state between tests; do not rely on execution order.

## Composables

- Test pure composables directly when they do not use lifecycle hooks, provide/inject, or component instance APIs.
- Use a tiny wrapper component when a composable needs lifecycle, injection, route context, or plugin context.
- Expose only the state needed for assertions from the wrapper.

## Suspense, Teleport, And Async Components

- Wrap async setup components in `Suspense` and await resolution before asserting resolved content.
- Query teleported content from `document.body` or the configured teleport target, not only from the wrapper.
- Mock dynamic imports only when testing the parent boundary; otherwise await the real async component.

## Avoid

- Testing private component variables instead of observable behavior.
- Snapshot-only coverage for interactive components.
- Global mocks that leak across tests.
- Testing Vue Router, Pinia, or browser APIs through hand-rolled mocks when a real plugin or browser runner is more reliable.
