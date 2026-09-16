# Fictional legacy furniture configurator

This is an existing minimal furniture configurator on **Three.js 0.152.2**, not a completed modernization. The installed dependency and lock define this source baseline; no claim about the latest Three.js release is embedded here. Build, browser, GPU and device evidence must be collected by the reviewer. No old browser result, screenshot, encoded video, CSG solver, cloth solver or path tracer is supplied or implied.

## Existing compatibility contract
The two valid `saved-designs/*.v1.json` documents use the exact v1 schema and semantic rules in `contracts/saved-design-v1.schema.json`. Dimensions are integer millimeters; renderer world units are meters. Load, change a parameter or material, serialize, and reload must preserve all document fields including camera, seed, time, label and audio cue. Rejected input must leave the current document intact. Unsupported versions, unknown materials, wrong units, additional fields and invalid ranges are errors, not silent defaults. Invalid sample files are data, not runnable code.

The chair consists of first-party box geometry for four legs, seat support, cushion and back. Static solid upholstery is intentional; it is not deformable cloth. `assets/materials.json` supplies numeric colors and a tiny wood pattern; a seeded first-party generator produces the upholstery pattern. No upstream meshes, textures, binary LUTs or vendor assets are checked into this family. The PCM preview is generated from `assets/audio-cue.json` at build time.

## Renderer and interaction
The existing WebGL raster renderer remains interactive in both desktop and mobile quality tiers. Auto uses the mobile tier at a CSS viewport width of 640 or below; a visible tier selector provides repeatable inspection. Mobile caps DPR at 1 and buffer dimensions at 768; desktop caps DPR at 2 and dimensions at 1536. This is the legacy raster path to retain when introducing future path tracing/capture, not a claim that a second backend already exists. Real mobile Safari, touch-device performance and GPU timing remain unverified.

The DOM has labeled numeric/select controls, document text input, load/save actions, a label overlay and an audio player. Save writes canonical v1 JSON to the visible document area; it does not silently use localStorage, upload or create a real customer record. Loading invalid text reports an error while retaining the prior scene/document. Changes redraw an actual chair. Diagnostics expose current parameters, raster tier, actual renderer object counts and a CPU render-submission duration. The latter is not GPU time, frame rate or an approved performance result.

Scene coordinates, color encoding, camera, time and seed are explicit in `contracts/scene-and-capture.json`. Explicit time changes an orbit pose without a wall-clock animation loop. Labels are DOM-only and the tone is a local audio input/preview; neither is already incorporated into encoded media. New Boolean operations, solver state, path-tracing accumulation and media formats need separate versioned contracts while preserving these v1 inputs.

## Temporary execution
Copy all public files into a disposable directory. Run `npm ci --ignore-scripts --no-audit --no-fund`, `node tools/build.cjs`, then `node tools/serve.cjs 4183`; open the loopback URL. The build copies the exact installed official Three.js module and license and generates the first-party WAV. Never place `node_modules/` or `dist/` in the canonical fixture. The server serves a fixed GET allowlist. No browser/model automation, real deployment, external order service or remote storage is bundled.

`node test/designs.test.cjs` checks saved-document round trips and current geometry/input contracts offline. It does not prove browser rendering, mobile interaction, GPU disposal, modernized feature completion or encoded media determinism. All advanced requested features in the scene contract remain explicitly unimplemented in this baseline.

