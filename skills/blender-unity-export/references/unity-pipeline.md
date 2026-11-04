# Unity delivery pipeline

## Choose the installed import path

Record exact Unity Editor version, render pipeline (Built-in/URP/HDRP or project custom), Blender/exporter version and import package. FBX with Unity's ModelImporter is a common controlled path; GLB is an option only through the actual supported importer package/workflow. Do not describe glTF as a universal built-in replacement for FBX. The official [glTFast 6.0.1 documentation](https://docs.unity3d.com/Packages/com.unity.cloud.gltfast@6.0/manual/index.html), checked 2026-11-04, describes separate editor/runtime workflows. Its existence does not establish it is installed in the user's project or that its version supports every requested feature.

The version-specific facts below were checked against Unity 6000.0 Model, Rig, Animation, Materials and LOD Group documentation. Other versions/importers need their own options and actual import test. Preserve source and derive controlled export objects; do not enforce upstream scale/axis presets without measuring the resulting asset.

## Units, basis and pivot calibration

Use a 1 m asymmetric reference with a visible forward arrow, off-center pivot and parent/child marker. Unity expects meter-scale physics assets. Record Blender units, export unit conversion and ModelImporter Scale Factor/Convert Units. [The Model tab](https://docs.unity3d.com/6000.0/Documentation/Manual/FBXImporter-Model.html) also exposes Bake Axis Conversion; baking into asset data and compensating a root transform are distinct paths. Choose the project convention and test it instead of hiding a quarter turn in multiple ancestors.

Measure target bounds and pivot rotation with the same settings as the production asset. Inspect handedness/mirrored normals and the chosen target forward/up visually and numerically. Correct scale at its actual source; do not apply transforms to a bound rig in place simply to make inspector values look clean. A static calibration can pass while animation/root motion remains wrong, so include a short moving sample for characters.

## Materials and render-pipeline mapping

Inventory material slots, base color, normal, metallic/roughness or smoothness, emission, transparency and culling. Bake Blender-only procedures only as needed, preserving originals. Unity shaders and channel packing depend on the active render pipeline and selected shader. Never assume a glTF metallic-roughness texture can be plugged unchanged into any Standard/URP/HDRP mask slot. Write an explicit source-channel to target-property map and inspect resulting swatches under neutral and raking light.

Use a deterministic material remap rather than a project-wide search for common texture names. [The Materials tab](https://docs.unity3d.com/6000.0/Documentation/Manual/FBXImporter-Materials.html) distinguishes creation, extraction and remapping. Record which materials are embedded versus project-owned overrides so reimport behavior is intentional. Texture extraction and shader translation are different checks; neither promises exact Blender node reproduction.

## Rig, Avatar and animation

Select None, Generic or Humanoid according to the asset. Generic suits machinery and nonhumanoid structures; Humanoid requires a real Avatar mapping and appropriate pose, not merely familiar bone names. [The Rig tab](https://docs.unity3d.com/6000.0/Documentation/Manual/FBXImporter-Rig.html) distinguishes these branches and root/Avatar options. Preserve export skeleton, bind transforms, skin weights and required attachment transforms. If optimizing the GameObject hierarchy, explicitly expose required socket/attachment transforms and verify their accessibility after import.

Bake constraints/IK on the Blender export rig where the file/importer does not preserve them. Do not rely on Unity's Bake Animations checkbox to bake arbitrary Blender controls; the [Animation tab](https://docs.unity.com/en-us/engine/6000.0/manual/assets-and-media/asset-types/models/importing/class-animation-clip) documents format-specific behavior. List clips, durations, sample rates, root-motion policy, loop intent and events if any. Compare imported first/middle/last and extreme joint poses; inspect foot drift, wrist twist and root translation. Compression/resampling can change curves and needs motion review. Avatar validity alone is not a deformation pass.

## Collider and LOD prefab contract

Decide where colliders are created: project prefab primitives, explicit mesh-proxy conversion or an existing importer/postprocessor. Unreal UCX prefixes are not a universal Unity custom-collider import guarantee. Inspect actual Collider components, transforms and shape against intended openings and surfaces. Dynamic concave geometry needs a project-specific decomposition/physics decision; do not enable convex blindly and fill every doorway.

For LOD record representation names, renderer assignments and thresholds. [Unity's LOD Group reference](https://docs.unity.com/en-us/engine/6000.0/manual/analysis/graphics-performance-profiling/simplifying-distant-meshes-with-level-of-detail-lod/class-lodgroup) defines transitions by screen-space height. Naming `_LOD0` is not evidence that the intended renderers and thresholds are correct in the final prefab. Scrub transitions and inspect silhouette, material assignment and bounds at intended camera sizes. Keep authoring high source out of active runtime renderers unless requested. Counts alone do not demonstrate frame-time improvement.

## Verification and handoff

Use a disposable Unity scene/prefab or the authorized project path, retain `.meta`/importer settings and avoid overwriting unrelated assets. Import the exact final hash, inspect scale/basis/pivot, actual materials, rig/Avatar, all clips, required attachments, colliders and LOD transitions. Reimport one controlled change to confirm project-owned material/prefab overrides persist as designed. Do not claim the prefab is ready from an FBX write or Blender roundtrip alone.

Deliver editable source, FBX/GLB and textures, version/importer/material mapping, animation and collider/LOD contracts, file hashes and actual reviewed target evidence. If Unity/importer is absent, label prepared for import and list unexecuted gates. This Skill does not install packages, change render pipelines or add gameplay logic as incidental export steps.
