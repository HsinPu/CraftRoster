---
name: blender-visual-review
description: "Read-only visual critique of Blender asset renders, comparison sheets and animation evidence against an art brief. Use for appearance acceptance, prioritized polish findings and revision rechecks; this Skill does not edit scenes or create reports."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "majidmanzarpour/blender-game-skills"
  reference-license: "MIT"
  reference-revision: "f0ef29385a03de139957e6f700b801cdc00b7e29"
---

# Blender Visual Review

Judge the visible asset against its intended art direction and use. Return actionable findings with evidence and a bounded recheck target.

Read the shared [asset contract](../blender-development/references/asset-contract.md), [execution and ownership](../blender-development/references/execution-and-ownership.md) and [quality loop](../blender-development/references/quality-loop.md), then apply the [visual review rubric](references/visual-rubric.md).

## Review without changing the asset

1. Read the user's requested scope and approved references. Identify the current asset/export revision, image provenance, camera, frame, lighting and intended gameplay size. Distinguish source, reimported and engine evidence.
2. Inspect supplied images directly at their intended size and useful close-up. Use consistent reference/candidate conditions. If images cannot be opened or their provenance cannot establish the current asset, mark the affected visual criteria unverified.
3. Review silhouette, proportions, composition, material separation, lighting, color/value hierarchy, edge quality, style coherence and game-camera readability. For animation, inspect representative motion and extreme poses; a still does not establish temporal quality.
4. Prioritize issues by visible impact and intended use. State the image/view/frame and affected part, observable mismatch, likely cause with confidence, smallest repair direction, and the comparison that would demonstrate improvement.
5. Separate defects from preferences and acknowledge interpretations of unseen reference regions. Recommend an owner such as modeling, materials, rigging or lookdev; a review request is not authorization to implement that repair.
6. Recheck only against fresh evidence of the revised output. Close a finding when its stated acceptance condition is met, and check whether the correction caused another visible problem.

This is a read-only workflow in every caller. Do not modify scenes, generate renders, write report files, install tools or create assets. Request missing evidence or hand off to an authorized writer; return the review in the response. Never claim that a numerical similarity score, technical inspector pass or a file extension makes an asset beautiful.

Report visual status as supported by the actual evidence: accepted against the stated brief, needs correction, or unverified for named criteria. Keep technical validity and engine acceptance separate. There is no universal prettiest asset or automatic aesthetic approval.

See [source attribution](references/upstream-notice.md).
