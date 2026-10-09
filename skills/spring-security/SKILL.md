---
name: spring-security
description: Spring Security guide for Spring Boot services covering authentication, authorization, OAuth2/OIDC, JWT resource servers, method security, CSRF, CORS, security headers, secrets, rate limiting, and secure error handling. Use when designing, implementing, reviewing, or debugging security in Spring MVC or WebFlux applications.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Spring Security

在 Spring / Spring Boot 專案處理 authentication、authorization、OAuth2/OIDC、JWT、CSRF、CORS、headers、method security 或安全審查時使用本 skill。一般 Spring 架構仍搭配 `spring-development`；依賴 CVE 升級搭配 `jvm-build-tooling`。

## Java Baseline Gate

When Spring Security work creates or changes Java configuration, filters, handlers, annotations, domain authorization, or tests, read `java-development` before planning. Keep this skill responsible for the security model and controls while `java-development` owns Java language, API, exception, and resource behavior. Read-only policy review without those Java changes may use this Skill alone.

## Handoff

- Use `spring-development` for general Spring Boot application structure, controllers, services, config, and tests.
- Use `spring-webflux` when security work is in a reactive WebFlux application.
- Use `auth-integration` when comparing auth providers or integrating Auth0, Clerk, Supabase Auth, NextAuth/Auth.js, or similar products.
- Use `security-code-review` when the task is a broad vulnerability review rather than Spring-specific implementation.
- Use `jvm-build-tooling` when the task is dependency, plugin, or CVE upgrade work.

## Workflow

1. 先界定應用類型：browser session、REST API、resource server、BFF、internal service、WebFlux。
2. 明確列出 principal、roles/authorities、tenant/context、public endpoints、admin endpoints。
3. 設計 filter chain 與 authorization rules；預設 deny，逐步 allow。
4. 實作測試：unauthenticated、authenticated、forbidden、CSRF/CORS、token claims、method security。
5. 檢查 secrets、headers、error response、logging 與 dependency CVE。

## Authentication Choices

- Browser app：session + CSRF protection；不要把 CSRF 關掉當修法。
- API resource server：OAuth2 JWT validation；驗證 issuer、audience、expiry、signature、scope mapping。
- Internal service：mTLS、short-lived tokens 或 platform identity；不要使用 shared static API key 當唯一控制。
- Local dev/test：明確 profile 與 fake identity；不要讓 dev bypass 進 production config。

## Authorization Rules

- 用 request-level authorization 保護 route，用 method security 保護 business action。
- 權限命名穩定：`SCOPE_orders:read`、`ROLE_ADMIN`、domain permission 分清楚。
- Multi-tenant 系統要同時檢查身份和 resource ownership。
- 不要只在 UI 隱藏按鈕；server 端必須 enforce。

## Web Security Defaults

- CORS allowlist 必須明確，不用 `*` 搭配 credentials。
- Security headers 保持開啟：HSTS、X-Content-Type-Options、frame policy、content security policy 視情境設定。
- Validation errors 回傳可用訊息；unexpected errors 不回傳 stack trace 或 raw exception message。
- Logs 不記 token、password、cookie、authorization header、PII。

## Common Spring Checks

- `SecurityFilterChain` 規則順序是否正確，最寬鬆規則不可提前吞掉後續規則。
- Actuator endpoints 是否只暴露必要 health/info，敏感 endpoints 需保護。
- Password storage 使用 modern password encoder；不要使用 plain MD5/SHA1。
- Reactive Security 與 Servlet Security 不混用設定模型。

## Testing

- MVC：使用 `spring-security-test`、`@WithMockUser`、MockMvc request post processors。
- Resource server：測試 JWT claims 到 authorities 的 mapping。
- Method security：針對 service method 測 forbidden 與 allowed cases。
- CORS/CSRF：加入負向測試，不只測 happy path。

## Avoid

- 全域 `permitAll()` 後依賴 controller 自己檢查。
- 為了讓測試通過關閉 CSRF/CORS/security headers。
- 在 log、exception、API response 暴露 token 或 secrets。
- 把 authorization 寫成散落在 controller 的 ad hoc if 判斷。
