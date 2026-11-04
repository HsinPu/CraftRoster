---
name: blender-collision-proxies
description: "Author, inspect and repair Blender collision meshes and primitive proxy plans for a specified game engine, preserving walkable gaps, contact behavior and render-mesh association."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Collision Proxies

Approximate the surfaces physics needs while preserving intended movement and contact, with explicit engine validation.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Identify static versus dynamic use, contact requirements, player capsule dimensions and engine import conventions.
2. Choose boxes, capsules, spheres or convex pieces per functional region; preserve doorways, seating gaps and passages.
3. Create owned proxies in a separate collection with consistent render-mesh pivots, scale and target-specific association names.
4. Check each piece for finite geometry, intended closure, convexity and overlap; inspect overlays against the render asset.
5. Export only when authorized and test actual engine contact, traversal and physics behavior. Record source-only checks separately.

## Evidence and handoff

Return render-to-proxy mapping, collider type/convex-piece counts and dimensions, naming/import settings, editable collision collection, overlay images and any actual target-engine contact results. Leave engine behavior unverified when only Blender evidence exists.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
