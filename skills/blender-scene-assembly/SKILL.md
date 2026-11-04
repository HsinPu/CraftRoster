---
name: blender-scene-assembly
description: "Create, audit and refine Blender scene layouts, units, collections, linked libraries, overrides and asset handoffs while preserving source ownership and scalable reuse."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Scene Assembly

Make scene structure and dependencies explain what is editable, reusable, visible and deliverable.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Inspect units, object/data users, library paths, collection membership, transforms, names and missing assets without changing them.
2. Establish an owned layout and scale convention; greybox navigation/cameras before detailed set assembly.
3. Choose linking, collection instances, appending or targeted overrides by ownership and reuse needs.
4. Organize helpers, render assets, collisions, lights/cameras and export sets, then scope any path/transform cleanup carefully.
5. Re-audit after corrections, inspect actual layout views and test reopen/dependency/export behavior relevant to delivery.

## Evidence and handoff

Return scene source, collection/ownership/dependency map, unit and pivot conventions, missing-resource findings and fixes, actual current layout images and any tested library/export results. Preserve unresolved external dependencies explicitly.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
