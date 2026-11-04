---
name: blender-retopology
description: "Rebuild, review and refine Blender delivery topology from sculpts, scans or dense meshes using manual deformation flow or measured automatic simplification without losing source geometry."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Retopology

Match topology to deformation, silhouette, shading and UV requirements rather than maximizing the number of quads.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Preserve the dense source and establish target counts, expression/joint requirements and surface-distance tolerance.
2. Choose manual/shrinkwrap for sensitive motion, Quadriflow for suitable static quad remeshing, collapse for irregular reduction or planar dissolve for flat regions.
3. Build/correct loops around deformation zones and allocate density where outline or strain needs it.
4. Inspect projection misses, boundaries, poles and UV/normal consequences; test actual critical poses on the resulting topology.
5. Compare current source/low silhouettes and measurements, repair the largest discrepancy and only then hand off UV/baking/rigging.

## Evidence and handoff

Return dense master and separately owned low mesh, method/parameters, actual evaluated counts, topology and distance findings, pose limitations and current wire/silhouette evidence. Report auto-remesh quality separately from deformation approval.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
