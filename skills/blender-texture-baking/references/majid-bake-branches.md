# HIGH/LOW bake branches and portable material repair

Use the main bake contract first. This reference supplies the operational decisions in Majid's bake script without importing its silent skips or broad material mutation. Work on a saved owned delivery revision, retain high/low source and run a small preview before full maps.

## Resolve geometry and surface sources separately

| Request | Geometry projection | Surface signal | Required decision |
|---|---|---|---|
| Normal detail transfer | Explicit high pair to active low | High evaluated surface normal | Missing high is incomplete/failure when normal transfer was requested; do not quietly omit the map |
| High-authored color/rough/metal | Selected high to low UV target | Explicit high output signal | Confirm all relevant high parts and transparent exclusions; no name-prefix guess |
| Low-authored procedural/painted maps | Low self-bake | Explicit low output signal | Do not pull unrelated high materials merely because HIGH exists |
| AO | Declared target and sources | Declared neighboring occluder set | Decide whether garment/body/ground contacts belong; scene-wide AO can include unwanted high or LOD copies |

Record pairs explicitly, for example `Torso_Low -> [Torso_High, Buckle_High]` and `exclude=[Cornea_High, Visor_High]`. A prefix `Torso*` can accidentally include `Torso_Backup`; it is not a reliable pair contract. If an `auto` policy is desired, resolve it once into that explicit table and show which signal each map uses. Source docstrings say LOW for surface maps, but its implemented auto branch selects HIGH when present; do not preserve that ambiguity.

Validate requested map names, finite positive dimensions/resolution/ray settings, UV channel and image destination before baking. Missing UV or a missing requested high source must become an explicit incomplete result or failure. An unknown map must fail before creating misleading empty images. Use collision/helper scopes separately from textured render meshes.

## Follow the rendered output, not the first Principled node

Discover the output node actually used by the selected Cycles context: renderer-specific CYCLES output can take precedence over ALL even when the EEVEE output is active in the UI. Follow its Surface links. Locate nodes by type, and follow node-group sockets through their actual group interface when the signal crosses a group boundary. An external group node has no useful direct link to its internal Principled shader without that mapping.

For a simple connected Principled material, native roughness and diffuse-color-only or explicit EMIT capture may suffice. For mixes, layered coatings and arbitrary BSDFs, define the desired source signal explicitly. The first reachable Principled metallic value does not generally equal final material metallic semantics. If extraction is unsupported, stop that map or provide an authored scalar/color output; do not bake a plausible wrong texture and label it complete.

For metallic or another explicit scalar, temporarily connect that signal to an Emission output and bake EMIT. Disable direct/indirect illumination for base-color capture; do not bake scene lighting into albedo. Preserve original links and active outputs before rewiring. Normal-map inputs may need temporary isolation to avoid feeding already-baked normals back into a transfer; restore them afterward.

## A transaction per pair and map

Snapshot selection/active object, mode, collection exclusion, render visibility, scene/bake settings, active image nodes and all links to be changed. Add target Image Texture nodes to every **used** low material slot; fill used empty slots deliberately or reject them. Unused empty slots need not invalidate a rendered surface. Set intended UV and active low target, then select only its matched high sources.

For non-AO transfer, hide renderables outside the pair to reduce scene synchronization and unintended participation; large strand grooms can dominate sync time. For AO, use the declared neighbor set instead of keeping the entire scene. Keep transparent shells out of projection when they intercept rays; their delivery material remains a separately authored surface.

Wrap the bake, image save and any temporary node changes in `try/finally`. Restore even if the operator throws: target nodes, output/normal links, active nodes, selection, source visibility and exclusions, not only hidden neighbors. Verify operator outcome and saved map decode/dimensions/content coverage. A nonempty black image is not proof of detail transfer. Never save a partially rewired material over the only master.

## Rebuild only supported delivery semantics

Rebuild a copy as portable Principled only after recording which material features must survive: base color, normal, roughness, metallic, AO packing, emission, alpha/cutout, transmission and double-sided policy. Replacing all slots with one opaque material can destroy glass/visors/cards. Preserve separate roles or create an explicit atlas/material consolidation with per-polygon mapping. AO may be packed or wired for the actual consumer; creating an AO image alone does not connect it.

LOD0 can supply maps to higher LODs only if their UV layout and material-role correspondence remain compatible. Check the actual UV coordinates/islands and sample seam regions; a copied Decimate modifier does not guarantee every downstream rework kept the layout. Match arbitrary numeric LOD suffixes rather than `_LOD[1-9]`, which misses LOD10. If a LOD has independent UVs, bake its own declared pair/maps.

Finally compare high source and baked low under neutral moving-light tests, hard-edge/UV seam close-ups, mip/game-camera views and actual reimported materials. Record pair map, signal path, exclusions/occluders, cage/rays, devices/settings, saved texture hashes and unresolved outputs. Source CPU/GPU anecdotes are not bake-performance guarantees.
