---
name: java-testing
description: Java testing engineering guide for JUnit 5, Mockito, AssertJ, Spring test slices, Testcontainers, JaCoCo coverage, ArchUnit architecture tests, test data builders, and deterministic test design. Use when writing, reviewing, or fixing Java or Spring tests, practicing TDD, adding regression tests, enforcing package boundaries, or diagnosing flaky JUnit test failures.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Java Testing

在撰寫、修正或審查 Java 測試時使用本 skill。若測試重點是 Spring Boot web/data/security slice，搭配 `spring-development`；若是在決定整體測試層級，搭配 `testing-strategy`。

## Java Baseline Gate

Read `java-development` when writing or fixing Java tests, changing production Java, or defining typed fixtures and public contracts. Keep this skill responsible for test levels, JUnit, assertions, mocks, containers, determinism, coverage, and architecture tests while `java-development` owns Java language, type, exception, resource, and production-code decisions.

Read-only review of existing tests and results can use this Skill alone. Do not create fixtures or edit test or production code in that mode; report coverage and proof gaps. An implementation or repair request activates the baseline above. If it is unavailable, name the affected branch and continue independent review while leaving Java edits pending.

## When To Use

Use this skill when the task is to write, repair, review, or improve Java tests.

- Add unit, slice, integration, regression, architecture, or CI-focused Java tests.
- Choose JUnit, AssertJ, Mockito, Spring test slices, Testcontainers, or ArchUnit patterns.
- Stabilize flaky Java tests or improve test data, fixtures, assertions, and boundaries.

## Workflow

1. 先區分只讀 review、測試設計或 implementation/repair，再確認要驗證的行為、失敗案例與邊界條件。
2. 選最小足夠的測試層級：pure unit、slice test、integration test、end-to-end。
3. 只讀 review 核對既有測試、結果與 coverage gaps；設計模式提出測試案例。Implementation/repair 才依所選驗證策略補測試與最小修正，必要時先建立 failing/regression test。
4. 保持測試 deterministic：固定時間、隨機值、外部 I/O、thread scheduling 與資料庫狀態。
5. 在授權執行模式跑最窄測試，再依影響擴大到 module / full build；只讀模式檢查既有結果並標明需要新執行的缺口。

## Test Level Choices

- **Pure unit**：domain logic、validators、mappers、small services；用 JUnit 5、AssertJ、Mockito。
- **Spring slice**：controller 用 `@WebMvcTest` / `MockMvc`，reactive web 用 `@WebFluxTest` / `WebTestClient`，JPA repository 用 `@DataJpaTest`，JSON serialization 用 `@JsonTest`，security 用 `spring-security-test`。
- **Integration**：需要 real DB、message broker、cache 或完整 Spring context 時使用 `@SpringBootTest` + Testcontainers。
- **Contract/regression**：修 bug 時先寫能重現問題的測試，避免只測 implementation detail。
- **Architecture tests**：需要維持 package/layer boundary 時使用 ArchUnit。

## JUnit And Mockito Rules

- 用 Arrange / Act / Assert 結構，測試名稱描述行為與期望。
- 預設用 AssertJ：`assertThat(...)`、`assertThatThrownBy(...)`。
- 避免 partial mock、deep stubs、過度驗證 internal calls。
- 只 mock 外部邊界或昂貴依賴；domain object 優先使用真實 instance。
- 使用 `@ParameterizedTest` 覆蓋輸入矩陣，不要複製多個幾乎相同的 test。

## Test Data Design

- 用 test data builders 或 object mothers 建立可讀資料，避免每個 test 重複長建構式。
- Builder 預設值要是 valid object；每個 test 只覆蓋和行為相關的欄位。
- 固定 clock、UUID、random、locale、timezone，讓 failure 可重現。
- 測試資料命名要表達意圖，例如 `expiredSubscription()` 比 `subscription2()` 好。

## Spring And Testcontainers

- 優先使用 slice test；只有跨多層行為才用 `@SpringBootTest`。
- DB 行為不要用 H2 假裝 production DB；需要 SQL dialect、migration、constraint 行為時用 Testcontainers。
- 用 `@DynamicPropertySource` 注入 container URL / credentials。
- 每個測試隔離資料；避免依賴測試執行順序。
- Testcontainers 優先共用 container lifecycle，但每個 test 清理資料或使用 transaction rollback。
- Kafka/Redis/DB container 測試要等 readiness，不要用固定 sleep。

## ArchUnit Boundary Tests

- 用 ArchUnit 驗證 domain 不依賴 Spring、JPA、HTTP、messaging 或 external SDK。
- 驗證 controller 只依賴 application/use-case boundary，不直接依賴 persistence adapter。
- 驗證 package cycle，避免 feature/module 互相纏繞。
- Architecture tests 應檢查少量重要規則；不要把所有 code style 都塞進 ArchUnit。

## Coverage And CI

- Coverage 是風險訊號，不是目標本身；新增功能與 bug fix 應覆蓋主要成功與失敗路徑。
- Maven 常用：`mvn test`、`mvn verify`、`mvn jacoco:report`。
- Gradle 常用：`./gradlew test`、`./gradlew check`、`./gradlew jacocoTestReport`。
- Flaky test 先隔離 root cause：時間、並行、shared state、network、container readiness、test order。
- 對 flaky failure 建立穩定 fingerprint：test class、test method、exception type、top stack frame、container/service dependency。
- CI 失敗先保留原始報告和 logs，再修測試；不要只重跑直到變綠。

## Avoid

- 測 private method 而不是 public behavior。
- 用 sleep 等非 deterministic timing。
- 在 unit test 啟動完整 Spring context。
- 只 assert 不拋錯或只驗證 mock 被呼叫，沒有驗證可觀察結果。
- 使用 production secrets、shared external services 或開發者本機狀態當測試依賴。

## Handoff

- Use `testing-strategy` when deciding which test level or coverage strategy is appropriate.
- Use `spring-development` for Spring Boot slice tests and broader Spring testing context.
- Use `spring-webflux` for `WebTestClient`, Reactor `StepVerifier`, and reactive pipeline tests.
- Use `jpa-hibernate-development` or `mybatis-development` for persistence-specific integration tests.
