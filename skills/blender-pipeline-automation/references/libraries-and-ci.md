# Library, CI and automation design

## Planning operations

Inventory the explicit source set and requested operation before dispatch: report-only, conversion, library append/link repair, texture relinking or rendering. A report job must not call destructive orphan cleanup as a hidden convenience. Resolve paths after opening the intended blend; `//` has file-relative meaning. Keep source snapshots and input hashes and choose an output directory outside the source tree.

Use one input per process where practical to prevent one asset's settings, handlers, caches or selection contaminating the next. A supported `bpy` wheel can be an alternative for data-only work when its Python/ABI/API match the target; the Skill installs no wheel and does not promise equivalence for UI, GPU or add-ons. Do not pin the host Python version from an upstream claim without checking the actual Blender build.

## Library linking and relocation

Distinguish append (local copy), link (external ownership) and library overrides (scoped edits of linked structures). Inventory intended collection/datablock names before load. Do not recursively append every asset just to move a library. Record absolute resolved source paths and intended relative delivery paths; retain nested library and texture dependencies.

For relocation, make a copy, update only the declared library references, reload deliberately and compare object identities, dimensions, material slots and missing-file reports. Keep before/after dependency manifests. Recursive orphan purge is not a substitute for identifying missing paths and can destroy unused but intentionally retained assets/actions. Package only requested datablocks with their dependencies; verify the saved library in a new process rather than trusting the authoring session's already loaded images.

## CI and render dispatch

Pin a verified Blender distribution/version and record build/version, host OS, script digest, file digest and relevant renderer/color settings. Cache the tool distribution separately from generated products. A headless launch is not proof that a GPU backend works; start with one low-cost smoke render using the intended device and inspect its output. CPU fallback changes execution characteristics and must be reported rather than silently called equivalent performance.

Split test tiers: host manifest/path tests, native data operations, native image generation/review and target-engine import. Host tests must explicitly skip unavailable native tiers. Avoid parsing human progress logs as a stable API; use process status and owned structured reports. Publish/archive artifacts only when that external action is authorized; a local CI recipe does not authorize changing credentials, uploading assets or installing system services.

## Failure recovery and acceptance

Test no-input/invalid manifest, script exception, missing output, timeout and source mutation in disposable fixtures. A process-wrapper mock can check argument construction and status aggregation but cannot validate native Blender. Reproduce a failed job with the same inputs and one worker before changing concurrency. Separate SDK/process duration from render duration and target performance; the helper's elapsed seconds include startup and script work.

Deliver exact manifest, trusted job script references, run root, logs, reports, declared artifacts and a concise list of passed/unexecuted tiers. If a conversion changes geometry, material or animation, route that product through the relevant asset/export checks and actual image review. Batch throughput and source integrity do not establish art quality or engine compatibility.
