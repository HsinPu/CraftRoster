# Execution and ownership

## Choose a real execution path

- **Background:** use an explicit installed Blender executable and a trusted local script. `python <skill>/scripts/run_blender.py --blender <exe> --blend <source.blend> --script <script.py> -- <script arguments>` starts a separate process. Omit `--blend` only when creating a new scene. Use `--timeout` appropriate to the work; the runner does not install Blender or sandbox arbitrary Python.
- **Live MCP:** discover the available tool schemas and query the current file, scene and objects. MCP tool names/protocols vary; never assume a particular server or connection from a Skill name or open port. Limit changes to the identified owned scope. Preserve the user's active file, view and unrelated objects; use a saved copy or separate process for destructive experiments and review renders.
- **Missing runtime:** useful planning/source inspection can continue, but do not report produced models, rendered previews or runtime verification. Never replace real Blender output with a claimed image-only approximation.

Blender Python (`bpy`) runs inside Blender. Host Python used for the runner is separate. Detect `bpy.app.version` and inspect available operator/property/enum signatures before relying on release-specific recipes. Documentation examples are not a compatibility matrix.

## Keep edits attributable and reversible

Identify owned collections and their shared datablocks before changing or removing anything. Preserve source meshes, rigs, shape keys, materials, library links, animation and export conventions outside the requested edit. Build an export copy when applying modifiers, joining, triangulating or converting units would destroy editability. Give outputs new explicit paths; avoid overwriting the original or an unrelated existing delivery.

For headless runs, a background process isolates the live UI but is not a filesystem sandbox. Review the script and its output paths. Disable file auto-execution, keep scripts local and trusted, and do not run arbitrary Text blocks from an imported file. Save only intentional source revisions and outputs.

Use the data API for precise edits and operators when their context is established. Check mode, active object and selection separately; use an explicit context override where required. Update the dependency graph before reading world transforms; read evaluated meshes for output costs and release temporary meshes afterward. Resolve nodes by stable type, not localized display names. Changes to shared mesh/material datablocks affect all users unless made single-user intentionally.

Inspect actual unit scale and axis conventions. Apply transforms on the appropriate export/working copy only when the rig, animation and modifier semantics permit it. Never normalize a rig or change world size just to silence a warning. Report a failed operation or unavailable feature; retry only after a diagnosis, with bounded work and preserved state.
