---
name: blender-procedural-modeling
description: "Create, review and refine art-directable Blender generators for rocks, buildings, roads, cables and panels with bounded parameter families, reproducibility and delivery-ready evaluated variants."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Procedural Modeling

Choose a procedural system when a useful asset family can be controlled by meaningful parameters and verified at its extremes.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Define the asset family, fixed interfaces, artistic invariants, seed behavior and allowed parameter ranges.
2. Choose Geometry Nodes, curves or modifiers by output needs; prove a small representative variant before generalizing.
3. Expose physical and structural controls instead of arbitrary noise sliders; keep UV/material mapping part of generation.
4. Evaluate multiple seeds and boundary combinations, measuring bounds, topology, instance population and interface validity.
5. Inspect generated variants at intended camera size, correct failing ranges and preserve the editable generator beside any baked outputs.

## Evidence and handoff

Return generator source, input/range schema, seed-to-variant table, tested boundary results, UV/material strategy, current variant images and requested static/instanced outputs. Do not describe a Blender node group as engine-executable without a verified runtime.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use blender-geometry-nodes for field/socket implementation, blender-environment-kits for terrain and snapping, and blender-game-optimization for measured output reduction.

[Attribution and license](references/upstream-notice.md).
