---
name: blender-vegetation
description: "Create, inspect and refine Blender trees, shrubs, grass and ivy using branch/card hierarchy, shared leaf atlases, documented wind data and canopy-preserving LODs."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Vegetation

Preserve plant species rhythm and crown coverage while controlling card overdraw and repeated geometry.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Establish species/style, plant size, camera range, target shader/wind contract and visible population.
2. Block trunk, major branches and canopy/ground silhouette before leaves; set scatter/attachment pivots intentionally.
3. Build reusable leaf/card/cluster variants and shared atlas with appropriate opaque/masked shading split.
4. Author requested wind attributes with documented domains/channels and bounded motion; create distance-appropriate canopy variants.
5. Inspect current plant and grove views for coverage, alpha edges, contact and wind/LOD defects; repair and remeasure.

## Evidence and handoff

Return editable plant sources, atlas/card mapping, pivot and branch hierarchy, wind-data contract, per-LOD counts/coverage decisions and current plant/grove evidence. State target shader/wind/impostor checks not executed.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
