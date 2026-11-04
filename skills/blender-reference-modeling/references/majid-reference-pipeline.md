# Calibrated sheets and a reference-led production slice

This writer workflow adapts Majid's image-to-3D entry, calibration, category and acceptance resources. Use the existing asset contract and actual permissions. A review-only caller returns findings; it does not crop images, initialize scenes or run this build sequence.

## Split a sheet without inventing scale

Inspect the full supplied image first. Retain its original bytes and record the image hash. Label each panel as orthographic, estimated perspective, detail callout or uncertain. A painted three-quarter view can guide identity and material arrangement without overriding a better-supported metric front view.

For each metric panel, record these fields before changing geometry:

| Field | Example and interpretation |
|---|---|
| Source and panel | `ranger-sheet.png`, SHA-256, pixel box `[120,80,520,880]`; coordinates are half-open in the original image |
| Crop and matte | `ref/front.png`, `ref/front-mask.png`, their hashes; matte removes labels/rulers/floor/shadows deliberately |
| Projection and authority | Cardinal orthographic front; authoritative height/width; side depth remains uncertain |
| Pixel landmarks | Sole row 740, crown row 60, midline column 200 in this crop; name each measured joint/part point |
| World anchor | Crown-to-sole height 1.70 m supplied by user; `1.70/(740-60)=0.0025 m/px` |
| Window | Width 400 gives 1.0 m; height 800 gives 2.0 m; left `-200*0.0025=-0.5 m`, bottom `(740-800)*0.0025=-0.15 m` |
| Uncertainty | Soft crown boundary ±2 px; occluded heel inferred; source side view uses a different crop |
| Consumer | Current blockout render hash, source revision, camera/pose and agreed tolerances |

Do not reuse a crop's axis/ground pixel values after resizing or padding. Under a uniform scale `s` and added left/top padding `(px,py)`, transform a point as `(s*x+px,s*y+py)` and divide metres-per-pixel by `s`. If different views were independently resized, calibrate each from a shared physical landmark; equal image height alone does not establish equal world scale.

Conflicting front/back capes need a decision: designate one silhouette authoritative, record the other view's mismatch and its uncertainty, and preserve that deviation through handover. Do not pursue incompatible scores indefinitely. For a photo, fit lens, distance, target, orientation and distortion on a simple box first; record uncertainty instead of applying an orthographic world gate.

## Initialize an owned calibration scene

Use an isolated process for a new asset, or an explicitly owned scene revision. Never call factory reset in an unrelated live session. Preserve the original master and existing project units. A new metric asset can choose metres, Z up and a documented facing axis, but a preexisting consumer may require another convention.

Create a reference collection containing the source image displays, a known-length ruler, a gameplay cell, clearance proxy and intended game camera. Keep render meshes, high sources, controls, deform rig, sockets and colliders separately identified; these are semantic roles, not mandatory collection names. An image empty is a viewport display, not a rendered image plane. For a rendered overlay, composite the saved matte or use a deliberate reference-plane material in a diagnostic copy.

For a **square-pixel front orthographic** crop of width `W`, height `H`, scale `S` metres per pixel, axis column `A` and ground row `G`, the window center is `((W/2-A)*S, (G-H/2)*S)` in horizontal/world-Z coordinates. Set horizontal sensor fit, orthographic width `W*S` and render aspect `W/H`; verify the result with a known-length marker. For back/side views, map the image-right direction explicitly. Do not transfer a front axis sign by guess. Nonsquare pixels require the declared horizontal/vertical sampling and an actual calibration marker check.

Upstream's `height/(subject_frac-ground_frac)` is ambiguous because its help calls subject_frac the occupied subject fraction. Use explicit crown/sole rows and scale instead. Reject nonpositive dimensions, nonfinite numbers and inconsistent landmarks; denominator clamping cannot repair bad calibration. A visual capsule made from overlapping spheres/cylinder is only a scale guide, not a validated closed physics collider.

## Run one complete uncertain asset before multiplying it

1. **Masses:** record 8–15 relevant ratios only when they help this asset: shoulder width, wheelbase, opening height, major negative spaces. Put joint/pivot guides and independent appendages in place before detailing. Render clay, silhouette and intended gameplay views.
2. **Forms:** correct the largest supported discrepancy, then add construction overlaps and secondary forms. Rerender the same calibrated camera and a diagnostic side/three-quarter. Keep unseen depth marked inferred. Detail does not resolve wrong framing or proportions.
3. **Delivery surface:** build deformation/rigid topology appropriate to the requested motion. Preserve the high source. Lock final triangulation/tangents for baking, compare LOD outlines and check material/UV roles with the relevant specialist.
4. **Motion and export:** only when requested, follow the rig, bake and semantic roundtrip branches. Capture the imported representation under matching conditions if conversion changes appearance.

Use [mask diagnostics](majid-mask-comparison.md) for reproducible silhouette measurements. Set tolerances from this brief; source IoU thresholds are examples, not universal acceptance. A writer captures current images and corrects authorized scope; the read-only visual reviewer examines those images and returns findings. Archive the brief, calibration ledger, original/cropped/matte identities, phase observations, inferences and current source/export evidence. For a multi-asset family, complete one representative of each uncertain category before reusing its scale/rig/material/export rules; proportions and motions still belong to each asset.
