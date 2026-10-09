---
name: spring-development
description: Spring and Spring Boot development guide covering application layering, dependency injection, configuration, web APIs, data access, security, testing, and observability. Use when building, reviewing, or refactoring Spring-based services and applications.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Spring 開發（Spring Development）

**在撰寫或維護 Spring / Spring Boot 專案時請讀取本 skill。**

本 skill 以「官方 reference docs」為優先依據，提供偏實務的最佳做法：專案結構、DI 與設定管理、REST API、資料存取與交易、Spring Security、測試策略、以及 Actuator/Observability。

## 適用範圍（Assumptions）

- 預設以現代版本為主：Spring Boot 3+ / Spring Framework 6+（或更高）
- 以 **Spring Boot** 當作預設組態管理與建置入口；若是純 Spring Framework（無 Boot），本 skill 會明確標註差異與替代做法

## When To Use

Use this skill when the task is about Spring or Spring Boot application code and architecture.

## Java Baseline Gate

When the Spring target creates or changes `.java` source, Java public APIs, exceptions, resources, or runtime behavior, read `java-development` before planning. Keep this skill responsible for Spring Boot boundaries, DI, configuration, web, transactions, testing slices, and observability while `java-development` owns Java language and compatibility decisions. Read-only diagnosis or configuration analysis without changes to those Java contracts or runtime behavior may use this Skill alone.

- Build, review, or refactor controllers, services, repositories, configuration, validation, transactions, or tests.
- Diagnose dependency injection, profiles, properties, data access, REST APIs, or Actuator/observability behavior.
- Choose Spring conventions and module boundaries for a Java backend.

## Workflow

1. Identify the Spring Boot version, build tool, entry point, package boundaries, and active profile/config.
2. Locate the affected controller, service, repository, configuration, test slice, or actuator surface.
3. Keep domain logic, transport DTOs, persistence, configuration, and security boundaries explicit.
4. Use constructor injection, typed configuration properties, validation, and test slices where appropriate.
5. Verify with focused unit/slice tests first, then broader integration or startup checks when shared behavior changes.

## Handoff

- Use `spring-security` for authentication, authorization, CSRF/CORS, JWT/OAuth2, or security filter-chain work.
- Use `spring-webflux` for reactive handlers, WebClient, Reactor, or non-blocking persistence.
- Use `spring-cloud-microservices` for gateway, service discovery, resilience, Kafka, tracing, or distributed-service concerns.
- Use `jpa-hibernate-development` or `mybatis-development` for persistence-layer details.
- Use `java-development` for general Java code style and language-level design outside Spring.

## 進階與參考（Bundled resources）

- **專案結構與分層**：controller/service/repository、DTO、configuration 與 boundary，見 [reference/project-structure.md](reference/project-structure.md)。
- **DI 與組態**：constructor injection、`@ConfigurationProperties`、profiles、環境變數、依賴邊界，見 [reference/di-and-configuration.md](reference/di-and-configuration.md)。
- **Web API**：REST 設計、validation、例外處理、錯誤回應、序列化、API versioning，見 [reference/web-api.md](reference/web-api.md)。
- **Data/JPA**：transaction、N+1、fetch 策略、repository 設計、migration，見 [reference/data-jpa.md](reference/data-jpa.md)。
- **Security**：認證/授權、CSRF、headers、resource server，見 [reference/security.md](reference/security.md)。
- **Testing**：test slicing、`@SpringBootTest`、MockMvc/WebTestClient、Testcontainers，見 [reference/testing.md](reference/testing.md)。
- **Observability/Actuator**：health/metrics/tracing、production endpoints 暴露策略，見 [reference/observability.md](reference/observability.md)。

---

## 外部參考（官方）

- Spring Boot Reference：`https://docs.spring.io/spring-boot/`
- Spring Framework Reference：`https://docs.spring.io/spring-framework/reference/`
- Spring Framework（Java-based config）：`https://docs.spring.io/spring-framework/reference/core/beans/java.html`
- Spring Framework（Environment abstraction）：`https://docs.spring.io/spring-framework/reference/core/beans/environment.html`
- Spring Boot Actuator：`https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html`
- Spring Boot Testing：`https://docs.spring.io/spring-boot/docs/current/reference/html/testing.html`
- Spring Security Reference：`https://docs.spring.io/spring-security/reference/`
- Spring Data JPA Reference：`https://docs.spring.io/spring-data/jpa/reference/`
