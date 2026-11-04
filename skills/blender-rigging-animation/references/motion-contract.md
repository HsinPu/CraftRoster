# Deformation and clip contract

## Weight and pose acceptance
Inspect unweighted vertices, weight normalization, excessive influences under the target limit, accidental distant-bone influence and mirrored seams. Choose limits from the actual engine and platform instead of always imposing four influences. Pose the range the task needs: shoulders raised, crouch, neck turn, jaw motion or mechanical travel limits. Judge volume, collision with clothing and readable silhouette from meaningful views. Save sampled frames on the exact reviewed revision.

## Contacts and motion
For locomotion, match foot-plant intervals with root/engine movement and check a complete repeat. For attacks, align anticipation, contact and recovery with the gameplay timing contract. Mechanical pivots must remain physically located while constraints are baked. Root motion and in-place are different deliverables; document displacement and orientation over the clip, not just an action name.

## Actions and export
Query the current API rather than assuming legacy action.fcurves exists. Confirm which action slots, NLA strips or active actions the exporter actually includes; do not require all clips to use one NLA pattern. Check unintended clips and animated transforms as well as missing ones. Record FPS, inclusive frame range, duration convention and supported interpolation. Compare source and imported skeletal pose at representative frames.

## Regression
A topology or rest-pose change can invalidate skinning and old animation. Re-test existing clips when those contracts change. Preserve shape keys and sockets required by other consumers. Runtime animation-state transitions remain unverified until exercised in the target engine.

## Build a bounded rig-to-clip slice

1. **Lock the contract.** Record the rest pose, axis and unit convention, deform-bone hierarchy, attachments, permitted root movement, needed joint range and clip event times. Determine whether the asset is rigid mechanical, skinned, morph-driven or a combination. Preserve an existing skeleton that another animation library consumes.
2. **Test one uncertain joint.** Before rigging the whole character, place a local chain at the actual joint centers, set consistent bone roll and inspect the planned rotation axes. Use a simple control/deform separation when needed. For a door or mechanism, rigid parenting and a correctly located pivot may be sufficient; adding weights is not inherently better.
3. **Bind and inspect.** Associate the intended armature and mesh, then inspect vertex groups against actual deform bones. Automatic weights can fail or produce plausible neutral geometry with bad motion. Check nonzero totals, required normalization and target influence constraints, and inspect joints with deliberate bend/twist poses.
4. **Repair the cause.** If a shoulder collapses, compare weight distribution, bone placement, topology and deformation method before smoothing indiscriminately. If a mechanical panel stretches, remove unintended blended influence or use rigid binding. Repeat adjacent poses so a single-pose repair does not introduce a different collapse.
5. **Block the clip.** Establish contact, anticipation, main action and recovery with readable keys. Record FPS and whether endpoint frames duplicate the loop pose. For a linear loop with a duplicate endpoint, duration commonly uses `(last-first)/FPS`; a sampled frame-sequence delivery may define duration differently. Store the chosen convention instead of silently changing it.
6. **Refine temporal behavior.** Inspect interpolation, overshoot and holds. Play or render enough sequential frames to reveal sliding and hitches; endpoint images alone are insufficient. Sample root, feet/hands and relevant orientation through the clip, including the wrap transition.
7. **Prepare delivery motion.** Duplicate the export rig if controls/constraints must bake. Sample the agreed range and rate, preserve required deform hierarchy and sockets, and verify that the exporter actually includes the intended action slots or strips. Keep the source control rig editable.
8. **Roundtrip and compare.** Reimport into a fresh process and inspect mapped rest transforms, representative posed points, clip timing and root displacement. Compare a motion sequence rather than only action names. Keep unavailable target-controller behavior explicitly untested.

## Loop and contact diagnostics

For a loop, compare the final-to-first transform in the intended coordinate frame. Root-travel clips can intentionally accumulate translation, so compare against the expected cycle displacement rather than demanding a zero offset. Use quaternion orientation difference with sign-equivalent quaternions handled correctly; raw component subtraction can create a false discontinuity.

Inspect first and last interval linear velocities and signed angular motion as well as pose. Equal speed magnitudes can conceal a reversal, and an orientation-only check can miss a translational jump. Check contact intervals against both local foot movement and intended root/controller travel. A walk cycle that looks fixed in place may slide when the root moves at a different speed.

Record collisions against visible clothing/props and loss of volume at the most demanding poses. A still render can confirm a particular pose only. If the available runtime cannot play the sequence, report that evidence gap instead of converting sampled transforms into a visual claim.

## Failure isolation

| Symptom | Likely investigation | Smallest justified repair |
|---|---|---|
| Mesh jumps when binding | Rest transforms, existing modifiers and parenting | Restore intended bind relationship on a copy before repainting weights |
| Mirrored limb twists oppositely | Bone roll and local-axis conventions | Correct the affected chain and retest constraints/old clips |
| Volume collapses at an elbow | Bone position, local weights and joint loops | Repair that bend region and compare extension plus compression |
| Loop pops despite equal end poses | Velocity, constraint evaluation and duplicate-frame timing | Adjust transition tangents/contact and rerender a repeated cycle |
| Export loses a clip | Action-slot/NLA selection, range and exporter mode | Correct explicit clip inclusion and validate the new artifact |
| Exported pose differs | Constraint bake, scale/bind or unsupported deformation | Compare sampled source/export transforms to isolate the first mismatch |
| Facial keys exist but no expression appears | Actual vertex deltas, active weights and export morphs | Build or repair the target shape and test combined expressions |

Deliver the source rig, changed binding/weight regions, clip table, root/event policy, pose/sequence evidence and exact roundtrip outcome. Do not replace missing runtime evidence with a statement that the skeleton has been created successfully.
