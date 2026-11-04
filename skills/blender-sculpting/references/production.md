# Sculpt form, topology and execution

## Resolution choices

Voxel remeshing fuses overlapping masses into a new surface with roughly uniform spatial density. It can erase UVs, weights, multires levels and thin features; save the original and choose voxel size from the smallest form that must survive. A 2 m figure might start at 0.02 m voxels for blockout, then become much denser as the size shrinks. Memory growth is not linear; do not immediately jump to a few millimeters on a full body.

Dyntopo changes topology while brushing and is useful for exploration, but conflicts with stable base/UV/multires workflows. Multires retains a base correspondence and adds subdivision levels for controlled detail/baking; changing base topology afterward invalidates that correspondence. The upstream suggestion to avoid multires when preserving base topology is misleading: stable topology is one of its main strengths. Imported subdivided meshes may support rebuild/unsubdivide, and reshape requires compatible topology; inspect the actual build/operator and input relationship first.

## Form and brush decisions

Block ribcage, pelvis, skull and limb gesture using major masses. In character work, head-unit canons and landmark heuristics are art guides, not universal human measurements. Check actual front/side reference, shoulder/hip tilt, hand/foot proportions and head depth. Secondary work defines bony landmarks, muscles, fat transitions and cloth stress folds. Only then add pores, scale patterns, scratches or fabric weave.

Use large Grab/elastic movement for primary corrections, Clay/Clay Strips for volume, Plane/Scrape for planes, Crease/Draw Sharp for folds and Smooth for transitions. Strength/radius depend on mesh resolution, pressure and scale; low-strength alpha stamps around 0.15–0.25 can be a starting experiment for subtle pores, not mandatory settings. A named third-party Dam Standard brush is optional; choose an installed equivalent rather than pretending it is native.

Masks and face sets isolate regions, parts or material transitions. Trim gestures and mask extraction can create concept armor shells in a live supported context; polygon modeling is often better for production mechanical precision. Inspect extracted shell thickness and intersections before using it as a bake source. Add asymmetry after the broad bilateral structure is approved when the brief permits it.

## Context and procedural equivalents

Never assume Sculpt Mode operators are safe in background Blender. The reviewed source warns of crashes; use object-level voxel remesh, symmetry, displacement, smoothing and multires preparation in authorized background copies instead. Live brush strokes require a valid viewport region/context and actual available brush assets; many 5.x brush/automasking/stroke APIs differ from earlier releases. Discover the build before attempting them. No upstream sculpt script is installed here.

Procedural order matters: remesh before multires/detail; symmetry uses the object's local plane; displacement uses defined texture coordinates and strength; Laplacian smoothing can reduce noise but also erase forms. Applying every modifier, especially multires, is destructive. Store names before applying modifiers because applied RNA structures may be freed. Do not change unrelated visibility to speed the task.

## Worked sculpt-to-bake source

For an authorized creature torso, preserve a base copy and join only owned intersecting blockout masses. Use a coarse voxel pass to unify them, inspect chest/pelvis silhouette, and correct shoulder attachments. Move to a clean stable lower base before adding multires detail that must bake back. Add folds following the tested compression directions, then a restrained skin alpha at a documented physical frequency.

Create matched high/low part names and preserve a separate high collection. Choose cage distance from measured source/low separation; a 1–2 percent size heuristic is only a starting point and can cross thin neighboring surfaces. Explode parts or use isolated bake groups when projection would leak. Do not require one high-poly face per texture pixel or a fixed million-face count; evaluate whether the surface signal is represented at the output texel scale.

## Repair and acceptance

A lumpy sculpt needs primary/secondary plane correction before smoothing or pores. Erased eyelids need a restored source and finer/local topology. Symmetrizing across the wrong plane needs origin/axis correction on a working copy. Bake streaks need ray/cage/part isolation review, not arbitrary darker shading.

Acceptance requires actual current silhouette and detail images, finite evaluated geometry, intentional boundaries and no harmful inversions/intersections within bake range. Check rough poses if deformation is part of the brief. Keep remesh/multires/bake checks separate; a high polygon count or noise displacement does not demonstrate form quality.
