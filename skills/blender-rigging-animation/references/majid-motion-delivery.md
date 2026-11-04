# Rig-family, socket, event and secondary-motion slice

Use the existing deformation/clip contract. This adapts Majid's rig-family and gameplay handoff detail; it does not impose new skeleton names, a world-zero root or four influences on every target. Preserve a compatible existing rig and separate editable controls from evaluated deform delivery.

## Choose stress poses by family

| Family | Guides and binding | Required stress subset when used |
|---|---|---|
| Humanoid/heavy biped | Root/pelvis/spine, clavicle, limb and twist axes; armor rigid versus flesh blended | Arms overhead/forward/crossed, crouch/stride, elbow/wrist twist, real two-hand grip and torso turn |
| Quadruped | Ribcage/pelvis, scapula, shoulder/elbow/carpus, hip/stifle/hock, tail | Full stride, compression/pounce, rear, head turn, bite gape and tail curl |
| Winged | Wing root/arm/digits or chosen feather structure, membrane support | Fold/spread/downstroke and bank, with leg/cape clearance |
| Serpentine or many limbs | Section spacing, branch hierarchy, contact roles | Tightest intended curl and opposing adjacent contacts; no inverted sections |
| Wheeled/tracked | Body, steering parent, spin axle, suspension and doors | Full steering lock, compression/rebound, hinge limits; track closure through intended movement |
| Turret/aircraft/mechanism | Ring/trunnion or actual flap/rotor/hinge pivots | Both travel limits, combined axes and mount clearance |

Create a separate diagnostic action/slot or owned rig copy. Restore active action/slot/frame, controls and pose state when operating live. An action name that exists but is incompatible with the selected rig is missing usable evidence, not a reason to choose the first slot and continue. Render all interacting visible parts together and inspect required continuous motion in addition to extremes.

For weights, find the actual armature modifier and declared deform bones. Count only their positive weights; pin/mask groups are not orphan bones. Check missing binding, zero totals, normalization tolerance, tiny influences and actual consumer limit. Report a mesh skipped for missing groups as unbound/unverified, never passed. Rigid pieces may use one-bone parenting/groups; adding blended skinning can be wrong. Check nonzero bone lengths, rest transforms, hierarchy and finite matrices on source and imported representations. Normalized weights cannot prove joint volume or absence of clipping.

## Sockets are tested relationships

Record each socket's semantic role, parent object/bone, local matrix and attachment-axis convention. For example a hand socket may use local +Y along weapon tip and +Z up, but adopt the consumer's actual convention. Evaluate transforms after the intended action/frame; stale matrix values can disguise a binding error.

Attach the **real** weapon to the hand and sample the full attack, a rider to a saddle through stride, or an effect cone to a muzzle during recoil. Check contact/grip, effect direction and clearance with both hands when needed. A socket empty at a plausible position proves only inventory. Preserve world/rest mapping through export wrappers or bone renaming; colliders/hit shapes remain separate from decorative spikes and fingers.

## Use a repeatable event table

Example authored action `Attack_A`, frames 10..40 at effective `fps/fps_base=30`:

| Event | Frame | Seconds from clip start | Runtime owner |
|---|---:|---:|---|
| anticipation_start | 10 | 0.0 | Gameplay animation state |
| active_start | 19 | 0.3 | Authoritative hit/effect window |
| hit | 22 | 0.4 | Hit/impact system |
| active_end | 25 | 0.5 | Gameplay animation state |
| cancel_ok | 31 | 0.7 | State transition policy |

Compute `(event_frame-start_frame)/effective_fps` with a documented endpoint/duration convention. Store events as ordered records, not a dictionary keyed by name: repeated footsteps/hits must survive. Reject events outside the exported range or preserve explicitly defined boundary semantics. Mark loop flag, authored in-place speed/direction, expected root displacement, mask/reference pose, locomotion permission and interruption policy as applicable. Custom metadata alone does not make a target controller honor them.

Record the intended action/slot or NLA mapping and exporter selection. `--no-animation` requires an empty delivered clip table; all used actions in the source are not automatically exported clips. Bake controls/IK to a deform-only copy over the agreed range, compare interior source/imported poses and loop-wrap position/orientation/velocity. Use effective FPS, not only the nominal integer. Inspect contact intervals against actual engine/root motion so an in-place walk does not slide at a mismatched speed.

## Secondary representation and runtime reset handoff

Keep render garment, simulation cage and collision proxies separately named. Fit real clearance before solver tuning, grade pin weights around true attachments, and define one final motion owner per vertex. If a solver receives skinned positions, do not apply the armature twice. Keep collar/body/weapon collisions and inner robe/outer cape policy explicit.

For a Blender cache, persist the supported bake, reopen a clean process at nonsequential frames and inspect the whole required motion. For runtime simulation, hand the engine owner this test matrix and record unavailable cases explicitly:

| Trigger | Expected handling and observation |
|---|---|
| Backpedal/strafe/rapid reversal/full dash | Bounded solver updates, no visible penetration or explosive stretch in actual sequential motion |
| Low FPS/hitch | Fixed-step/substep budget and measured fallback behavior, not simply increased stiffness |
| Teleport/respawn/reconnect/large correction | Reset/rebase relative motion once; no old-world-position streak or double skin transform |
| Distance/quality fallback | Bone chain/authored loop or frozen state with a deliberate blend and no silhouette jump |
| Return to simulation | Reinitialize cage/velocities and check contact, not reuse stale cache state |

Blender poses or source instructions cannot establish those engine outcomes. Deliver source/control/deform rigs, semantic sockets, weight/pose evidence, exported clip/event table, secondary/cache/fallback ownership and actual executed checks for the exact revision.
