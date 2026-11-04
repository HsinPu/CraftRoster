# Scene units, libraries and hygiene

## Inspect before reorganizing

Capture scene unit settings, world bounds, active scenes/view layers, object transforms, parent/constraint relationships, shared mesh/material users and library paths. Default names and duplicate suffixes may be cleanup candidates, but stable imported/rig names can be functional dependencies. A root-level object is not intrinsically invalid. Preserve established naming and explain deliberate exceptions.

A metric unit scale of one is a useful authoring convention; imported projects may differ. Changing unit labels does not rescale geometry or solve exporter conversion. Confirm known spans, camera clipping and physical scales. Negative scale can change winding; rotation may be intentional for placement. Apply transforms only where the actual delivery/geometry requires it.

Before transform baking, check parent inverse matrices, children, constraints, shape keys, animation and shared data users. A single-user static mesh is easier to normalize than a linked animated hierarchy. Preserve world positions while moving pivots. Props often use bottom-center, modules a connector/corner, characters a root between the feet, and doors their hinge.

## Library and reuse choices

Append creates a local copy appropriate for a one-off owned variant. Link keeps a dependency on the external .blend and normally prevents direct data edits. A targeted library override allows supported per-scene changes while retaining source updates; do not override everything just to make editing easy. Collection instances reuse assembled modules; shared meshes reuse geometry with per-object transforms.

Keep library paths relative when the delivery layout supports that relationship, or package dependencies through a documented policy. Moving files can break apparently correct relative paths, so reopen a copy from its delivered directory. Packed images can help single-file handoff but do not automatically include every external cache, library or video. Avoid whole-file path rewrites while scoped to one asset.

Large scenes can split layout, modular geometry, dressing, vegetation, lighting, cameras, FX, collisions and references, with streaming/visibility zones when the target needs them. Do not join geometry across distant visibility regions merely to simplify the Outliner. Hide heavy sources during editing with reversible, scoped visibility changes and preserve other view layers.

## Asset libraries and exporters

Mark reusable assets, create previews when authorized, and set meaningful metadata/tags/catalog IDs. A Blender asset catalog uses a root catalog file with UUID/path/name entries; preserve existing IDs rather than regenerating them. Registering an asset library changes user preferences and is not necessary merely to produce a library file. Remote library features are version-dependent and remain optional.

Collection Exporters can store a repeatable format/destination in compatible Blender builds. Inspect the installed operator and exporter properties before adding them. Exporting every collection globally may ship unrelated work; use an explicit owned collection and path. Exclude reference, high-poly, cutters and cages from delivery rather than relying on viewport hiding.

## Worked linked set

For a courtyard assembled from a shared wall kit and a hero fountain, keep the kit linked/instanced and append only an authorized damaged fountain variant. Create an owned layout collection, place scale/navigation guides and organize lights/cameras by purpose. Keep collision and render sets separate. Fix a broken relative texture reference only within the owned local material or its source contract.

Reopen the delivered copy, inspect entry/hero/exit cameras and verify intended dependencies resolve. If an override loses edits after a source update, inspect resync and supported overridden properties rather than making every library local.

## Audit caveats and repairs

The reviewed scene audit computes issues before its optional fixes, so its returned list is not a post-fix verdict. Rerun measurements afterward. Its orphan purge and make-paths-relative operations affect the whole file; an object-name list does not constrain those changes. Avoid broad purge on a scene containing other artists' reserved assets/actions. Unused data can still be intentionally retained.

Missing images need resolved paths or explicit delivery exceptions; no-material geometry may be an intentional collider. Far origins need the documented pivot checked, not automatic recentering. Technical acceptance covers dependencies, transforms and intended membership; visual acceptance covers the current assembled layout and view-layer behavior. Neither clean naming nor an empty audit list proves art quality or target streaming.
