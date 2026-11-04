# Gameplay implementation

Use only the branches intersecting the requested feature. Define expected state and visible feedback first, including the affected cancellation or failure case. Preserve the existing system owner and version-specific API.

## Movement and physics

Identify the body type, coordinate space, camera-relative basis, units and physics update path. Keep acceleration/time integration distinct from a body API's own motion integration. For Godot 4 `CharacterBody3D`, velocity is a rate, and `move_and_slide()` uses the physics step internally; multiplying the desired velocity by delta is a common error. Verify against the version-selected [CharacterBody3D reference](https://docs.godotengine.org/en/stable/classes/class_characterbody3d.html). Do not transfer this rule blindly to another body's movement method.

For collision failures, inspect shape presence/enablement, layer/mask compatibility, transforms and whether movement bypasses the intended physics path. Exercise affected slopes, floor transitions, corners or moving platforms rather than testing flat travel alone. Distinguish visual interpolation/camera issues from simulation errors before adjusting physics values.

## Input, UI and pause

Use existing Input Map actions and supported device assignment. Distinguish press/release/hold behavior and UI-handled versus gameplay input. A pause menu can consume the same button that opened it; define event consumption and focus deliberately. Preserve remapping and controller routing where present rather than adding raw key checks.

For a UI change, follow the actual `Control` hierarchy, containers, anchors/theme and focus neighbors. Test keyboard/controller focus as well as pointer activation when those devices are supported. Pause handling must agree across gameplay, UI, timers and audio according to the project rule. Test held input during pause/resume and repeated activation if affected. A screenshot proves appearance, not focus or input flow.

## Combat and action state

Trace eligibility, target validation, cost, commitment, effect resolution, cooldown and feedback. Ensure one accepted activation applies its effect and cost according to the intended rule. Connect animation events to state eligibility; looping clips, duplicate callbacks or delayed hits should not produce extra damage after an action ends. Preserve deliberate persistent projectiles or committed effects rather than cancelling everything universally.

Exercise invalid target, insufficient resource, repeated input, interruption, death and removed target only as relevant. For simultaneous death/reward, use a stable resolution rule rather than code order accidentally granting two rewards. Expose tuning values in their existing owner with units; keep per-actor state independent.

## AI and encounter state

Identify perception, decision, navigation and action ownership. Preserve the existing state machine/behavior pattern rather than adding another loop that issues conflicting movement. Define enter/exit conditions and transitions for loss of target, blocked path, stun or encounter end where affected.

Check the navigation data, agent constraints and actual reachable destination separately from visual geometry. Avoid repathing continuously without a need; investigate frequency and stalls using the project's profiler. Test spawn/despawn, victory cleanup and return/reset against the encounter lifecycle. A navigation path does not prove readable enemy behavior or balanced pressure.

## Saves and persistent progression

Inspect the actual schema, stable identifiers, save point and error handling. Preserve existing data and use explicit defaults/migrations for a format change. Test representative old data, missing optional fields and interrupted/invalid data according to the project's policy. Do not silently reset player progress to make a test pass. Keep instance runtime state and persistent unlocked state distinct during restart and scene re-entry.

## Local and online multiplayer

First determine local input ownership or networked authority; one does not imply the other. For local play, isolate each player's device, state and UI routing and check affected shared camera/reward behavior. For online changes, trace authoritative validation, replication/spawn ownership and state reconciliation through the existing transport/model. Do not trust client-supplied rewards or damage merely because input originated locally.

Exercise the changed scenario across the required peers and authority, including join/leave when affected. One local instance or two local controllers cannot establish network synchronization, latency behavior or remote trust. Report missing peer/device access explicitly and retain the static/automated evidence that was possible.
