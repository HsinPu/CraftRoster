# Cost diagnosis and quality preservation

For scanned shells, morph preservation and delivery trade-offs, also read [cost and appearance decisions](cost-and-appearance.md).

## Measure the actual output

Count the dependency-graph evaluated mesh after modifiers, using loop triangles, and release temporary meshes even on failure. Compare with an exported/reimported vertex count: hard normal boundaries, UV seams, colors and material splits may create additional GPU vertices. A seam and hard edge at the same place can share a split; summing every boundary independently overstates it.

Material slots per object are a draw-submission proxy. Actual calls depend on passes, batching, instancing, engine and visibility; unique material count is not draw-call count. Inventory unique loaded textures and distinguish image dimensions, uncompressed storage and target compression. RGBA8 plus a full mip chain is roughly width*height*4*4/3 bytes: 1024² about 5.3 MiB, 2048² about 21.3 MiB and 4096² about 85.3 MiB. Float/channel formats and engine compression change that estimate. Traverse needed material groups rather than counting only top-level image nodes.

Platform guides differ greatly. A mobile hero might start around 15k triangles, two materials and 1k textures; a web prop might start around 10k triangles/two materials/2k textures; a close PC hero may justify much more. These are example planning envelopes, not current engine limits. Roblox, VR devices and importers have specific evolving constraints: verify the actual target. Whole-scene visibility, transparent overdraw and CPU object counts may dominate any per-asset limit.

## Reduction order and methods

Remove unseen interiors only after every camera, pose and outfit is considered. Reduce subdivisions and bevel segments that cannot affect projected outline. For a flat CAD surface use Decimate DISSOLVE with angular threshold and seam/sharp/material/UV delimiters; COLLAPSE suits irregular surfaces with protected regions; UNSUBDIV works when a regular subdivision history exists. Compare the evaluated result, not just the ratio slider.

Merge-by-distance requires a scale-aware tolerance smaller than intended gaps; 0.1 mm is a candidate on meter-scale props, not a blanket command. Prefer connected-only weld when separate parts must remain detached. Do not erase intended shell boundaries to make a manifold counter zero.

Share trims/atlases or material instances where the target supports them. Joining a whole level defeats occlusion/frustum culling and can break UV layer correspondence. Align layer names and preserve color/UV channels before joining a localized static batch. Keep repeated source meshes instanced as long as the target can preserve them.

Skin cost includes influence count, deforming skeleton, clips and shape-key storage. Four influences is a common delivery setting, not universal. Clamp/normalize only to a confirmed target and test motion afterward. Bake unsupported constraints/drivers on an export copy; preserve controls and required bone hierarchy in source.

## Worked prop reduction and LOD risks

For a measured 24k-triangle cabinet budgeted at 8k for its gameplay distance: save baseline front/three-quarter/detail images; remove hidden internal screws, reduce cylinder sides and bevel rings, then remeasure before decimating. Preserve hinges and visible door gaps. Atlas two compatible opaque materials, but keep transparency separate when needed. Generate named lower-detail copies only after an acceptable LOD0 exists, and compare at transition screen sizes.

The reviewed source LOD helper optionally cleans the original and deletes pre-existing same-named LOD objects; never adopt those operations without explicit ownership and a recoverable copy. Build a temporary revision, ensure names are collision-free, and evaluate modifiers into a duplicate rather than applying to the master.

If a lower LOD tears UVs, protect seams, relax reduction or rebuild/rebake. If a facial expression collapses, retain deformation loops and test weights instead of pursuing the ratio. Keep proxies separate from render simplification.

Accept only after current images and any affected motion show acceptable outline, shading and identity. Record measured costs and trade-offs; target-engine profiling in a representative population is needed for performance claims. A successful GLB and low file size cannot establish real-time frame cost.
