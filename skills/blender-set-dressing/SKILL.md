---
name: blender-set-dressing
description: "Create, review and refine Blender narrative prop placement with causal story clusters, controlled density, preserved traversal and camera readability."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Set Dressing

Place a few meaningful objects so their relationship tells the story and supports the intended route.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Inspect the locked layout, story beat, interaction focus, camera path, clearance and reusable prop sources.
2. Establish hero placements and supporting clusters before background filler; keep paths and focal negative space deliberate.
3. Instance repeated props and vary only plausible placement/scale; add wear/decals where the story explains them.
4. Inspect hero and route views under intended lighting, checking contact, tangencies, silhouette noise and readability.
5. Remove or relocate weak/conflicting placements, then repeat current images and clearance/cost checks.

## Evidence and handoff

Return the owned dressing collection, story/density map, source instance dependencies, current hero/path images, clearance and population findings and remaining layout/lighting risks. Preserve the underlying architecture and prop masters.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
