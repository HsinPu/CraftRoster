# Rig construction and deformation correction

## Contract and skeleton

Inventory topology, shape keys, weights/actions, units, rest pose, axes and target skeleton contract. Discover installed Rigify/extensions without installing or enabling upstream tools by assumption. Preserve metarig, controls and original meshes. Apply transforms on prepared inputs before binding; an animated rig needs conversion/verification before transform cleanup.

Place edit-bone heads/tails at rotation centers with nonzero lengths. Metarig height fitting is only a start: fit each joint anatomically. Slight elbow/knee bend defines an IK plane. Keep bone roll consistent; local Y lies along the bone. Symmetrize only symmetric subjects and use established side names. Current bone collections replace legacy armature-layer recipes.

Separate deform bones from controls/mechanisms (`use_deform=False` on helpers). A pelvis beneath a dedicated root supports root motion when required; a root at world zero is a common game contract, not universal. Connected bones cannot translate freely. Use IK for contact and FK for arcs. Set target, pole target, chain length and pole angle, then test straight-limb singularities. Snap matching evaluated poses before an IK/FK switch and key the switch; unmatched chains pop.

Rigify generation requires selected active metarig and valid context. Keep metarig/generated rig ownership distinct. Regeneration may replace custom controls, so check supported preservation. Supply control map, reset/rest instructions, switches and supported joint ranges.

## Bind and weights

Heat weights are an initial estimate. Diagnose tiny scale/bones, overlapping parts, disconnected islands and invalid surfaces before retrying. A manifold voxel proxy can receive weights transferred with DATA_TRANSFER `VGROUP_WEIGHTS`, `POLYINTERP_NEAREST` and name mapping. Preserve original groups: proxies can bridge limbs and produce incorrect weights despite full coverage. Manual envelopes or one-bone rigid groups suit armor/mechanisms better.

Count only deform groups. Clean negligible weights (example threshold 0.001), limit to the actual target (often four mobile, sometimes eight desktop), normalize deform weights and recheck zero-weight vertices. Do not normalize pin/mask groups with bones or remove them as orphans. Smooth shoulder/clavicle/chest and pelvis/thigh transitions while retaining rigid pieces. Armature typically precedes subdivision; shape keys evaluate before modifiers. Preserve Volume may need matching target skinning or alternate correctives.

## Stress and repair

Create a separate diagnostic action without replacing the animator's current action, switches or pose. Test arms overhead/forward, elbows 120–140 degrees, wrist twist, hip flexion, crouch, spine twist and head turn within intended ranges. Capture front/side/three-quarter views, inspect joint volume, sliding and clothing contact. Missing controls mean untested poses. Restore action/slot/frame, pose matrices, custom properties and render settings afterward.

Candy-wrapper forearms need distributed twist or corrective deformation. Elbow collapse can need better topology/local falloff rather than broad smoothing. Sculpt pose correctives as proper residual deltas and use a calibrated bone-local driver; arbitrary Euler components across discontinuities are fragile. Retest combinations and the transition range. Normalized weights alone never prove deformation quality.

## Export duplicate and gates

Build a separate deform-only skeleton with required hierarchy/root and preserved rest matrices. Select nearest valid deform ancestors rather than retaining mechanism parents accidentally. Reassign copied mesh groups/modifiers, preserving production names. Follow controls through constraints until baking; compare sampled poses before muting replaced constraints. Generic bone names do not establish a Unity Humanoid Avatar, Unreal retarget chain or Roblox R15 compatibility: validate the actual destination template/importer.

Technical gates include finite matrices, nonzero bone lengths, required hierarchy, zero unweighted deform vertices, influence ceiling and normalized sums within contract. Visual gates require intended joints/contact to hold in stress images and continuous motion. Deliver metarig/control/export rigs, control guide, weights report, stress images, repairs and a baked test clip. Engine acceptance stays unverified until destination playback is inspected.
