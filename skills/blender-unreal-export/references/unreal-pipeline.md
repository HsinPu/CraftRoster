# Unreal Engine delivery pipeline

## Pin the import path and asset family

Record Unreal version, legacy FBX versus Interchange/project importer, Blender/exporter build and static/skeletal/animation-only branch. The official [FBX static mesh pipeline](https://dev.epicgames.com/documentation/en-us/unreal-engine/fbx-static-mesh-pipeline-in-unreal-engine) and [skeletal pipeline](https://dev.epicgames.com/documentation/en-us/unreal-engine/fbx-skeletal-mesh-pipeline-in-unreal-engine) were checked on 2026-11-04 and presented as UE 5.8 documentation. They describe an FBX 2020.2 pipeline. Do not claim Blender emitted that exact SDK file version without checking its exporter, and do not transfer every legacy FBX option to Interchange without testing.

Preserve the editable master and derive export geometry/skeleton. Inventory meshes/material slots/UVs, pivot, normals/tangents, collision, sockets, LODs, bones, morphs and clips required. Reject the assumption that every asset needs a mannequin skeleton or Nanite. The requested target platform and asset role decide those choices.

## Units, axes and pivots

Use a known 1 m source edge expected to measure 100 cm in a centimeter-based Unreal project, plus asymmetric forward/up markers and an offset pivot. Record scene unit scale, FBX unit handling and importer transforms. Do not prescribe a universal 0.01 export multiplier: combinations can convert twice. Inspect exact imported bounds and basis; trace any 100x error before changing the production asset.

For static pieces choose a deliberate export-local origin suited to placement or snapping while retaining world assembly transforms separately. Check pivot rotation and modular joins after import. Skeletal transforms/bind pose need their own calibration; applying scale after binding can corrupt animation even if a static cube looks correct. Compare a short root-translation and joint-rotation sample before shipping all clips.

## Static mesh, collision and sockets

Control triangulation where shading/silhouette matters and inspect the final evaluated surface. Retain intended material-slot ordering and UV channels. Export only the required render mesh and its explicitly associated collision/socket helpers, using matching coordinate frames. Static collision helpers are not skeletal Physics Assets.

The checked FBX reference associates closed convex `UCX_[RenderMeshName]_##` objects with the exact render-mesh name. A single concave UCX object is invalid for that contract; split it into authored convex pieces preserving doors and other required gaps. Primitive UBX/UCP/USP names have stricter shape rules. Do not repeat the upstream typo `UCLX` as a supported prefix. Inspect target collision wireframes and resulting body setup rather than accepting helper names as proof.

Use static socket helpers following the documented `SOCKET_[RenderMeshName]_##` association, then test socket position/rotation by attaching a visible marker in the target. Generic `SOCKET_Name` without association is not a universal rule. The checked static FBX page documents limitations for multi-mesh custom collision and socket packages; use separate per-asset files when necessary and verify actual associations. Do not combine a whole modular library into one file and assume all helpers were imported.

## Skeletal, morph and animation branch

Maintain one deliberate skeleton hierarchy, bind pose and root-motion policy, separating authoring controls from exported deformation bones. Bake unsupported constraints to the export rig, retain required attachments and ensure morph targets survive the selected modifier path. Bone names alone do not establish compatibility with an existing Unreal Skeleton; compare hierarchy and bind transforms before reusing it.

The checked skeletal FBX guide describes one imported animation per skeletal mesh per file in that path. Package separate explicitly named clip files when needed rather than assuming all Blender Actions become independent Unreal sequences. List clip duration/sample range and verify actual output; first/middle/last and joint-extreme comparisons expose bind twists, scaling and dropped curves. Inspect morph extremes and root translation in Unreal. Physics Asset generation/setup is a separate operation needing shape and joint review; a skinned import does not validate ragdoll behavior.

## Material and LOD decisions

Treat automatic FBX material conversion as a starting subset, not arbitrary Blender node reproduction. Supply textures and a slot-to-target-material map for base color, normal, roughness, metallic, emission and alpha as required. Record packed-channel and normal orientation conventions for the actual target shader. Inspect raking light and roughness swatches; do not judge only a flat front view.

Choose authored LOD import or a documented target-generated method. Verify level count, per-level material slots, common pivot, bounds and actual transitions at intended screen sizes. Nanite is a separately declared target decision; enabling it is not blanket permission to skip material, collision, platform or deformation checks. Reduced triangle count is technical evidence, not a measured frame-rate improvement.

## Target acceptance and delivery

Import the final files in a disposable or authorized target location and retain exact importer settings and hashes. Compare measured centimeter dimensions, basis/pivot, module joins, surface normals/materials, collision shape/gaps and attached socket markers. For skeletal assets inspect bind/deformed/morph states and play every delivered clip, including root movement. Test requested collision or physics behavior only in the target and report that execution distinctly from collision-wireframe review.

Correct source or importer causes on derived assets, regenerate outputs and repeat affected checks. Deliver master, per-asset/clip exports, textures, association/clip/LOD documentation and actual reviewed images. Without Unreal execution describe prepared-for-import status and leave engine acceptance unperformed. Blender roundtrip, helper names and exporter exit cannot certify Unreal success.
