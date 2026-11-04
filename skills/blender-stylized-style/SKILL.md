---
name: blender-stylized-style
description: "Develop Blender non-photorealistic assets through explicit shape, palette, lighting and line rules, with reversible cel-shading and engine-aware NPR handoff choices."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Stylized Style

Develop Blender non-photorealistic assets through explicit shape, palette, lighting and line rules, with reversible cel-shading and engine-aware NPR handoff choices.

Read [the production recipe](references/production.md) for construction choices, diagnostics and acceptance. Treat its numbers as starting experiments tied to the stated shot, not universal art rules. Preserve the approved subject, intensity, palette and deliverables; a style request alone does not authorize replacing a project or creating game logic.

Use foundation resources for [asset intent](../blender-development/references/asset-contract.md), [scoped execution](../blender-development/references/execution-and-ownership.md), [style production](../blender-development/references/style-production.md) and [revision-bound review](../blender-development/references/quality-loop.md). These are resource dependencies, not a request to execute every foundation stage. Work read-only when asked to diagnose; an authorized writer makes changes and saves evidence.

Use blender-anime-style for specific color-cel character language, blender-hand-painted-style for painted texture work, blender-pbr-materials for node mechanics and blender-export for requested target delivery.

Inspect actual rendered images at the requested output size. Describe unavailable execution or images explicitly; a node graph, written evaluation or saved file alone cannot establish visual success. Deliver the editable source, requested images and the settings needed to reproduce them. Engine appearance needs its own target test.

Behavioral cases live in [evals/evals.json](evals/evals.json); they are definitions, not executed results. See [source provenance](references/upstream-notice.md).
