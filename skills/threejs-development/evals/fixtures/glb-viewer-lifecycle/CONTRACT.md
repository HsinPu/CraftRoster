# Fictional existing GLB viewer

This existing local viewer is evaluation input, not a deployed product or a finished repair. Review the current source against the requirements below. No model run, GPU benchmark, crash reproduction or browser result is pre-recorded.

## Required behavior
Route changes must release route-owned resources once unused, while the application-owned reference object and controls stay alive. Removing a scene node is a route transition, not an application shutdown. Repeating the route must reach a bounded steady state after warm-up; compare actual renderer resource counters and dispose events. Increasing a cache without a finite ownership/eviction policy is not an accepted memory budget.

The initial frame and first shader-variant interaction must be measured. The supplied timers wrap synchronous compile/render calls with performance.now(): CPU wall-time only, including any driver blocking observed there, not GPU execution timing. Record cold/warm context, renderer identity and limitations. Do not infer a production freeze from a minimal fixture or claim an optimized frame budget without measurements.

Customer GLB input policy: version 2, maximum 1 MiB container, at most 64 nodes, 16 meshes, 4096 vertices, 4096 triangles, four PNG images, each at most 1024×1024 and 4 MiB decoded pixels, compression ratio at most 64:1. Reject external URIs and undeclared extensions; no Draco/KTX codecs are installed. Validate type, lengths, counts and image dimensions before decode/upload. Parse/compile/upload CPU work has a 50 ms observation budget per phase; a post-return timer cannot interrupt an unsafe parser or guarantee a hard deadline. The current implementation is the review target; contract text is not evidence that all limits are implemented.

## Ownership
- Application lifetime: renderer/context, scene, camera, shared blue box geometry/material/DataTexture, ambient light, OrbitControls and one requestAnimationFrame loop.
- Route lifetime: GLTFLoader-created model geometry/material/embedded texture (including its decoded image), and one 128×128 render target used for a real offscreen render before onscreen rendering.
- Asset fetch bytes are not retained after load. There is no model cache, worker, skeleton, animation mixer or route-owned control. Shared object resources are distinct from route resources.
- Shutdown closes the application lifetime. Route leave must not dispose the renderer or shared resources while the reference box remains displayed.

## Local inputs and controls
`tools/generate-assets.cjs` constructs a triangle, JSON/glTF metadata, and a 1×1 PNG from first-party numeric values using Node zlib and CRC32. Build creates the GLB bytes locally; no upstream model, image or binary is copied. The second sample changes only the embedded PNG to a tiny invalid signature. It is bounded decoder-error input, not an OOM payload and does not reproduce a customer tab crash. Do not replace it with dangerous allocation sizes.

`Mount route` loads the valid GLB. `Unmount route` leaves the route. `Repeat 6 routes` serially loads, renders, leaves and waits for a real frame six times. `Load bounded corrupt texture` follows the actual GLTFLoader image decode path. `Measure shader variant` changes a material shading variant and records compile/render CPU wall-time. It is not a synthetic busy loop. The diagnostics panel reads `renderer.info.memory`, `renderer.info.programs`, and actual resource `dispose` events. Memory counts are object counts, not GPU bytes. Browser/context caches may stabilize above zero.

## Disposable execution
Copy this family to a new temporary directory, then run `npm ci --ignore-scripts --no-audit --no-fund`, `node tools/build.cjs`, and `node tools/serve.cjs 4174`. Open `http://127.0.0.1:4174/`. Install/build only in that disposable copy; canonical inputs contain no node_modules or compiled assets. The server binds loopback and serves local files only. Browser verification, arbitrary model code execution and real deployments are separate capabilities, not granted by this fixture.

`node test/assets.test.cjs` checks authored asset structure and the current bounded validation path without a browser. It does not instantiate WebGLRenderer, measure GPU/browser memory, prove disposal, or certify hostile asset safety. A CPU-only or unavailable browser must report those checks as unverified. No model evaluation is authorized.

