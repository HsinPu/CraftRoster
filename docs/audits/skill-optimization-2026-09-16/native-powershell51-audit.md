# Native Windows PowerShell 5.1 installer audit

Date: 2026-09-16. Scope: run the existing local installer smoke with Windows PowerShell 5.1 as both the smoke host and installer. No installer or smoke source was changed.

The full native-host result is **failed**. It is neither `not_run` nor a passing platform check. The isolated ownership-refusal reproduction passed, which does not override the full-smoke failure.

## Host and invocation

[Host evidence](native-powershell51-host.json) records the actual executable `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`, Desktop edition **5.1.19041.3803**, a 64-bit process, CLR 4.0.30319.42000, and Windows 10.0.19045.0.

The full run used:

```powershell
$env:PSModuleAnalysisCachePath = 'NUL'
& 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe' `
  -NoProfile -NonInteractive -ExecutionPolicy Bypass `
  -File 'C:/Users/win10/Desktop/github/CraftRoster/scripts/smoke-install.ps1' `
  -PowerShellExecutable 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
```

The outer Node recorder only captured output, monitored the owned process, and applied a 900,000 ms timeout with process-tree termination if needed. Neither full run timed out. The smoke itself redirected all simulated project and global installs to its temporary fixture home. Every installer call supplied a local `SourceDir`; the download branch was not selected. Network counts describe that inspected execution path, not packet tracing. Model calls: **0**.

## Preserved attempts

| Attempt | Result | Evidence |
| --- | --- | --- |
| Initial sandbox child launch | `spawn EPERM`, no smoke child started, 0 PASS lines; its empty owned temporary directory was removed | [Failure record](native-powershell51-spawn-failure.json) |
| Full smoke with an additional recorder-owned TEMP directory | Exit 1 after 34 PASS lines; failed while copying the Python fixture at a 261-character destination path; no completion summary | [Record](native-powershell51-smoke-v2.json), [raw log](native-powershell51-smoke-v2.log) |
| Full smoke with normal system TEMP | Exit 1 after **102 PASS lines**; no completion summary | [Record](native-powershell51-smoke-v3.json), [raw log](native-powershell51-smoke-v3.log) |

The extra TEMP directory made the failing copy path 261 characters; removing that extra directory reduced the corresponding path to 227 characters. The normal-TEMP run passed that category install and both full-catalog installs. This is evidence of a path-sensitive limitation, consistent with a legacy path-length boundary; this audit did not establish the exact responsible API or Windows configuration. The failure remains preserved.

The normal-TEMP run subsequently stopped at `Agent ownership stored input alias target`: the expected failure helper received a nonzero child exit and empty combined output, so it could not find `ownership metadata does not match`. The existing helper did not print or persist that child's numeric exit code, separate streams, signal, or timeout. Consequently the child's exact cause is **unknown**; the evidence does not establish a native crash or an installer ownership bug. Exit 1 in the full-run record is the smoke host's exit code.

The 102 PASS lines include successful local dependency closure and selection checks, full project Skills/Agents installation, isolated global profiles, content/ownership checks, and atomic rollback scenarios. They are reported as emitted PASS lines, not as 102 independent assertions or a fully passing suite.

## Isolated diagnostic

[The first reproduction](native-powershell51-alias-repro.json) used the smoke's combined-output capture pattern. It installed `code-reviewer` in an owned temporary directory, changed only the installed ownership metadata's `target` to `vscode`, and retried the same `claude` install. Baseline exit: 0. Refusal exit: 1 with the expected ownership message. Cleanup succeeded.

[The second reproduction](native-powershell51-alias-repro-v2.json) repeated that bounded case under the native 5.1 host, using .NET `Process` to capture stdout and stderr independently:

| Child | Exit code | Timeout | stdout | stderr |
| --- | --- | --- | --- | --- |
| Baseline install, PID 5948 | 0 (`0x00000000`) | false | Installation completed | Empty |
| Stored alias refusal, PID 6360 | 1 (`0x00000001`) | false | Expected ownership mismatch refusal | Empty |

Both processes closed, and both stream reads completed. Each had a 60,000 ms bound. `signal` is null because the Windows Process API exposes exit codes rather than POSIX signals. This diagnostic did not reproduce the full run's empty child output. No further full-suite retry was performed.

## Source integrity and cleanup

Both full runs verified identical before/after SHA-256 hashes:

| File | SHA-256 |
| --- | --- |
| `scripts/smoke-install.ps1` | `f4b8be27cbf4066659629de9ca0304fa1ff457bddac39f11ba51e935063c593e` |
| `scripts/install.ps1` | `038b00a09a2b291f45dddd767f4649c5e7e7524206affc0b642ac61c54e8b70e` |

The recorder's extra TEMP directory was empty and removed after the first full run. During the normal-TEMP run, the observed new root `craftroster-install-smoke-955dc2129ce140f3b0f2d32745a5b0ef` was removed by the smoke's guarded `finally`; no new smoke roots remained. The pre-existing `craftroster-install-smoke-20bec8701b0f46dd8f310f3e71f5799e` was not touched. Both isolated reproduction directories were removed after their verified children exited.

The full logs have SHA-256 hashes `eb2f8c28c325f0a65c1306a5ad8737862eb6fdee8232efa0962cd4ea39c59054` (extra TEMP) and `c6cc7215c7b16319d0e1bc9c6b472874b7699e2718241357cf4e4dc7aec3b858` (normal TEMP). Logs preserve native output bytes; localized error text may require the Windows output encoding when viewed.

## Remaining evidence gap

Native 5.1 full-host validation remains failed with an unexplained child-output failure. A future focused change could persist each smoke child's exact exit code and independent output streams on unexpected failures before another full run. This audit made no such change and does not infer a source fix from the isolated success. Linux/macOS behavior, CI execution, model task outcomes, and ordinary user-home installs were not tested here.
