---
name: blender-rigging-animation
description: "Build or repair Blender rigs, weights, constraints and animation clips for the intended deformation and target engine. Use for character or mechanical motion, retargeting, looping or root-motion defects; static mesh and render-only work do not require a rig."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Rigging and Animation

Preserve identity in motion and deliver a rig/clip contract that the target can reproduce.

Read the shared [asset contract](../blender-development/references/asset-contract.md) and [execution and ownership](../blender-development/references/execution-and-ownership.md). Inspect bind pose, transforms, bone roles, current actions and the consuming engine before altering a rig.

## Motion workflow

Use this entry for a combined rig-to-clip delivery. For a focused task, use `blender-character-rigging` for skeleton/control/weight work, `blender-animation` for timing and clips, and `blender-facial-shapekeys` for expression targets when installed. Cloth, hair and other simulations have separate workflows; they are not automatically needed for a character rig. The [motion contract](references/motion-contract.md) remains sufficient to organize and verify a bounded simple mechanical or deforming asset directly.

1. Record required motions, skeleton compatibility, attachment points, root-motion policy and clip timing. Preserve existing bone names, bind matrices and animation consumers unless the requested change includes their migration.
2. Choose rigid parenting/constraints for mechanical parts, deformation bones or shape keys where needed. Keep animator controls separate from the deform skeleton when the target requires it.
3. Bind and inspect weights using [deformation and clip checks](references/motion-contract.md). Automatic weights are a starting result to inspect; clean specific failure regions instead of globally smoothing identity away.
4. Build or repair motion in the actual Blender action/slot API. Match the movement's timing, weight and exaggeration to the approved style and gameplay event contract.
5. Inspect contact, extreme poses and loop boundaries as an image sequence or playback. Fix collapsing volume, foot sliding, intersections, silhouette loss and unintended motion on unkeyed controls.
6. Bake target-unsupported constraints only onto an export copy, preserving the editable rig. Reimport and compare the required clip names, durations, skeleton and root displacement when the relevant runtime is available. Use the shared [quality loop](../blender-development/references/quality-loop.md).

`blender-modeling` can repair deformation topology and `blender-export` can own output packaging when installed and needed. Their absence does not justify inventing an engine result.

## Deliver
Provide the source rig, changed bones/weights/actions, clip ranges with FPS, motion policy, stress-pose and loop evidence, and actual export/reimport results. A still beauty render cannot prove deformation or animation quality; a parsed clip list cannot prove playback.

See [source attribution](references/upstream-notice.md).

For the corresponding production stage, read the detailed [motion delivery](references/majid-motion-delivery.md) procedure. Keep its measurements, failure cases and acceptance evidence tied to the current asset revision.
