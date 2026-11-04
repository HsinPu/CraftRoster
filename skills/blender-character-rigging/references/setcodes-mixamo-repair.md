# Prepare and repair a Mixamo-derived rig

Use this branch only when Mixamo is the chosen pipeline. Asset processing does not authorize account login, upload or accepting external terms. Prepare an owned mesh/export copy and give the user the explicit upload file when that external step is theirs. Record source rig/morph requirements before changing anything: an existing rigged asset is not an unrigged auto-rig input by default.

## Prepare and inspect

Choose the intended connected humanoid body in A/T pose, actual facing axis and metres. Check holes, degenerate faces, fused fingers and garment intersections. A manifold-count target cannot justify destroying intentional shells. Convert transforms on the duplicate so world size/ground/pivot/facing remain correct; assigning location/rotation zero and scale one discards transforms rather than applying them. Export only that copy with the intended FBX axis/unit settings, no cameras/lights or accidental armature. Query exporter RNA and reimport beside a known-size axis marker. Check moved-package textures. ORM is not automatically preserved through FBX material translation; retain source maps and a hookup legend.

When asking for a rigged download, specify With Skin for the model and Without Skin for additional compatible clips; choose the skeleton level from the actual project, not a compulsory 65-bone example. Keep the downloaded source unchanged. Import into a separate owned scene, enumerate all meshes/armatures, map deform groups to actual bones and verify modifiers/parenting. Normalize name matching only after checking both colon and underscore namespaces and collisions; suffix matching is a candidate, not identity proof. Record missing fingers or leaves rather than asserting exact 41/65/73 counts.

## Local jaw/neck diagnosis and correction

Render rest and several actual idle/head-turn frames. If the chin is correct at rest but stretches with neck motion, sample front-most vertices in calibrated head-height bands (for example 0.01–0.015 m on a human-scale asset), listing Head/Neck and other deform weights. Work in a calibrated head frame with local vertical z and front -y; a translated/rotated character invalidates world-X-zero assumptions.

Mark chin and nape in the local side plane. Let `d=normalize(nape-chin)` in yz and choose perpendicular `n=(-d.z,d.y)` pointing above the jaw. Signed distance `s=dot((p.y,p.z)-chin,n)` determines a bounded blend. Example human-scale bounds are -0.006 to 0.016 m; rescale and inspect on this subject. Use `t=smoothstep(lo,hi,s)` only inside a measured head sphere and `abs(p.x-head_center.x)<=half_width`. Reject coincident jaw points, zero radius or reversed blend bounds. The sphere/midline must follow the calibrated head frame; ears/hair may require explicit masks.

For each included vertex multiply other deform weights by `(1-t)` and set `Head = oldHead*(1-t)+t`. Preserve nondeform mask/pin groups. Normalize only intended deform weights, handle zero totals explicitly, and report changed/full-head vertices. Do not paint a hood or neck into Head by an overlarge sphere. Use actual bone names and check the Head group exists before mutation. Re-render adjacent head tilts and neck bends; a perfect one-frame chin fix can create a neck crease. Restore action, action slot, NLA state, pose mode/matrices, frame and settings in `finally`.

## Crowd-only reduction and clip compatibility

Confirm that fingers are invisible/unneeded and no attachment consumes them. For each removed finger deform group add its weight to the corresponding hand group, then remove the finger group/bone only on a duplicate. Preserve hand attachments and reparent surviving descendants while retaining rest transforms. Do not delete every `_End` string without inspecting its use. Limit/normalize deform weights to the target contract and recheck zero-weight vertices. A four-weight setting is common, not universal.

Regenerate or remap every exported clip against the reduced skeleton; remove tracks only for deliberately removed bones. Test all preexisting motions and hand-held attachments. Extra Without Skin animations remain compatible only when the actual skeleton/rest conventions agree. Keep the full rig for source and any hero/facial deliverable. Do not rename every action to one source-specific string; match the consuming project's actual clip contract.

Stress-test shoulders, elbow flexion, knee/hip bend, spine twist and head turn in a dedicated action, then inspect continuous motion and cloth contact. Deliver fixed weights, original/full and reduced skeleton maps, affected clip list, measured influence report and current pose images. Reimport requested rigged FBX/GLB and compare bind/rest transforms, posed landmarks, durations/root movement and textures. A skin/joint count alone is insufficient; unavailable engine playback remains untested.

Source: independently adapted from `setcodes/gamedev-skills` `096c224aa498a789fa99d476583029fcb9f538e1`, `skills/blender-game-assets/references/mixamo.md`, `references/characters.md`, `scripts/bpy_lib.py` (MIT; preserve notice). Fixed source anatomy, names and author timing measurements are not local project contracts.
