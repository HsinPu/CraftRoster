# Project discovery

## Establish the execution contract

Identify the repository/project root and existing work before editing. Locate `project.godot`, any project instructions/design records, actual launch/test commands, add-ons and language/build files. Read only the affected scene graph and scripts first; expand to shared systems when evidence leads there. Track the user-visible outcome and the scene or flow that must expose it.

Record evidence for engine version separately from file format: project features, pinned CI binary, package/tool version, project docs and the selected executable may differ. Query that executable's `--version` and `--help` when available. Resolve a material mismatch before editor save/import, since opening with another release may rewrite resources. If the exact engine is unavailable, inspect source and report that limitation; do not silently install, upgrade, downgrade or switch renderers.

Identify 2D/3D, target platform, GDScript/C# and whether the available binary supports the project's language. For .NET, inspect `.csproj`, solution and SDK configuration plus the project's established build path; a GDScript parser is not a C# compiler. Distinguish an editor executable from an export template or dedicated server build because flags and capabilities differ.

## Trace the affected flow

Find the main scene and scene transition mechanism, owning scripts, exported bindings, signal connections, autoloads and resources used by the feature. Inspect both scene-file connections and runtime code. Trace an example from input through state to presentation and persistence, adding network ownership only when relevant. Record exact nodes/properties the scene expects instead of inventing paths.

Inspect Input Map action names, device routing, relevant physics layers/masks and project pause conventions. For UI work, read the project's design guidance and actual theme/focus patterns. Match existing naming, typing, folder layout and test approach unless a demonstrated problem requires changing them.

Before importing unfamiliar project content, inspect enabled editor plugins, tool scripts and native extensions; import can execute project code. Use a permitted working copy for generated caches and scoped experiments. Do not infer authorization for arbitrary external code execution from a request to read supplied source. Preserve source assets, import settings and UID metadata according to the project version.

## Choose the implementation boundary

Describe the smallest complete change: owner, callers, serialized data and playable entry point. List any compatibility impact on old scenes, save files or other actors. A movement fix should not become a new ability framework, and a review should not rewrite scenes. Conversely, an implementation request should include the scene wiring needed to reach the feature, not leave disconnected scripts.

When a missing design choice affects semantics, name it specifically, such as whether interrupted casts refund energy. Follow existing rules where evidence resolves it. Use a reversible stated assumption for routine choices; do not ask for a blanket confirmation before authorized work.

If only screenshots, snippets or logs are available, distinguish verified facts from inferred scene structure. Give a bounded diagnosis or patch proposal without claiming local execution. Do useful static analysis while identifying the precise project or runtime evidence needed for further verification.
