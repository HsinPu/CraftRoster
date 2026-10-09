---
name: security-code-review
description: Security-focused code review for high-confidence vulnerabilities in diffs, files, pull requests, and snippets. Use for a security review, vulnerability audit, OWASP-style review, or analysis of injection, XSS, SSRF, auth/authz, deserialization, cryptography, secrets, supply chain, and infrastructure risks. For a broad code review, load the sibling code-review Skill while this Skill owns exploitability and security confidence.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Security Code Review

Use this skill for vulnerability-focused review. Use `code-review` for broad correctness/quality review and `python-security-hardening` or `spring-security` when implementing security fixes.

## Umbrella Contract

Standalone vulnerability audits can use this Skill alone and return the security output below. A security-only diff or PR does not activate the umbrella merely because of its input format.

When security analysis is one dimension of a broader diff or pull-request review:

1. Read the sibling [`../code-review/SKILL.md`](../code-review/SKILL.md).
2. Let `code-review` own scope, read-only boundaries, cross-domain deduplication, and the final verdict.
3. Keep this Skill responsible for trust boundaries, attacker control, source-to-sink evidence, exploitability, framework protections, and security confidence.
4. Return confirmed vulnerabilities as findings and unresolved reachability or control questions as needs-verification evidence. Do not let a generic checklist upgrade suspicion into a blocker or downgrade a confirmed exploit.

## Review Principle

- Report only issues with a clear vulnerable pattern and a credible attacker-controlled input or trust-boundary violation.
- Research surrounding code to increase confidence, but report only on the requested file, diff, PR, or snippet scope.
- Do not flag issues from pattern matching alone; verify source, sink, validation, framework protections, and deployment context.
- Separate confirmed vulnerabilities from questions that need verification.

## Confidence Levels

- **High**: vulnerable sink plus attacker-controlled input or exploitable misconfiguration confirmed. Report with severity.
- **Medium**: suspicious pattern but source, validation, or reachability unclear. Put in `Needs Verification`.
- **Low**: theoretical, defense-in-depth, test-only, dead/commented code, or server-controlled value. Do not report as a finding.

## High-Impact Validation Gate

Before returning a security finding that would block a broad review:

1. Recheck the exact reviewed baseline, source, trust-boundary transition, sink, validation, authorization, framework behavior, and deployment condition.
2. Look for negative evidence that disproves attacker control, reachability, or impact.
3. For snippets and partial context, keep the candidate under verification when an unavailable route mount, caller, middleware, framework guard, or deployment control could fully prevent exploitation. Confirm only when the supplied context is explicitly complete or the vulnerability survives that missing layer.
4. Use a narrow non-destructive reproduction, negative control, or concrete code path when safe. Do not run exploitative, production, or externally mutating tests without separate authorization.
5. For elevated reviews, use an independent security pass when available and permitted, but resolve disagreement from evidence rather than votes.
6. Mark the candidate confirmed, rejected, or needs verification; return rejected candidates only when explaining a material false-positive decision.

## Security Areas

- Injection: SQL/NoSQL/command/template/LDAP and unsafe dynamic execution.
- XSS and HTML injection: `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, unsafe template bypasses.
- Auth/authz: missing authorization checks, IDOR, privilege escalation, auth bypass, insecure sessions.
- SSRF and open redirect: user-controlled URL, host, redirect, or fetch target without allowlist.
- File handling: path traversal, unsafe uploads, archive extraction, XML/XXE.
- Deserialization: unsafe pickle/YAML/Java/PHP/object deserialization from untrusted input.
- Cryptography: weak randomness for secrets, insecure password hashing, broken algorithms in security contexts.
- Secrets and data protection: committed credentials, PII leaks, sensitive logs, token exposure.
- Supply chain and CI/CD: unpinned privileged actions, unsafe scripts, dependency confusion, secret exfiltration paths.
- Business logic: race conditions, replay, workflow bypass, missing ownership checks.

## Context Checks

- Trace user-controlled input: request params/body/headers/cookies, route params, uploads, webhook payloads, WebSocket messages, database content from other users.
- Treat settings, environment variables, hardcoded constants, internal config files, and framework constants as server-controlled unless evidence says otherwise.
- Check framework protections before flagging: ORM parameterization, template auto-escaping, CSRF middleware, routing/auth middleware, validators, serializers, schema checks.
- Verify whether auth is required and whether the authenticated user can influence the input or target resource.

## Output

For a broad review, return confirmed vulnerabilities and needs-verification evidence to the sibling `code-review` output instead of emitting a second summary or verdict. For a standalone vulnerability audit, use:

```markdown
## Security Review

### Summary
- Findings: <count>
- Risk level: Critical/High/Medium/Low
- Confidence: High/Mixed

### Findings
- **[Severity] [Type]** `file:line`
  - **Issue:** <confirmed vulnerability>
  - **Impact:** <attacker outcome>
  - **Evidence:** <source -> sink path or relevant code>
  - **Fix:** <specific mitigation>

### Needs Verification
- `file:line` <what must be checked before calling this exploitable>
```

If no high-confidence vulnerabilities are found, state that explicitly and mention the reviewed scope.

## Avoid

- Reporting test files, docs, dead code, or comments unless explicitly in scope.
- Calling server-controlled configuration SSRF, redirect, or path traversal without user influence.
- Treating auto-escaped framework output as XSS unless escaping is explicitly bypassed.
- Downgrading a confirmed exploitable vulnerability into a style suggestion.
