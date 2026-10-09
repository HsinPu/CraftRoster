# Three.js Capability Map

## Contents

- Route first
- Core engineering
- Advanced visual systems
- Cross-cutting acceptance

## Route First

Use `threejs-development` when a request spans several systems or starts from an incomplete product brief. Use one specialist directly when the affected boundary is already known.

Select these routes by the affected concern. They are conditional companions, not an all-specialist installation bundle. A package installed to supply shared reference files does not by itself select any route. When a selected specialist is missing, return its name and the affected pending branch rather than treating a route description as executed evidence.

## Core Engineering

| Concern | Skill |
|---|---|
| Modules, ownership, update phases, migration | `threejs-project-architecture` |
| Three.js release upgrades, breaking changes, deprecations, compatibility | `threejs-version-migration` |
| Runtime editors, undo, serialization, import, export, publishing | `threejs-editor-authoring` |
| OffscreenCanvas, renderer workers, message and transfer protocols | `threejs-offscreen-workers` |
| Loop, resize, visibility, teardown, context recovery | `threejs-scene-lifecycle` |
| glTF, textures, compression, loading, asset rights | `threejs-assets-gltf` |
| Keyframes, mixers, blending, skeletons, morphs, retargeting, IK | `threejs-animation-system` |
| Vectors, matrices, quaternions, transforms, projections | `threejs-math-transforms` |
| BufferGeometry, attributes, topology, instancing | `threejs-geometry` |
| Solid Boolean modeling, CSG topology, tolerances, cut faces | `threejs-csg-modeling` |
| PBR materials, static or media textures, environments, lights | `threejs-materials-lighting` |
| GLSL, ShaderMaterial, uniforms, GPU computation | `threejs-shaders` |
| Picking, pointer, touch, keyboard, controls, spatial indexes | `threejs-interaction-input` |
| Rigid bodies, colliders, fixed-step simulation, physics workers | `threejs-physics-simulation` |
| Listener ownership, positional audio, activation, captions | `threejs-spatial-audio` |
| Legacy or explicitly combined physics-and-audio routing | `threejs-physics-audio` |
| Cloth, ropes, soft bodies, strands, particles, and fluids | `threejs-deformable-simulation` |
| Navmeshes, pathfinding, agents, avoidance, crowds | `threejs-navigation-crowds` |
| WebGLRenderer, WebGPURenderer, capability fallback | `threejs-rendering-platforms` |
| WebGPU, TSL node materials, compute, storage, WGSL | `threejs-webgpu-tsl` |
| Pass graphs and screen-space effects | `threejs-postprocessing` |
| Stills, deterministic frames, video, codecs, and audio-video recording | `threejs-capture-recording` |
| React Three Fiber and Drei integration | `threejs-react-three-fiber` |
| Vue/TresJS, Svelte/Threlte, and other framework integration | `threejs-framework-integrations` |
| HUDs, labels, text, DOM and world-space UI | `threejs-ui-overlays` |
| Core loops, entities, levels, game feel, replay | `threejs-gameplay-systems` |
| 3D charts, networks, volumes, and scientific analysis | `threejs-data-visualization` |
| Dense point clouds, scans, Gaussian splats, streaming LOD | `threejs-point-clouds-splats` |
| CAD/BIM conversion, assemblies, metadata, measurement | `threejs-cad-bim` |
| Geographic coordinates, floating origins, tiled worlds | `threejs-large-worlds-geospatial` |
| Non-XR semantics, equivalent input, sensory alternatives | `threejs-accessibility` |
| WebXR sessions, immersive input, comfort, inclusive fallback | `threejs-webxr-accessibility` |
| Profiling, spatial acceleration, adaptive quality, cleanup | `threejs-performance-memory` |
| Reproduction, diagnostics, automated and visual tests | `threejs-testing-debugging` |
| Untrusted assets, policies, production delivery | `threejs-security-deployment` |
| Replication, interpolation, prediction, authority | `threejs-networked-experiences` |

## Advanced Visual Systems

| Concern | Skill |
|---|---|
| Camera rigs, cinematic composition, floating origins | `threejs-camera-direction` |
| Analytic timelines, springs, quaternions, staging | `threejs-procedural-animation` |
| Seeded characters, body plans, rigs, IK, character LOD | `threejs-procedural-characters` |
| Shared scalar and vector fields | `threejs-procedural-fields` |
| Procedural PBR surfaces and masks | `threejs-procedural-materials` |
| Height-field relief and silhouette POM | `threejs-parallax-occlusion-mapping` |
| Generated production meshes | `threejs-procedural-geometry` |
| Trees, grass, ivy, wind, growth | `threejs-procedural-vegetation` |
| Building grammars, façades, roofs, cities | `threejs-procedural-architecture` |
| Spherical terrain, biomes, craters, orbital LOD | `threejs-procedural-planets` |
| Directional wave-spectrum oceans | `threejs-spectral-ocean` |
| Bounded and analytic water optics | `threejs-water-optics` |
| Rain, snow, wetness, accumulation, splashes | `threejs-precipitation-surfaces` |
| Planetary sky and aerial perspective | `threejs-atmosphere-aerial-perspective` |
| Raymarched clouds and cloud shadows | `threejs-volumetric-clouds` |
| Black holes, wormholes, bounded space raymarching | `threejs-raymarched-space-effects` |
| Progressive path tracing, BVH light transport, convergence | `threejs-path-tracing` |
| Particles, debris, wakes, dissolves, effect pools | `threejs-procedural-vfx` |
| History-driven frost, droplets, wet glass | `threejs-temporal-surfaces` |
| Cascades, clipmaps, stable large-world shadows | `threejs-shadow-systems` |
| GTAO and screen-space ambient occlusion | `threejs-screen-space-ambient-occlusion` |
| HDR bloom and selective emission | `threejs-bloom` |
| Exposure adaptation, tone mapping, LUT grading | `threejs-exposure-color-grading` |
| Integrated depth, normals, history, and final image | `threejs-image-pipeline` |
| Fixed-view, seed, temporal, and GPU acceptance | `threejs-visual-validation` |

## Cross-Cutting Acceptance

Every route should state:

1. Three.js and integration versions;
2. renderer and browser or device targets;
3. coordinate, scale, time, color, and resource ownership;
4. quality tiers and fallbacks;
5. fixed diagnostics and reproducible validation;
6. CPU, GPU, memory, loading, and network budgets as applicable;
7. lifecycle, accessibility, security, and deployment behavior.
