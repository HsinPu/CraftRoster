---
name: blender-modeling
description: "Build or refine Blender mesh assets, modular environments, props and character forms with controlled topology and silhouette. Use for geometry authoring or retopology; material-only, rig-only and review-only tasks retain their own workflows."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Modeling

Create the geometry the intended camera needs, then inspect its shape before adding detail.

Read the shared [asset contract](../blender-development/references/asset-contract.md) and [execution and ownership](../blender-development/references/execution-and-ownership.md). Preserve the project's scale, source collections, naming, pivots and reference direction.

## Shape and construction
1. Inspect the existing file and identify the objects this task owns. Make an editable working revision; keep imported originals and unrelated collections intact.
2. Establish dimensions, modular interfaces or character joint centers. Block the large masses and render from the reference-matched and intended gameplay cameras. Fix proportion, balance and identifying negative space before small details.
3. Choose topology for the asset's behavior: deformation loops where joints bend, stable shading on hard surfaces, and repeatable interfaces for modular pieces. Use the relevant [construction branch](references/construction.md).
4. Add secondary forms at a scale visible in the final presentation. Keep procedural seeds and exposed parameters reproducible. Inspect the evaluated modifier result; a stack's order follows its actual geometry effect rather than a universal recipe.
5. Inspect normals, intersections, duplicate surfaces, UV readiness and evaluated triangle counts. Preserve intentional open shells and asymmetry. Keep a sculpt/source copy separate from a reduced delivery copy.
6. Render the same views after changes and resolve the largest shape or shading defects. Use the shared [quality loop](../blender-development/references/quality-loop.md) to record remaining findings and evidence.

For a reference-dominant reconstruction, use `blender-reference-modeling` when available. UVs and shading can continue with `blender-materials-uv`; deformation with `blender-rigging-animation`. These are task-dependent handoffs. If a companion is absent, complete feasible geometry work and name the unmet part without claiming to have used it.

## Deliver
Return the edited source, owned object names, dimensions, topology/modifier decisions and current rendered evidence. A valid mesh is not a visual approval or a successful engine import. If Blender or visual inspection is unavailable, describe the source work and unexecuted checks explicitly.

See [source attribution](references/upstream-notice.md).
