---
name: skill-scan
description: Run a fast, deterministic, read-only first-pass scan of a Skill directory to inventory files and hashes, verify basic identity, and flag symlinks, binaries, archives, scripts, dependency manifests, hidden files, destructive commands, network access, secret access, subprocesses, or authority-expansion language. Use before linting or executing an unfamiliar package; do not treat a clean scan as security approval or release readiness.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Skill Scan

Inventory an unfamiliar package without executing it or following links outside its boundary.

## Workflow

1. Resolve the exact package directory and keep the operation read-only.
2. Run the bundled scanner from this Skill package:

   ```bash
   node scripts/scan-skill.js <skill-directory> --json
   ```

3. Preserve the JSON report as evidence when a later review needs package hashes or signal locations. Accompany it with the source revision, dependency identity, scanner version, inspected scope, target tool or platform, actual command and exit status; mark runtime checks not applicable. The bundled inventory hashes bind the inspected bytes, while the accompanying record binds their review context.
4. Inspect every high and medium signal in source context; pattern matches are triage evidence, not proof of malicious intent.
5. Route by disposition:
   - `stop-and-review`: do not install or execute; use `skill-security-review`.
   - `needs-review`: use `skill-audit` before execution or adoption.
   - `continue`: run `skill-lint`; a clean scan still does not prove safety or effectiveness.

Use `--max-text-bytes <bytes>` only when the default 1 MiB text-scan limit is insufficient and reading the larger file is within scope.

## Report Contract

Require:

- Skill folder and frontmatter identity;
- sorted file inventory with byte counts and SHA-256 values;
- executable, binary, archive, dependency, hidden, and symlink surfaces;
- signal severity, rule, path, and line when available;
- disposition, next Skill, reason, and explicit static-analysis limitations.

## Rules

- Keep the scan fast and lightweight.
- Do not execute scripts, resolve dependencies, contact the network, or expose secrets.
- Do not follow symlinks or accept non-regular files as ordinary package content.
- Do not downgrade a signal without inspecting the referenced source.
- Do not approve, certify, install, or publish from scan output alone.
- Do not replace deeper review steps when they are needed.

## Handoff

- For structure and naming checks, use `skill-lint`.
- For quality and safety review, use `skill-audit`.
- For focused third-party and executable-content review, use `skill-security-review`.
- For release gating after remediation and runtime proof, use `skillforge`.
