# Reconstructing a referenced asset

Use this playbook when a supplied image constrains the asset's shape or presentation. Keep the original reference, an editable reconstruction and the comparison conditions distinct. A photo is evidence of one projected view, not a complete measurement of the hidden object.

## Establish what the reference can prove

1. Inspect the full image before cropping. Note the subject boundary, occlusion, contact plane, horizon, symmetry, likely lens distortion and whether the artwork contains inconsistent perspective. Record the authoritative view when several drawings disagree.
2. Pick stable landmarks: bounding corners, joint centers, wheel centers, openings and major intersections. Record their pixel coordinates or normalized positions in the original image. Avoid soft shadow edges and highlights as geometric landmarks.
3. Separate dimensions supplied by the user, inferred dimensions and purely relative ratios. Use the known dimension to establish world scale. A mannequin or familiar object supplies an estimate with uncertainty, not a measured guarantee.
4. Record shape, surface and presentation requirements separately. A pale photographed surface may be bright illumination rather than white base color; a dark recess may be a shadow rather than black paint. Keep those hypotheses open until a neutral-light test.
5. For an existing asset, inventory the current object hierarchy, mesh sharing, modifiers, rig and consumers. Make a scoped revision copy. Preserve the working rig, names and material relationships unless their replacement is necessary for the requested change.

## Solve camera before fine shape

For an orthographic drawing, set the camera perpendicular to the measured plane, match the ground line and preserve a fixed world window. With a square render of height `H` pixels and an orthographic vertical extent `S`, one vertical pixel spans `S/H` world units in that camera plane. Account for render aspect, pixel aspect and camera sensor fit for nonsquare views; verify with a known-length calibration object instead of assuming both axes share that scale.

For a photograph, start with a simple bounding box and a ground plane. Match visible face proportions, vanishing directions and object fill through camera position, target and projection. Adjust one variable at a time. Focal length and camera distance are coupled: a longer lens with changed distance can preserve framing while changing depth compression. Do not distort the mesh to compensate for a plainly incompatible viewpoint.

Keep two cameras: the reference comparison and a diagnostic three-quarter or orthographic view. A mesh that matches one view through flattening may fail the second view or its physical dimensions. For stylized concepts with inconsistent perspective, choose an explicit compromise and identify the unmatched feature. Do not claim a unique reconstruction from one image.

## Build in inspectable stages

**Masses.** Model only the main volumes and negative spaces. Store width/height/depth ratios and meaningful attachment coordinates. Render clay or silhouette against a high-contrast background. Compare the reference landmarks before bevels or textures can hide the error.

**Construction.** Add structural separations: joints, panels, supports, folds or anatomical transitions according to the object. Use real depth where it affects parallax or silhouette; reserve texture-only marks for surfaces that remain convincing from the intended camera. A boxy concept does not need gratuitous chamfers merely to look more detailed.

**Identity.** Add the visible feature that distinguishes the asset: a handle's opening, a crest, a vehicle nose, a distinctive window ratio. Check its visibility at actual gameplay size. Do not spend the detail budget on repeated tiny parts before this feature reads.

**Surface and light.** Establish broad material roles under neutral light, then match the reference light direction, shadow softness and presentation. Copy a shared material only when the requested variation should be local; isolated emission animation must not affect unrelated surfaces. Keep final grading from disguising unresolved geometry.

## Compare without hiding the error

Use identical frame size, camera, pose, exposure and view transform for each revision. Save the uncropped render as well as any aligned comparison. If registration, cropping or silhouette normalization was used, record it and state which errors that operation removes.

- Silhouette intersection-over-union can locate projected mass disagreement after a documented alignment. It does not measure physical scale, unseen topology, material quality or whether a usable three-dimensional asset exists.
- Landmark residuals should name the reference point, candidate point and normalization. Comparing distances as a fraction of subject width helps across resolutions; absolute world measurements remain separate.
- A difference image confounds geometry, shadows, tone mapping and background. Diagnose on clay first, then material and intended-light views, rather than chasing every pixel with geometry changes.
- Compare at target size and a useful close-up. A subpixel bevel improvement is not a meaningful gameplay improvement if it increases cost without changing the delivered read.

Keep a short revision record: observation, likely cause, changed parameter/object, expected effect and actual re-render outcome. Fix framing or large proportions before color accents. Recheck the other views after each shape correction so a one-view improvement does not create a worse asset elsewhere.

## When the match stalls

| Observation | Investigation | Bounded repair |
|---|---|---|
| Correct width but inconsistent near/far sizes | Perspective/camera position versus taper | Refit the box and camera before changing both ends |
| Front matches but side is implausibly thin | Missing depth evidence or overfit silhouette | Restore plausible construction and mark inferred depth |
| Good clay silhouette, wrong beauty result | Lighting, material values or view transform | Compare neutral surface roles before remodeling |
| Details disappear in game view | Projected size and contrast | Enlarge a defining feature or simplify competing detail |
| Numeric score rises while resemblance worsens | Registration/background bias | Inspect actual side-by-side images and relevant landmarks |
| All views demand incompatible geometry | Inconsistent reference authority | Record the conflict and use the chosen view/use-case priority |

Deliver the master, reference mapping, actual comparison images, dimensions, unresolved inferences and the final revision's check results. If the target export changes shape or shading, repeat the relevant comparison on the decoded artifact. Reference matching is complete only to the agreed evidence and scope, not to an arbitrary universal similarity score.
