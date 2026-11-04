# LOD construction and transition quality

## Budgets and methods

Ratios are initial hypotheses. A hero prop may begin near 100/50/25/10 percent of LOD0 triangles, a vehicle 100/55/30/12, and a tree may replace its last stage with an impostor. Choose by projected shape error rather than pursuing those percentages. Fixed distances depend on field of view, object size and display resolution. A screen-height scheme is often more portable, but engine definitions differ; document the actual formula/settings.

Use planar dissolution on static flat regions, collapse on suitable irregular surfaces, and manual rebuilding where deformation or protected features matter. Remove tiny bolts, unseen interiors and fine frames before collapsing important outline. Normal-bake transfers can preserve surface detail but cannot preserve silhouette or contact geometry. For animated assets retain the intended skeleton and weights, and test poses on each changed level.

LOD0 is a recoverable approved source. If it needs correction, revise it explicitly and regenerate/review affected lower levels; do not silently optimize it while generating the chain. Use separate mesh datablocks and collision-free names. Evaluate procedural modifiers onto the duplicate with temporary meshes released afterward. Never delete same-named scene objects until ownership and replacement are explicit.

## Consistency contracts

All levels need a common root, scale, axis and pivot to avoid position popping. Bounds should represent the same intended asset; record deliberate differences from dropped appendages or billboards. Material slot order and shader-relevant UV/color attributes must stay compatible, even when a far level intentionally uses a different material. Record and test that exception. A lower level with a different slot count is not automatically wrong, but cannot silently change material association.

Inspect UV seams, normals, thin surfaces, alpha cards and any skinning. Decimation can preserve layer existence while tearing actual interpolation; a nonempty UVMap is insufficient. Lower foliage needs crown/coverage preservation rather than simply fewer leaf cards everywhere. Billboards/impostors need capture directions, alpha edges, lighting assumptions and transition behavior documented.

## Worked cabinet chain

For an approved 8k-triangle cabinet, start LOD1 around 4k by reducing bevel rings and hidden hinges; start LOD2 near 2k with simplified door rims; create a far shell only if its silhouette remains recognizable. Preserve door gap and base footprint. Store copies as SM_Cabinet_LOD0 through LOD3 in an owned collection.

Try transition screen heights of 0.5, 0.25 and 0.1 as a staging experiment, not a promised cross-engine mapping. Frame LOD0 and each candidate at the exact same camera/scale around those transitions and inspect alternating images or an actual transition playback. Check front, three-quarter and the worst thin profile. Record the count actually achieved; a planar angle is not a triangle ratio.

If a handle disappears too early, keep a coarse handle or delay that transition. If normals pop, compare triangulation and baked tangent basis. If the asset jumps, correct origins/transforms rather than camera framing. If materials change unexpectedly, compare slot order and exported attributes. Test skeletal collapse at compression and extension extremes.

Acceptance includes current per-level images at transition size, no unintended holes/inversions, intended attribute continuity and documented pivot agreement. A target import must prove the engine actually selects the levels and uses the intended thresholds. Engine auto-LOD, Nanite or importer-specific alternatives should be selected only when supported by the actual asset/runtime; handmade LODs are not universally required.
