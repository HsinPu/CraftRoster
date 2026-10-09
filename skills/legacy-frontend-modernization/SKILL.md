---
name: legacy-frontend-modernization
description: Legacy frontend modernization guide for incrementally refactoring jQuery, Bootstrap-era, global-script, and framework-mixed web apps without breaking existing behavior. Use when planning or executing gradual migration to vanilla DOM APIs, TypeScript, modules, React/Vue/Alpine/HTMX, modern build tooling, or strangler-style replacement of old frontend screens.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Legacy Frontend Modernization

Use this skill when the frontend is legacy, risky, or mixed with server-rendered pages and global scripts. Use `jquery-development` for maintaining existing jQuery and `jquery-4-migration` for version upgrades.

Before planning a replacement that changes visible production UI, read `frontend-design`. Stack inventory, boundary analysis, and migration planning without visible implementation may use this Skill alone.

## Strategy

- Preserve business behavior first; do not rewrite purely for style.
- Prefer incremental replacement over big-bang rewrites.
- Start with boundaries: page, widget, route, server template, or DOM container.
- Stabilize with characterization tests, visual regression, or high-value manual smoke checks before refactoring.
- Keep a rollback or coexistence path until the modern replacement is proven.

## Modernization Workflow

1. Inventory stack: libraries, globals, script order, bundler/no-bundler, browser support, server templates, plugin dependencies.
2. Identify high-change or high-risk areas: checkout, auth, dashboards, forms, modals, search, uploads.
3. Extract seams: service/API wrappers, event boundaries, DOM container ownership, initialization functions.
4. Modernize one slice: replace one widget or flow with a clear interface while keeping old pages working.
5. Validate old and new behavior side by side.
6. Remove legacy code only after traffic, tests, and owners confirm the new path is stable.

## jQuery To Modern Patterns

- `$(document).ready(fn)` -> explicit `initPage()` or `DOMContentLoaded` wiring.
- `$.ajax` -> `fetch` wrapper with timeout, CSRF, and error normalization.
- jQuery animations -> CSS transitions/animations or Web Animations API.
- jQuery UI widgets -> native elements, lightweight components, or framework-owned widgets.
- Global event soup -> delegated container events or component-local handlers with cleanup.
- Data hidden in DOM attributes -> typed state object or server-provided JSON bootstrap data.

## Coexistence Rules

- Define ownership of each DOM region: legacy jQuery or modern component, not both.
- Avoid modern components mutating DOM that jQuery plugins also own.
- Keep script loading order explicit while global scripts remain.
- Wrap legacy plugins behind small adapter functions instead of spreading plugin calls through new code.
- Use feature flags or route-level switches for risky replacements.

## Testing And Safety

- Add smoke tests for the top revenue or business-critical flows.
- Use visual screenshots for pages where markup/styling must remain identical.
- Capture console errors during rollout; legacy script-order bugs often surface there first.
- Compare form submission payloads before and after migration.
- Track bundle size and duplicate dependencies when introducing modern tooling.

## Avoid

- Rewriting an entire legacy frontend without a fallback.
- Mixing jQuery mutation into framework-rendered DOM.
- Adding TypeScript annotations without improving boundaries or tests.
- Leaving compatibility shims with no removal plan.
