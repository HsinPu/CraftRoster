# UV geometry, density and packing

## Seam and unwrap choices

Plan texture sets and visible seams before final topology. Logical construction joins, underarms/inner legs, back of the head and hidden undersides are common seam candidates; visibility and deformation determine the actual choice. For tangent-space normal baking, hard normal splits usually need UV splits/padding, while not every UV seam needs a hard normal edge. Keep bake/export triangulation and tangent basis compatible.

Manual seam unwrap with Angle Based or a supported minimum-stretch method suits organic controlled layouts. Follow Active Quads can straighten strips for roads/limbs/trims; projection methods suit appropriate surfaces. Smart Project can be acceptable for some static assets with verified results, despite upstream blanket objections; it is not a substitute for checker/bake review. Closed surfaces without cuts can collapse or fail to solve: add meaningful seams instead of silently changing the entire asset's UV method.

UV operators are selection/context-sensitive. Explicitly set owned mesh/face selection, mode and active UV channel, then restore relevant state. Blender versions differ in UV access and selection attributes; inspect the installed API rather than assuming old per-loop selection code.

## Correct density calculation

For a square R-pixel texture, area-based density is R * sqrt(A_uv/A_world), with UV area in tile fractions and world surface area in square meters. The upstream formula based only on island size is incomplete. On a 2048 map, a 2 m-long wall spanning one UV unit has 1024 px/m along that direction. Rectangular textures require axis/aspect-aware measurements; average density can hide anisotropic distortion.

Measure world-transformed geometry and each island's area/density. Track mean, min/max and spread, plus intentional hero allocations. A 512 px/m environment or 1024 px/m hero is a starting plan, not a universal law. For adjacent kit surfaces use a consistent target. Scaling each island by target/measured density preserves its relative shape; packing afterward with scale=True changes absolute density again. Pack without rescaling when an absolute target is required, and report overflow instead of claiming success.

## Margins, overlap and channels

Convert pixels to UV fraction using the actual resolution: 8/2048 = 0.00390625. Verify the packer's margin definition and inspect actual island-to-island gaps; fractions do not always equal final pixel clearance. Include mip/filter needs, texture-set padding and thin islands. AABB packing is a useful quick iteration method; concave packing may be slower and denser. Area occupancy is not sufficient proof: an overlap can falsely increase apparent efficiency.

Mirror/stack only when shared detail is intentional and the shader/tangent pipeline supports it. During unique baking, separate overlapping recipients into explicit bake groups or known tile offsets; merely shifting by a tiny amount does not make a unique bake valid. Moving a duplicate +1 U is a workflow choice requiring the baker's tile/wrapping behavior checked, then restore the intended final layout.

Lightmap UVs are a distinct nonoverlapping channel within 0–1, with padding derived from actual lightmap resolution and importer rules. They are needed only when the target pipeline asks for them. Keep UV0/UV2 semantic indices explicit; name alone may not control importer selection.

UDIM assigns islands to documented tiles, with tiled images and target support checked. Ten-column numbering follows 1001 + U + 10*V for nonnegative tile coordinates. Many real-time targets need conversion to atlases/material sets. Trim sheets deliberately reuse strips and may tile U outside 0–1; do not flag that as accidental overflow.

## Worked wall kit and repair

For a 2 m wall face on a 2048 atlas at 512 px/m, its 2 m span needs roughly 1024 pixels, or 0.5 UV units along that axis. Lay its trim regions against the documented sheet, add 8 px candidate padding and inspect a checker on adjacent kit pieces. Scale islands to target, pack without rescale and measure again. If it cannot fit, reduce density, increase map size or split texture sets explicitly.

A checker that stretches needs seam/unwrap correction; matching average area density does not fix anisotropy. Zero-area UV faces need an actual solve/geometry diagnosis. Missing lightmap faces need selection/channel review. A UV layer existing after decimation does not prove correspondence. Inspect current full-size and mip/bake views and verify overlap categories, density and channel indices again after topology/export changes.
