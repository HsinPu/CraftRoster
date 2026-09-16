---
name: threejs-development
description: "Build, debug, or evolve Three.js and WebGL/WebGPU 3D experiences, including single-file HTML scenes and affected renderer, asset, interaction, lifecycle, or performance contracts. Use for requested 3D work or evidence tied to an existing scene; exclude plain Canvas 2D and unrelated edits in repositories that merely contain Three.js."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "scottstts/Threejs-Awesome-Graphics-Agent-Skills"
  reference-license: "MIT"
  reference-revision: "e43dcb03020cae5b08983a828bc1817dd6c0c40a"
---

# Three.js Development

Route a Three.js task to the smallest specialist set while preserving one coherent scene, renderer, resource, and verification contract.

## HTML and Web Page Entry

Treat any request to use Three.js or `three` in an HTML page, website, browser demo, canvas experience, or frontend application as a Three.js task even when `frontend-design`, `css-development`, or `javascript-development` was the initial entry point.

For existing projects, activate this route only when the requested outcome or affected code depends on the scene, renderer, resources, or DOM-to-scene contract. An unrelated footer, plain Canvas 2D chart, or dependency elsewhere is not enough. Inspect a suspected integration boundary before deciding.

1. Determine whether the deliverable is an existing project, a bundled application, or a standalone HTML file. Preserve the existing stack; when none exists, choose the smallest browser setup that satisfies the request and state how Three.js is loaded.
2. Keep this Skill responsible for renderer, scene, camera, render loop, resize, resources, interaction, visual systems, performance, and Three.js version compatibility.
3. Use `frontend-design` only for the semantic page shell, content hierarchy, responsive DOM, controls, and accessible fallback; use `css-development` for document layout, canvas sizing, stacking, and overlays; use `javascript-development` for generic module, I/O, and error boundaries.
4. Read [capability-map.md](references/capability-map.md) and load only the Three.js specialists required by the requested scene.
5. For a standalone file, pin one compatible Three.js release across core and addons, keep import and asset behavior browser-valid, provide an intentional canvas and DOM fallback, and avoid silently converting the task into a framework project.
6. Verify the rendered scene in a browser, not only the HTML or JavaScript syntax. Check startup, resize, device pixel ratio, input, console errors, cleanup, narrow viewports, reduced motion, and the requested visual behavior.

Do not let a generic frontend-only workflow replace the Three.js scene and rendering contract.

## Workflow

1. Inspect the installed Three.js version, package manager, bundler, renderer, framework integration, browser targets, worker or authoring boundaries, asset pipeline, and existing test commands.
2. Define the experience contract: camera and input, scene scale, visual target, supported devices, accessibility fallback, loading behavior, frame-time and memory budgets, and deployment constraints.
3. Read [capability-map.md](references/capability-map.md) and select only the Skills that own the affected systems.
4. Establish architecture, lifecycle, renderer, color, asset, and resource ownership before adding advanced effects.
5. Implement in vertical slices that retain a working no-effect baseline and expose diagnostics for each new render or simulation stage.
6. Verify deterministic behavior, resize and lifecycle transitions, representative devices, visual evidence, performance budgets, cleanup, and production build behavior.

## System Order

1. Project, version-migration, authoring, framework, worker, and scene ownership
2. Renderer, camera, color, asset, and data contracts
3. Geometry, CSG, materials, lighting, animation, input, and accessibility semantics
4. Rigid and deformable simulation, navigation, audio, environment, and advanced visual systems
5. Path tracing, post-processing, capture, and final-image treatment
6. Testing, performance, security, deployment, and recovery

## Core Rules

- Preserve the repository's current framework and render-loop ownership unless a measured limitation requires migration.
- Keep simulation state, render state, and user-interface state explicit.
- Use one declared world scale and coordinate convention.
- Keep time, randomness, input, and external data injectable when deterministic testing matters.
- Add quality tiers and fallbacks before expensive effects become release dependencies.
- Keep worker protocols, editor documents, and specialized data formats versioned independently from incidental runtime objects.
- Treat screenshots as evidence only when the camera, seed, viewport, renderer, color pipeline, and scene state are fixed.
- Verify APIs against the installed Three.js version and [official-resources.md](references/official-resources.md); do not rely on examples from a different release without checking compatibility.

## Required Deliverable

Return the selected specialist route, confirmed versions and targets, ownership and data boundaries, scene and render flow, quality budgets, implementation slices, diagnostics, validation evidence, compatibility limits, and remaining risks.

When the user requests implementation, repair, or migration, deliver inspectable source changes and the requested runnable, build, or media artifacts; routing and proposed implementation slices alone do not complete the task. Tie completion claims to those artifacts and executed checks, and identify unfinished work or missing evidence. For analysis, review, or planning-only requests, return the requested findings or plan without expanding into implementation.
