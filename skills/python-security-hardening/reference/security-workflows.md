# Python 安全硬化 — 參考資料

Use this reference when Python code needs secure-by-default implementation choices.

## 目錄（Table of Contents）

- [觸發時機](#觸發時機)
- [邊界與分工](#邊界與分工)
- [Trust Boundaries](#trust-boundaries)
- [Secrets](#secrets)
- [Unsafe Primitives](#unsafe-primitives)
- [Filesystem and Paths](#filesystem-and-paths)
- [Subprocess and Shell](#subprocess-and-shell)
- [Network and Auth](#network-and-auth)
- [Dependencies](#dependencies)
- [Verification](#verification)
- [Checklist](#checklist)

---

## 觸發時機

- Review or harden security-sensitive Python code
- Handle secrets, credentials, or tokens
- Accept untrusted input from files, network, or users
- Call shell commands or external programs
- Publish or update dependencies with security implications

---

## 邊界與分工

- 用 `security-code-review` 產出漏洞與 exploitability findings；通用 correctness/quality review 才用 `code-review`。
- 用 `python-packaging-release` 處理打包與 release mechanics。
- 用 `python-backend-development` 處理 framework structure。
- 這份參考專注在 implementation hardening，而不是審查報告。

---

## Trust Boundaries

- Identify every place data crosses trust boundaries.
- Treat user input, files, env vars, external services, and subprocess output as untrusted until validated.
- Make allowlists explicit.
- Fail closed when security assumptions are not met.

---

## Secrets

- Keep secrets out of source control.
- Avoid logging tokens, passwords, or private keys.
- Load secrets from approved config or secret managers.
- Mask secret-bearing values in diagnostics.

---

## Unsafe Primitives

- Avoid `eval`, `exec`, and dynamic import tricks on untrusted input.
- Avoid unsafe deserialization formats on untrusted payloads.
- Prefer typed parsers, JSON, or explicit schema validation.
- If a dangerous primitive is unavoidable, isolate and constrain it.

```python
# Prefer explicit parsing over unsafe object loading.
data = json.loads(payload)
```

---

## Filesystem and Paths

- Normalize and validate paths before use.
- Prevent traversal outside the intended root.
- Treat symlinks and temp files carefully when security matters.
- Write with least privilege and explicit destinations.

---

## Subprocess and Shell

- Prefer argument lists over shell strings.
- Treat every subprocess argument as security-sensitive.
- Use timeouts and explicit working directories.
- Do not pass user input to a shell without a clear allowlist.

```python
subprocess.run(["git", "status", "--short"], check=True)
```

---

## Network and Auth

- Use least-privilege auth scopes.
- Make endpoints, base URLs, and redirects explicit.
- Validate response shape before trusting it.
- Do not automatically trust redirects, downloaded content, or remote config.

---

## Dependencies

- Keep dependency sets minimal.
- Review additions that expand attack surface or transitive risk.
- Prefer maintained packages with clear provenance.
- Re-check build inputs when packaging or release behavior changes.

---

## Verification

- Re-run the original security-sensitive flow after hardening.
- Confirm functionality still works under expected inputs.
- Add tests for rejected or invalid inputs where practical.
- Verify no secrets leak into logs or errors.

---

## Checklist

- [ ] Trust boundaries identified
- [ ] Secrets handled safely
- [ ] Dangerous primitives avoided or isolated
- [ ] Paths and subprocess boundaries constrained
- [ ] Network/auth assumptions explicit
- [ ] Dependency impact reviewed
- [ ] Hardening verified with representative input
