---
name: blender-vehicle-modeling
description: "Create, review and refine Blender cars, aircraft, boats, transit or mechs with proportion-driven bodywork, functional system splits and motion/LOD/collision-aware construction."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Vehicle Modeling

Lock the vehicle's stance and major ratios before panel detail; preserve the parts that must move or shade independently.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Establish reference dimensions, vehicle class, use/camera range, symmetry, moving systems and delivery needs.
2. Block chassis/body and wheelbase, wingspan, waterline or support footprint; inspect front/side/top silhouettes.
3. Build primary body curvature and functional panel flow, then separate running gear, glazing, lights and visible interiors.
4. Refine cuts/bevels while preserving clean highlights and motion clearances; stage LOD/collision requirements around those systems.
5. Inspect intended-camera and movement poses, repair proportion/shading/clearance defects, and remeasure final costs.

## Evidence and handoff

Return editable bodywork and system masters, dimension/ratio sheet, pivot/axis map for moving parts, actual costs, current silhouette/highlight/clearance evidence and requested LOD/collider variants. Keep simulation/engine handling claims separate.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use blender-hard-surface for detailed cut/bevel construction, blender-lod-pipeline for transition variants, blender-collision-proxies for physics approximations and engine-specific export Skills only for requested target delivery.

[Attribution and license](references/upstream-notice.md).

Read [Thin-shell vehicle reconstruction with camera-specific visibility](references/setcodes-shell-reconstruction.md) when that branch is requested. It specifies inputs, construction or repair steps, failure handling and the evidence required for acceptance.
