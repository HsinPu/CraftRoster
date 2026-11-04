---
name: blender-cartoon-style
description: "Construct Blender cartoon characters and props with deliberate shape exaggeration, expressive silhouette and soft or graphic shading without imposing anime conventions."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Cartoon Style

Construct Blender cartoon characters and props with deliberate shape exaggeration, expressive silhouette and soft or graphic shading without imposing anime conventions.

Read [the production recipe](references/production.md) for construction choices, diagnostics and acceptance. Treat its numbers as starting experiments tied to the stated shot, not universal art rules. Preserve the approved subject, intensity, palette and deliverables; a style request alone does not authorize replacing a project or creating game logic.

Use foundation resources for [asset intent](../blender-development/references/asset-contract.md), [scoped execution](../blender-development/references/execution-and-ownership.md), [style production](../blender-development/references/style-production.md) and [revision-bound review](../blender-development/references/quality-loop.md). These are resource dependencies, not a request to execute every foundation stage. Work read-only when asked to diagnose; an authorized writer makes changes and saves evidence.

Use blender-prop-modeling or blender-character-modeling for required topology and blender-animation for an authorized acting test.

Read [the construction alternatives](references/shading-and-motion-branches.md) for soft volumetric, graphic-band or rubber-hose work; choose the intended shading and articulation system.

Inspect actual rendered images at the requested output size. Describe unavailable execution or images explicitly; a node graph, written evaluation or saved file alone cannot establish visual success. Deliver the editable source, requested images and the settings needed to reproduce them. Engine appearance needs its own target test.

Behavioral cases live in [evals/evals.json](evals/evals.json); they are definitions, not executed results. See [source provenance](references/upstream-notice.md).
