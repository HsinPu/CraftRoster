---
name: blender-uv-unwrapping
description: "Create, review and repair Blender UV layouts for seams, texel density, pixel-margin packing, trims, mirrored bakes, UDIM or lightmap channels under a declared texture/export contract."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender UV Unwrapping

Allocate texture samples where the camera needs them while keeping seams, padding and channel semantics explicit.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Preserve the existing UV revision and define map resolution/aspect, texture sets, target density, unique/mirrored regions and channel requirements.
2. Mark seams by construction/deformation visibility and choose a suitable unwrap/strip/projection method.
3. Inspect checker distortion and collapsed islands before scaling/packing; measure density using world surface area.
4. Pack with pixel-derived margins and explicit scaling policy; handle trim tiling, UDIM and lightmap exceptions deliberately.
5. Inspect current checker/bake images at output and mip sizes, repair seams/overlaps/density defects and recheck exported channel mapping.

## Evidence and handoff

Return editable UV mesh, seam/channel/tile map, resolution and pixel margins, density/overlap/collapse findings, current checker/bake images and any actual importer results. Record intentional overlaps separately from errors.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
