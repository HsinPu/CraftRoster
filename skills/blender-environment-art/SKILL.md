---
name: blender-environment-art
description: "Plan, create, review and refine Blender environments spanning terrain, modular architecture, vegetation and focal composition with scale, navigation and measured real-time costs."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Environment Art

Build spaces that communicate place and support the intended route before spending detail on their surfaces.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Define playable or cinematic use, traversal dimensions, vista cameras, grid, world units and simultaneous visibility budget.
2. Greybox terrain, structures and routes with a scale guide; inspect camera/player paths and hero silhouettes.
3. Build the minimum reusable kit and material plan, then prove corners, junctions and openings in an assembled test space.
4. Add terrain features and vegetation layers with controlled seeds/density; reserve unique detail for focal regions.
5. Inspect foreground/midground/background separation, navigation and repeated seams under final lighting; correct and remeasure after changes.

## Evidence and handoff

Return layout source, named kit and terrain/vegetation collections, grid/pivot and material-atlas plan, hero and path-view images, instance and evaluated cost reports, and known navigation/target-runtime limits.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use blender-environment-kits for detailed kit/terrain/scatter mechanics, blender-set-dressing for narrative placement, blender-vegetation for plant assets and blender-game-optimization for measured reductions.

[Attribution and license](references/upstream-notice.md).
