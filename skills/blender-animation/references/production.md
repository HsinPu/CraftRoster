# Animation production and repair

## Clip contract and blocking

Record clip names, effective FPS (`render.fps / fps_base`), inclusive authoring range, event/contact frames, root-motion policy and target interpolation. Choose duration from movement speed and reference. A 30 FPS walk block can use contacts at 1/13/25, down at 4/16, passing at 7/19, up at 10/22; adapt stride and style. Frame 25 duplicates frame 1 for a 24-interval cycle. State whether that endpoint is retained or dropped; importers do not universally discard it.

Create an owned action per deliverable clip. Key required controls on authoring rigs and use a consistent rotation mode for export bones. `pb.rotation_mode='QUATERNION'` and `pb.keyframe_insert('rotation_quaternion', frame=f)` provide a high-level path. Evaluate `scene.frame_set(f)` before setting matrices and inserting keys. Maintain quaternion sign continuity: negate q when `q.dot(previous)<0`. Use stepped blocking, then Bezier for authored easing, linear for sampled motion/constant speed, Constant for deliberate cuts. Do not ban linear organic mocap.

## Actions, slots and NLA

Blender 5 actions can hold multiple animated IDs. Assign `ob.animation_data.action`, then its matching `action_slot`; an action name alone does not identify channels. Keyframe insertion can create suitable slots automatically. To edit curves, use `bpy_extras.anim_utils.action_get_channelbag_for_slot(action, slot)` or `action_ensure_channelbag_for_slot`; inspect layers/strips/channelbags instead of assuming legacy `action.fcurves`. Preserve deliverable actions with real users, fake users or appropriate asset ownership.

NLA strips specify slot, action source range, scene range, repeat, scale, influence and blend mode. Use REPLACE for isolated clips; ADD/COMBINE requires a defined reference pose. An active action plus pushed-down strip can double motion. Isolate each clip before export/measurement. NLA strips are not universally mandatory: choose the installed exporter's action/NLA mode and verify its resulting clip inventory.

## Locomotion, combat and mechanisms

Mark stance intervals and measure foot world displacement during them. In-place clips keep root travel fixed while body motion agrees with intended ground speed. Root-motion clips put travel/yaw on a dedicated root and retain pelvis bob. For combat record anticipation, strike/contact, follow-through, recovery and gameplay event windows; no universal percentage defines a cancel window. Check weapon arcs and impact silhouettes from gameplay camera. Mechanical motion uses real hinge pivots, Limit Rotation/Location, gear drivers (`-teethA/teethB`) and piston targets. Bake evaluated movement when constraints are unsupported downstream.

## Retarget and bake

Preserve source rest pose, scale, object matrices and action. Supply target-to-source bone mapping and report missing/ambiguous bones. Auto-name matching only proposes candidates. Convert source world rotation changes relative to calibrated rest into target rest orientations, processing parents first. Different A/T poses require calibration. A hip-height ratio alone is insufficient for arbitrary translated, rotated or nonuniformly scaled rigs; derive scale from measured anatomy in a shared coordinate system. Correct contacts after retargeting.

Bake to a separate export skeleton or duplicate. Sample evaluated constrained poses per required frame, convert to target local transforms and write keys. Compare samples before muting only the constraints replaced by the bake. Preserve the authoring rig and do not clear all constraints during self-bake. Include yaw in root extraction when required. Key reduction must stay below angular/positional tolerances at contacts and intermediate frames.

## Review, correction and delivery

Evaluate first/second/penultimate/duplicate endpoint and repeated two-cycle playback. Measure each deform bone's position and rotation seam plus signed linear/angular velocity across it. Equal angular-speed magnitudes miss reversed movement and translational hitches. Human-scale preview tolerances might be 1 mm and 0.5 degrees, adjusted by contract. For root motion remove the declared accumulated root transform, not all translation. Matching endpoints without tangents still hitches. Repair affected keys/tangents and contacts, then repeat measurements/playback.

Deliver editable actions, slot/rig associations, range/FPS, root policy, baked duplicate, contact/seam findings, playblast and export clip inventory. Reimport to a clean file and compare representative bone matrices; test event timing and root travel in the engine. A smooth Blender loop cannot prove a state-machine transition.
