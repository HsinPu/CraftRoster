---
name: mybatis-development
description: MyBatis development guide covering mapper design, XML and dynamic SQL, result mapping, Spring transaction integration, performance, and security. Use when building or refactoring MyBatis-based persistence layers in Java projects.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# MyBatis 開發（MyBatis Development）

**在使用 MyBatis（含 MyBatis-Spring / Spring Boot Starter）撰寫資料存取層時請讀取本 skill。**

本 skill 以 MyBatis / MyBatis-Spring 官方文件為優先依據，整理偏實務的最佳做法：Mapper 與 XML 結構、參數與結果映射、動態 SQL、與 Spring 交易整合、效能與安全注意事項。

## Java Baseline Gate

When MyBatis work creates or changes Java mapper interfaces, domain or DTO types, services, exceptions, or public contracts, read `java-development` before planning. Keep this skill responsible for mapper XML, bindings, result maps, dynamic SQL, Spring transaction integration, and persistence behavior while `java-development` owns Java language and API decisions. XML-only mapping or SQL review without Java type or API changes may use this Skill alone.

## 適用範圍（Assumptions）

- MyBatis 3.5+；若搭配 Spring，預設使用 MyBatis-Spring（或 Spring Boot Starter）
- 預設以「Mapper interface + XML mapper」為主；簡單查詢可用 annotations，但複雜 mapping 仍以 XML 為優先

## When To Use

Use this skill when the task is about MyBatis mapper design, SQL mapping, dynamic SQL, or Spring/MyBatis persistence behavior.

- Create, review, or refactor mapper interfaces, XML mapper files, ResultMap definitions, and SQL fragments.
- Diagnose parameter binding, nested result mapping, lazy loading, batch execution, or transaction behavior.
- Improve performance, safety, or maintainability in a MyBatis-backed data access layer.

## Workflow

1. Identify the mapper interface, XML mapper, domain object, SQL statement, and calling service.
2. Check parameter binding, result mapping, dynamic SQL branches, and null/empty behavior.
3. Validate transaction boundaries and Spring integration before changing persistence behavior.
4. Prefer `#{}` binding, explicit ResultMap definitions for complex shapes, and safe dynamic identifiers.
5. Verify with mapper tests, integration tests, generated SQL/log output, or the affected service flow.

## Handoff

- Use `database-design` when the task is schema modeling, indexes, constraints, or migration design.
- Use `sql-best-practices` when the main task is a standalone SQL query or query optimization.
- Use `spring-development` for broader Spring Boot application structure, DI, REST, or testing concerns.
- Use `jpa-hibernate-development` when the persistence layer uses JPA/Hibernate rather than MyBatis.

## 進階與參考（Bundled resources）

- **Mapper / XML 最佳實務**：命名、參數綁定、ResultMap、SQL fragments、Dynamic SQL，見 [reference/mapper-xml.md](reference/mapper-xml.md)。
- **Spring 整合與交易**：`SqlSessionTemplate`、Mapper 注入、`@Transactional`、Batch Executor 限制，見 [reference/spring-integration.md](reference/spring-integration.md)。
- **效能**：N+1、nested select vs join/nested results、cursor、RowBounds、cache 與 timeout/fetchSize，見 [reference/performance.md](reference/performance.md)。
- **安全**：`#{}` vs `${}`、動態識別字白名單、SQL injection 風險與防護，見 [reference/security.md](reference/security.md)。

---

## 外部參考（官方）

- MyBatis 3 Reference：`https://mybatis.org/mybatis-3/`
- MyBatis 3 Configuration：`https://mybatis.org/mybatis-3/configuration.html`
- MyBatis 3 Mapper XML Files：`https://mybatis.org/mybatis-3/sqlmap-xml.html`
- MyBatis 3 Dynamic SQL：`https://mybatis.org/mybatis-3/dynamic-sql.html`
- MyBatis 3 Java API：`https://mybatis.org/mybatis-3/java-api.html`
- MyBatis-Spring Reference：`https://mybatis.org/spring/`
- MyBatis-Spring Transactions：`https://mybatis.org/spring/transactions.html`
- MyBatis-Spring SqlSessionTemplate：`https://mybatis.org/spring/sqlsession.html`
- MyBatis-Spring Injecting Mappers：`https://mybatis.org/spring/mappers.html`
- MyBatis Spring Boot Starter：`https://www.mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/`
