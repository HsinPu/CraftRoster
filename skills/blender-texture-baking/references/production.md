# Texture bake construction, artifacts and validation

## Bake contract and source protection

Record low/high pairs, intended UV, target resolution/mips, tangent convention, triangulation, channels/color spaces and engine. Preserve high sculpt/procedural source and working low before destructive changes. Cycles performs bake; discover actual CPU/GPU backend rather than assuming the render device works for every bake.

Low mesh needs valid UVs and intentional overlap handling. Move duplicate/mirrored islands outside the active bake tile or isolate them when they would overwrite different source detail. Keep the authoritative final triangulation consistent between bake and export. Hard-normal discontinuities typically need UV splits/padding; inspect the actual smoothing/tangent contract rather than imposing an arbitrary topology style. High floaters/details need valid normals and ray coverage.

## Targets and projection

Select only intended high sources and low target, with low active. Enable selected-to-active for transfer; self-bake omits high sources. Every low material slot needs an active Image Texture node pointing to the target image, including empty slots filled deliberately. Make the intended UV active and explicitly choose it on bake. Snapshot original active nodes/selection/settings and restore them in finally after success or failure.

Uniform cage extrusion should exceed required surface deviation without hitting unrelated parts. Use measured bounds and a small preview rather than a universal 0.02 m. Explicit cages must preserve low topology/vertex correspondence and surround relevant high surfaces. Edit locally for concavities and thin parts; generating thickness with Solidify adds topology and is not automatically a valid cage. Bake by matched parts or exploded pairs to prevent cross-projection. Preserve the cage as reproducible source.

## Map recipes

Tangent normal: NORMAL bake, tangent space, OpenGL POS_X/POS_Y/POS_Z for Blender/glTF; invert Y only for the declared receiving convention. Normal data is Non-Color. AO is a separate linear mask; determine whether intended contact includes neighboring parts/ground. Raise samples for noise after geometry/ray issues are fixed. Roughness can use the native pass.

For procedural basecolor/metallic/alpha, route the actual requested material signal temporarily through Emission and bake EMIT, restoring the original Surface link afterward. Choosing the first Principled input does not capture arbitrary multi-BSDF shader semantics; define the source output for complex materials. ID colors need a stable ID-to-color table and sufficient distinctness, not an unverified hash collision assumption. Thickness via inside AO is only an occlusion-derived proxy with a defined distance, not exact physical thickness. Curvature derived from tangent normal divergence is an image-space approximation and has UV/seam/tangent artifacts; use verified geometric curvature when required.

Use sRGB for appropriately encoded basecolor/emissive output and Non-Color for normal/rough/metal/AO/masks. Position/vector/displacement data may need float EXR and explicit range/coordinates; saving it as clamped PNG destroys information. Multi-res baking uses its own viewport/sculpt levels and bake operator options; inspect version-supported types instead of mixing `object.bake` and `bake_image` settings.

## Padding and packing

Start with 16 px margin at 2K and gutters sufficient for intended mips, then inspect downsampled results. Margin cannot fix overlapping islands or different engine tangents. Save generated images explicitly; packing in `.blend` and external delivery paths are separate choices. Use linear channel packing: ORM R=AO/G=roughness/B=metal, alpha as declared. Missing channels require explicit defaults in the manifest, not silent success. Unity smoothness/mask packing differs; use blender-pbr-materials for target layout.

## Correct artifacts

Black holes: rays miss/backfaces, hidden sources or wrong target. Ghost details: neighboring parts/overlarge cage. Skewed bolts: averaged ray directions; improve cage/low supports or isolate floaters. Wavy cylinders: inadequate low silhouette/smoothing and projection. Engine seams: compare UV splits, triangulation, tangent basis, padding and normal Y before adding samples. Banding: use sufficient bit depth for the signal. Blurry maps: inspect UV density and actual output dimensions.

Deliver bake source/settings/pair map/cage, saved texture manifest with color spaces/channels, artifact close-ups and neutral low-with-bake versus high reference renders. Check file decode, dimensions, finite values, channel ranges and coverage. Inspect seams at mip distances and reimport material/mesh to the actual target. Nonempty images or a successful bake operator do not prove correct detail transfer.
