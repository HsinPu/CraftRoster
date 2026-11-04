---
name: blender-modeling
description: "Create, review and refine general Blender mesh assets using proportion blockouts, precision edits, modifiers, instances and scoped topology cleanup before discipline-specific handoff."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "arjun988/blender-skills"
  reference-license: "MIT"
  reference-revision: "8f778d2405a214b508d4c7d80742be8e43acdd52"
---

# Blender Mesh Modeling

Use the simplest editable construction that can explain the required silhouette, dimensions and behavior.

Read the [asset contract](../blender-development/references/asset-contract.md), [execution boundaries](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md). Use the [production reference](references/production.md) for method selection, the worked recipe and correction criteria.

## Working modes

- Create: establish the dimensions, intended views, asset behavior and output contract before constructing the first form.
- Review: inspect the supplied revision and return prioritized findings with object names, evidence and a proposed correction. A review request permits no scene edits, renders, saves or report-file writes unless those are separately authorized.
- Refine: capture the baseline, modify an owned working copy, correct the largest observed defect, and repeat the affected measurements and actual image inspection.

## Task sequence

1. Identify owned meshes, intended dimensions/pivots, reference direction, camera views and source/delivery collections.
2. Construct primary masses with primitives and numeric alignment; prove proportion and negative space before detail.
3. Choose extrude, inset, loop/knife cuts, symmetry, repetition and thickness according to the shape rather than a fixed modifier recipe.
4. Refine secondary forms, normals and topology with scale-aware cleanup; keep repeated data shared until a local variation needs independence.
5. Inspect evaluated output from matched views, repair the largest defects and prepare only the UV, motion or export handoffs actually needed.

## Evidence and handoff

Return editable source, owned-object map, measured dimensions/pivots, topology/modifier rationale, evaluated counts and current silhouette/shading images. Preserve reference/blockout revisions and label missing runtime/visual checks.

Keep source objects and unrelated scene contents intact. Resolve explicit object names rather than falling back to every visible mesh; inspect shared datablock users before mutation. Discover the actual Blender connection and tool schema, or use an authorized background copy. This package installs no MCP server, third-party add-on or upstream executable. Record Blender version and unsupported operations; never present authored instructions or evaluation cases as executed Blender work.

Use other discipline Skills only when the deliverable needs their work; they are not implicit execution permissions.

[Attribution and license](references/upstream-notice.md).
