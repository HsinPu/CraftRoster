---
name: jpa-hibernate-development
description: JPA and Hibernate development guide for entity modeling, associations, fetch strategies, transactions, repositories, query optimization, migrations, auditing, pagination, indexing, and Spring Data JPA usage. Use when designing or refactoring Java persistence layers that use JPA/Hibernate rather than MyBatis, especially in Spring Boot services.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# JPA / Hibernate Development

在 Java 專案使用 JPA、Hibernate 或 Spring Data JPA 建立資料層時使用本 skill。若專案使用 MyBatis，改用 `mybatis-development`；若需要 schema / index / migration 設計，也搭配 `database-design`。

## Java Baseline Gate

When JPA or Hibernate work creates or changes Java entities, repositories, projections, services, exceptions, or public contracts, read `java-development` before planning. Keep this skill responsible for ORM mapping, fetching, transactions, queries, migrations, and persistence behavior while `java-development` owns Java type, API, and implementation decisions. Mapping or query-plan review without those Java changes may use this Skill alone.

## When To Use

Use this skill when the task is about JPA, Hibernate, or Spring Data JPA persistence implementation.

- Design, review, or refactor entities, repositories, associations, transactions, queries, projections, or fetch plans.
- Diagnose N+1 queries, lazy loading, transaction boundaries, mapping problems, or persistence performance.
- Write persistence tests that verify ORM behavior against the real database dialect.

## Workflow

1. 先確認 domain model、table ownership、read/write paths 與 transaction boundary。
2. 設計 entity 時先決定 identity、lifecycle、immutability、auditing 與 migration 策略。
3. 預設 lazy association，針對 use case 用 query / projection 明確取資料。
4. 為常見查詢與 foreign keys 設計 index；用實際 query plan 驗證。
5. 用 integration tests 驗證 mapping、constraint、transaction 與 fetch behavior。

## Entity Modeling

- Entity 表示 persistence model，不一定等於 API DTO 或 domain command。
- 用 `@Enumerated(EnumType.STRING)`，避免 ordinal 造成資料相容性問題。
- 明確設定 `@Column(nullable = false, length = ...)`、unique constraint、foreign key。
- 避免在 entity `equals` / `hashCode` 使用 mutable fields 或 lazy collections。
- Production schema 以 Flyway / Liquibase migration 為準，不依賴 Hibernate auto DDL。

## Associations And Fetching

- 預設 `LAZY`；避免對 collection 使用 `EAGER`。
- 避免無限制雙向關聯；需要雙向時維護 helper method 保持兩端一致。
- 對 read path 使用 DTO projection、interface projection、`JOIN FETCH` 或 entity graph。
- 檢查 N+1：打開 SQL log、觀察 query count、用測試覆蓋常見 list/detail endpoint。

## Transactions

- Transaction boundary 放在 service layer，避免 controller 直接控制 persistence 細節。
- read path 使用 `@Transactional(readOnly = true)`。
- Transaction 內避免慢外部 I/O、HTTP calls、message publishing blocking path。
- Lazy loading 不應靠 Open Session In View 掩蓋設計問題。

## Repository And Queries

- Derived query 適合簡單條件；複雜查詢用 `@Query`、Specification、Querydsl 或自訂 repository。
- 大型 list 回應用 pagination；高流量或深分頁考慮 keyset pagination。
- Bulk update/delete 會繞過 persistence context；執行後要清理或重新載入相關 entity。
- Native query 要隔離並註明 DB dialect 假設。

## Performance And Operations

- 為 filter、sort、join pattern 建 composite index，而不是只為單欄位加 index。
- Batch writes 需同時確認 ID strategy、`hibernate.jdbc.batch_size`、flush/clear 策略。
- Second-level cache 只用於明確 read-heavy 且可管理 eviction 的資料。
- Connection pool 大小需符合 DB capacity、request concurrency 與 transaction duration。

## Testing

- Repository / mapping 測試優先用 `@DataJpaTest` + Testcontainers。
- 驗證 migration、constraint、transaction rollback、fetch strategy 與 query count。
- 不要用 H2 測 PostgreSQL/MySQL-specific 行為。

## Handoff

- Use `database-design` for schema modeling, indexes, constraints, and migration strategy.
- Use `sql-best-practices` for standalone SQL query review or optimization.
- Use `spring-development` for broader Spring Boot service, controller, configuration, or testing work.
- Use `mybatis-development` when the project uses MyBatis instead of JPA/Hibernate.
