---
name: blender-geometry-nodes
description: "Create, inspect and refine Blender Geometry Nodes systems with correct fields/domains, attributes, instancing, version-aware interfaces, bounded zones and evaluated-output checks."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Geometry Nodes

Design the data flow and field evaluation context before creating a node graph.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Define source geometry, consuming domains, exposed parameters, output representation and maximum evaluated cost.
2. Inspect the installed node types, enabled sockets and interface/modifier APIs before scripting; create an owned versioned group.
3. Build source/masks, generation, instances, transforms, attributes/materials and output with explicit field capture points.
4. Test zero/minimum/maximum settings and fixed seeds. Inspect node warnings, attributes, instance count and evaluated bounds/cost.
5. Review actual output images, correct field/domain or geometry defects, and bake/realize only what the chosen delivery path needs.

## Evidence and handoff

Return editable named node groups, input schema/ranges/seed, source object dependencies, node/socket compatibility notes, boundary-test measurements, current output images and any baked/static variants. Report unsupported experimental nodes as unavailable.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
