# Mechanical construction, normals and detail

## Choose a pipeline

Mid-poly geometry uses selected bevels and controlled normals directly with tiled/trim materials. High-to-low retains a dense boolean/subdivision source and a simplified UV mesh for baking. Subdivision needs topology that supports smooth curvature and held edges; do not feed untreated curved n-gons from a boolean into Subdivision and expect clean highlights.

Primary forms establish identity. Secondary parts define panels, vents, hatch depth and functional assembly. Tertiary bolts, welds and small greebles should consume only the budget visible at the intended distance; place tiny marks in normal maps/decals when appropriate. Stylization can depart from manufacturing realism intentionally, but preserve its confirmed shape language.

## Boolean and bevel decisions

Check operand transforms, closure and normals. EXACT is a robust mechanical starting point when supported; MANIFOLD needs suitable closed inputs; FLOAT may be useful for a known compatibility/performance case but is fragile around coplanar geometry. Extend cutters through the intended region so coincident faces do not cause missing/sliver surfaces. A collection operand can simplify many cuts, but combining all cutters is not automatically more robust.

Keep cutters render-hidden and outside the delivery selection. Do not disable a shared collection globally. Preserve the live source unless a downstream bake requires an applied copy. A typical intended order is symmetry/repetition, cutting, bevel and final normal treatment; inspect geometry effects rather than enforcing a universal stack. Sometimes a pre-cut bevel represents a different designed edge and is intentional.

Choose bevel width in physical units. A 1 m casing might begin with 5–10 mm primary edge treatment and narrower panel edges, but material/process and shot determine final values. Angle limiting around 30 degrees is an initialization; weights/selection isolate edges more reliably on complex surfaces. Clamp overlap prevents some self-intersections but can shrink narrow bevels unevenly. Reduce width, repair spacing or isolate the tier instead of treating clamp as proof.

## Shading and topology

Inspect smooth face state, sharp-edge attributes and normal-modifying stack order. Weighted Normal can preserve broad flat highlights after bevel when the build supports it; face-area weighting with keep-sharp is one option, not a requirement on every mesh. Smooth by Angle workflows replace older Auto Smooth APIs in newer Blender builds; inspect the installed operator/asset rather than assigning removed properties.

On current attribute-based meshes, bevel weights and creases are edge-domain float attributes, while sharp_edge is boolean; seam marking remains an edge flag. Support loops or creases can hold subdivided edges, but an engine usually receives the evaluated result rather than Blender crease semantics. Flat static n-gons can be valid; curved/deforming n-gons and skinny slivers need cleanup. Allocate cylinder sides by projected silhouette: a tiny hex bolt and a hero barrel need different resolution. Keep triangulation identical between tangent-space bake and delivered low mesh.

## Repeated detail and functional assemblies

Build a small owned library of bolt heads, ports, vents, brackets and rail segments; instance it at meaningful attachment points. Align surface-mounted parts with the local normal, then constrain yaw/offset so fasteners remain seated. Avoid random rotations that make hinges or rails unusable. A curve profile is often cheaper and more editable than individually modeled cable segments. Sheet-metal bends, gasket channels and weld strips should have their own scale and construction logic. Keep detail objects independently toggleable for lower LODs.

For a weapon/viewmodel brief, preserve the grip contact pivot, sight-line alignment and separate slide, magazine or other moving parts. Check the first-person camera and required action poses, not only an external orbit. Vehicle-wide proportion/system decisions belong to blender-vehicle-modeling; use this branch for its mechanical surfaces without replacing that larger contract.

## Worked industrial console

Block a 1.2 by 0.6 by 1 m casing, separate hinged panel and rubber gasket. Save the clean blockout. Create two through-cut vent operands in an owned cutter collection, inspect EXACT output, then add selected 8 mm main bevels and narrower panel edges. Instance bolts and retain them as toggleable detail. Choose a trim UV plan before adding bevel topology that obscures seam selection. Inspect a neutral matcap and a grazing area-light view, then compare at gameplay size.

If faces disappear, inspect cutter overlap, manifold state and normals. If flat panels have gradients, inspect shading and normal boundaries before adding geometry. If curved areas pinch, remove sliver n-gons/poor pole placement or rebuild curvature. If bevels balloon, check scale and local spacing. The reviewed stack helper replaces prefixed modifiers and changes cutter visibility; a local implementation must own those exact resources and preserve unrelated stack entries.

Deliver a source stack and applied export copy only as needed. Technical checks cover finite geometry, boundaries, self-intersections, normals and evaluated costs. Visual checks cover outline, panel hierarchy, consistent edge highlights and intended assembly; re-render the same views after repairs.
