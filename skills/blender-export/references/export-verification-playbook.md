# Controlled export and semantic verification

Use this sequence for a real delivery, alongside the chosen target's conventions. A format preset is a starting hypothesis; the project's known-good asset and importer determine acceptance.

## Freeze the delivery contract

Record the source revision, requested object roots, included descendants, intended unit size, facing direction, origin/pivot, material roles, texture paths, animation names/ranges, skeleton and shape-key requirements. Mark render-only helpers, cameras, lights, proxies and hidden backups explicitly. Visibility or current selection alone is not a reliable export manifest.

Choose the representation deliberately:

- Use glTF/GLB for a consumer that supports its scene and material conventions; verify extension/decoder support separately. Embedding images can simplify transfer but does not make every Blender shader portable.
- Use FBX when the actual rig/static-mesh pipeline expects it. Record importer and exporter versions, axis conversion, scale handling, deform-bone and animation settings. Do not reuse a static transform-baking shortcut on a rig without a roundtrip test.
- Use USD or Alembic for a supported scene/cache workflow. Determine whether the consumer needs editable instances, baked meshes, animation caches or shader translation; these are different deliverables. A cache is not an editable control rig.

The focused `blender-godot-export`, `blender-unity-export` and `blender-unreal-export` packages supply engine branches when installed. Their absence does not authorize guessing a target's import behavior. Generic export can still prepare and roundtrip a file with engine acceptance left incomplete.

## Prepare an export revision

1. Save an owned export copy in a new location and preserve the master's hash. Resolve the exact object set by stable names/collection membership, including the required armature and attachment hierarchy. Reject an empty set and unexpected extra roots.
2. Check evaluated geometry and transforms using asset validation. Determine whether modifiers can remain procedural, must evaluate at export, or require a baked copy. Do not apply a deformation modifier to erase the rig just because a mesh-only exporter is easier.
3. Keep triangulation consistent with normal baking and target tangents. Inspect mirrored/negative transforms and normals; a blanket apply-all operation can change parenting, bind matrices or animation.
4. Save every intended image. Build a texture table containing role, color/data interpretation, UV set, channels and relative destination. Resolve duplicate basenames before copying. Test unsupported nodes through an explicit bake or target material reconstruction, not a promise that the graph transfers.
5. Decide whether clips are exported from named actions, NLA strips or baked scene motion. Inspect the current action-slot API and the selected export mode. Sample constrained motion and representative deformations before discarding controls on the copy.
6. Capture pre-export expected values: world dimensions, axis marker direction, pivot coordinates, mesh/material roles, clip intervals at the actual FPS, root displacement and chosen posed landmark positions. Record tolerances that fit the asset's role.

## Execute without false success

Discover the installed operator and inspect its RNA properties before forming keyword arguments. If a requested option is unavailable, reject or explicitly revise that part of the plan. Silently dropping it can produce a file that violates the contract.

In an isolated scene, deselect unrelated objects and explicitly select the complete manifest set. Check that the active object belongs to it. Use the appropriate selection option for that exporter and confirm the result set contains `FINISHED`; preserve exceptions and stderr. Export into a fresh path and check that the current operation produced it. An old nonempty file must not satisfy a failed export.

For multiple assets, give each job a unique destination derived from an explicit asset ID, not an unqualified source basename. Keep the root's local transform and parent relationship when moving an export copy to the desired pivot; restoring only a local location cannot undo every parent/constraint side effect. Never move the master for a convenience batch preset.

Parse the delivered format with an appropriate reader. For GLB, validate container/header/chunk lengths before interpreting JSON; require supported version and buffer/image references that fit the file. Count triangles according to primitive mode and accessor/index semantics, not `indices.count/3` for every primitive. A parser summary proves only what it actually checked.

## Compare a clean reimport

Open a new isolated process/scene, import the final artifact and collect corresponding semantic measurements. Keep master and imported names in a mapping because importers can create wrapper nodes or split meshes at material boundaries.

| Contract | Comparison method | What a simple count misses |
|---|---|---|
| Scale, axis and pivot | Known-size marker, world bounds and transformed direction points | Rotated or offset objects with identical dimensions |
| Geometry | Evaluated triangles, bounds, silhouette and required parts | Lost detail, wrong winding or unexpected modifiers |
| Materials/images | Per-surface assignment, exported roles and moved-package load | An image count without correct channel/color interpretation |
| Skeleton | Hierarchy, rest transforms, deform associations and stress poses | Bone names with a broken bind pose |
| Animation | Named clip intervals, sampled transforms, root travel and playback | Correct duration with incorrect motion or absent constraints |
| Shape keys | Required names, tested weights and deformed surface positions | Named but empty expressions |
| LOD/collision | Target-recognized metadata plus separate visual/physical check | Correctly named geometry that the importer ignores |

Keep absolute and relative tolerances explicit. Exporters can split vertices, so raw vertex-count equality is rarely a sufficient or universally required invariant. For animation, inspect start/end and interior samples; a seam can be continuous in orientation while translation or velocity jumps.

## Test the consuming pipeline

Copy the package to a directory that cannot accidentally resolve source textures. Import with recorded target settings, inspect the actual material render, place beside a known-size object, and play required clips. Check collisions and LOD transitions through the engine's actual behavior when those are delivery requirements. Log engine version, target renderer/platform and any importer overrides.

For web delivery, load the real URL/package through the configured loader and decoders. Extension declarations are not proof that the deployed application ships a decoder. Compare compression on/off at the required camera and inspect loading failure paths.

If an engine is unavailable, deliver preparation, parsed-file and Blender-roundtrip results separately. Do not use those results as engine acceptance. If the engine import reveals a defect, repair the authoring/export copy, regenerate artifacts and rerun affected checks; do not only edit the manifest to hide the mismatch.

## Delivery record

Include file paths and hashes, source/contract hashes, versions and settings, object/clip/texture tables, actual measurements, comparison images and findings. State whether each result is a source check, format check, Blender roundtrip, visual review or engine observation. Keep failed and unavailable checks visible. The packaged evidence checker verifies its documented schema and revision consistency; it does not implement every geometric or engine check described in this playbook.
