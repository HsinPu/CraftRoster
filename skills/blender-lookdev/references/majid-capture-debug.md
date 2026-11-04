# Diagnostic capture and bounded appearance debugging

This is an authorized writer's capture procedure. The read-only visual-review workflow examines images and returns findings; it does not gain render, scene-write or report-write permission from this reference.

## Capture the intended scope and camera

Resolve explicit render objects, intended LOD and current source hash. Refuse a missing requested name/collection rather than falling back to the whole scene. Include all interacting visible costume/prop parts; keep high sources, alternate LODs, cutters and proxies excluded unless the diagnostic explicitly needs them. A viewport-hidden body can differ from a render-hidden body: record and inspect both when the user reviews in a live viewport.

Store camera world matrix, projection, lens/orthographic extent, sensor fit, render size/pixel aspect, clipping, exposure/view transform, frame and rig/action/slot identity. Azimuth/elevation/lens alone is not a complete reference camera: auto-fitting to each new object's bounds changes registration. Keep a calibrated comparison camera fixed across revisions and a separate diagnostic camera for shape.

For an action pose, select the intended armature and compatible action slot explicitly; a warning followed by a neutral render is not a successful extreme-pose check. Update evaluation before measuring/capture. Save each output to a new revision-specific path and record actual engine per image, especially after a renderer fallback. Process exit and fresh decoded image are separate checks.

| Capture | Purpose | Important limitation |
|---|---|---|
| Clay/silhouette | Large masses, outline and negative spaces | Auto-crop/normalized masks hide size and translation |
| Wire | Joint flow and surface density | Wire modifier geometry is diagnostic, not the shipped mesh |
| UV checker | Stretch/orientation/scale and seams | One screenshot cannot prove all UV overlap or padding |
| Neutral material | Surface roles, highlight width and normal response | A graph rendering in Cycles may not export |
| Fixed-camera moving light | Rough/metal/normal stability through illumination | Orbiting camera with fixed lights is a different test |
| Gameplay image/sequence | Readability, contacts and temporal stability | Frame resolution does not guarantee the subject occupies the requested pixel height; measure its actual projected mask |

Use a supported engine on the actual host. Workbench may require graphics/context support; a CPU Cycles route must be deliberately configured and recorded, not assumed from an upstream platform claim. Renderers can differ in hair/alpha/material behavior. A fallback is not identical evidence unless the comparison conditions remain suitable.

## Test one appearance hypothesis at a time

Suppose a leather strap looks gray against the reference. First capture a small representative border at unchanged geometry/exposure. Test (1) flat emission debug identity, (2) neutral base-color response, (3) specular/sheen/roughness, (4) edge-wear mask coverage and (5) lighting/view transform separately. Thin straps can be almost entirely covered by an overbroad wear mask. Raising albedo to compensate can damage every other lighting condition.

Sampling median reference/render sRGB in a matched region can quantify a displayed-color discrepancy, but it cannot isolate albedo from illumination, grading and reflection. Preserve source color and annotate lighting uncertainty. Standard versus AgX and a warm glossy environment are art choices; do not switch them mid-comparison merely to increase similarity. Recheck neutral and intended-light views after any change.

For sparse hair/transparent surfaces, inspect backlight and a dark background as well as the dense front view. Ensure the selected output is actually supported by the renderer; an EEVEE-specific branch can differ from Cycles. Keep alpha, normals and material rebuild changes reversible on a copy.

For a long sequence, write numbered fresh frames with source/camera/settings identity and a frame manifest. Resume only when an existing frame's hash and full input identity match the current run; file existence alone is insufficient. Encode with the project tool after required frames are validated. Review an actual sequence for flicker, contacts and loop behavior; a turntable frame count cannot establish temporal quality.

Deliver current images/sequence and recorded conditions to the reviewer. An authorized writer may archive the returned findings and implement bounded repairs, then capture fresh evidence. Close findings only on their stated recheck, keeping technical, visual and engine results distinct.
