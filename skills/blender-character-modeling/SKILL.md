---
name: blender-character-modeling
description: "Create, review and refine human or humanoid Blender meshes, including proportions, facial and joint topology, clothing and hair choices for the declared animation and camera needs."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Character Modeling

Build character identity and motion clearance together; facial detail cannot rescue incorrect large proportions.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Establish identity references, stature, style, supported outfits, camera distances and expression/pose requirements.
2. Block skull, ribcage, pelvis and limbs; compare front, side and intended three-quarter silhouettes before facial detail.
3. Design eyelid, lip, jaw, shoulder, hip and finger flow around the actual motion brief. Allocate density by deformation and screen size.
4. Construct clothing, armor and hair as independently controllable parts where swaps, shading or motion demand it; preserve the complete body master.
5. Inspect rough blink, jaw, raised-arm and bent-limb tests; correct volume loss or intersections before UV/rig handoff.

## Evidence and handoff

Return the editable proportion master and delivery meshes, dimensions/landmarks, object splits, hair method, topology and expression-zone notes, evaluated counts, front/side/three-quarter images and observed deformation limitations. If pose tests were unavailable, identify them as outstanding.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Route dense form work to blender-sculpting, rebuilt topology to blender-retopology, UVs to blender-uv-unwrapping and motion to blender-rigging-animation as needed.

[Attribution and license](references/upstream-notice.md).
