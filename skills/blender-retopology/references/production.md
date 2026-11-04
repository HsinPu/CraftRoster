# Retopology methods and failure boundaries

## Method selection

Manual construction with surface snapping and Shrinkwrap gives control over eyelids, lips, shoulders and other sensitive motion. Use an explicit projection direction/offset and check both sides of thin forms. Nearest-surface projection may jump between nearby limbs; PROJECT can miss where rays do not meet the target. Neither mode makes a deformation-ready mesh automatically.

Quadriflow targets a quad count, so a nominal 8k triangle envelope might begin near 4k quads, but actual output requires measurement. A voxel prepass can make difficult scanned input coherent while erasing UVs, weights and thin features; retain source and choose voxel size from minimum thickness. Do not infer good facial flow from a quad-dominant result. External remeshers such as Instant Meshes are optional, separately installed tools, not bundled capabilities.

Collapse reduction can retain existing UV layers but may distort them. Planar dissolution is suitable for flat static/CAD regions, with seam/sharp/material/UV delimiters; its angle threshold does not guarantee a requested triangle count. Evaluate upstream modifiers on a duplicate before remeshing, and never hide or alter the original's visibility without scope.

## Deformation flow

Build continuous eye/lip loops and supporting facial planes according to the expression brief. A dialogue face may need six or more mouth rows, but loop count is only a starting estimate. Lip corners must connect into cheeks/jaw without terminating in a star pinch. Eyelid flow follows the eyeball and must support full closure. Keep nostril boundaries coherent and avoid high-valence poles at the most visible curvature.

Elbows, knees and fingers need a bend row with support to either side plus volume in compression. Shoulder topology must support arm elevation. Move pole redirections toward low-strain or hidden areas, judged through actual deformation; an armpit is not automatically safe merely because it is hidden at rest. Triangles can work in non-deforming regions; avoid unsupported n-gons where subdivision/skin motion will change shape.

A cinematic mesh may support more facial/micro-expression detail and displacement, while a game mesh emphasizes camera-visible motion and cost. Never adopt a cinematic count to imply better quality. Hidden body faces can be removed only on an outfit-specific delivery variant after pose/coverage checks.

## Worked creature low mesh

For an 8k-triangle static creature statue, test an automatic remesh copy with a voxel smaller than the thinnest retained horn. Inspect ears, nostrils and claw gaps before committing. For the animated version of the same creature, use the dense form as projection reference and manually route shoulders, hips, jaw and face loops. Maintain separate source/low collections and a recorded offset.

Measure world-space silhouette and surface deviation on the head, appendages and limbs. A nearest-point distance is useful but can hide a projected vertex on the wrong nearby surface, so inspect topology overlays and cross-sections. Test a crouch, extended stride and open jaw with an appropriate rough deformer/rig when authorized.

## Repair and acceptance

Spikes after Shrinkwrap: inspect misses, normals, direction and target space. Thin horns disappearing: restore source and choose finer remesh/local manual topology. Pinched joints: redirect loops and pole placement, then retest weights and joint centers. UV layers surviving but looking torn: inspect checker distortion and re-unwrap/rebake as required.

The reviewed automatic helper applies duplicate modifiers, uses a voxel/quad target, optionally projects in both directions and hides the source. Those are not blanket permissions. Preserve sources and make each step explicit in a scoped implementation.

Acceptance combines finite geometry, intended closure, actual triangle counts and source deviation with actual wire/silhouette and required-pose images. State tests unexecuted if Blender/rig/image review is unavailable. Retopology ends at a proven mesh contract; UV, bake and production rig remain conditional follow-up work.
