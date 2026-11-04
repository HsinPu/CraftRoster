---
name: blender-asset-validation
description: "Validate Blender asset structure, budgets, materials, rigs and exported/reimported delivery evidence. Use for technical asset acceptance and regression checks; visual beauty and target-engine operation require their own evidence."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Asset Validation

Check the actual delivery revision against the asset contract and state exactly which checks ran.

Read [the asset contract](../blender-development/references/asset-contract.md), [execution and ownership](../blender-development/references/execution-and-ownership.md), [quality loop](../blender-development/references/quality-loop.md) and [validation evidence](references/validation-evidence.md).

Use [the helper contract](references/helper-contract.md) for the packaged inspector's supported checks, invocation, report schema and limitations. Do not infer checks the helper does not implement.

Apply the [technical review playbook](references/technical-review-playbook.md) to the actual geometry, UV, material, binding, animation and export risks. It specifies additional methods, failure interpretation and repair/retest contracts; keep unsupported or unexecuted checks separate from the packaged inspector's result.

## Technical acceptance

1. Identify explicit asset objects/collections, source and export revisions, units, target, budgets, material/texture requirements, skeleton/clips and intended exceptions. Never validate every object in an unrelated open scene by default.
2. Use an authorized isolated process or copy to inspect evaluated geometry, transforms, triangle/material budgets, UV requirements, external image availability, rig influences and required animation data. Account for modifiers and report the inspected representation.
3. Record check outcomes individually, including skipped checks and their reasons. Interpret open boundaries, separate islands, overlap and pivots against the asset purpose; intentional foliage, eyes, effects or mirrored UVs are not universal defects.
4. Review the export through an independent reimport when available. Compare dimensions, names/mappings, mesh/material counts, textures, skeleton, clip names/ranges and morph targets with the delivery manifest. A report listing data is not the same as comparing it.
5. Inspect revision-bound diagnostic renders and relevant deformation frames. Use visual-review support for appearance judgments. If images, a target importer or required comparison data are unavailable, retain those criteria as unverified.
6. Give the authorized owner concrete failures and recheck the corrected revision. This validation workflow does not silently repair geometry, apply modifiers, change rigs or overwrite the source.

The caller's permissions remain controlling. A read-only reviewer inspects existing reports and files through permitted read operations; producing new render/report artifacts belongs to an authorized writer or isolated execution job. Do not use this Skill to bypass that boundary.

Deliver measured results versus limits, errors, accepted exceptions, skipped/unavailable checks, exact files/revisions and separate technical, visual and engine status. An inspector's successful exit proves only the checks it actually implements.

See [source attribution](references/upstream-notice.md).
