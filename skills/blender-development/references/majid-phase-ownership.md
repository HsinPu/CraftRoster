# Replayable measured phases without replacing unrelated work

This adapts the useful ownership idea in Majid's build template, not its entire primitive library. Use only trusted scripts in an authorized asset workspace. Background execution does not sandbox Python. Follow the foundation runtime and batch contracts; no upstream tools or hooks are implied.

## A bounded phase contract

Record `asset_id`, `phase_id`, input revision/hash, owned scene and object IDs, measured/inferred constants, required upstream entities and new output path. A typical phase record is `asset=Ranger`, `phase=forms`, `input=ranger-r2.blend`, `output=ranger-r3.blend`, `owns=[Ranger_Cape_High]`, `depends=[Ranger_Torso_High]`. Use a task-specific custom tag containing both asset and phase, rather than the generic `phase:02_blockout` across every file.

1. Open the exact input in a new isolated process. Refuse a missing input, existing output, wrong scene, linked/read-only data or an unowned name collision.
2. Resolve all dependencies before removing anything. Snapshot the current source hash and object/data consumers. If an owned mesh is shared with an unrelated object, copy it before a local change.
3. Build replacement geometry in an owned temporary collection. Named constants carry measured view/landmark or `inferred` rationale. Example: `wheelbase_m=2.8` from calibrated side axle points; `rear_panel_depth_m=0.12` inferred from adjacent panel construction.
4. Check finite geometry, intended bounds/part counts and expected dependencies before swapping. Keep a stable object identity when downstream modifiers/parents refer to it, or explicitly remap every dependent link and validate the result. Deleting and recreating an object with the same name does not preserve an ID relationship.
5. Save to the new revision only after successful checks. Verify the actual nonempty file, reopen when relevant and retain the original. Do not disable backups or overwrite the sole master as an idempotence shortcut.
6. Invalidate dependent bakes, weights, clips, exports and images according to the changed contract. A forms edit can require new low topology/bake; a rest-pose change can require weight/clip regression. Rerun the affected downstream slice, not only the phase's object-count assertion.

Rerun a phase from the same declared input, not blindly on its previous final output. If manual edits touch an owned part, preserve them as a new input or stop before replacing them. A script cannot promise that all manual edits survive an ownership-tag sweep.

## Repairs to the source helper assumptions

| Source operation | Failure and bounded replacement |
|---|---|
| `clear_owned` over `bpy.data.objects` | A matching generic tag can delete another asset or scene; restrict scene/asset ownership and inspect downstream users first |
| `skin_chain` stores BMesh vertices then frees BMesh | Do not dereference freed elements; capture scalar radii and stable index correspondence before writing/freeing |
| `apply_all_modifiers` from evaluated object | Can bake a pose, remove armature and lose morph semantics; reject bound/morph inputs or use an explicit supported delivery-copy operation |
| Evaluated `join_meshes` | Geometry alone does not preserve material-index maps, groups, bind matrices or animation; either remap these semantics or reject unsupported source types |
| Blind mesh transforms | Shared meshes, parenting, shape keys and constraints can change other consumers; use an owned copy and compare world/bind transforms |
| Object-only cleanup | Materials/images/node groups can accumulate; clean only verified unused task-owned datablocks, never a global orphan purge |

For a loft helper, validate equal nonzero section sizes, ordering, finite coordinates and caps before building. For a spin/extrude helper, validate outline orientation, intersections and axis rather than assuming a profile is a valid closed volume. For skin chains, coincident joints with conflicting radii require a deliberate merge rule; skin/subdivision output is a blockout, not proof of deformation topology. Keep reusable code small enough that these contracts can actually be exercised.
