# Geometry Nodes data and compatibility

## Fields, domains and persistence

A field describes a value computed on a consumer's elements; it is not automatically a stored array. Position, normal and index can mean different things before and after topology changes. Document whether the consumer evaluates points, edges, faces, corners, curves or instances. Capture a value before changing topology when its earlier meaning is required. Use Evaluate on Domain deliberately; interpolation can blur binary masks or destroy categorical IDs.

Store a named attribute when shaders/exporters need persistent data. For example a height mask may be a POINT float; a UV map belongs on FACE_CORNER with an appropriate vector type. A primitive's UV output is not guaranteed to survive downstream topology unless stored/preserved. Define export naming and supported types; underscore-prefixed custom attributes in glTF require the export option and importer support.

Instances share source geometry and carry transforms/attributes. Realize Instances only where a downstream operation needs per-instance topology. Repeated nested realization can make a manageable point cloud enormous. Count dependency-graph instances separately from mesh vertices; an empty evaluated mesh may still contain visible instances.

## Building and inspecting a tree

Use the installed Blender version and RNA descriptors as authority. Create group interface sockets through the supported interface API (4.x+ commonly interface.new_socket). Obtain identifiers from interface items, not guessed Socket_N strings. Modifier inputs have changed across releases: introspect whether the build exposes RNA properties.inputs or supported ID-property access, and set attribute-mode inputs through the actual mechanism. Do not treat a source's 5.2 example as cross-version support.

Set mode/data_type before looking up sockets because nodes such as Random Value and Compare expose type-dependent sockets with repeated names. Resolve enabled sockets, inspect types/defaults, and reject ambiguous references. Pair zone input/output nodes before configuring state-dependent sockets. Use a separate temporary tree for inspection and remove only that owned tree afterward.

Some primitive parameters need a single value rather than a field evaluated on downstream elements. A seeded field connected directly to a primitive Size input can collapse geometry even though the group still has nonempty bounds from other parts. When a single sampled random parameter is intended, evaluate it on an explicit one-point geometry through a supported sampling node, then connect that single result. Verify the created part's face areas and dimensions, not just the overall scene bounds. Keep a separate per-element field for scatter variation.

An isolated Blender 5.2.2 trial used the modifier RNA input item at `getattr(modifier.properties.inputs, socket.identifier).value`; legacy `modifier[identifier]` was unavailable in that build. Probe the actual representation before setting values and verify the evaluated result. This observation does not establish that every supported Blender release uses the same API.

The reviewed JSON builder supports tree type, interface arrays, node type/properties/defaults, zone item lists, pairs and links; this can inspire a local spec. It clears existing named groups and may clear material nodes by default, so it is not a safe drop-in patcher. Build a new revision and swap only an owned modifier after validation. Shader/compositor construction is possible with the appropriate tree type, but does not grant permission to overwrite existing look development.

## Production patterns

Scatter: source mesh -> distribution -> slope/height/mask selection -> instance selection -> normal alignment plus yaw -> scale -> output. Expose density/spacing, seed, scale bounds and preview cap. Stable random IDs are preferable to indices when topology changes, but a seed alone cannot guarantee stable placement after a surface changes.

Cable: input curve -> controlled resampling -> profile circle -> Curve to Mesh -> caps/material/shading. Radius is in defined units; profile resolution follows screen size. Road strips need intersection handling and UV distance along the curve, not just an automatic sweep.

Building: documented footprint -> bounded floor repetition -> connector/window module selection -> roof switch -> material assignments. Keep floor count and width/depth within proven ranges; expose seed-based variation without breaking architectural interfaces. Rock: coarse primitive -> multiscale displacement -> controlled simplification -> shading; noise must not erase the silhouette family.

## Zones and optional facilities

Simulation zones carry frame-dependent state and need deliberate cache/bake/seek testing. Repeat zones iterate a bounded state transformation; exponential subdivision can grow roughly fourfold per pass. For Each Element operates per geometry element/island and needs a bounded input population. Closures and bundles pass reusable functions/structured values where the installed build supports them; list nodes are actual sequence operations, distinct from fields. SDF grids enable volumetric booleans/fillets/remeshing with memory controlled by voxel resolution. Node tools and gizmos require the intended UI mode and context. Experimental physics/XPBD must remain optional and unavailable unless verified on the actual build; no fallback should silently change its result.

## Worked scatter and repair

Create GN_RockPatch_v01 on an owned 20 m patch; expose seed 7, density, spacing and 0.8–1.2 scale bounds. Keep source rocks in an explicit collection and output instances. Test density zero, allowed maximum and three saved seeds; inspect count, warnings and bounds each time. Store a height mask only if the material needs it.

Missing output: inspect output links and domain/component types before adding nodes. Constant random scale: check field ID/consumer context and enabled sockets. Lost UVs: inspect corner attributes before and after realization. Exploding counts: reduce upstream population or repeat count, not merely viewport hiding. Accept with saved group/input schema, measurements and actual current images; export/bake must be rechecked independently.
