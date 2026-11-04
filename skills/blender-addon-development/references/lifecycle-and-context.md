# Add-on architecture, context and lifecycle

## Define the extension contract

Record the Blender versions actually supported, Python ABI, host platforms, entry operators, affected data types, UI surfaces and persistent settings. Inspect the existing package before choosing a new layout. An extension package and a legacy add-on have different packaging metadata; migrate only when requested or needed for the target. Do not claim every legacy add-on stopped loading in the extension era.

For a new extension use a manifest and Python package entrypoint. Keep operator/data logic separate from panel drawing and preferences. Use relative package imports because the host may choose the installed module namespace. Choose a durable extension identifier, semantic version and maintainer from the real project. Set minimum Blender version from APIs used and actually tested, not a source template's aspirational version. Do not copy a fictional maintainer, permissions or license from an example. The Skill's Apache-2.0 license describes its guidance; it does not decide the license of a new Blender extension. Confirm the product license and intended distribution rules independently.

Manifest validation/build tooling is version dependent. Query the installed executable's extension-command help before running it. The official Blender 5.0 extension manual documents manifest metadata, wheel declarations, permission reasons and local build/validation. Platform publication is a separate external action, never an automatic result of local packaging. See [official checked sources](official-sources.md).

## Registration as an acquisition transaction

List resource dependencies: PropertyGroups before PointerProperties and operators/panels that use them. Register classes in dependency order. For each successful acquisition append the exact inverse to a cleanup ledger: registered class, attached RNA property, appended menu callback, handler function object, timer callable, keymap item or draw-handler token. If the fourth acquisition fails, unwind only the first three in reverse order. Never unregister a foreign class because it shares a convenient name.

Ordinary unregister uses that same owned-resource ledger and clears it. Remove UI callbacks before the classes they call; remove properties before their PropertyGroup type; stop timers/modal work before deleting referenced data. Unregister should tolerate its own already-removed resources without swallowing unrelated failures. Repeated enable/disable cycles must not create duplicated menus or handlers. Reload the package only after its previous module's functions have been removed: a freshly imported callback with the same name is a different Python object.

Keep import/register fast and bounded to host integration. Do not scan libraries, start network jobs or rewrite user preferences merely by enabling an add-on. File/network operations belong to explicit operators with documented scope and manifest permissions where the target extension format requires them. Check the installed host's online-access policy before requested network operations. Bundle compatible dependencies when needed instead of installing packages silently at runtime.

## Operators and context

Prefer a data-oriented function accepting explicit objects and options. Let an operator validate inputs, call that function and report a result. Poll should check the actual requirements: editor/area only for UI-bound operations, scene/object mode, writable local data, valid selection and required geometry. A background-safe data edit must not acquire an unnecessary VIEW_3D dependency. A UI-only action should return a clear unsupported-context result in background mode.

When an operator is necessary, resolve the target view layer, active object and selected editable object set deliberately; enter a bounded context override and check its returned status. Do not invent an area or pass a region belonging to another window. Handle Edit Mode using the correct editable mesh API or a justified mode transition. Snapshot active object, selection, mode, frame and temporary tool settings that the operation changes, and restore them in a finally block when restoration remains valid. Objects removed by undo/file load cannot be restored through stale references: re-resolve owned data by identity/name and report loss.

Use registered property annotations and distinguish RNA settings from custom ID properties; inspect the installed API for version changes. Validate numerical ranges before touching data. Undoable data edits should form an intentional undo step and support redo parameters; external file writes cannot be undone by Blender's undo stack and need their own output/overwrite contract. A return status alone does not prove data was restored.

## Modal, timers, handlers and drawing

Break long work into short chunks. A modal operator needs explicit running, completed, cancelled and failed paths; remove its event timer/draw token on every terminal path, including window closure and exceptions. Cancellation should restore temporary edits or retain a clearly documented partial result. Background mode is a separate batch entry rather than a fake modal event loop.

Store only the minimum persistent identifiers and resolve scene data again after undo or file load. File-load and depsgraph handlers must avoid recursive self-triggering and heavy work on each update. Keep drawing read-only and use the installed GPU API; do not resurrect removed legacy drawing APIs. Release draw handlers on disable and recreate GPU resources only within a valid supported context. Keymaps and translations also need exact owned cleanup.

## Lifecycle evidence and delivery

Exercise enable, valid operation, invalid context, undo/redo, cancellation, disable and re-enable in a disposable project. Inject a failure partway through registration and check that owned class/property/menu/timer counts return to baseline. This tests rollback instead of merely spotting a reverse loop in source. Package build success is distinct from install/enable success, UI behavior and data preservation.

Deliver source, actual manifest, built archive when requested, tested Blender/Python/OS matrix, the exercised operator data assertions and any UI captures actually reviewed. Label background-only testing honestly; it cannot establish panel layout, shortcut behavior, redraw performance or modal cancellation in a real window. Preserve user preferences and unrelated scene data throughout.
