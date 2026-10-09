---
name: skill-security-review
description: Perform a focused security and supply-chain review of a third-party Skill package, including provenance, scripts, dependencies, permissions, data flows, prompt injection, downloads, secret access, external actions, and sandboxed runtime behavior. Use when an external Skill contains executable or opaque content, requests broad access, contacts the network, handles credentials, shows suspicious instructions, or needs a security approval before installation; use skill-audit for overall semantic quality and catalog fit.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Skill Security Review

Decide whether a third-party Skill can be installed or executed within an explicit threat and permission boundary.

## Workflow

1. Freeze repository, revision, release artifact, author, license, install path, file inventory, and hashes.
2. Reuse a `skill-scan` report only after verifying its source revision, complete package inventory and file hashes, dependency identity, inspected scope, scanner version, target tool or platform, and actual disposition against the package being reviewed. Otherwise produce a fresh scan with `skill-scan`. If no scan producer is available, record that prerequisite as blocked; source inspection alone does not satisfy it. Inspect every high and medium signal and preserve the inventory hashes.
3. Establish the trust boundary: target tool, user identity, workspace, credentials, network, external systems, and allowed mutations.
4. Inspect frontmatter, instructions, references, scripts, binaries, archives, generated files, dependencies, hooks, and installers.
5. Trace inputs through parsing, command construction, subprocesses, filesystem paths, network requests, logs, outputs, deletion, and cleanup.
6. Trace dependency and download provenance. Flag mutable URLs, unpinned packages, install-time scripts, hidden payloads, obfuscation, and checksum gaps.
7. Test untrusted repository, web, document, filename, and tool-output content for instruction injection and authority expansion.
8. When representative runtime behavior needs proof, reuse matching execution evidence or use `skill-executor` only in an isolated environment with synthetic data, least privilege, blocked secrets, explicit network policy, timeout, and observable file and process activity. Reuse requires the same package identity, tested case scope, target tool and version, environment, authority boundary, observed verdict, and cleanup proof; stale, blocked, incomplete, or unrun cases cannot become a pass.
9. Compare observed behavior with declared capability, permissions, completion, and residue contracts.
10. Classify findings, define required controls, and recommend approve, approve with restrictions, quarantine, or reject.

## Security Review Areas

- Provenance chain, maintainer identity, revision pinning, artifact integrity, and license.
- Credential access, environment variables, home directories, SSH, cloud config, browser profiles, tokens, and keychains.
- Command injection, path traversal, unsafe archive extraction, arbitrary code execution, privilege escalation, and persistence.
- Network destinations, telemetry, uploads, webhook calls, package downloads, and data exfiltration.
- Prompt injection, concealed instructions, scope expansion, external contact, and bypass of approval boundaries.
- Destructive writes, overwrite behavior, cleanup, failure mode, rollback, and audit evidence.

## Severity

- **Critical**: credential theft, concealed exfiltration, malicious persistence, destructive execution, or unauthorized external action.
- **High**: broad secret or filesystem access, opaque executable content, unsafe command construction, mutable download-and-execute behavior, or missing approval for consequential actions.
- **Medium**: unpinned dependencies, hidden network use, excessive permissions, incomplete cleanup, or injection-sensitive data handling.
- **Low**: hardening, portability, logging, or maintenance weakness without a demonstrated exploit path.

## Decision Rules

- Reject unverifiable executable provenance, obfuscation that blocks review, credential harvesting, or behavior that contradicts the declared purpose.
- Quarantine content that cannot be inspected or reproduced safely.
- Require revision pins, integrity verification, least privilege, domain allowlists, sandboxing, or disabled features where those controls reduce a specific risk.
- Do not treat popularity, stars, install count, or a clean static scan as proof of safety.
- Do not install globally or expose real secrets merely to complete the review.
- Mark runtime, network, binary, or dependency behavior as unverified when it was not observed; do not infer a pass from source inspection.

## Output

State the decision and highest severity first. Include evidence paths or lines, attack scenario, affected asset, required precondition, observed or plausible impact, reproducibility, required controls, residual risk, and re-review triggers.

## Handoff

- Use `skill-audit` for invocation quality, workflow completeness, overlap, context cost, maintenance, and the overall adopt-versus-adapt decision.
- Use `skill-scan` when the matching deterministic package scan is missing or stale.
- Use `skill-executor` when controlled runtime proof is required and no matching execution evidence is available.
- Use `github-operations` for GitHub-hosted revision and source inspection.
