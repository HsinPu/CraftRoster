---
name: blender-archviz
description: "Create, review or refine architectural interiors and exteriors in Blender using measured dimensions, camera correction, believable materials and revision-ready still or walkthrough delivery."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Architectural Visualization

Treat the architectural brief as a spatial specification: image appeal must preserve the building's actual dimensions and design.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Reconcile drawings, imported CAD units and a known dimension; list unresolved measurements instead of scaling by appearance.
2. Establish room shells, openings and circulation in a greybox. Lock approved camera positions before detailed furniture or surface work.
3. Separate glazing, frames, building shell, furniture and presentation helpers. Add only edge detail visible in the chosen plates.
4. Develop plausible material scale and window/practical lighting, then inspect test images for distorted space, material repetition and clipped highlights.
5. Correct the highest-impact spatial or image defect and repeat the same camera renders. For walkthroughs, sample the complete path for intersections and exposure changes.

## Evidence and handoff

Return the editable scene, drawing-to-scene scale check, named cameras and lenses/shifts, material and lighting decisions, final image sequence or stills, optional layered EXR passes, and a revision-bound visual findings list. State whether construction measurements, lighting quality and animation playback were actually checked.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use blender-camera-cinematography, blender-lighting, blender-rendering and blender-compositing when those deliverables are requested; the spatial construction remains usable without them.

[Attribution and license](references/upstream-notice.md).
