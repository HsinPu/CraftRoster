# Verification and delivery

Choose checks that can falsify the affected behavior. Use the selected binary's help and the project's established scripts. The [official command-line reference][godot-cli] is a discovery link: select the project release, since supported flags and build types vary and unknown flags may be ignored. The examples below are templates for Godot 4, not a mandatory sequence.

## Static, import and parse

Inspect script types, node paths, serialized references and changed ownership without claiming execution. Where authorized and version matched:

```sh
godot --version
godot --help
godot --headless --path /actual/project --import
godot --headless --path /actual/project --script res://actual/script.gd --check-only
```

Import may write generated caches and run editor-side code. Parse checks inspect the supplied GDScript and dependencies, not all gameplay or C# compilation. Use the project .NET workflow for C#; Godot's engine `--test` flag is not the game's test runner. Inspect diagnostics and exit status together.

## Asserted runtime behavior

Use the existing project test runner or an appropriate scene/harness. A bounded smoke example, if supported:

```sh
godot --headless --path /actual/project res://tests/actual_case.tscn --quit-after 120
```

The limit counts iterations, not elapsed seconds. A run that merely reaches it lacks a behavioral assertion. Record scenario completion and expected state/output, failure diagnostics and exit status. A test timeout or missing completion marker is incomplete evidence, even if no explicit error was logged. Headless mode cannot establish sound, visuals or feel.

For a cooldown fix, assert one accepted activation, denied repeats, expiry and the affected pause/reset policy. For state isolation, instantiate two actual consumers and mutate one. For a scene transition, enter/exit/return and assert the intended ownership and subscriptions. Prefer realistic project paths over an empty test created solely to exit successfully.

For synthetic input, observe that the intended callback received the event before checking its consequences. With accumulated input enabled, injection and a single frame wait can still precede dispatch. Use a bounded callback acknowledgement or the project's explicit event-flush mechanism; do not repair the game logic merely to satisfy a harness that asserts too early. Preserve press/release and pause routing, and distinguish injected events from physical-device tests.

## Editor integration

Open the affected scene using the intended editor when available. Inspect bound exports, resource loading, inherited overrides, signals and diagnostics. Editor loading is distinct from gameplay execution; tool-mode preview does not establish runtime behavior. Preserve a working copy and inspect source diffs after editor changes/import.

## Actual input and presentation

Run the playable entry point and perform the affected interaction with the supported devices. Record build, scene, setup, action and observed result. Check the UI/pause/focus path and a relevant failure/restart where affected. Synthetic action injection may test state routing but does not prove physical-device mapping or focus behavior.

Inspect actual rendered output at the intended camera, resolution and renderer for changed visual behavior. Compare the corrected revision, not a stale screenshot. Audio needs actual playback or appropriate signal evidence; headless logs cannot establish it. Distinguish accessibility-tree/source evidence from assistive-technology interaction where relevant. Do not claim game feel or visual acceptance without observation.

## Build and export

Use the project's named export preset, selected engine and matching templates. Inspect target requirements, asset inclusion/filter rules, native libraries and language support. Keep secrets/signing credentials in the existing secure workflow. Output must go to a scoped artifact path, preserving source and prior deliverables according to project conventions.

An example to adapt after checking help and actual preset names:

```sh
godot --headless --path /actual/project --export-release "Actual preset" /scoped/output/game
```

Check exit/diagnostics and a nonempty expected artifact. Launch the export on the target when available, exercising the affected flow and bundled assets. Editor play and successful export are different from target-runtime acceptance. Export availability does not authorize publishing a build or modifying store accounts.

## Evidence record

Tie results to the tested revision or changed-file hashes and exact binary/platform. State what ran, its inputs and outcome, then limitations: static only, import/parse, asserted runtime, editor, actual input, render/audio, build and target run. Missing layers should remain missing rather than generalized into "tested." Eval JSON files are test definitions, not evidence of executed model or engine cases.

If runtime/tools are unavailable, finish meaningful inspection and give the smallest concrete verification still needed, such as repeated scene restart with one damage event per hit. Do not fabricate a native pass or install an engine solely to make the report look complete.

[godot-cli]: https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html
