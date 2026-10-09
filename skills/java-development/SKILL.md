---
name: java-development
description: Write, modify, fix, review, refactor, and test Java source code, libraries, services, and applications. Use as the primary Java implementation and routing skill whenever work mentions Java, .java, javac, JVM stack traces, Java source sets, JUnit alongside production code, Spring, JPA, MyBatis, or Java public APIs; then load only the architecture, framework, persistence, testing, debugging, or refactoring skill that materially owns the remaining work.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Java Development

Use this skill as the baseline for Java implementation, review, debugging, testing, and refactoring.

## Java Routing Gate

Read this skill before planning when the target includes `.java`, `src/main/java`, `src/test/java`, a `javac` diagnostic, a Java or JVM stack trace, a Java public API, or Spring, JPA, Hibernate, MyBatis, or Reactor work that creates or changes Java source. A Maven or Gradle build-file-only task can remain with `jvm-build-tooling`; add this skill when Java source, runtime behavior, or public contracts also change.

Keep this skill responsible for supported Java versions and language features, packages and modules, type and generic design, null and validation boundaries, public API compatibility, exceptions, resources, concurrency, serialization boundaries, and general Java implementation. Add only the specialist that owns a material part of the task:

- Package, module, domain, hexagonal, or bounded-context architecture: `java-architecture`.
- JUnit, Mockito, AssertJ, Testcontainers, ArchUnit, or flaky Java tests: `java-testing`.
- Maven, Gradle, toolchains, dependency resolution, plugins, wrappers, or build phases: `jvm-build-tooling`.
- Spring Boot application structure, DI, configuration, REST, or observability: `spring-development`.
- Spring authentication, authorization, OAuth2, JWT, CSRF, or CORS: `spring-security`.
- WebFlux, Reactor, WebClient, R2DBC, or reactive behavior: `spring-webflux`.
- Spring Cloud, Kafka, gateways, resilience, or distributed services: `spring-cloud-microservices`.
- JPA, Hibernate, Spring Data, entities, repositories, or ORM behavior: `jpa-hibernate-development`.
- MyBatis mappers, XML, dynamic SQL, or MyBatis transactions: `mybatis-development`.
- Unknown compiler, build, test, or runtime cause: `systematic-debugging`.
- Behavior-preserving cleanup: `code-refactoring`.
- A required RED-GREEN-REFACTOR cycle: `test-driven-development`.

Do not load every related skill. Keep Java as the shared implementation baseline and select the smallest specialist set justified by the request.

General Java implementation can use this Skill alone. Before entering a material specialist concern above, check that its named Skill is available; if it is missing, name the blocked concern and continue independent Java work without claiming that specialist's contract was applied.

## When To Use

- Create or change Java classes, records, interfaces, services, libraries, commands, or application code.
- Fix compiler diagnostics, exceptions, resource leaks, concurrency defects, unsafe null handling, or public API regressions.
- Design packages, generics, domain types, adapters, validation boundaries, and stable Java interfaces.
- Add Java tests whose fixtures, assertions, or production contracts require language-level decisions.

## Workflow

1. Inspect the supported Java and runtime versions, build wrapper, toolchain, package layout, formatter, test framework, framework conventions, and public compatibility requirements.
2. Trace the owner path, inputs, outputs, exceptions, resources, concurrency, and callers before changing a type or method boundary.
3. Keep types, packages, and method boundaries aligned with the existing architecture; validate external data before treating it as a trusted domain type.
4. Use language features supported by the declared toolchain, and prefer clear immutable data and exhaustive modeling over type tricks.
5. Apply object-oriented or functional patterns only when they reduce real coupling, duplication, or invalid states.
6. Verify with the project wrapper's narrowest relevant unit, integration, build, static-analysis, or compatibility command, then broaden according to risk.

## Reference Routing

- Code style, naming, formatting, Javadoc, and exceptions: read [reference/code-style.md](reference/code-style.md).
- SOLID, dependency injection, composition, immutability, and pattern choices: read [reference/design-patterns.md](reference/design-patterns.md).
- Refactoring tactics and Java code smells: read [reference/refactoring.md](reference/refactoring.md).
- Modern Java versions, records and sealed types, null and validation boundaries, concurrency, resource lifetime, and public API compatibility: read [reference/modern-java-workflow.md](reference/modern-java-workflow.md).

## Rules

- Prefer composition and dependency injection over hidden global state.
- Keep domain logic out of controllers, adapters, and persistence mapping code.
- Treat HTTP, messaging, database, file, environment, and deserialized input as untrusted until validation establishes a domain-safe shape.
- Preserve interruption and cancellation semantics; do not swallow `InterruptedException` or block an event-loop path accidentally.
- Close owned resources deterministically and keep transaction, thread, executor, and client ownership explicit.
- Do not introduce a framework abstraction when a local plain Java boundary already exists.
- Preserve source, binary, and serialized public contracts unless a breaking change and migration are explicitly accepted.

## Handoff

- For Java package, module, Clean Architecture, hexagonal, or DDD boundaries, use `java-architecture`.
- For Maven, Gradle, toolchains, dependencies, plugins, or build-file-only work, use `jvm-build-tooling`.
- For Spring or Spring Boot services, use `spring-development`.
- For Java tests, use `java-testing`.
- For persistence with JPA/Hibernate or MyBatis, use `jpa-hibernate-development` or `mybatis-development`.
- For unknown Java compiler, test, or runtime failures, establish the cause with `systematic-debugging` before applying the smallest Java fix.
