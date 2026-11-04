---
name: blender-creature-modeling
description: "Create, review or refine Blender creatures with anatomy-based masses, readable silhouettes, movement clearance and deformation-aware surfaces for quadrupeds, winged, aquatic or hybrid designs."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Creature Modeling

Use the creature's locomotion and behavior to explain its form, while preserving the approved fantasy design.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Record creature role, size, reference species, gait, attack/flight poses and intended camera distance.
2. Place spine, pelvis, shoulder girdle and limb joints as guides; validate range and support before skin detail.
3. Block muscle and fat masses around that framework. Compare gameplay silhouettes and negative spaces at the intended size.
4. Build organic, membrane, armor and mechanical regions with different motion requirements separately where appropriate.
5. Test the critical bent/extended poses, repair intersections or volume collapse, then prepare dense sculpt and lower-topology handoffs as needed.

## Evidence and handoff

Return joint/mass guides, editable creature mesh, scale and silhouette evidence, organic/mechanical splits, topology priorities, evaluated costs and the tested pose set. Report unsupported flight, rig or engine checks independently.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use blender-sculpting for high-detail anatomy, blender-retopology for delivery flow, blender-rigging-animation for a production rig and blender-character-modeling for humanoid facial mechanics.

[Attribution and license](references/upstream-notice.md).
