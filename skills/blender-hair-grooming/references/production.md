# Groom, strand and hair-card production

## Representation and surface contract

Choose render curves, an actual supported engine groom pipeline or hair cards. Do not promise generic glTF strand export. Preserve scalp topology, UVs, rest geometry, guide curves and density masks. Record character scale, hairstyle flow, target camera, strand/card budget and motion requirements. Cinematic guides/children and game cards require separate acceptance.

Define hairline, crown/part, sides, nape and facial regions with guide flow/length. Verify scalp UVs before attaching curves: changed topology/UV correspondence can detach roots. Density masks should feather the hairline while excluding eyes, ears and mouth. A duplicate scalp may need Surface Deform/armature attachment, but do not deform it twice.

## Curve groom construction

Use a CURVES object attached to the surface and its UV map. Inspect the installed Add Empty Hair behavior instead of assuming it creates the same dynamics/modifier stack on every release. Blender 5.2 bundled procedural hair assets can be appended from the installation's node asset library. Resolve the asset path through `bpy.utils.system_resource('DATAFILES')`, check available groups and inspect their interface; never assume hardcoded socket indices or input identifier APIs from another release.

Build guide generation → child interpolation → clump → curl → displacement/noise → profile with explicit root preservation. Guide density and child density are usually per surface area, not total hairs: multiply by measured scalp area and mask coverage to estimate count. Start with hundreds/thousands of guides, then add children within memory budget. A clump guide distance near 5–10% of hair length is a useful starting scale; huge distances merge the whole head. Use low viewport fraction but measure final render density separately.

Style primary masses/flow before flyaways. Curves Sculpt Comb, Smooth, Grow/Shrink and density editing need appropriate live context; headless procedures can prepare guides/attributes but do not prove a hand-combed hairstyle. Keep radius/taper measurable: human-scale strand radii around 0.03–0.05 mm can guide realism, but screen-space visibility may require deliberate changes. Principled Hair model/parametrization and melanin/roughness inputs must be discovered; Cycles strand response does not establish real-time shader equivalence. Compare broad highlights under intended lighting and neutral rotations.

## Dynamics and caches

Inspect surface deformation across a head turn before simulation. Experimental Hair Dynamics needs the installed version's rest/surface bundle and collision capabilities; retain a pinned working file and do not imply full self-collision support. Separate static groom approval from motion approval. Bake/persist the actual dynamics cache and reopen in a fresh process at nonsequential frames. Sequential viewport playback is volatile evaluation, not proof of render-farm reuse. Record range, FPS, source revision, asset dependencies and cache paths.

## Game cards and atlas

Build layered tapered ribbons along curated flow guides: scalp coverage, middle mass and silhouette/flyaways. Sampling well-spread strands can seed cards but cannot choose an art-directed hairstyle automatically. Use sufficient longitudinal segments for bends and stable frame orientation along curves; tangent cross scalp normal becomes unstable when vectors align, so transport a frame with a fallback. Transform normals with inverse transpose under nonuniform scale. Cards need intentional root pivots, deformation weights and LODs.

Atlas clumps vary width/density; use root-to-tip V, gutters sized for mips and straight color/data export. Ship base color+coverage alpha, optional root-tip/ID, tangent/flow and normal maps as supported. Data maps use Non-Color; avoid baking display tone mapping into masks. Choose receiver cutout/dither/blend deliberately: Blender DITHERED is not proof of glTF MASK or correct depth sorting. Test both sides, edge halo, mip coverage and overdraw in the actual engine.

## Diagnosis and acceptance

Bald patches need density/guide/hairline repair before multiplying all children. Roots floating under animation need attachment/rest/UV correction. Uniform spaghetti needs clump hierarchy and primary flow, not more noise. Card black edges need alpha/color bleed and import settings review; bright streaks may be shader/tangent issues. Test front/back/top/grazing/gameplay views and full motion.

Deliver preserved guides/scalp, settings and final counts/length/radius, root-gap measurements with sample method, card triangle/alpha-area budgets, atlas manifest, motion cache and actual rendered review. Alembic/USD curve roundtrip only proves those tested paths; engine groom import and acceptable motion need destination evidence.
