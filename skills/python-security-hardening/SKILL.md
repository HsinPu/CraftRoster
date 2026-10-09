---
name: python-security-hardening
description: Harden Python code that handles secrets, untrusted input, deserialization, subprocesses, filesystem paths, network boundaries, or dependencies. Use when writing or changing security-sensitive Python implementation details rather than performing a findings-only security review; pair with python-development and the owning Python specialist.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Python Security Hardening

Use this skill when Python code needs secure-by-default implementation choices.

## Python Baseline Gate

Before planning or editing security-sensitive Python code, read the sibling [`../python-development/SKILL.md`](../python-development/SKILL.md), even when the runtime omitted it from the initial Skill list. Keep this skill responsible for trust boundaries, dangerous primitives, secrets, paths, subprocesses, dependencies, and secure defaults; keep `python-development` responsible for the surrounding Python design and implementation.

## When To Use

- Handle secrets, tokens, credentials, or environment-based config
- Review file, subprocess, shell, or network trust boundaries
- Avoid unsafe deserialization or dynamic execution paths
- Reduce dependency and supply-chain risk in Python projects
- Harden Python code before it ships or is exposed to untrusted input

## Boundaries

- Use `security-code-review` when the requested outcome is vulnerability and exploitability findings without implementation. Use `code-review` when the primary outcome is a broad correctness or quality review.
- Use `python-packaging-release` for release mechanics and artifact publication.
- Use `python-backend-development` for framework structure and app flow.
- Use `python-automation-scripting` for local operational scripts.

## Workflow

1. Identify the trust boundary and attacker-controlled input.
2. Remove or minimize dangerous primitives.
3. Prefer explicit allowlists over implicit trust.
4. Keep secrets out of source and logs.
5. Validate dependencies, inputs, and execution paths.
6. Verify the hardening change does not break expected behavior.

## Hardening Rules

- Do not hardcode secrets or credentials.
- Avoid `eval`, `exec`, unsafe `pickle`, and equivalent dynamic execution on untrusted input.
- Treat shell and subprocess calls as sensitive boundaries.
- Validate paths before reading or writing.
- Prefer secure defaults for network and auth-related settings.

## Supply Chain Rules

- Pin and review dependencies deliberately.
- Prefer maintained and minimal dependency sets.
- Treat new transitive dependencies as part of the change.
- Inspect release artifacts and build inputs when packaging is involved.

## Handoff

- For vulnerability and exploitability findings, hand off to `security-code-review`; for broad correctness and quality review, hand off to `code-review`.
- For packaging and release output, hand off to `python-packaging-release`.
- For general implementation style, hand off to `python-development`.

- See [reference/security-workflows.md](reference/security-workflows.md) for deeper guidance.
