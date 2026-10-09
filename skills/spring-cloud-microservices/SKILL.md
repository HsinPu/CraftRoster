---
name: spring-cloud-microservices
description: Spring Cloud and Spring Boot microservices guide covering service boundaries, configuration, discovery, API gateways, Resilience4j, OpenFeign/WebClient clients, messaging, Kafka, saga patterns, distributed tracing, service-to-service security, and operational readiness. Use when designing, building, or reviewing Spring-based distributed systems and cloud-native microservices.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Spring Cloud Microservices

在設計或維護 Spring Boot microservices、Spring Cloud、service-to-service communication、event-driven flows、gateway、resilience 或 distributed tracing 時使用本 skill。服務內部架構搭配 `java-architecture`；單體 Spring app 優先用 `spring-development`。

## Java Baseline Gate

When distributed-system work creates or changes Java source, clients, consumers, events, resilience code, or public service contracts, read `java-development` before planning. Keep this skill responsible for service boundaries and distributed behavior while `java-development` owns Java language, API, exception, resource, and compatibility decisions. Read-only topology analysis or platform-manifest work without those Java changes may use this Skill alone.

## When To Use

Use this skill when the task is about distributed Spring systems rather than one Spring Boot service in isolation.

- Design service boundaries, gateway behavior, service-to-service communication, events, resilience, tracing, or release strategy.
- Diagnose distributed failure modes such as retry storms, consumer lag, circuit breaker behavior, or dependency outages.
- Review whether a proposed microservice split is safe, observable, and operationally justified.

## Boundary Decisions

- 先用 bounded context、team ownership、data ownership、change cadence 決定 service boundary。
- 不要以 database table 或 controller 數量切 microservice。
- 每個 service 擁有自己的資料；跨服務 join 要改成 API composition、read model 或 event projection。
- 分散式系統成本包含 deploy、observability、schema evolution、incident response。

## Communication Choices

- Synchronous HTTP/gRPC：適合查詢或需要即時回應；必須有 timeout、retry、circuit breaker。
- Messaging/Kafka：適合事件通知、最終一致、削峰、跨 bounded context integration。
- 不要把 message queue 當 remote procedure call；事件 payload 要有版本與 idempotency key。

## Spring Cloud Patterns

- Config：集中配置可用，但 secrets 應交給 secret manager，不放 plain config repo。
- Gateway：處理 routing、auth boundary、rate limiting、headers；不要塞 business logic。
- Discovery：Kubernetes 環境優先使用 platform-native discovery，避免不必要的 Eureka。
- OpenFeign/WebClient：client 要集中設定 timeout、error mapping、metrics、retry policy。
- Resilience4j：使用 circuit breaker、bulkhead、rate limiter、retry，但避免重試風暴。

## Event-Driven Design

- 事件名稱描述已發生事實：`OrderPlaced`，不是命令 `PlaceOrder`。
- Producer 使用 outbox pattern 避免 DB commit 成功但 event publish 失敗。
- Consumer 必須 idempotent；用 event id / business key 去重。
- Saga / process manager 用於跨服務長流程；不要用分散式 transaction 掩蓋邊界錯誤。

## Observability And Operations

- 每個 service 暴露 health、readiness、metrics、structured logs、distributed traces。
- Trace/span/context propagation 要跨 HTTP 與 messaging 保留 correlation。
- Dashboard 需包含 latency、error rate、saturation、consumer lag、circuit breaker state。
- Runbook 要記錄 dependency failure、retry storm、backpressure、poison message 處理。

## Security

- Service-to-service auth 使用 mTLS、JWT audience、workload identity 或 service mesh policy。
- Gateway auth 不取代 downstream authorization；服務仍需驗證 caller 與權限。
- 不在事件 payload 放 secrets 或過量 PII。

## Testing And Release

- Consumer-driven contract tests 驗證 API/schema 相容性。
- Messaging schema 需要 versioning；新增欄位優先保持 backward compatible。
- 重要 flow 用 integration tests + Testcontainers 驗證 broker / DB / HTTP clients。
- Deployment 使用 canary、feature flags 或 backward-compatible rolling upgrade。

## Avoid

- Distributed monolith：服務分開部署但共享 database、同步鏈過長、一起 release。
- 無 timeout 的 Feign/WebClient 呼叫。
- 無上限 retry 疊加 gateway、client、message consumer。
- 在 gateway 或 consumer 裡實作大量 domain logic。

## Handoff

- Use `spring-development` for a single Spring Boot application's controllers, services, repositories, config, and tests.
- Use `java-architecture` for Clean Architecture, hexagonal boundaries, DDD, and package/module direction inside a service.
- Use `spring-webflux` for reactive WebClient/Reactor/WebFlux implementation details.
- Use `kubernetes-operations` or `deployment-operations` for cluster rollout, probes, manifests, and release operations.
- Use `observability-engineering` for SLI/SLO, metrics, logs, traces, dashboards, and alerts.
