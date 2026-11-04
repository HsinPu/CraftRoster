# Scenes, state and assets

## Composition and dependency contracts

Preserve existing scene boundaries. A reusable actor scene should make required children, exported references and emitted events discoverable. Bind stable local nodes using the project's convention; avoid reaching through unrelated scene branches to find a manager. Shared lifetime may justify an autoload, but a single feature does not require one by default.

For a new scene instance, verify the root type, script attachment, required exported fields, child paths and caller integration. For inherited scenes, inspect overrides before changing the base. For dynamic instantiation, follow the project's addition/initialization order and ensure dependencies exist before callbacks use them. Do not assume a node's presence in a text file proves it is active in the running path.

## Events and lifetime

For each relevant signal, identify emitter, subscriber, callable and the intended lifetime of the connection. Check both serialized and code-created subscriptions. In Godot 4, `Signal.is_connected(callable)` can guard the same callable; multiple different bound callables or emitters can still deliver repeated effects. Trace the actual event path rather than adding a duplicate guard blindly. See the version-selected [Signal reference](https://docs.godotengine.org/en/stable/classes/class_signal.html).

When pooled actors re-enter a scene or persistent services outlive it, make activation/deactivation ownership explicit. Cancellation, timers, tweens and awaited operations need a policy when their target leaves, dies or a scene changes. Revalidate the current target/state before applying delayed results. Do not infer that an object-validity check also proves the action is still eligible.

For repeated damage after restart, identify whether damage is emitted twice, connected through two paths, applied to two objects or repeated by lingering work. Compare instance identities and activation IDs. Repair the owner and retest repeated entry/restart; indiscriminate disconnection can break other listeners.

## Shared definitions versus instance state

Keep static item/ability definitions separate from each actor's mutable health, inventory, cooldown and active action. Loaded Resources may be shared. If mutable data belongs in a Resource, choose duplication or scene-local behavior based on the intended ownership and the actual version's nesting semantics. Inspect nested Resources, arrays and dictionaries; do not assume a shallow copy isolates them. Confirm with a two-consumer mutation scenario. Consult the version-selected [Resource reference][godot-resource] before relying on duplication behavior or newer APIs.

For custom Resources, preserve serialized property types and defaults used by existing content. A renamed export can break old data even when code parses. Load representative old instances and exercise their defaults; use an explicit migration if necessary. Keep designer-facing units and ranges meaningful rather than exporting internal bookkeeping.

## Asset and resource integration

For requested imports, preserve editable originals and provenance. Establish intended scale, forward/up axis, root/pivot, materials/textures, rig/clips, collision and target renderer before import. Prefer project import settings or wrapper scenes over editing generated imported content that reimport overwrites. Moving assets requires checking their consumers and the project's UID practices; generated import caches are not authoring source.

Verify the touched asset can be loaded, instanced and used by its actual caller. Check animation names/tracks and retarget expectations, material availability under the chosen renderer, collision bodies/shapes and gameplay scale. A visually correct mesh can have unusable collision or a clip that never plays. Keep asset-source review, engine import diagnostics and scene behavior separate.

For scene/resource edits outside the editor, preserve IDs and external/subresource references, and inspect actual loading with the matched editor where possible. Do not regenerate every resource to fix one unresolved path. For missing assets, report the exact unresolved reference and complete checks that do not depend on it; do not substitute an unrelated asset and claim final acceptance.

[godot-resource]: https://docs.godotengine.org/en/stable/classes/class_resource.html
