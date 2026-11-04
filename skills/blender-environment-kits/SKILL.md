---
name: blender-environment-kits
description: "Build and validate Blender modular kits, terrain heightfields and biome scatter layers with explicit grid/pivot rules, heightmap metadata and reproducible instance placement."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Environment Kits

Prove module interfaces and terrain/scatter data in their real coordinate spaces before building a large environment.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Record kit connectors, grid, origin, export units, terrain extent/resolution and allowed scatter region.
2. Test a small terrain patch and minimum kit assembly before allocating full resolution or dense populations.
3. Construct terrain noise/heightmap, erosion/terrace/play-area controls and explicit slope/height attributes.
4. Author separate instanced scatter layers with slope, height, mask, spacing and seed controls; inspect evaluated placement.
5. Measure seams, pivots, texel density and transformed bounds, then inspect current room/junction and biome images. Export data only with range, orientation and quantization metadata.

## Evidence and handoff

Return editable kit/terrain generators, module interface table, test assembly, named scatter inputs/seeds, actual instance counts, height/splat data and decoding metadata when requested, and final seam/placement images. Distinguish sampled placement audits from exhaustive tests.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
