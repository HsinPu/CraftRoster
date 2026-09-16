# Vanilla game migration input

This is the existing vanilla Three.js game, before any React Three Fiber migration. Preserve its gameplay, asynchronous level loading, error/retry behavior, route lifecycle and idle behavior. The target dependencies are pinned for the requested migration, but there is no R3F implementation or completed migration plan in these public files.

The player starts at (0, 0) on a board bounded by the level's limit. Arrow keys and the four direction buttons request one grid step. Motion approaches the requested destination at the level's speed, using a delta capped at 0.05 seconds. Reaching the current target increments the score once and selects the next target cyclically. Reset restores the starting position, first target and zero score. A new route entry starts a fresh game. Requests beyond the board are clamped. No movement, scoring or render loop is required while idle.

The level is first-party synthetic JSON. Loading is asynchronous and cancellable; malformed or failed loads show a DOM error with retry. Leaving during loading must not create a late canvas. The local server delays asset replies to make this boundary observable. Enter/leave can be repeated. While mounted, this game owns its geometry, materials, renderer, resize observer, keyboard binding and scheduled frame; leaving releases those owned resources. The app shell and diagnostic timer survive route changes.

The canvas is real WebGL. Diagnostics report actual frame callbacks, renderer render calls, instrumented geometry/material disposal events, renderer disposal/context-loss calls and live DOM canvas count. These are counters and API observations, not GPU memory bytes, allocation-profiler results, frame-time benchmarks or proof about every browser. Idle checks must allow startup/resize/invalidation frames to settle before comparing counters.

Use `node test/game.test.cjs` for deterministic gameplay checks. Install dependencies with `npm ci --ignore-scripts --no-audit --no-fund` only in a new disposable copy, then run `node tools/build.cjs` and `node tools/serve.cjs 0`. Open the server's explicit `vanilla_url` (`/vanilla/`), not its origin root. All runtime assets are local. No deployment, publishing, real account or service is involved. Stop the server after inspection.

The `lastMovementFirstDeltaSeconds`, `lastMovementFirstPosition`, `lastMovementElapsedSeconds` and `lastMovementFrameCount` diagnostics describe the most recently started motion from real callbacks. They help inspect idle-to-motion timing; wall-clock observations vary with browser scheduling and are not a fixed-FPS guarantee.

The original evaluation task is to perform a migration, not just suggest one. Node logic tests and successful compilation are not browser, WebGL, lifecycle or performance evidence. Independent author feasibility examples and their results are outside this public input. No model evaluation has run for this case.
