# Debugging and scoped repair

## Reproduce before choosing a cause

Record build/engine, scene entry path, starting state, actions, expected result, actual result and frequency. Use the shortest reproduction that retains the failure, not an empty scene that removes its lifecycle. If reproduction is unavailable, rank hypotheses from supplied evidence and label them; do not present a likely cause as observed fact.

Trace the causal chain from input/event to owning state and output. Use logs, debugger breakpoints, remote scene inspection or the project's telemetry where available. Capture instance identity, state transition and event/action identifiers when repetition or pooling is involved. Observe whether the defect occurs in one object twice or in two objects once before proposing a signal fix.

## Select discriminating checks

| Symptom | Compare before repair | Targeted follow-up |
| --- | --- | --- |
| Damage doubles after restart | Connection paths, emit count, actor instances, old delayed effects | Repeated restart plus a surviving persistent listener |
| Changing one actor changes another | Shared Resource/nested data versus instance field | Two actors, mutate one, inspect the other |
| Movement varies with frame rate | Update loop, velocity units, duplicate integration | Same input/time at controlled rates, same physics settings |
| UI activates gameplay | Focus/event handling, raw polling and action routing | Open/close UI and activate focused control on supported devices |
| Imported model looks wrong | Source versus import settings, wrapper transforms, renderer/material support | Reimport then instance in the real target scene |
| Save appears reset | Read path, schema/default handling, migration and write errors | Load a preserved old save in an isolated test location |

Do not apply every diagnostic to every bug. Select the check that separates the plausible causes. Keep temporary instrumentation scoped, remove it when no longer useful, and preserve relevant evidence without collecting unrelated player data.

## Repair the owning rule

Fix the earliest incorrect state transition, dependency or integration boundary supported by evidence. Avoid suppressing errors, disabling collisions globally or resetting state every frame to hide a symptom. If a caller violates a valid scene contract, repair the caller rather than weakening every consumer.

For timing defects, distinguish stale asynchronous work from repeated subscriptions and legitimate repeated input. For a freed target, also check whether the delayed action remains semantically valid after a replacement target appears. An instance-validity guard alone may prevent a crash while applying an incorrect effect.

For a performance issue, use a representative scene/workload, measured interval and actual profiler evidence. Separate CPU scripts/physics, rendering, asset load and shader compilation. Compare before/after under the same conditions. A faster empty scene or lower polygon count cannot establish target-device frame-time success.

## Regression and conclusion

Repeat the original reproduction on the corrected revision and one affected boundary case. Broaden tests for shared-system changes or new failures rather than rerunning an unrelated full suite without reason. Add a regression test only when it checks a meaningful invariant with the project's actual runner.

Report the supported root cause, change and evidence. If engine execution is blocked, deliver the source repair with bounded confidence and precise remaining scenario. A no-error parse is useful but cannot establish that the repeated-damage bug is fixed in play. Follow [verification](verification.md) to state the evidence level accurately.
