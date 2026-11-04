---
name: blender-hard-surface
description: "Build, review and refine Blender mechanical assets with deliberate boolean/bevel/subdivision workflows, manufacturing form hierarchy and measured shading/geometry quality."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Hard Surface Modeling

Choose a construction path that serves the camera and delivery mesh; use seams and edge treatment to explain how the object is assembled.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Establish dimensions, primary masses, moving parts, camera size and whether delivery is mid-poly, high-to-low or subdivided render geometry.
2. Block forms and assembly seams before panel detail; preserve sources and organize owned cutters/repeated parts.
3. Apply or account for scale and choose boolean solver/operands, bevel selection and shading based on the actual topology.
4. Add functional panels/greebles at visible density, then inspect flat faces and curved highlights in neutral lighting.
5. Correct shading/intersection defects and validate evaluated triangles; apply/bake/triangulate only on the appropriate delivery revision.

## Evidence and handoff

Return editable body/cutter/repeat sources, chosen construction path, physical bevel/segment values, stack rationale, cost measurements and current silhouette/grazing-highlight/topology images. Preserve high/low and bake-normal correspondence when applicable.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
