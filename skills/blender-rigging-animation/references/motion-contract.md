# Deformation and clip contract

## Weight and pose acceptance
Inspect unweighted vertices, weight normalization, excessive influences under the target limit, accidental distant-bone influence and mirrored seams. Choose limits from the actual engine and platform instead of always imposing four influences. Pose the range the task needs: shoulders raised, crouch, neck turn, jaw motion or mechanical travel limits. Judge volume, collision with clothing and readable silhouette from meaningful views. Save sampled frames on the exact reviewed revision.

## Contacts and motion
For locomotion, match foot-plant intervals with root/engine movement and check a complete repeat. For attacks, align anticipation, contact and recovery with the gameplay timing contract. Mechanical pivots must remain physically located while constraints are baked. Root motion and in-place are different deliverables; document displacement and orientation over the clip, not just an action name.

## Actions and export
Query the current API rather than assuming legacy action.fcurves exists. Confirm which action slots, NLA strips or active actions the exporter actually includes; do not require all clips to use one NLA pattern. Check unintended clips and animated transforms as well as missing ones. Record FPS, inclusive frame range, duration convention and supported interpolation. Compare source and imported skeletal pose at representative frames.

## Regression
A topology or rest-pose change can invalidate skinning and old animation. Re-test existing clips when those contracts change. Preserve shape keys and sockets required by other consumers. Runtime animation-state transitions remain unverified until exercised in the target engine.
