---
name: blender-sculpting
description: "Create, inspect and refine Blender sculpt sources using proportion/form hierarchy, voxel or multires choices, controlled detail and safe high-to-low handoff with honest live/headless limits."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Sculpting

Resolve gesture and mass at a cheap resolution before introducing detail that makes structural corrections expensive.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Establish scale, form references, owned base/source copies, target views and eventual sculpt/bake/deformation needs.
2. Choose voxel remesh for changing volume, multires for a stable base or optional live Dyntopo exploration; preserve prior topology/data before destructive changes.
3. Refine primary masses, secondary anatomy/folds and tertiary surface marks in that order, checking actual silhouettes throughout.
4. Use only operations supported by the actual execution context; keep headless work to suitable object/mesh/modifier methods.
5. Inspect current sculpt and bake-sensitive surfaces, repair form/intersection/detail defects and prepare high/low/cage handoffs as needed.

## Evidence and handoff

Return editable high source and recoverable base, resolution/brush/procedural decisions, deformation-zone notes, current form/detail images, evaluated counts and bake handoff limitations. A procedural noise pass is not hand-sculpted likeness or approved anatomical detail.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use blender-retopology for delivery topology, blender-texture-baking for bake execution, and blender-character-modeling or blender-creature-modeling for motion-specific form plans.

[Attribution and license](references/upstream-notice.md).
