---
name: blender-development
description: "Create, repair, or coordinate Blender game assets with a reference-led brief, scoped scene edits, render review, and verified export. Use for Blender asset production spanning modeling, materials, animation or delivery; game logic, unrelated image generation and engine-only programming remain with their own workflows."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Development

Deliver an editable asset that fits the user's art direction and game constraints. This entry can handle a small task directly. Specialist packages add depth only when the task needs them; the shared references here do not activate this entire workflow when another Skill reads them.

## Establish the asset

Read repository guidance, existing art/design documents, the requested references and actual scene before editing. Identify the asset's purpose, target engine and platform, camera distance, size, style, movement, output formats and ownership. Follow [the asset contract](references/asset-contract.md) to retain that information without asking again for already settled choices. A stylized or low-poly brief is not permission to replace it with realism. Treat missing views and dimensions as inferences.

For a complete asset or scene, use [production planning](references/production-planning.md) to select the uncertain slice, discipline handoffs and revision gates. Find the focused package in [the specialist index](references/specialist-index.md); the broad entries below coordinate related tasks, while the index includes separate technical, style, world and genre workflows.

Distinguish creation/refinement from review-only requests. A clear request to build or improve authorizes bounded edits and the correction loop; an inspection request authorizes findings. Read-only collaborators return findings in the response, including when a workflow normally persists reports.

## Execute and route

Use [execution and ownership](references/execution-and-ownership.md) before operating Blender. Discover the actual installed version and tools. A background process is available through [run_blender.py](scripts/run_blender.py); an already connected MCP can operate a live scene when that scene and operation are in scope. Skill installation supplies neither Blender nor an MCP connection.

Use [runtime and bpy guidance](references/runtime-and-bpy.md) for context-sensitive operations, API migration, shared data, evaluated meshes and file/resource handling. The read-only [runtime inspector](scripts/inspect_runtime.py) records the current environment; API presence is not a successful render, exporter or engine test.

| Task | Conditional specialist |
|---|---|
| Props, structures, geometry and topology | `blender-modeling` |
| Images, camera/scale calibration and measured resemblance | `blender-reference-modeling` |
| UVs, PBR textures and baking | `blender-materials-uv` |
| Bones, weights, clips and deformation | `blender-rigging-animation` |
| Art direction, surface response, lighting and presentation | `blender-lookdev` |
| Geometry/texture budgets, LODs and collision proxies | `blender-game-optimization` |
| Game-engine export and delivery manifest | `blender-export` |
| Geometry, file and contract correctness | `blender-asset-validation` |
| Independent visual diagnosis against the brief | `blender-visual-review` |

Check that a selected specialist is installed before saying it was used. If absent, perform feasible work directly and identify any indispensable gap. Do not install a dependency or substitute an unrelated style as an incidental production step.

## Build, examine, refine

Use [the quality loop](references/quality-loop.md) for assets whose appearance matters. Establish large forms and visual hierarchy before detail. Inspect diagnostic images as well as the intended game view, fix the largest supported defect, and capture new evidence after changes. For full creation-and-review work, use an independent visual reviewer when available; otherwise label the review as a self-review.

When applying a selected look, combine its specific playbook with [style production](references/style-production.md). For a world or game-genre asset set, combine the selected playbook with [world and genre production](references/world-and-genre-production.md). These shared procedures organize evidence and handoffs without replacing the specialized construction details.

Technical validity, visual fit and engine acceptance are separate results. A numerical pass does not approve art. A flattering beauty render does not establish correct scale, clean topology or game readability. Do not promise an objective "most beautiful" result; work toward the agreed reference, style and measurable delivery requirements, stating remaining subjective choices.

Deliver the requested source and exports with current images and a concise account of changes and checks. Name which Blender version, host, target and files were actually exercised. Reinspect the final saved revision after polish; old approvals do not carry over automatically.

See [source attribution](references/upstream-notice.md).
