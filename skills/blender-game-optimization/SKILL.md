---
name: blender-game-optimization
description: "Measure and reduce Blender real-time asset geometry, material, texture and skeletal costs while checking silhouette, UV, shading and motion regressions against explicit target budgets."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "setcodes/gamedev-skills"
  reference-license: "MIT"
  reference-revision: "096c224aa498a789fa99d476583029fcb9f538e1"
---

# Blender Game Optimization

Optimize the cost that limits the intended scene and preserve the appearance and behavior the user needs.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Record hardware/engine target, visible population, camera range and explicit per-asset/scene budgets; label provisional limits.
2. Measure evaluated triangles, exported vertex splits, material slots, textures/mips, bone/influence counts and current images.
3. Reduce hidden work, excessive flat/cylinder detail and redundant materials before aggressive shape reduction.
4. Make LOD and collider variants on owned copies; preserve UV layers, shading, weights and recognizable silhouettes.
5. Compare matched views and critical poses, remeasure actual output, then profile the representative target scene when available.

## Evidence and handoff

Return source and optimized copies, before/after cost table with measurement method, LOD/collision/material decisions, current visual comparisons and remaining budget risks. Distinguish draw-call/memory estimates from engine measurements and target FPS.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).

Read [Generated-character reduction with protected face and hand regions](references/setcodes-ai-reduction.md) when that branch is requested. It specifies inputs, construction or repair steps, failure handling and the evidence required for acceptance.
