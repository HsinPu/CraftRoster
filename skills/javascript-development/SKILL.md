---
name: javascript-development
description: Implement, review, debug, or test browser and Node.js JavaScript, including modules, async I/O, cancellation, and errors. Pair visible UI changes with frontend-design; add TypeScript or Three.js only when the affected code or diagnostic evidence involves those contracts.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# JavaScript Development

Use this skill for JavaScript implementation, review, refactoring, and debugging in Node.js or browser projects.

## Frontend Baseline Gate

When browser JavaScript creates or changes visible DOM, controls, navigation, forms, feedback, loading, errors, animation, or responsive behavior, read frontend-design before planning. Keep this Skill responsible for JavaScript runtime mechanics while frontend-design owns the complete user-visible UI contract. Do not add the frontend baseline for Node.js-only, build-tool-only, or non-visual library work.

## TypeScript Routing Gate

When the requested change or diagnosis involves TypeScript source, compiler configuration, typed public APIs, or a `tsc` or `vue-tsc` diagnostic, read the sibling [`../typescript-development/SKILL.md`](../typescript-development/SKILL.md). A TypeScript dependency or `tsconfig` elsewhere in the repository does not activate that route for unrelated JavaScript work. Keep this skill responsible for runtime behavior, async I/O, cancellation, error propagation, security, and JavaScript interop; keep `typescript-development` responsible for compiler configuration, type design, narrowing, module contracts, and typed public APIs.

## Three.js Routing Gate

When the affected JavaScript imports or uses Three.js, the requested outcome is a Three.js or WebGL/WebGPU 3D experience, or evidence connects the failure to the scene or renderer:

1. Read the sibling [`../threejs-development/SKILL.md`](../threejs-development/SKILL.md) before planning, even when that Skill was not included in the runtime's initial metadata list.
2. Keep this Skill responsible for generic module structure, application boundaries, input validation, asynchronous I/O, cancellation, error propagation, and non-Three.js tests.
3. Keep `threejs-development` responsible for Three.js versions and addons, renderer, scene, camera, frame loop, loaders, resources, interaction, visual systems, disposal, performance, and browser rendering evidence.
4. Do not replace a requested Three.js implementation with a generic canvas, CSS imitation, unrelated framework, or raw WebGL unless the user explicitly asks for that change.

Plain Canvas 2D, a generic HTML demo, or an unrelated script in a repository containing Three.js does not activate this gate.

## Workflow

1. Inspect runtime targets, module format, package scripts, lint rules, and test setup.
2. Follow the local style for modules, exports, async flow, and error boundaries.
3. Keep side effects explicit and isolate I/O from pure transformation logic.
4. Handle promises, cancellation, retries, and thrown errors deliberately.
5. Verify with the repo's unit tests, targeted script, browser check, or Node smoke command.

## Reference Routing

- Style, modules, JSDoc, `@ts-check`, and formatting: read [reference/code-style.md](reference/code-style.md).
- Async flow, promises, and error handling: read [reference/async-and-errors.md](reference/async-and-errors.md).
- Browser, server, dependency, and input security: read [reference/security.md](reference/security.md).
- Jest, Vitest, mocks, and test structure: read [reference/testing.md](reference/testing.md).

## Rules

- Prefer simple data flow over clever metaprogramming.
- Avoid hidden mutation across modules unless the project already uses that pattern.
- Validate and normalize external input at the boundary.
- Do not add dependencies when native APIs or existing helpers are enough.

## Handoff

- For work that meets the 3D routing gate, use `threejs-development` as the scene implementation and routing Skill.
- For TypeScript-heavy code, use `typescript-development`.
- For React UI behavior, use `react-ui-patterns` or `react-perf`.
- For browser automation or UI verification, use `webapp-testing` or `playwright-automation`.
