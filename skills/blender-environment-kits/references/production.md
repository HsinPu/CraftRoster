# Kit, heightfield and biome mechanics

## Terrain construction

A regular square grid with N vertices per side has N² vertices and 2(N−1)² triangles. Cell spacing is extent/(N−1). Estimate memory before selecting resolution; tile large landscapes with identical border samples. Choose dimensions compatible with the target importer, which may distinguish Unity power-of-two-plus-one heightfields from Unreal's component/section layouts. Verify current import constraints instead of assuming one square resolution serves every engine.

For rolling shapes use low-frequency fractal noise; ridged noise emphasizes mountain crests; heterogeneous noise varies roughness with elevation. Expose feature size in meters, octave count and seed. Thermal erosion moves material from slopes beyond a chosen talus threshold; it is a visual process, not hydraulic erosion. Keep border handling explicit to avoid wrap-around exchange. Terracing quantizes height with a softened riser. A flatten control blends a chosen play-area level back into the field with a smooth transition; inspect that ring for steep banks.

Store slope and height with named domains and units: for example ENV_Slope as angle/90 on points and ENV_Height as a normalized point float. When using slope thresholds such as 35 degrees for rock and upper-height snow, describe them as art parameters. Height normalization is not world elevation. Export both minimum elevation and vertical range, grid extent, cell count, origin, row order and coordinate handedness. A normalized 16-bit sample decodes as z_min + sample/65535 * z_range. A range alone loses a nonzero baseline.

Write data textures without display transforms. RAW may require unsigned little-endian 16-bit values; PNG must actually preserve 16 bits. RGBA splats can store grass/rock/snow in RGB with normalized weights; define alpha separately. Reimport known corner and middle samples, measure error against approximately range/65535 quantization, and check vertical orientation. Do not inherit the upstream claimed round-trip tolerance without a local measurement.

## Scatter and coordinate frames

Build one controlled layer per biome population. Distribute points, apply slope/height/density masks, pick source instances, randomize scale/yaw and then output instances. A tree generally stays upright; a rock may partially align with the surface normal. Start with tree spacing of several meters, then fill shrubs/grass at a density appropriate to the asset and target; count actual output rather than treating density as an exact count.

Slope tests must state whether normals are smooth/interpolated or geometric. Height masks may run in object space even when placement reports use world transforms. Normalize transforms or convert explicitly. Nonuniform scale requires inverse-transpose normal conversion; a determinant-based area approximation is inaccurate for arbitrary anisotropic scaling. Preserve source collection visibility outside the task: excluding an entire collection can affect other view layers.

The reviewed upstream scatter checks roughly 500 sampled instances at high populations, despite prose describing every instance. A local report must record checked/total counts, failed queries and missed surface hits. If zero points survive, inspect mask availability/domain, height frame and normal threshold before increasing density.

For a placement-data handoff, record each source asset identifier and world transform, with units, up axis and quaternion component order. The reviewed upstream JSON uses meters, Z-up and wxyz quaternion order; a receiver expecting xyzw must convert explicitly. glTF GPU instancing requires exporter support for EXT_mesh_gpu_instancing and a compatible receiver. FBX may instead need explicit objects or realized geometry. A saved point file is not proof that an engine instantiated its assets correctly.

## Kit assembly and worked recipe

For a 4 m wall/floor kit on a 0.5 m lattice, choose a corner-at-floor pivot and record the outward normal. Test straight runs, inside/outside turns and a doorway in a closed room. Measure footprint and connector positions within an agreed tolerance, such as 1 mm for this kit. Thin trims need not occupy an entire grid cell; intentional open seam edges are distinct from accidental internal holes.

For a 100 m terrain test, begin at 129 samples, a modest 12 m elevation span and a 10 m flattened building zone. Create a rock layer with saved seed 17, a bounded scale range and a maximum slope suited to its art direction. Inspect cliff roots, ground contact and path exclusion. Keep instances until the selected target needs conversion. glTF instancing support, engine placement JSON or realized FBX are separate delivery paths; do not realize a dense forest reflexively.

Correct origin/scale on an owned single-user source while preserving world geometry and linked siblings. Rebuild the assembled test after the fix. Report per-piece bounds, seam errors, intended open boundaries, UV density and evaluated triangles. Review actual seam close-ups and biome vistas after the final edits. Importer acceptance remains separate from Blender's data checks.
