# Effect timing, volumes, particles and real-time delivery

## Effect brief and representation

Define spawn pivot, anticipation/start/peak/tail frames, physical/stylized motion, size, camera, FPS and budget. Choose cinematic simulation/volume, geometric ribbons/instances, engine-native effects or rendered flipbooks. Preserve source emitters, procedural nodes and raw renders. An effect reading in a beauty still can fail timing/silhouette in motion; approve a cheap prototype first.

## Smoke and fire

Use a Mantaflow GAS domain, FLOW source with intended smoke/fire behavior and closed EFFECTOR collision. Bounds contain actual expansion plus margin, not a huge empty environment. Start at resolution 32–64 to approve plume rise, source velocity, timing and dissipation; refine only after motion approval. Specify cache directory/range/type and bake required data/noise. Reopen nonsequential frames in a fresh process before calling the cache portable.

Shader density/temperature/flame attributes depend on actual simulation grids. Principled Volume should read the intended density and blackbody/emission behavior; a default volume material does not automatically use all fields. Fire lighting and separate practical fill need deliberate balance. Excess emission/glare cannot fix wrong motion. Clipped plume: enlarge/reposition domain and rebake; voxel-stepping: inspect resolution/scale and render quality; missing smoke after reload: cache path/bake/source problem.

## Sparks, dust and ribbons

Use bounded deterministic emitters with stated rate/lifetime, initial velocity, gravity/drag, collision and seed. Legacy particle systems may be unavailable or unsuitable in newer versions; discover supported data/nodes. GN instances can render efficiently while base mesh counts remain zero: inspect evaluated instances and render cost. Camera-facing sprites/cards need correct billboard orientation, soft alpha and depth intersection strategy. Debris belongs to blender-simulation with actual rigid collision.

Build trails/ribbons from sampled positions with stable IDs, finite lifetime and stored history or an analytic path. Resample and transport orientation to prevent twist at near-parallel tangents. Width/alpha/emission fade along age; roots/pivots remain meaningful. Bound point counts and simulation-state growth. An analytic trail can evaluate arbitrary frames; history-dependent simulation requires a persistent bake. Do not conflate the two.

## Flipbook and engine path

Render from a locked camera with consistent framing/lighting across frames, transparent film and RGBA output. Choose orthographic/perspective by intended sprite use. Set a fixed world-size frame bound so peak smoke is not cropped and apparent scale does not pulse. Keep raw sequence, then pack atlas rows/columns with documented origin, indexing, frame count and lifetime. Add gutters/alpha color bleed for mips; test premultiplied versus straight alpha over light/dark backgrounds. Normal/emission/distortion/motion-vector maps require an explicit target shader contract, not arbitrary packed names.

For loops inspect first/last and temporal derivative/optical appearance; fading to nothing can hide a pop but may not satisfy continuous flame. Do not duplicate the endpoint and add a pause unintentionally. Game sparks/ribbons usually need native particle recreation rather than thousands of exported drop meshes. glTF/FBX do not preserve Mantaflow, GN simulation or arbitrary shaders. Export mesh/card/atlas data and implement supported runtime behavior separately.

## Visual correction and delivery

Review the entire effect at gameplay scale and final camera, plus peak/impact/tail stills. Measure range/duration, bounds, particle/triangle maxima, atlas memory and alpha coverage where relevant. Readability includes motion direction, impact timing, color/value hierarchy and background separation. Too much dust: lower opacity/count and preserve silhouette; dead impact: correct timing/expansion rather than add glare; swimming sprite edges: inspect alpha/color bleed and engine sampling.

Deliver source `.blend`, seed/settings, effect timing sheet, cache/sequence/atlas manifest and preview on representative backgrounds. Technical cache/render checks, actual visual acceptance and engine performance/import are separate. Report unexecuted engine tests explicitly.
