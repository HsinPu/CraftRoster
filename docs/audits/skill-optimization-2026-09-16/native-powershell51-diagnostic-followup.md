# Native PowerShell 5.1 diagnostic follow-up

Date: 2026-09-16. This is new evidence after the [earlier audit](native-powershell51-audit.md); its failed runs and unknown child-output cause remain unchanged.

The single v4 full smoke **passed** under native Windows PowerShell **5.1.19041.3803**, Desktop edition, 64-bit, as both host and installer: **113 emitted PASS lines**, host exit **0**, stderr **0 bytes**, no timeout, and the completion message `PowerShell installer smoke passed: 286 Skills, 237 Agents.`

- [Machine record](native-powershell51-smoke-v4.json)
- [Complete raw log](native-powershell51-smoke-v4.log)

The run used the same executable and arguments as v3, original system TEMP, `PSModuleAnalysisCachePath=NUL`, local `SourceDir` inputs, and the existing isolated fixture homes. It started at 13:51:53.185 UTC and ended at 13:56:07.055 UTC. The observed smoke host PID was 17372. Its configured timeout was 900,000 ms; process-tree termination was not needed. There are no running children or new residual smoke roots from this run.

The root task changed the two failure helpers to include signed and hexadecimal child exit codes and the captured output line count. Inspection confirmed that their child invocation, zero/nonzero acceptance checks, and expected-message condition remained unchanged. An additional raw-byte inverse-hash preflight did not match and aborted before any v4 child launch. Mixed line endings were observed in the current checkout, but the cause of the inverse-hash mismatch was not established. Current function inspection and new source hashes were recorded independently. The preflight was recorded separately from the one actual full execution and was not treated as a smoke run.

No unexpected failure triggered the new diagnostic message in v4. The success therefore does **not** explain v3's empty output or demonstrate that changing the diagnostic text fixed a root cause. It supplies one complete native 5.1 passing run while preserving the earlier failed evidence and its unresolved cause. No automatic full-suite retry followed v4.

## Integrity and cleanup

| Item | SHA-256 |
| --- | --- |
| `scripts/smoke-install.ps1`, before and after v4 | `79a66a31dc93102ba6b4cb61613b7d634c7eefaf0719452d0fbc606e94b5466c` |
| `scripts/install.ps1`, before and after v4 | `038b00a09a2b291f45dddd767f4649c5e7e7524206affc0b642ac61c54e8b70e` |
| Native `powershell.exe` used by v4 | `64dd55e1c2373deed25c2776f553c632e58c45e56a0e4639dfd54ee97eab9c19` |
| v4 raw log | `89d84ef7b01a420113dd100700cd5d44db9288238f2152463ad0f69a132e9be7` |

The new root `craftroster-install-smoke-5dce5553f350438ab1c23f6df0d15884` was observed during execution and absent afterward; no new matching roots remained. The pre-existing `craftroster-install-smoke-20bec8701b0f46dd8f310f3e71f5799e` was preserved. The native executable and argument vector, all source hashes, timing, process status, and cleanup inventory are in the machine record.

This audit added only the v4 record, log, and this follow-up. It did not edit installer or smoke sources. Model calls: 0. Installer network calls: 0 by inspected local-`SourceDir` control flow; packet tracing was not performed. Linux/macOS, CI runs, and model task outcomes remain outside this evidence.
