---
name: blender-export
description: "Prepare and verify Blender asset exports for a declared game-engine pipeline, including geometry, materials, skeletons, clips, scale and delivery evidence. Use when Blender assets leave the authoring scene; unrelated engine programming and beauty-only renders do not activate this Skill."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "EL4CTEO/blender-skills"
  reference-license: "MIT"
  reference-revision: "fb92cfb4cc5a238c22113a6a230b09f535bd0656"
---

# Blender Export

Deliver the agreed asset in the target pipeline without losing its editable source or confusing a successful write with successful import.

Read the common [asset contract](../blender-development/references/asset-contract.md) and [execution rules](../blender-development/references/execution-and-ownership.md). Confirm target engine/version/importer, required format, exact export objects, units, pivot, materials/textures, deform bones and named animation clips. Preserve the project conventions rather than selecting an exporter preset from an engine name alone.

## Prepare a controlled export

Use [format and verification guidance](references/engine-delivery.md) for the selected target and the [export verification playbook](references/export-verification-playbook.md) for preparation, operator checks, semantic comparisons and failure recovery. Keep destructive preparation on an export copy. Explicitly control scene, collection, selection and child/armature inclusion; a globally selected object from another scene must not leak into the package. Inspect runtime exporter properties instead of silently dropping unsupported options.

Invoke `blender-asset-validation` against the intended objects and current contract before export. This is a required companion; if it or the runtime is absent, name the missing verification and keep that gate incomplete. An optimization workflow is conditional on an actual budget or geometry problem, and visual review is conditional on appearance approval being in scope. Preserve accepted art direction and deformability when solving a technical warning.

Export to a new explicit path, preserving the source `.blend`. Confirm meaningful file contents, textures and referenced external resources, not only nonzero file size. Record the exporter/version/options, object set, source and contract hashes, outputs and hashes in a delivery manifest.

## Verify the delivered revision

Reimport into a clean background scene and compare expected dimensions/orientation, meshes/material assignments, texture references, bone names, clip names/durations, root motion and shape keys as applicable. Compare semantic contracts; exporters may split vertices or rename containers, so raw object/vertex equality is not universally meaningful. A count summary without comparison does not establish preservation.

For target-engine acceptance, actually import the final files and inspect representative views, deformation and playback in that engine. Otherwise label the package prepared for import and engine verification unperformed. If compression, material conversion or export changes the appearance, the exported asset needs a fresh visual check; approval of the authoring scene alone is insufficient.

Use the validation package's [delivery evidence checker](../blender-asset-validation/references/helper-contract.md) when maintaining machine-readable evidence. It checks file/revision consistency, not visual beauty. After any repair, regenerate changed outputs and their evidence instead of editing a stale report to pass.

Return the source, exports, textures, manifest and actual check outcomes with unverified targets. See [source notice](references/upstream-notice.md).

Read [Scoped FBX packaging, texture channels and semantic roundtrip checks](references/setcodes-fbx-package.md) when that branch is requested. It specifies inputs, construction or repair steps, failure handling and the evidence required for acceptance.

For the corresponding production stage, read the detailed [semantic roundtrip](references/majid-semantic-roundtrip.md) procedure. Keep its measurements, failure cases and acceptance evidence tied to the current asset revision.
