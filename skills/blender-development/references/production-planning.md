# Plan a complete production slice

Use this for a task spanning multiple disciplines. A single targeted edit does not need a formal production ceremony. Retain already settled choices and proceed through ordinary authorized corrections without requesting approval after each stage.

## Select owners by the actual work

Choose one primary construction discipline for the asset, one requested art direction when applicable, and the specialists needed by its output. For example, a humanoid model, a four-legged creature and a rigid mechanical prop share some mesh tools but need different topology and motion tests. A world/genre package supplies art and layout constraints; it does not replace geometry, shading or engine implementation.

Use the specialist index to find exact packages. Check which are installed before invoking them. Treat shared reference dependencies as documents, not instructions to run the foundation from the beginning. For a mixed task, record each handoff's input, expected artifact and acceptance conditions so a later specialist does not silently invalidate an earlier decision.

## Plan around uncertainty

| Uncertainty | Early slice that reduces it |
|---|---|
| Proportions or likeness | Blockout with matched camera, scale anchor and silhouette comparison |
| Target art style | Representative form/material study at intended resolution, before detailed production |
| Deformation | Low-detail mesh and actual extreme poses before sculpt detail and texture work |
| Modular environment | A straight segment, corner and junction assembled together, with clearance proxies |
| Material portability | One representative exported material, imported into the actual target when available |
| Procedural cost | Bounded seed/density sample, evaluated/exported counts and target-camera views |
| Animation delivery | One short representative clip with root policy and fresh-process reimport comparison |

Avoid a universal triangle or texture budget. Derive provisional limits from role, screen coverage, simultaneous instance count, hardware and project measurements, and label the assumptions. Do not label material-slot counts as draw calls or file size as GPU memory.

## Production sequence and checkpoints

Establish source ownership, scene units, the art contract and output locations. Build large forms and the uncertain slice first. Capture a baseline image and relevant measurements. Continue through secondary geometry, topology/UVs, surfaces and optional deformation in the order justified by the asset; a high-to-low bake and a trim-sheet prop have different dependencies.

Checkpoint when a change is difficult to reconstruct or when a downstream artifact depends on it. Record source identity, geometry/UV/rig/material revision and key settings. A UV edit invalidates dependent bakes; a bind-pose change invalidates deformation/retargeting evidence; an exporter/material conversion can invalidate appearance even if the authoring render is unchanged.

Keep live controls, simulation sources and high-detail originals separate from delivery conversions. Bake/apply only what the target cannot reproduce, onto an owned copy. Explicitly identify the export collection and resources so staging cameras, diagnostic geometry and unrelated assets do not leak into delivery.

## Acceptance and correction ownership

Technical validation compares actual measurements with the declared contract. Visual review opens current images and inspects the asset in its intended use. Engine acceptance imports and exercises the final output in the declared engine. Report unavailable steps separately instead of deriving all three outcomes from one successful script.

Assign repairs to the responsible discipline. Fix primary silhouette/proportion and broken behavior before cosmetic detail, but use the project's priorities when a visible defect is an intentional tradeoff. Preserve a matched before/after view and retest affected interfaces. A read-only reviewer supplies findings; the maker performs changes and accurately records the review.

Stop when required checks have passed or an explicit limitation prevents completion. State the unresolved input, tool or conflicting contract and the remaining deliverable. Do not hide an unresolved failure behind optional polishing, fabricate a completed artifact or repeat an unproductive loop to satisfy an arbitrary iteration quota.

## Delivery record

Provide the source/export/resource inventory, actual versions and relevant settings, measured contract results, viewed images/frames, resolved and remaining findings, and untested engine behavior. For a continuing project, retain the small set of decisions needed to resume: owned IDs, current source revision, selected style, cache/bake dependencies, output paths and the next unverified gate.
