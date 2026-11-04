# Explicit-job batch contract

## Boundaries and prerequisites

The local [run_jobs.py](../scripts/run_jobs.py) launches trusted project scripts through the foundation background runner. It is process isolation, not a sandbox for arbitrary Python or blend content. Select scripts already reviewed or authorized for the task; installation does not authorize executing downloaded upstream scripts. Inspect the current helper and its `--help` before relying on options. It does not implement the upstream batch_process.py glob/convert/shard/run API.

Supply a real Blender executable through `--blender` or `BLENDER_BIN`. Use a normal host Python for the outer helper. The helper locates `blender-development/scripts/run_blender.py` beside the installed packages; the foundation must be available. That runner starts a separate background process per job with factory startup, auto-execution disabled and Python exception exit handling. Explicitly passed Python still runs with the process user's privileges. Driver-dependent work may require a separately reviewed execution plan; do not broadly enable autoexec to bypass a failed fixture.

## Manifest

The manifest is strict JSON with exactly `schema_version` equal to integer 1 and a nonempty `jobs` list. Each job contains a unique lowercase slug `id`, a required existing Python `script`, optional existing `.blend` input `blend`, optional string-array `args` and required nonempty `expected_outputs` list. Paths for input blend/script resolve from the manifest's directory; the helper's own location is unrelated. Job identifiers become child directories and must be portable platform-safe names.

```json
{
  "schema_version": 1,
  "jobs": [
    {
      "id": "crate-review",
      "blend": "sources/crate.blend",
      "script": "tools/review_crate.py",
      "args": ["--camera", "Review_Main"],
      "expected_outputs": ["asset-report.json", "views/main.png"]
    }
  ]
}
```

`review_crate.py` in this example is a project-supplied trusted script, not a bundled helper. It must accept `--output-dir` followed by the job directory and then its own argument array, create any needed subdirectories and write the expected files there. It should raise/exit nonzero on processing failure. Do not substitute a script that only exposes `run(**kwargs)` without adding a compatible explicit CLI wrapper. Do not manually add a second conflicting output-directory argument.

Expected outputs are relative slash-separated file paths beneath one job directory, not glob patterns or directories. Avoid absolute paths, traversal, empty/dot segments, backslashes, Windows device/invalid names and case-insensitive aliases. Logs are reserved; do not declare `stdout.log` or `stderr.log` as artifact paths. Avoid parent/file conflicts such as declaring both `views` and `views/main.png`. The helper rejects these portable output ambiguities instead of writing source-folder conversions.

## Invocation and run directories

```text
python skills/blender-pipeline-automation/scripts/run_jobs.py --manifest jobs.json --output runs/review-001 --blender /absolute/path/to/blender --workers 1 --timeout 300
```

Use the equivalent real Windows executable path where appropriate and pass arguments without shell command construction. `--output` is a new run root; it must not exist. Each job gets `<run>/<id>/` with stdout/stderr logs and declared artifacts. The aggregate file is `<run>/batch-report.json`. Keep old runs to compare revisions instead of deleting evidence in place.

Workers are bounded to 1 through 8 and timeout to 1 through 3600 seconds. Begin with one representative job; raise workers only after measuring CPU, memory, VRAM and I/O pressure. Thread coordination in the host still runs separate Blender processes. It is not a GPU scheduler, render farm, CPU-affinity manager, shard planner or automatic retry system. Manifest validation happens before run creation; per-job failures must be inspected in the aggregate rather than hidden by successful sibling jobs.

## What a report establishes

Per-job records include source/script hashes, output hashes/bytes, elapsed wall time, process exit where available and errors. Source changes are failures. Missing, empty or escaping expected artifacts fail. Nonzero processing status fails even if a partial artifact exists. A zero-byte report is not a useful output.

A helper pass establishes only the implemented process/source/output gates. It does not parse and validate every produced JSON, inspect image content, verify export semantics or open a target engine. A trusted script could write unrelated bytes to a correctly named file; inspect its product-specific evidence separately. Source hashes do not prevent the trusted script from writing elsewhere, and a timeout is not a general descendant-process sandbox.

After failure keep logs and partial outputs, diagnose the first supported cause, then create a fresh bounded rerun manifest/output root. Do not rerun every successful costly render automatically. Record which jobs changed, source/script hashes and whether previous artifacts remain valid. Never mark a batch visually or engine accepted merely because the process report passed.
