---
name: blender-materials-uv
description: "Author or repair Blender UVs, PBR or stylized materials, textures and baked maps for a defined asset and target. Use for seams, texel density, shading, color-space or baking problems rather than changing the whole scene's art direction."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Materials and UV

Make surfaces read correctly under the intended lighting and survive the chosen delivery format.

Read the shared [asset contract](../blender-development/references/asset-contract.md) and [execution and ownership](../blender-development/references/execution-and-ownership.md). Inspect the current material graph, image paths, UV channels, color management and target shader before edits.

## Surface workflow

For an end-to-end surface job, coordinate the stages below. For a focused repair, select the relevant package when installed: `blender-uv-unwrapping` owns seams, density and UV channels; `blender-pbr-materials` owns physical material response and node graphs; `blender-texturing` owns painted/image texture production; `blender-texture-baking` owns source-to-target projection and saved maps. These are conditional handoffs, not required installations for this entry's complete small-asset workflow.

1. Separate a material defect from a lighting, exposure or view-transform problem. Capture a neutral reference and the intended presentation. Preserve approved palette and stylization.
2. Set UV strategy by surface role and output: unique bakes, intentional mirroring, tiling/trim sheets, lightmaps or supported UDIMs. Use [UV and bake decisions](references/surface-delivery.md); do not assume all overlaps are defects.
3. Construct or repair materials using node types and sockets available in the actual Blender version. Reuse shared materials deliberately; make a local copy before changes intended for one object only.
4. Bake unsupported procedural detail onto a delivery mesh when required by the engine. Verify source/target selection, cage/ray distance, tangent convention and color-space/channel meaning. Save output maps explicitly.
5. Inspect checker distortion, seam close-ups, normal-map highlights and material assignment under neutral and intended light. Also inspect at gameplay size; extra texture resolution is justified by visible improvement and budget.
6. Repair findings through the shared [quality loop](../blender-development/references/quality-loop.md). Any changed map or material invalidates prior screenshots and affected export checks.

Use `blender-lookdev` for a broader lighting/presentation task when available. Hand an authorized export to `blender-export` when installed; still report which map behavior has actually been checked after export.

## Deliver
Return the edited source, UV/channel purpose, texture files, resolution/color-space/packing decisions and current comparison images. A Blender shader preview does not establish the target engine's material result. Account separately for technical checks, visual review and missing engine verification.

See [source attribution](references/upstream-notice.md).
