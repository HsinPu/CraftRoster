---
name: blender-lookdev
description: "Develop and refine the look of Blender assets through art direction, cohesive materials, lighting and camera presentation. Use for Blender appearance and render polish; visual review without authorized edits belongs to blender-visual-review."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Look Development

Make the asset read clearly and express the agreed art direction under both diagnostic and intended presentation conditions.

Read the shared [asset contract](../blender-development/references/asset-contract.md), [execution and ownership](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Read [look development](references/look-development.md) for camera, light and material decisions.

## Refine the visible result

1. Identify the approved references, palette, shape language, material roles, intended emotion, target engine and viewing distance. Existing project style takes priority over a generic attractive preset.
2. Inspect current renders before editing. Establish a neutral diagnostic setup and a separate presentation setup. Record camera, resolution, projection, exposure, view transform, engine, samples and relevant frame.
3. Fix readability in order of impact: silhouette and composition, large value/color groups, material response, then small accents. Return geometry or UV defects to their owners rather than hiding them with lighting.
4. Adjust coherent light size/direction, reflections, roughness, color relationships, separation and focal hierarchy. Preserve intentional stylization. Do not apply arbitrary filmic contrast, excessive bloom or shallow depth of field to every asset.
5. Make presentation rigs in owned collections or isolated copies. Keep the asset's authored transforms, animation, world and cameras intact unless their modification is part of the request. Preview each edit with a small render before expensive output.
6. Compare matched before/after views and an intended gameplay view; inspect an alternate light direction to expose fragile shading. Review the current revision using available visual-review support, fix consequential findings and recheck affected technical gates.

Deliver the editable setup, renders and settings, actual corrections and remaining limitations. A beauty shot alone cannot validate textures, geometry or target-engine lighting. When rendering or image inspection is unavailable, report appearance as unverified.

See [source attribution](references/upstream-notice.md).
