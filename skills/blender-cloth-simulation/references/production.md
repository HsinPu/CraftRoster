# Cloth solver and cache acceptance

## Delivery path and preparation

Distinguish static drape, cinematic vertex cache, corrective morphs and runtime cloth. Blender Cloth does not transfer as live physics through ordinary FBX/glTF. A game needs bones/morphs, an engine cloth setup or rendered effects. Alembic/USD acceptance depends on the receiver. Preserve simulation source separately from delivery.

Set units, effective FPS, simulation/shot ranges and pre-roll first. For a one-meter cape an even 2–4 cm grid is a starting point; refine after motion works. Quads help predictable bending but are not mandatory. Remove zero-area/skinny faces, duplicates and penetrating starts. Use a simplified collision body rather than the high-resolution render mesh. Prepare applied-scale copies before tuning.

## Classic Cloth construction

Add `cloth=ob.modifiers.new('CapeSim','CLOTH')`; set `cloth.settings.vertex_group_mass` to an existing pin group. Weight 1 anchors, with soft falloff around supports unless the seam is truly rigid. Armature/Hook before Cloth can animate the base/pins; subdivision/thickness afterward add render detail. Verify moving-pose modifier order to avoid double deformation.

For a cotton preview try quality 8–12, mass 0.15–0.3 in Blender's cloth mass setting, tension/compression/shear around 15 and bending 0.2–0.5. Coats need more structure, silk less bending. Values depend on grid/scale and are not measured universal fabric specifications. Keep time scale 1 while tuning; damping removes chatter but excessive damping looks viscous. Stiffness groups and sewing springs require explicit topology/setup.

Add COLLISION modifiers to intended colliders, enable cloth object collision, and start with 2–5 mm outer thickness/minimum distance at human scale. Their sum must fit actual clearance. Begin without self-collision; enable it for folds with distance below edge spacing. Restrict irrelevant collider participation where supported.

## Settle and persist

Start nonpenetrating, run 20–60 pre-roll frames and enter action gradually. Reset from cache start after changing geometry, pin weights, FPS, collisions, modifiers or settings. Preview by stepping every frame; jumping to a late frame cannot reproduce history reliably.

Sequential evaluation only fills volatile state. Set point-cache range and save a revision, then perform the supported point-cache bake with the correct object/cache context. Record disk-cache path and bake state. Reopen in a new process, sample nonsequential frames and compare to the approved preview before farm delivery. For experimental node cloth inspect the installed asset interface and feature limits; do not silently replace classic Cloth with a version-sensitive solver.

## Diagnose and correct

Exploding first frame: check penetration, duplicate/zero-area faces, negative scale and excessive collision distances. Fast tunneling: increase solver quality/substeps, simplify/thicken collider and inspect continuous movement; bending stiffness cannot fix tunneling. Pin stretch: improve falloff, topology and tension instead of rigidly pinning a broad visible band. Fold chatter: reduce oversized self-distance/collider noise and increase damping/quality gradually. Rubber motion: compare stiffness/mass/timing on a controlled swatch before retuning everything.

For a static drape duplicate the evaluated frame while retaining source/cache. Morph capture needs identical topology/order and positions converted to the same local space. Key the weights and test between captured frames; many-frame morphs can be heavy and interpolate poorly. Cinematic caches include FPS, units, topology behavior, range and clean reimport proof.

## Acceptance

Deliver source, immutable cache directory/manifest, pin/collider inventory, settings, pre-roll/shot range, motion preview and repair log. Measure pin drift and body clearance/intersections in critical regions; inspect finite evaluated coordinates over sampled frames. Watch the complete clip for tension/silhouette pops. Stable final-frame geometry does not prove stable animation or a reusable cache.
