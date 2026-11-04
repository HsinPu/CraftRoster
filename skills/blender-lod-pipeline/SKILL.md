---
name: blender-lod-pipeline
description: "Create, review and repair Blender LOD chains with asset-specific simplification, screen-size transitions, preserved pivots/UV/material behavior and target-engine verification."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender LOD Pipeline

Make each lower-detail representation appropriate for its actual projected size, then inspect the transition.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Establish an approved LOD0, intended camera range, target importer and screen-size/error budget.
2. Choose manual, planar/collapse, part-removal or impostor generation by geometry and animation needs.
3. Build named owned copies with stable root/pivot and retained material/UV/color/skinning contracts.
4. Measure each evaluated level and render it at its intended transition size; correct silhouette/shading/pose differences.
5. Deliver transition settings and verify the imported chain when an engine is available; do not infer engine LOD configuration from names.

## Evidence and handoff

Return preserved LOD0 and LOD copies, per-level counts/methods, attribute/material mapping, screen-size table and current transition comparisons. Report actual importer/engine checks separately from Blender-only evidence.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
