---
name: blender-rendering
description: "Render and verify Blender stills, animation and multi-camera output with engine/device selection, passes, color and file evidence."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Rendering

Produce recoverable render outputs and inspected visual results.

Read the shared [asset contract](../blender-development/references/asset-contract.md), [execution and ownership](../blender-development/references/execution-and-ownership.md), and [quality loop](../blender-development/references/quality-loop.md). The required blender-development companion supplies these resources; it does not grant execution permissions.

## Select and execute the work

1. Establish the requested deliverable, source revision, owned objects/data, target renderer or receiving engine, scale, timing and available tools. Inspect the current file before changing it. Keep recoverable editable sources and isolate destructive or export conversions.
2. Read [the production and repair guide](references/production.md) before selecting operators, data structures or settings. It supplies the discipline-specific recipe, parameter choices, failure causes and acceptance evidence; do not replace it with a preset or capability summary.
3. Use the available supported Blender execution path. Inspect actual tool schemas and installed API behavior. Work on bounded previews before expensive bakes or renders; retain source graphs, rigs, media and caches needed to reproduce the result.
4. Check actual frame inventory, dimensions, passes, chosen device and decoded movie. A read-only reviewer returns findings; an authorized writer applies repairs, renders and persists reports.
5. Correct consequential findings, repeat affected measurements and compare the resulting revision visually. Missing rendering, image inspection or destination access must remain explicitly unverified. Structural checks and file presence alone do not establish appearance or runtime success.

## Handoffs and output

Use the relevant specialist only when its operation is needed: `blender-lighting`, `blender-compositing`, `blender-video-editing`. These are conditional handoffs, not blanket package requirements.

Deliver the editable source, concrete settings and dependency paths, actual output inventory, inspected visual evidence, measurements and corrections. Distinguish executed technical checks, actual image/motion review and destination acceptance. Name remaining limitations and the next required evidence without implying an unrun workflow passed.

See [upstream provenance and license notices](references/upstream-notice.md). Evaluation cases are definitions in [evals/evals.json](evals/evals.json), not claims of completed model or Blender runs.
