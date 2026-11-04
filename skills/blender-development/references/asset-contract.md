# Asset contract

This is shared production guidance, not a requirement to run a router or change files during a review. Use the existing project brief and asset layout; add a compact asset brief when an authorized creation task lacks one.

## Record decisions that affect the result

| Area | Decision/evidence |
|---|---|
| Identity and scope | Asset ID, source file, revision, owned collections/objects, original files retained, allowed edits |
| Purpose | Playable prop, environment module, character or presentation asset; target engine/version and platform |
| Art direction | Reference images and their provenance, intended shape language, palette/material roles, mood, focal point and style limits |
| Physical contract | Units, world dimensions, orientation, pivot, attachment points and any inferred hidden surfaces |
| Runtime context | Gameplay camera and typical screen size, interactions, collision, rig/motion needs, performance budget and how it was chosen |
| Delivery | Required source/export/texture files, target import configuration, verification levels and known unavailable tools |

References are evidence of desired appearance, not authority to copy protected assets or claims about hidden geometry. Resolve conflicting views by recording their confidence and intended role. Do not silently force a photographic lens estimate, FBX preference, triangle budget, art style or material convention from an upstream example.

## Evidence belongs to a revision

Capture the saved source identity/hash, inspection settings, contract, camera/view, engine/color management, resolution and output paths with every review. Save a new revision after intentional refinements. Evidence is stale if the source, relevant contract, material/lighting, camera or requested delivery changed; repeat the affected checks on the final files.

The brief can be Markdown. Executable checks use an explicit JSON contract rather than trying to infer budgets from prose. When the optional `blender-asset-validation` package is installed, read its `references/helper-contract.md`. Without that package, record actual checks and their limitations directly; the shared brief remains usable on its own.

Keep three independent outcomes: **technical** (scoped correctness checks), **visual** (images examined against the brief), and **engine** (actual target import/playback). An unavailable or unexecuted check stays unverified. A complete Blender asset can be prepared for an engine without claiming the engine accepted it.
