# Production recipes and decision gates

## Select a bounded branch

Start with deliverable, existing source, reference, dimensions, camera, target/importer, style and evidence requirements. Choose the shortest branch that can satisfy them. A complete asset task may require several disciplines, but does not require installing every companion. Existing project conventions override sample budgets and materials. Read foundation ownership/execution and preserve editable masters before deriving export copies.

Each gate is a specific assertion about the current revision. Failed dimensions return to blockout; bake seams return to UV/cage/normal work; collapsed elbows return to topology/weights; engine material failures return to conversion/import. Do not compensate for an earlier defect by adding later detail. Use named checkpoints and current images so rework invalidates affected approvals rather than the entire history.

## 1. Direct game prop, without a high-to-low bake

Use when the target detail and budget permit modeled forms with tiling/trim or direct textures. Establish silhouette, real dimensions and pivot first. Choose bevel/boolean strategy and inspect a repeated/stacked instance if modular. UV timing depends on modifier behavior: early UV can suit a stable base mesh, but topology-changing operations need a post-modifier UV check. Do not mandate UV-before-bevel for every stack.

Build secondary forms, normals and material families; inspect wireframe and neutral/intended light at the gameplay camera. Measure evaluated triangle/material/texture costs against supplied budgets. Add LOD/collision only when required. Export a controlled object set and compare clean reimport dimensions, orientation and surfaces, then run the declared target import. Deliver master, derived file, textures, pivot/scale notes and current evidence.

## 2. Hero prop, high-to-low baking

Keep high and low sources distinct and preserve their common coordinate space. Make low geometry follow silhouette and visible plane changes; decimation is a candidate method, not automatic hero retopology. Unwrap and inspect density/padding at actual output resolution. Validate cage/ray distances with a small bake and inspect opposing normals, thin surfaces and separate nearby parts.

Bake only requested maps into explicit destinations and verify color/data handling and tangent convention. Inspect the low mesh with its maps under raking and intended lighting; compare it with high source at matching framing. Seams, waviness and projection contamination need targeted UV/normal/cage fixes followed by rebake. Then take the same optimization/export gates as branch 1. A generated texture's existence does not demonstrate a good bake.

## 3. Character from sculpt, scan or generated source

First establish rights/provenance and actor dimensions; generated input is untrusted geometry, not a production-ready rig. Retain original color/high source. Plan deformation loops for required joints rather than accepting uniform retopology solely because counts fit. Bake source appearance after UV and check it before rigging.

Fit joints, build control/deformation separation where useful, bind and inspect shoulder/elbow/wrist/hip/knee stress poses. Weight normalization does not prove deformation. Clothing/hair are conditional branches: preserve body source, test collision/poke-through in the same poses and convert groom to target-supported representation when needed. Bake constraints/retargeted motion onto the export skeleton, list clips and frame ranges, check root motion and loop seams, then inspect imported deformation/playback. Deliver rig source, export skeleton, meshes/maps and clip contract, including unexecuted engine gates.

## 4. Roblox prop, accessory, clothing or avatar

Choose the actual Roblox product category first. A prop, rigid accessory, layered accessory and avatar body do not share identical skeleton/cage/attachment requirements. Obtain the current official template/specification for that category and record retrieval date. Do not reuse upstream numeric triangle/texture caps as universal current limits.

For a prop use the relevant mesh/material and Studio import gates. For a rigid accessory preserve the required attachment frame and inspect fit against the chosen avatar. For layered clothing retain official cage topology/UV correspondence and required rig binding; fit outer coverage without deleting template cage vertices. For an avatar body preserve required body part/attachment/cage organization from the current template and test requested body/face motion. The [official clothing specification](https://create.roblox.com/docs/art/accessories/clothing-specifications) and [Blender template description](https://create.roblox.com/docs/art/characters/creating/blender-configurations) were checked on 2026-11-04 for these category distinctions. Studio fitting/import validation is separate from a Blender render. Marketplace upload or publication requires its own authorization and is not part of asset completion by default.

## 5. Generated or downloaded asset cleanup

Inventory provenance, loose shells, hidden interiors, normals, UVs, external images, scale and actual visual defects before repair. Work on a duplicate; do not purge every disconnected part, since intended accessories may be separate. Set explicit cleanup tolerances relative to asset size. Repair manifoldness only where the contract needs a closed surface; cards and open sheets can be valid.

Simplify or retopologize when required, transfer appearance from preserved source, re-UV/rebake only affected regions and repeat silhouettes/material checks. Report what was lost or inferred, especially absent undersides. Stop claiming resemblance if aggressive repair changed key features without a matched comparison.

## 6. Procedural environment or modular kit

Set terrain dimensions, seed, instance source assets, density masks and assembly grid from the project. Place geology/architecture and scale camera before scatter. Test representative slope/height/border/clearance cases and repeated module joins. Keep instances if the chosen export/importer supports their intended representation; realize/bake only when needed on a derived copy.

Measure evaluated geometry and material/texture dependencies; source-mesh counts alone omit scatter cost. Capture intended camera, overhead density and border/underside views. Verify that imported placement and any instance representation survive. Procedural generation does not establish traversal, biome ecology or target performance.

## 7. Web or AR delivery

Identify the actual viewer/device, supported compression/extensions, material features, transparency and dimensional reference. Prefer a format the consumer really loads rather than prescribing one universal compressed GLB. A compressed file can be smaller but unsupported. Keep baseline and compressed derivatives and compare appearance, normals, animation and dimensions after loading in the intended viewer.

USDZ/AR and glTF/web are separate consumer paths; test anchoring/scale and required material behavior on the declared device when in scope. File size and validator pass are technical evidence, not proof of browser/device rendering. Do not claim all iOS AR behavior from a desktop import.

## 8. Product still or turntable

Use product dimensions, approved finish and camera intent. Diagnose floating parts, z-fighting, bevels and texture scale under neutral light before a studio rig. Capture a low-cost representative frame at final aspect ratio and inspect contact, reflections, highlights and label readability. Set turntable duration, axis, start/end policy and output sequence explicitly.

Inspect multiple angles and adjacent seam frames. A full frame sequence or encoder exit is not a judgment of stable focus/exposure or artifact-free output. Deliver editable studio setup, agreed still/sequence/video and settings. Preserve a clean version when compositing or display treatments are requested.

## 9. Mood, time and weather shot

Start from approved assets/camera and their baseline diagnostics. Choose a motivated time-of-day light structure before rain/snow/fog. Keep weather density, surface wetness/accumulation and lightning controls separate. Ground/roof contact and direction must explain accumulation; do not coat sheltered undersides uniformly.

Review dry/wet or clear/fog pairs and representative flash/extreme frames at delivery resolution. Make rain visible through appropriate light/background separation without hiding important silhouettes. Check animation seam and changing reflections before rendering the full range. A dramatic frame cannot validate weather dynamics, physical accumulation or a whole animation.

## Deliver and state evidence

Return requested editable sources, derived exports/renders, external dependencies, settings and actual check outcomes. Bind approval to current files, cameras and frames. Technical, actual visual and target-runtime acceptance remain separate. If a stage is unavailable, identify it and deliver feasible completed work without inventing a pass. The recipe is a production plan; installing it supplies no Blender runtime, paid generation service, target editor or publishing permission.
