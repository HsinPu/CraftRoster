---
name: vue-router-patterns
description: Vue Router 4 guide for route records, nested routes, route params, query state, lazy loading, navigation guards, redirects, meta fields, data loading, cleanup, and route lifecycle pitfalls. Use when implementing, reviewing, or debugging Vue Router navigation, guards, route-driven components, or SPA routing behavior.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Vue Router Patterns

Use this skill for Vue Router 4 route design, navigation behavior, and guard bugs. Pair with `vue-debug-guides` for runtime diagnosis, `pinia-state-management` for auth/session stores, and `nuxt-development` when routes are Nuxt file-based routes.

Read `frontend-design` before planning changes to visible navigation or user-facing loading, error, and permission states. Route-record analysis or guard contracts without a visible UI change may use this Skill alone.

## Workflow

1. Identify route records, route names, params/query, guards, redirects, and owning components.
2. Decide whether state belongs in params, query, route meta, store, or component-local state.
3. Handle same-component navigation by watching params or using route update hooks.
4. Keep guards small and return values explicitly; move auth/session logic into stores or services.
5. Verify route names, URLs, redirects, rendered state, and guard loops with a real router when possible.

## Route Design

- Keep route records explicit and named when links, redirects, or tests need stable references.
- Use nested routes when layout and lifecycle should be shared; avoid nesting only to mirror URL segments.
- Lazy-load route components for page-level chunks.
- Keep route params stable and minimal; put optional UI filters in query state when they should be linkable.
- Validate and normalize route params before using them for API calls or store writes.

## Component Lifecycle

- Do not assume navigating from `/users/1` to `/users/2` remounts the component.
- Watch `route.params` or use `onBeforeRouteUpdate` when the same component handles changing params.
- Clean up event listeners, timers, subscriptions, and inflight requests when route-driven components unmount or params change.
- Use keyed `RouterView` only when a forced remount is the intended behavior.

## Navigation Guards

- Prefer returning values from guards instead of using legacy `next()` unless maintaining older code that already uses it.
- Await async permission checks, token refreshes, or preload work before allowing navigation.
- Prevent infinite redirects by checking the target route before redirecting.
- Keep guards small; move auth/session decisions into stores or services.
- Do not access component instance state inside global guards.

## Auth And Meta

- Use route `meta` for declarative requirements such as auth, roles, layout, or feature gates.
- Treat `meta` as routing policy hints, not a security boundary; enforce authorization on the backend too.
- Centralize auth redirect behavior so public, protected, and guest-only routes do not conflict.

## Data Loading

- Choose one owner for page data loading: route guard, route component, or store action.
- Show route-level loading and error states when data is required before meaningful render.
- Cancel or ignore stale requests when users navigate quickly between param values.
- Preserve query strings intentionally during redirects and tab/filter navigation.

## Testing And Debugging

- Test route behavior with a real router when navigation, guards, or link generation matter.
- Assert route names, paths, rendered page state, and redirect targets rather than guard internals.
- Reproduce guard loops with minimal route records and a fake auth/session state.

## Avoid

- Building a production SPA with manual `window.location` routing.
- Reading params once in setup and never reacting to updates.
- Making guards perform unrelated data mutations that are hard to reverse on cancelled navigation.
- Encoding large state objects into query strings without validation and size constraints.
