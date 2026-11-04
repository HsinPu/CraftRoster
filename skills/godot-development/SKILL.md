---
name: godot-development
description: "Implement, debug or review Godot gameplay, scenes, Resources, GDScript/C#, controls, AI, UI and builds using the project's engine version. Use when Godot is selected; distinguish engine checks from observed play."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "setcodes/gamedev-skills"
  reference-license: "MIT"
  reference-revision: "096c224aa498a789fa99d476583029fcb9f538e1"
---

# Godot Development

Connect the requested change to a playable behavior in the existing Godot project. Explanation/review remains inspection and findings; authorized implementation includes code, scene/resource integration and suitable verification. Preserve unrelated changes and the chosen engine, language, renderer and project architecture.

For repository work, read project instructions, `project.godot`, affected scripts/scenes/resources and build tooling. Establish intended version from project/CI evidence and the selected binary's version; `config_version` is not an engine release. Inspect `[application]`, `[autoload]`, `[input]`, rendering/physics settings, main scene and relevant plugins as needed. A bounded explanation can use supplied facts without demanding unrelated project access.

Use these references according to the task:

| Work | Read |
| --- | --- |
| Existing project, engine/language selection, import or migration concern | [Project discovery](references/project-discovery.md) |
| Composition, signals, state lifetime, Resources and asset integration | [Scenes and data](references/scenes-data.md) |
| Movement, combat, AI, input/UI, saves or multiplayer | [Gameplay implementation](references/gameplay.md) |
| Reproduction, diagnosis, profiling and scoped repair | [Debugging](references/debugging.md) |
| Parse/import, automated behavior, editor, input, render or export checks | [Verification and delivery](references/verification.md) |

Trace the input/event, owning state, transition and feedback before changing it. Extend that owner rather than creating a second system around the bug. Define observable acceptance and the affected failure path. Keep tuning values in the project's source of truth with units; do not confuse proposed game rules with settled requirements.

Use the project's established command/test workflow. For uncertain APIs or flags, consult the selected binary's help and version-matched official Godot documentation; the stable links in references are discovery links whose version must be checked. Do not import or save a mismatched project as a side effect of diagnosis. No MCP server, plugin or engine installation is a dependency of this package; runtime verification requires the actual project and compatible tools.

For design questions that materially change the feature, use supplied design records or optionally `game-design` when available. For requested asset production, `blender-development` is an optional handoff, not an automatic install or activation. Pass the required dimensions, orientation, collision and animation contract; importing an asset does not prove it works in play.

Report changed behavior and integration points, checks actually completed, artifacts and remaining gaps. Static review, import/parse, asserted runtime behavior, editor integration, actual input and visual/audio review are different evidence. [Evaluation cases](evals/evals.json) define assessments without claiming execution. See [source attribution and MIT notice](references/upstream-notice.md).
