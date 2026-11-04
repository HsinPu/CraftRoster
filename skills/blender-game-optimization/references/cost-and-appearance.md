# Cost and appearance decisions

## Choose the reduction
For rigid objects, reduce invisible subdivisions and redundant coplanar geometry before changing the outside shape. Thin scanned shells can be damaged by voxel remeshing; rebuild or simplify with a method that preserves their actual surface. Protect protruding silhouette features as geometry; normal maps cannot replace them from arbitrary views.

For organic or skinned assets, inspect face, hands and bending joints after reduction. Weight transfer and remeshing need their own deformation checks. Preserve required morph targets or regenerate and validate them deliberately. Crowd budgets depend on the full concurrent scene, shadow passes and hardware; do not repeat an upstream machine's FPS as a guarantee.

## LOD and instances
Choose transition criteria from projected size and compare neighboring LODs using identical framing. Fixed percentage reductions are candidates, not acceptance criteria. Distinguish keeping instances in the authoring file from what the exporter realizes or the engine batches. Count the exported result.

## Materials and textures
Combine slots or atlas only when compatible with shading, transparency, UVs and required variation. Preserve alpha edges, normal-map basis and enough mip padding. Report dimensions, format and estimated memory assumptions; compressed file size is not GPU memory. Include skinning and morph costs where applicable.

## Collision and delivery
Pick primitive, convex or detailed collision from gameplay requirements and the engine's support. Inspect clearance and contacts; do not replace visual geometry with its collider or include colliders in beauty counts accidentally. Preserve a high-detail source and the derivation settings. Export and reimport remain separate checks from authoring statistics.
