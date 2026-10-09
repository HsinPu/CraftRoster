---
name: pinia-state-management
description: Pinia state management guide for Vue applications covering setup stores, state, getters, actions, storeToRefs, plugins, composables inside stores, SSR hydration, Nuxt integration, testing with @pinia/testing, and avoiding circular store dependencies. Use when defining, reviewing, refactoring, or testing Pinia stores.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Pinia State Management

Use this skill for Vue application state that belongs outside a single component. Pair with `vue-development` for app structure, `vue-testing` for test setup, and `nuxt-development` for Nuxt-specific auto-import and SSR behavior.

Read `typescript-development` before planning TypeScript stores, typed actions or public store contracts, or compiler diagnostics. Pure JavaScript store analysis may use this Skill alone.

## Store Design

- Prefer setup stores for complex logic, composables, watchers, and TypeScript-friendly composition.
- Keep stores focused on one domain or workflow; avoid a single app-wide dumping-ground store.
- Put durable shared state in Pinia; keep ephemeral UI-only state in the component when it has no cross-component value.
- Model async actions with explicit loading, error, and stale/refresh state when the UI depends on them.
- Keep getters pure and synchronous; move side effects into actions.

## Reactivity Rules

- Use `storeToRefs(store)` when destructuring state or getters in components.
- Destructure actions directly; actions are bound to the store.
- Avoid destructuring store state without `storeToRefs`, because it loses reactivity.
- Use `shallowRef` or mark raw external instances when storing large or non-reactive objects.

## Actions And Side Effects

- Keep API calls, persistence, analytics, and cross-store writes in actions or service boundaries.
- Return useful values from actions when callers need them, but keep canonical state in the store.
- Handle concurrent requests deliberately: ignore stale responses, cancel previous work, or serialize writes.
- Avoid hidden action chains that make state transitions hard to trace.

## Composing Stores

- Call other stores inside actions, getters, or setup functions only when needed.
- Avoid circular reads during store initialization; defer cross-store access to functions when possible.
- Keep authentication/session state separate from feature state, and inject only the minimal dependency needed.

## SSR And Nuxt

- Do not create stores or read request-specific state at module scope.
- Ensure server-created state is serializable and safe to hydrate into the client.
- Do not place secrets or server-only objects in public Pinia state.
- In Nuxt, follow Nuxt Pinia module conventions instead of manually sharing singleton state.

## Testing

- Use real stores for store unit tests and assert state/getter/action behavior directly.
- Use `@pinia/testing` in component tests when actions should be stubbed or spied.
- Reset store state and plugin state between tests.
- Mock external services at the service/API boundary, not by rewriting store internals.

## Avoid

- Using Pinia for every local input, modal flag, or hover state.
- Mutating store state from unrelated components without an action when the transition has business meaning.
- Storing router instances, DOM nodes, sockets, or SDK clients as deeply reactive state.
- Relying on persisted client state without validation or migration.
