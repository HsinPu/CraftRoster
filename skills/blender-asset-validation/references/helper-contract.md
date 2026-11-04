# Executable helper contract

Helpers use Python's standard library. The inspector runs inside Blender; the runner and delivery checker run in system Python. They do not install software or constitute an execution sandbox. Only run trusted job scripts in an authorized scratch workspace. Native measurements were exercised on Blender 5.2.2; other runtimes require their own checks.

## Run a background job

```text
python <skills>/blender-development/scripts/run_blender.py --blender /absolute/blender --blend input.blend --script trusted_job.py --timeout 300 -- --job-option value
```

`BLENDER_BIN` or PATH can supply the executable instead. Timeout must be 1..3600 seconds. A new background process uses factory startup and disables embedded auto-execution before opening the input. This is not a sandbox for the supplied script: scripts can intentionally write. No open UI scene is used. Failure exit codes propagate; timeout exits 124. Capture stdout/stderr and verify the actual outputs. A successful process exit alone proves no quality property.

## Inspect a saved asset without changing it

Invoke `scripts/inspect_asset.py` through that runner, passing `--contract contract.json --output technical-r1.json` after `--`. The output must not already exist, and its parent directory must exist.

```json
{"schema_version":1,"objects":["Crate"],"max_triangles":5000,"require_uv":true,"require_manifold":true,"require_materials":true}
```

Names are explicit mesh objects, not patterns; missing, repeated or unsupported names fail. `max_triangles` is an optional positive aggregate limit; `require_uv`, `require_manifold`, and `require_materials` are optional booleans. Only these requested checks are implemented. Rig deformation, weights, animation playback, UV overlap and appearance require separate evidence. Do not add undocumented check keys and assume they ran. Scope render meshes separately from collider/helper geometry before requesting material or UV requirements. Intentional flat cards are not automatically errors.

The report binds `source_sha256` to the saved `.blend` bytes and `contract_sha256` to the exact JSON bytes. It contains Blender version, evaluated triangle/material/UV counts, world dimensions converted using scene unit scale, nonmanifold counts, explicit findings and `not_checked`. Missing scoped FILE textures, empty/nonfinite geometry, non-positive scale, failed requested material/UV/manifold checks or budget excess fail. Only materials used by scoped meshes are examined; linked libraries, procedural material appearance, UDIM/sequence completeness and engine packaging are not comprehensively validated. The original file is never saved. `status:pass` is a technical subset result, while `visual_status:not_reviewed` and `engine_status:not_tested` remain explicit.

## Bind delivery evidence to the final revision

Run `python scripts/check_delivery.py --manifest delivery.json`. Paths inside the manifest and reports resolve relative to the manifest directory. Supply a source/contract file record and at least one export file record, each with `path` and SHA-256. Reports are JSON paths:

```json
{
  "schema_version":1,
  "source":{"path":"asset.blend","sha256":"<64 lowercase hex>"},
  "contract":{"path":"contract.json","sha256":"<64 lowercase hex>"},
  "exports":[{"path":"asset.glb","sha256":"<64 lowercase hex>"}],
  "technical_report":"technical-r1.json",
  "visual_report":"visual-r1.json",
  "require_engine":false
}
```

A visual reviewer uses this report form after actually inspecting images:

```json
{"schema_version":1,"status":"changes_requested","source_sha256":"<source hash>","contract_sha256":"<contract hash>","images":[{"path":"review/beauty.png","sha256":"<image hash>"}],"findings":[{"severity":"major","location":"handle silhouette","observation":"Handle merges into body at gameplay size","requested_change":"Separate its outline","recheck":"Same camera at target pixel size"}]}
```

Allowed visual conclusions are `pass`, `changes_requested`, `unverified`. Technical and optional engine reports also require matching source/contract hashes and `status:pass`. Unresolved blocker/major findings prevent readiness even if a report labels itself pass. If engine acceptance is required, set the boolean `require_engine:true` and provide `engine_report`; execute engine checks first. The engine report must include a nonempty `engine` string naming target/version, a nonempty `checks` list of nonblank strings describing executed checks/outcomes, and `exports` identical to the manifest's export records, in addition to those bindings. Nulls, booleans, objects and blank strings are not check descriptions. Changed exported bytes invalidate that engine evidence.

All source/contract/export files and reviewed images must exist, be nonempty and match hashes. Missing, stale or nonpassing required reports block readiness. Hashes bind evidence, not reviewer identity or correctness; this is not a signed attestation or automatic visual scoring system. Refresh source/contract/report/image hashes after saving any correction. `scope:asset_delivery` explicitly leaves an absent engine test as `not_tested`; only required engine evidence can yield `scope:engine_verified` readiness.
