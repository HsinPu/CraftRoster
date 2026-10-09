---
name: python-api-client-development
description: Build, modify, fix, and review Python HTTP API clients and SDKs with OpenAPI, authentication, pagination, retries, timeouts, error mapping, transport setup, or generated client code. Use when Python code consumes an external API rather than implements the server; pair with python-development.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Python API Client Development

Use this skill when the task is to build or maintain a Python SDK or HTTP API client.

## Python Baseline Gate

Before planning or editing a Python client or SDK, read the sibling [`../python-development/SKILL.md`](../python-development/SKILL.md), even when the runtime omitted it from the initial Skill list. Keep this skill responsible for transport, auth, pagination, retries, timeouts, serialization, and remote error mapping; keep `python-development` responsible for package layout, typing, public Python interfaces, resource lifetime, and general implementation.

## When To Use

- Build a typed client for an HTTP API or OpenAPI spec
- Add auth, pagination, retries, timeouts, or transport configuration
- Map remote errors into local exceptions or result types
- Maintain generated client code or hand-written SDK wrappers
- Prepare a client library for reuse by other Python code

## Boundaries

- Use `python-backend-development` for server-side app structure.
- Use `python-packaging-release` for versioning, wheels, and publishing.
- Use `python-security-hardening` for trust boundaries and secret handling.
- Use `python-testing-engineering` for test implementation details.

## Workflow

1. Identify the remote API contract and the smallest useful surface.
2. Decide sync, async, or both.
3. Make auth, base URL, and timeouts explicit.
4. Wrap pagination and retries in reusable helpers.
5. Map remote errors into stable client exceptions.
6. Verify the client against representative API responses.

## Client Rules

- Prefer a narrow, typed surface over a giant generic wrapper.
- Keep request and response models explicit.
- Normalize transport and serialization behavior in one place.
- Preserve useful remote error details without leaking sensitive data.
- Keep generated code isolated from custom hand-written logic when possible.

## Handoff

- For consumer/provider compatibility and breaking-change gates, hand off to `api-contract-testing`.
- For packaging and publishing the SDK, hand off to `python-packaging-release`.
- For hardening secrets and trust boundaries, hand off to `python-security-hardening`.
- For server-side transport or service implementation, hand off to `python-backend-development`; client transport, retry, timeout, serialization, and remote-error handling remain owned here.

- See [reference/api-client-workflows.md](reference/api-client-workflows.md) for deeper guidance.
