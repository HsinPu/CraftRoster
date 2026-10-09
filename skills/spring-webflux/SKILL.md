---
name: spring-webflux
description: Spring WebFlux and Project Reactor guide for reactive HTTP APIs, WebClient, backpressure, non-blocking persistence, R2DBC, Reactor operators, error handling, testing with WebTestClient, and avoiding blocking calls. Use when building, reviewing, or debugging reactive Spring Boot applications or deciding between MVC and WebFlux.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Spring WebFlux

在使用 Spring WebFlux、Project Reactor、WebClient、R2DBC 或 reactive pipelines 時使用本 skill。若專案是傳統 servlet/blocking stack，優先用 `spring-development`，不要為了流行而改 WebFlux。

## Java Baseline Gate

When WebFlux or Reactor work creates or changes Java source, typed handlers, domain APIs, exceptions, resources, or concurrency behavior, read `java-development` before planning. Keep this skill responsible for reactive pipelines, backpressure, schedulers, WebClient, R2DBC, and reactive tests while `java-development` owns the Java contracts and general implementation. Read-only workload or operator analysis without those Java changes may use this Skill alone.

## When To Use WebFlux

- 高並發 I/O-bound workload：proxy、streaming、SSE、WebSocket、fan-out HTTP calls。
- 需要端到端 non-blocking stack：WebFlux + reactive drivers + non-blocking clients。
- 不適合：CPU-heavy work、主要使用 blocking JDBC/JPA、團隊不熟 Reactor、低流量 CRUD。

## Workflow

1. Confirm the workload actually benefits from WebFlux and that the stack is non-blocking end to end.
2. Identify controller, handler, WebClient, Reactor chain, scheduler, and data-access boundaries.
3. Remove blocking calls from event-loop paths or isolate unavoidable legacy blocking calls explicitly.
4. Add timeout, retry, fallback, backpressure, and bounded-concurrency behavior where the flow needs it.
5. Verify with `WebTestClient`, `StepVerifier`, logs/metrics, cancellation/error cases, and blocking-call checks.

## Core Rules

- 不在 event loop 上執行 blocking I/O：JDBC、JPA、file I/O、sleep、blocking SDK calls。
- 不在 reactive chain 中呼叫 `block()` / `subscribe()` 作為業務流程控制。
- Error、timeout、retry、fallback 必須是 pipeline 設計的一部分。
- Backpressure 與 concurrency 要顯式限制，不要無限制 `flatMap`。

## Controller Patterns

- `Mono<T>` 表示 0/1 個結果，`Flux<T>` 表示 stream。
- Validation 和 auth context 在 boundary 處轉換成 use-case input。
- Streaming endpoint 要處理 cancellation、timeout 與 client disconnect。

## WebClient

- 設定 connect/read timeout、response size limit、base URL、default headers。
- 對 4xx/5xx 做明確 mapping；不要讓所有錯誤都變 generic exception。
- Retry 只用於 idempotent 或可安全重試的操作，並加 backoff / jitter / max attempts。
- 對 fan-out calls 使用 bounded concurrency。

## Reactor Guidance

- 使用 `map` 做同步轉換，`flatMap` 做 async boundary。
- 使用 `concatMap` 保序，使用 `flatMap(..., concurrency)` 控制並行。
- 使用 `switchIfEmpty` 處理 not found，使用 `onErrorMap` / `onErrorResume` 處理錯誤語意。
- 需要包 blocking legacy call 時，隔離到 `Schedulers.boundedElastic()`，並標註技術債。

## Data Access

- R2DBC 不等於 JPA；沒有 lazy loading、dirty checking、完整 ORM 行為。
- Transaction 用 reactive transaction manager；不要混用 blocking transaction manager。
- 複雜 relational mapping 可能更適合 MVC + JPA，而不是 WebFlux + R2DBC。

## Testing

- HTTP layer 用 `WebTestClient`。
- Reactor sequence 用 `StepVerifier`。
- 測 timeout、retry、empty、error、cancellation，不只測 happy path。
- 用 BlockHound 或 code review 檢查 blocking calls。

## Avoid

- 在 WebFlux app 中直接使用 JPA repository 服務主路徑。
- 用 `parallel()` 當一般效能優化。
- 在 chain 外部 mutable shared state。
- 忽略 `Mono<Void>` / empty completion 的錯誤處理。

## Handoff

- Use `spring-development` for traditional servlet/blocking Spring Boot applications.
- Use `spring-cloud-microservices` for distributed-service communication, gateway, resilience, or tracing concerns.
- Use `java-testing` for broader Java test design and Testcontainers outside reactive-specific testing.
- Use `jpa-hibernate-development` when the persistence layer is blocking JPA/Hibernate and WebFlux may be the wrong fit.
