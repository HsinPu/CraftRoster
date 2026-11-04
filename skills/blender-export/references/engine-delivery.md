# Engine delivery

Read only the target branch. These are decision points, not verified universal presets or permission to install an engine/plugin.

| Target | Inspect before choosing settings | Prove after import |
|---|---|---|
| Godot or web/Three.js | Existing glTF/GLB importer, supported material/extensions, loader and decoder setup, intended up/forward axes, animation naming | Relative dimensions, pivot, PBR appearance, texture color spaces, named clips and representative playback; compressed content must have supported decoders |
| Unity | Existing FBX or glTF package, importer version, static vs skeletal path, avatar/rig convention and render pipeline | Unit/axis conversion, skeleton mapping, bind pose, root motion, clip boundaries and material translation; presence of a GLB file does not imply a glTF importer is installed |
| Unreal | Actual FBX/Interchange route, skeleton/static mesh requirements, unit policy, collision/LOD conventions and material import | Known-size reference, normals/tangents, expected collision, skeleton compatibility and animation playback; preserve intentional root transforms |
| Other/custom engine | Its documented importer and an existing known-good asset | The contract the project consumes; do not infer support from a familiar file extension |

## Geometry and materials

Export the intended evaluated geometry on an owned copy; do not apply an armature or destructive modifier to the master merely to remove a warning. Triangulation and normal/tangent choices must match baked maps and target shading. Mirror/UV seams and material boundaries can increase exported vertices even when triangle count is stable.

Procedural Blender node graphs and renderer-specific looks do not automatically transfer. Bake supported image maps or rebuild the intended shader in the target with explicit permission and evidence. Record color vs data textures, normal-map convention, UV set, texel density and whether alpha/double-sided behavior is supported. Check missing files after moving the export package away from the authoring directory.

Compression is conditional on the actual runtime/importer and quality needs. Check decoded appearance and load behavior. Do not enable Draco/meshopt/WebP/KTX merely because an exporter offers it.

## Rigs and animation

Separate control rig from deformation skeleton. Bake constraints or procedural motion only when the target cannot represent it, using the agreed frame range and sampling. Preserve required clips, shape keys, bone hierarchy, sockets, root-motion policy and scale. Detect Blender action/slot API support before assuming all actions export. Pose or play the reimported result; exporting an armature is not a deformation test.

## Manifest and roundtrip

Record source and contract hashes, exact output files/hashes, exporter settings, expected semantic contents and the images/reports used for acceptance. Reimport on an isolated copy, using actual importer signatures for that Blender version. Compare against the manifest: name expected checks, actual values, deviations and unavailable checks. A missing engine cannot be replaced by a Blender roundtrip when engine acceptance is required.

Review source and decoded/exported appearance at the intended game camera. A rendering-only revision and the final game asset may differ in materials, tessellation and lights; bind evidence to the artifact it actually depicts.
