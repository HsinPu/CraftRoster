# Runtime discovery and reliable bpy work

Use this when selecting an execution path, debugging old code or building a reusable scene operation. Inspect the installed runtime; a source repository's version claim does not describe the user's Blender.

## Discover without modifying the user's environment

Run the packaged `scripts/inspect_runtime.py` through `run_blender.py` in an isolated process. `--output` accepts a new JSON file and refuses replacement. The result records Blender/build/Python, the loaded scene, units, color management, frame timing, enabled add-ons and selected RNA feature presence. It does not benchmark a GPU, connect MCP, prove an exporter works or run an engine.

Choose live MCP only when the connected scene is the intended target. Read its actual tool schemas and return shapes. A server may preserve imports, clear execution namespaces or expose specialized tools; those behaviors are connector-specific. Do not assume the method names or socket protocol of a different Blender integration. For a background job, the factory startup and auto-execution switches precede the input file; later commands can otherwise replace state already loaded.

Prefer a project-selected executable over automatically picking the newest installation. Record optional add-ons and external converters separately. A missing dependency stays a missing step; do not silently enable add-ons, install packages, change preferences or use an unrelated open scene to make a test pass.

## Data access, context and ownership

Read named objects from the intended scene/collection, verify their type and library/override state, and retain their identity. A name existing in `bpy.data.objects` does not establish that it belongs to the active scene or that this task owns it. Before modifying a shared mesh, material, image or node group, inspect its users and create a working copy when the change is local.

Use data APIs for mesh construction, node wiring and metadata. For an operator, inspect `get_rna_type().properties`, establish mode/active object/selected objects deliberately, check `poll()` when useful, and require the expected return set. `temp_override` supplies context members; it does not invent a window, region or editor unavailable in a background process. Use a documented data equivalent or report that an operation requires a suitable UI context.

Object-mode mesh data and edit-mode BMesh are different access paths. In edit mode use the edit BMesh and its update operation; do not free Blender-owned edit data. For an independent BMesh, write back only to the owned mesh and free the temporary structure in `finally`. After changing transforms, update the view layer before measuring world coordinates.

Evaluated geometry is a temporary dependency-graph result. Acquire it from the evaluated object, inspect or copy it, and release its temporary mesh in `finally`. Keep the source mesh intact. Reacquire IDs/modifiers after destructive operations, undo or file changes rather than using freed Python references.

## Feature migration, not blind version substitution

| Area | Inspect before selecting the code path |
|---|---|
| Actions | Whether layered slots/channelbags exist; the assigned action slot and NLA/export selection; use object keyframe insertion for simple animation when appropriate |
| Compositor | Whether the scene owns `compositing_node_group` or an older node-tree API; the actual compositor node/socket types |
| Node-group interface | Interface sockets and identifiers exposed by this node group; modifier input RNA or the older supported property representation |
| Material transparency | Actual renderer method, alpha values and exporter interpretation; renderer dither mode alone does not specify exported alpha mode |
| Image/movie output | Whether `media_type` exists, followed by a supported file format and encoding options |
| Normals/smoothing | Available mesh normals APIs and supported smoothing operations; removed Auto Smooth properties cannot be repaired by setting them anyway |
| Sequencer/Grease Pencil | Current collection/property names and runtime-supported data types rather than legacy tutorial snippets |

Probe capabilities on scratch data when inspection alone cannot establish behavior. Static enum lists can omit dynamically registered values. Handle assignment errors locally, preserve the original setting and report the actual supported choice; do not guess another enum and continue without checking the effect.

## Materials, attributes and transforms

Locate nodes by type rather than translated display names. In a multi-shader graph, follow the active material output to identify the connected surface; choosing the first Principled node can inspect an unused branch. Confirm socket existence/type and image interpretation before linking. For color attributes or generic mesh attributes, match name, type and domain to the consuming operation; equal array lengths alone do not prove matching vertex/corner semantics.

Use bulk attribute APIs for large arrays, with the correct scalar width and shape. Preserve a reliable correspondence when retopology or modifiers change indexing. Sampled validation should record sample count; high data volume is not permission to report an unexecuted full check as passed.

World size depends on both object transforms and scene unit scale. Applying transforms to a bound armature or shared mesh can change behavior elsewhere. Prefer an export copy when conversion is necessary, preserve bind relationships and animation, then compare actual reimported dimensions and poses. A negative determinant needs orientation/shading analysis; a blanket transform reset is not a safe universal repair.

## Files, libraries and background jobs

Resolve Blender-relative `//` paths against the intended saved file. Record linked libraries, image files, UDIM tiles, sequences and simulation caches; checking only one image pathname is incomplete for a multi-file resource. Append/link only requested datablocks. An override or relink is a mutation with its own ownership boundary, not incidental cleanup.

Write outputs to explicit owned destinations and retain source hashes. Avoid global orphan purge and broad missing-file search as default fixes. A batch should use unique job IDs and output directories rather than flattening unrelated files with the same basename. Verify both process status and expected artifacts, then perform the domain-specific technical and image checks. Source preservation, a successful subprocess and visual quality are separate observations.
