# Look development review and correction loop

## Define appearance acceptance

Record approved references, palette/material roles, silhouette, intended emotion, target engine/renderer, camera and viewing distance. Preserve established stylization and project color pipeline. Separate neutral diagnostic, intended beauty and actual gameplay views. Capture the current revision before editing; keep original world/material links and animation so changes are reversible.

## Build controlled diagnostic views

Use a neutral grey backdrop and broad key/fill with enough contrast to reveal shape. Add grey/chrome calibration objects only when useful. Create cameras/light rigs in an owned collection; inspect existing data users before changing shared materials/worlds. Frame evaluated bounds with actual aspect/pixel aspect and safe margin. A turntable should orbit the camera when asset transforms/actions must remain unchanged. Declare whether lights stay world-fixed or follow the camera: the former sweeps reflections, the latter holds lighting relative to view.

Record engine/device, samples, resolution, projection/lens, view transform, look, exposure, frame and source revision. AgX, Khronos PBR Neutral and Standard serve different output goals; Neutral does not mean raw albedo equals display pixels in every condition. Keep color settings fixed for comparisons. Render a sharp view without DOF/blur first so small defects remain visible.

## Iterate by visible impact

Match camera and primary silhouette/value groups before material microdetail. A grey/clay override can expose form but must not replace the original material data. Inspect critical negative spaces and gameplay thumbnail size. If geometry/proportions are wrong, record and route the correction to geometry rather than disguising it with a dark rim.

Assign clear material roles: painted dielectric, bare conductor, rubber, glass and fabric should differ through plausible response or intentional stylized treatment. Tune scale of roughness/noise against object dimensions and camera distance. Uniform roughness is legitimate for a deliberately clean material; do not add arbitrary noise to every surface. Rust/dirt must follow physical/art-directed causes. Read blender-pbr-materials for wiring and blender-texturing for authored masks.

For reflective objects shape environment highlights and gradients, not just brightness. Rotate a neutral light/environment to expose seams or bad normals hidden under a beauty highlight. Check at least one alternate illumination when portability matters. For emissive accents inspect exposure and shared animation: changing one multi-user material can blow out structural surfaces. Duplicate scoped material data where independent changes are required.

## Record findings and repair

Each pass has a ranked gap list: location/view, visible symptom, likely cause, chosen change and acceptance comparison. Change the dominant cause, then rerender matched views. Examples: hero blends into ground → separate large values/light direction; metal reads plastic → check metallic mask/roughness/reflection environment; bevel disappears → inspect actual width/normals/screen size; noise obscures form → reduce frequency/amplitude rather than sharpen the entire image.

Do not define success as a fixed number of iterations. Stop when agreed gates pass, a documented dependency blocks, or the remaining gap needs a changed brief/budget. Ask only about material creative decisions that cannot be inferred; continue authorized technical repairs. A read-only reviewer can inspect and return findings, while an authorized writer applies changes, renders and saves evidence.

## Presentation and delivery

Add DOF, motion blur, glare and grade only if they serve the brief, retaining diagnostic views. For an orbit key a full turn at N+1 and render 1..N; inspect two loops and avoid a repeated endpoint pause. Protect the source object's transforms/actions. A cyc/backdrop can reflect into the asset, so note it as part of the look rig rather than a neutral absence.

Deliver editable rig/material changes, settings, matched before/after and gameplay views, prioritized findings/repairs, unverified gaps and revision-bound evidence. Technical texture/geometry checks, actual visual judgment and target-engine appearance remain independent. Reimport and engine lighting/material tests are required before claiming engine parity; a pleasing Cycles render cannot establish it.
