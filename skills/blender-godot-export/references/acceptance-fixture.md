# Godot acceptance fixture

Use a disposable scene with a known-dimensional block, offset-pivot prop, forward arrow, one two-material patch, an open doorway proxy and a small skinned sample with one loop and one root-translation clip. Dimensions and names come from the contract. These are diagnostic artifacts, not a required game level.

Capture source and target from equivalent neutral views and a raking-light material angle. Record imported bounds and basis vectors, material-slot/texture presence, skeleton/bone and clip inventory, duration, first/middle/last poses and collision shape type/count. For the doorway, inspect that empty passage survives the chosen proxy method. If using import hints, record the enabled options and resulting node types.

Inspect actual images/playback and report concrete differences. Compare LOD representations at matched framing if requested. Repeat an import after a small controlled source change to verify the intended wrapper/override ownership. Restore the test asset afterward or retain the disposable fixture according to the task.

Pass technical, visual and engine gates separately. A JSON report can bind hashes and measurements; it cannot establish that somebody actually looked at images. No engine available means that entire target gate is unexecuted. The package supplies a procedure and cases, not a claimed Godot fixture run.
