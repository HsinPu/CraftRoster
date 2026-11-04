---
name: blender-reference-modeling
description: "Reference-guided Blender modeling with calibrated proportions, camera matching, inferred-side tracking and rendered comparison. Use when a supplied image, photo or turnaround must guide a Blender asset; unrelated image editing does not apply."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "majidmanzarpour/blender-game-skills"
  reference-license: "MIT"
  reference-revision: "f0ef29385a03de139957e6f700b801cdc00b7e29"
---

# Blender Reference Modeling

Translate evidence in the reference into a coherent 3D asset. Preserve the chosen style and record what the images cannot establish.

Read the shared [asset contract](../blender-development/references/asset-contract.md), [execution and ownership](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Follow [reference reconstruction](references/reference-reconstruction.md) for landmark selection, camera fitting, staged construction and mismatch diagnosis; use [calibration and comparison](references/calibration.md) before interpreting similarity scores.

## Work from measured evidence

1. Inspect every supplied view and its source. Separate orthographic drawings, perspective photos, stylized concepts and inconsistent turnarounds. Record subject crop, lens/projection assumptions, visible dimensions and unknown sides.
2. Set the asset's actual scale from a defensible cue or declared project assumption. Record proportions, attachment points, facing direction, intended game-camera size and budget in the asset contract. Do not infer an exact physical size from pixels alone.
3. Match projection, framing and pose before comparing geometry. Block out primary masses first; render the same camera and fixed diagnostic views before adding surface detail.
4. Compare silhouette, landmark ratios and negative spaces. Correct the largest supported mismatch first, then re-render. A normalized silhouette score cannot detect world-scale or placement errors; check those independently.
5. Preserve unseen surfaces as explicit interpretations. Resolve conflicting reference views by documenting the chosen authority rather than secretly distorting the asset to satisfy all of them.
6. Continue through relevant modeling, materials and rigging work only when installed and needed. Inspect the final exported/reimported asset under the comparison conditions; a source viewport does not prove the delivery matches.

Deliver the reference mapping, exact revision and comparison images, measured deviations, inferred features and remaining evidence gaps. Keep the source references and editable master. A similarity metric supports diagnosis; it does not grant visual approval or establish engine behavior.

See [source attribution](references/upstream-notice.md).

Read [Per-view projection, clean atlas baking and contact repair](references/setcodes-projection-atlas.md) when that branch is requested. It specifies inputs, construction or repair steps, failure handling and the evidence required for acceptance.

For the corresponding production stage, read the detailed [reference pipeline](references/majid-reference-pipeline.md) procedure. Keep its measurements, failure cases and acceptance evidence tied to the current asset revision.

For the corresponding production stage, read the detailed [mask comparison](references/majid-mask-comparison.md) procedure. Keep its measurements, failure cases and acceptance evidence tied to the current asset revision.
