---
name: blender-prop-modeling
description: "Create, review and refine grounded Blender furniture, tools, containers, household objects and kitbash parts with readable construction, functional pivots and camera-appropriate detail."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Prop Modeling

Make the object's use, scale and construction readable without imposing an unrelated mechanical style.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Establish reference dimensions, use/interaction, nearest camera, style and cost tier.
2. Block primary shapes and human contact points, then confirm silhouette and functional pivot.
3. Add actual construction joints, thickness and visible edge treatment; keep moving and differently shaded systems controllable.
4. Plan UV/material reuse and causal wear at handled/exposed regions; avoid detail that cannot survive the intended view.
5. Inspect contact, use motion and final silhouette, repair defects and remeasure before optional collision/export handoff.

## Evidence and handoff

Return editable prop/source parts, measured dimensions and contact/pivot positions, detail/material tier, current images and any requested kitbash/export variants. Include interaction/collision checks only when performed.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
