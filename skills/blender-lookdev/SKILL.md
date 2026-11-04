---
name: blender-lookdev
description: "Develop and correct Blender appearance through controlled material, light, camera and reference comparison loops. Use for authorized appearance edits; read-only image critique belongs to blender-visual-review."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Lookdev

Converge on approved art direction with neutral, beauty and intended-view evidence.

Read the shared [asset contract](../blender-development/references/asset-contract.md), [execution and ownership](../blender-development/references/execution-and-ownership.md), and [quality loop](../blender-development/references/quality-loop.md). The required blender-development companion supplies these resources; it does not grant execution permissions.

## Select and execute the work

1. Establish the requested deliverable, source revision, owned objects/data, target renderer or receiving engine, scale, timing and available tools. Inspect the current file before changing it. Keep recoverable editable sources and isolate destructive or export conversions.
2. Read [the production and repair guide](references/production.md) before selecting operators, data structures or settings. It supplies the discipline-specific recipe, parameter choices, failure causes and acceptance evidence; do not replace it with a preset or capability summary.
3. Use the available supported Blender execution path. Inspect actual tool schemas and installed API behavior. Work on bounded previews before expensive bakes or renders; retain source graphs, rigs, media and caches needed to reproduce the result.
4. Fix ranked visible gaps and preserve matched before/after settings. A read-only reviewer returns findings; an authorized writer applies repairs, renders and persists reports.
5. Correct consequential findings, repeat affected measurements and compare the resulting revision visually. Missing rendering, image inspection or destination access must remain explicitly unverified. Structural checks and file presence alone do not establish appearance or runtime success.

The existing [compact look-development decisions](references/look-development.md) remain useful for material, light and camera comparisons.

## Handoffs and output

Use the relevant specialist only when its operation is needed: `blender-pbr-materials`, `blender-lighting`, `blender-camera-cinematography`, `blender-texturing`, `blender-rendering`, `blender-visual-review`. These are conditional handoffs, not blanket package requirements.

Deliver the editable source, concrete settings and dependency paths, actual output inventory, inspected visual evidence, measurements and corrections. Distinguish executed technical checks, actual image/motion review and destination acceptance. Name remaining limitations and the next required evidence without implying an unrun workflow passed.

See [upstream provenance and license notices](references/upstream-notice.md). Evaluation cases are definitions in [evals/evals.json](evals/evals.json), not claims of completed model or Blender runs.

Read [Portable neutral lighting and reproducible material previews](references/setcodes-neutral-preview.md) when that branch is requested. It specifies inputs, construction or repair steps, failure handling and the evidence required for acceptance.

For the corresponding production stage, read the detailed [capture debug](references/majid-capture-debug.md) procedure. Keep its measurements, failure cases and acceptance evidence tied to the current asset revision.
