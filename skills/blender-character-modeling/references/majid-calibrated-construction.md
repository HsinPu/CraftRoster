# Calibrated face, hands and layered character construction

Use these branches when the reference or camera actually requires this detail. They adapt Majid's category recipes into bounded construction and recheck steps. A supplied design determines proportion and style; familiar human averages, source millimeter tolerances and arbitrary primitive counts are not acceptance rules.

## Fit a face to supported views

1. Keep original front/profile images, crops and explicit landmark records. Establish a common physical scale, pupil height, facial midline and ground/head window. If views are perspective, solve/declare camera uncertainty before treating their pixels as coordinates.
2. Select stable points: chin, crown, brow, pupil centers, nose tip/base, lip corners, jaw angle and ear attachment. Use additional landmarks only when they constrain a visible feature. Record which image supports each point; an occluded ear is inferred.
3. Fit skull/cheek/jaw masses to front outline and profile midline. Place eye spheres from pupil spacing/depth evidence, wrap eyelids with actual thickness, and join mouth loops into cheek/jaw topology. Preserve the approved exaggeration instead of averaging it toward realism.
4. Render through both calibrated cameras and a diagnostic three-quarter. Store residuals in pixels or declared world units with uncertainty. If front and side disagree, identify authoritative evidence or a bounded compromise; do not flatten the skull to chase one silhouette score.
5. Test closed blink, mouth closure and required jaw/expression range before pores and skin microdetail. Landmark agreement cannot prove expression topology or hidden depth.

For projected skin color, de-light the reference only when a defensible process exists. Use rest-pose UV correspondence, project front/profile images through their recorded cameras and blend with explicit masks/normal-facing weights. Check nose/ear seams and mirrored far-side assumptions. Painted brows/lashes retained in color plus new geometry create duplicate features; choose which representation owns them. A source photo's highlights/shadows cannot be assumed base color. Retain original images and reversible projection materials.

## Smooth analytic forms without adding a bulge

When section widths/depths define a head or body, linear interpolation can create visible bands. Fit a smooth interpolant while preserving measured extrema and monotonic regions; compare silhouettes before accepting it. Blending two descriptions of the same surface by positional weights can preserve their intended section. A smooth union instead adds mass near overlap. Test neutral grazing light and front/profile contours so a smoother shader does not conceal changed geometry.

## Build each hand in a handed local frame

Record wrist center, palm normal, finger direction and thumb side. Construct palm/fingers in that frame with joint centers and separate thumb base articulation. For the opposite hand, reflect the intended frame and anatomy, then correct winding/transform handedness on the owned geometry; a rotated duplicate can put the thumb behind or reverse finger order. Avoid leaving a negative-scale hierarchy for export.

Pose a relaxed hand beside the thigh and a real grip around the intended prop. Check thumb side, finger order, wrist rotation, fingertip spacing and joint compression. Fingerless gloves end around the intended exposed-finger boundary with thickness and supporting topology; test curled fingers/fist for holes rather than accepting a neutral open-hand render. Fine finger detail is unnecessary when the actual game camera never resolves it, but the grip silhouette may still matter.

## Neck and layered armor: measured clearance

Preserve a complete body/head in the source. Assign one visible surface owner at a head/body neck join: a small controlled overlap may be appropriate, but its amount depends on scale, motion and rendering. Match skin mapping/material across the join, inspect front/side/back and head turns, and reject a visible step or doubled shell. Do not use a universal 1–2 mm overlap without a camera/pose check.

Build garment layers outward in assembly order: body → inner garment → outer garment → belt/straps → collar/gorget → shoulder plates/cape. Give sleeves real openings and enough circumference for the intended pose. For a cylindrical limb region, sample garment surface along rays about a declared limb frame, place the armor outline in `(angle,height)`, and offset by intended clearance. Reject rays with no hit or an ambiguous wrong-layer hit; preserve the sampled target/object identity. This technique fits a local region, not every folded surface.

Check clearance in the neutral and extreme poses using mesh/BVH candidates and actual close-up renders. BVH candidates alone are not exhaustive penetration proof; nested shells and thin contacts can require targeted distance/containment checks. A shoulder plate can be rigid to one bone while cloth remains deforming. Fix assembly space, joint placement or topology before attempting to hide clipping by smoothing weights. Make covered-body cuts only on an owned delivery variant after all supported outfits/poses are checked.

## Hair near collars and armor

Choose strand master, groom pipeline, cards or mesh clumps according to the real consumer. Long back hair may need an envelope outside pauldrons; face-framing short locks need a narrower neck/head envelope. Reusing the broad shoulder collider for both can push short locks sideways. Test head rotation and shoulder lift with each hair class and visible garment together.

Inspect a sparse lock against a dark background and through backlight as well as the dense mass. A strand shader's transmission can make a sparse lock appear much lighter than its color setting suggests. Diagnose lighting, shader output and density separately; a fixed 15% shader mix from the source is not a general repair. EEVEE and Cycles hair support differ, and a Blender strand result does not establish game-card appearance. Hand off atlas/alpha/mip/overdraw and motion-cache acceptance to the installed groom/target workflow when needed.

Deliver calibrated views/landmarks, measured residuals and inferences, editable layer sources, hand/grip/neck/armor/hair stress images and exact final revision. Keep artistic likeness, technical topology and actual engine behavior as separate outcomes.
