# Workflow and evidence

## Establish the baseline

Resolve the screen or component and the user task it supports. Read its layout, state ownership, theme resources, localization and input handling before selecting fixes. Existing `DESIGN.md`, approved designs, neighboring screens and current rendered behavior are evidence; resolve conflicts with the user's requirement rather than inventing a new brand.

Record only the matrix relevant to the change: target/framework/version, minimum supported OS or target SDK, device/window sizes, scale/text size, appearance, locale, input method, account/data and loading/error states. Separate product targets from the host that can run tools. Use an isolated fixture/profile when possible. If an authorized test changes a device setting, record and restore the original value.

Inspect a current native or browser render when available and identify the build/revision. A screenshot supplied without build/state context is visual evidence with uncertain freshness. Source-only findings can still be actionable, but distinguish a proven code defect from a rendering hypothesis. Do not impose screenshot capture, new SDK installation or a full test matrix for a trivial change unrelated to them.

## Diagnose and prioritize

Critique asks whether users understand and complete the intended task; audit traces specific failures to layout, input, state or platform contracts. Keep subjective visual preferences separate from defects. Each actionable finding includes location, trigger/state, actual versus expected behavior, user impact, evidence, confidence and smallest plausible correction.

Prioritize blocked tasks, lost data or inaccessible controls; then missing recovery/state and incorrect navigation; then layout/theme consistency; then bounded optical polish. A lower score, detector warning or unfamiliar visual style alone is not a defect. Retain strengths and intentional platform differences.

## Implement the requested correction

1. Reproduce or trace the failure and identify its owning view, component, resource, command or state model. Use prior findings only if they still match the current revision.
2. Make the smallest coherent source patch, including all touched variants. Reuse semantic tokens and native controls where they own the pattern. Preserve persistence, save/cancel, selection, async cancellation, navigation and localization contracts.
3. Exercise the path after the patch. Revisit the relevant surrounding states: long text, smaller window, keyboard/Back, cancellation, errors, appearance or text scale. Do not “repair” clipping by disabling scaling, reflow, system gestures or accessibility.
4. Fix observed regressions, then inspect the final diff for accidental churn. Stop when the agreed acceptance behavior is met; new speculative redesigns are separate work.

A missing optional companion is not a reason to stop an independently feasible fix. Missing indispensable source, tool or target evidence limits the affected acceptance claim. Complete the available work and state precisely what remains unverified. Never replace native code with an HTML imitation to manufacture a pass.

## Match each claim to evidence

| Evidence | Supports | Does not establish |
|---|---|---|
| Source inspection / static check | API/constraint/state defects and candidate repairs | Actual layout, screen-reader experience, timing |
| Build / unit test | Named target compiles or tested logic passes | Correct rendering and whole-flow behavior |
| Render / screenshot | Appearance at the captured revision, state and size | Input, focus, announcements, live resizing, performance |
| UI automation / manual interaction | The exercised actions and resulting state | Untested OS/device combinations |
| Accessibility tree / automated audit | Exposed names, roles and detectable violations | Narrator/VoiceOver/TalkBack usability without running it |
| Assistive-technology walkthrough | The tested reading, focus, action and recovery flow | All disability needs or every screen |
| Comparable measurement | Timings/frame behavior under recorded conditions | A performance improvement from a stylistic diff alone |

Use the repository's existing build and test workflows. Record actual commands/results; do not invent tool access or install an unrelated testing framework. Runtime checks belong on the supported target with its actual UI toolkit. A simulator result is not a real-device performance or hardware-input result.

## Deliver

Scale reporting to the work. Include target/mode/framework, findings or source changes, preserved contracts, checks actually run, and remaining limitations. For comparisons record revision/build, state, theme/scale, device/runtime/tool and artifact location. Do not call an unexecuted case a pass, a planned fixture a test run, or an installed Agent an executed delegation.

Read-only roles return the report in chat; an authorized writing owner may save it in the project's agreed location. No mandatory hidden report store, upstream command prefix, detector score, or extra approval cycle is part of this workflow.
