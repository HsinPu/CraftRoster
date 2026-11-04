# General mesh construction and scene discipline

For a compact comparison of geometry versus texture and discipline boundaries, read [construction branches](construction.md).

## Geometry planning

Separate reference guides, blockout, working geometry, collisions, instances and delivery copies using the project's names. Common prefixes such as SM_ for static mesh, CAM_ for camera and GN_ for groups help discovery, but preserve an existing naming contract rather than renaming the entire file. Keep blockout until its proportions are accepted. A mechanical root empty can carry assembly placement while door/hinge/grip pivots remain functional.

Use orthographic front/side views for measured form, then the intended perspective for visual judgment. Set dimensions numerically and inspect actual world bounds after modifiers. Cursor placement, vertex/edge/grid snapping and explicit connector coordinates support precision; they are tools, not a reason to erase meaningful object transforms.

Extrusion adds connected volume; inset creates borders; loop cuts add continuous resolution; knife cuts handle custom topology. Use only enough resolution to represent shape and upcoming deformation. Decide likely UV seams and material boundaries before dense final topology.

## Modifier decisions

Read the stack in evaluation order and explain why each stage sees that input. Mirror often precedes repeated detail; Array may need constant offsets for modular spacing; Solidify may need to precede cuts when a shell must become a solid operand. Boolean followed by Bevel treats cut edges; Weighted Normal or angle-based smoothing controls shading afterward. Subdivision is a different curvature workflow requiring support topology. There is no universally correct ordering that combines every modifier.

For Mirror, align the local symmetry plane and inspect clipping/merge thresholds. A millimeter merge tolerance can erase tiny features, so derive it from actual dimensions. For Array, choose count and spacing explicitly; merging array ends is appropriate only where boundaries are intended to weld. For Solidify, inspect inside/outside offset and corners. Preserve live sources; apply only when required on a copy.

Linked duplicates share mesh edits, independent duplicates do not. Collection instances keep assemblies reusable; Geometry Nodes handles parameterized populations; Array suits regular repetitions. Applying per-object scale to shared mesh data can change every sibling. Inspect users and make the affected data local only when the task calls for divergence.

## Cleanup and shading

Measure the smallest intentional gap before merging vertices. Remove actual loose artifacts and internal duplicate faces, but keep deliberate open shells and separate touching parts. Recalculate normals on coherent closed regions; for thin surfaces determine the intended side rather than relying on an outside heuristic. Check negative-scale handedness and backface behavior.

Modern sharp-edge/angle-smoothing workflows vary by Blender release. Inspect the supported API instead of assigning a removed Auto Smooth property. Clear or rebuild custom normals only when topology changes require it and preserve the shading source on a copy. Count evaluated triangles, not raw polygons.

## Worked gate repair

An existing 2 m gate uses a 0.5 m snap grid and a left-edge hinge. Save a working copy of the owned gate and corner modules. Compare doorway width/height and hinge placement with the measured assembly. Use numeric edits or a controlled Mirror adjustment to repair the opening; do not rescale the whole assembly and move the hinge. Assemble straight/corner/door modules together, then inspect front, side and gameplay views. Add only the bevel/support geometry needed to retain the established silhouette.

If corners gap, compare connector coordinates before hiding the error with trim. If shading changes after a join, compare UV/material names and normal boundaries. If a cleanup collapses thin bars, restore the prior mesh and lower the tolerance. Recheck world bounds, pivots, evaluated topology and the same rendered images after correction.

Asset Browser marking, previews and catalog assignment are optional reuse deliverables; they do not imply the mesh has passed visual approval. Use blender-hard-surface, blender-character-modeling, blender-environment-kits or blender-reference-modeling when the work demands their specialist decisions. Keep feasible general geometry work independent of those routes.
