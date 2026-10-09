---
name: jvm-build-tooling
description: JVM build tooling guide for Maven and Gradle projects, dependency management, wrapper usage, multi-module builds, plugin configuration, reproducible builds, CI commands, and Java version alignment. Use when editing pom.xml, build.gradle, build.gradle.kts, Maven/Gradle wrappers, dependency upgrades, build failures, or Java project setup.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# JVM Build Tooling

在處理 Maven / Gradle、Java version、dependency、plugin、wrapper、multi-module build 或 CI build failure 時使用本 skill。

## Java Source Gate

Keep build-file-only Maven, Gradle, wrapper, dependency, plugin, toolchain, and CI work in this skill. When the same task changes `.java` source, runtime behavior, compiler-facing public APIs, or Java implementation to resolve the build, read `java-development` before planning and keep this skill responsible for the build graph and toolchain.

A build-file-only task can use this Skill alone. Check the Java baseline only for the affected source or runtime branch; if it is unavailable, report that branch as pending and continue independent build-graph inspection without treating an unrelated Java file as an activation trigger.

## Handoff

- Use `java-development` for Java code style, APIs, language-level design, or implementation changes.
- Use `java-testing` when the task is primarily test design or test failure repair.
- Use `spring-development` for Spring Boot application configuration beyond build files.
- Use `github-actions-ci` when the build problem is mostly CI workflow configuration.
- Use `security-scanning` when dependency changes are driven by CVE or supply-chain scanning requirements.

## Workflow

1. 先辨識 build system：`pom.xml`、`build.gradle`、`build.gradle.kts`、`mvnw`、`gradlew`。
2. 讀取 project Java version、toolchain、parent / convention plugin、dependency management 來源。
3. 做最小修改：優先改 root convention 或 dependency catalog，避免在多個 module 重複版本。
4. 使用 wrapper 執行驗證：`./mvnw` / `mvnw.cmd` 或 `./gradlew` / `gradlew.bat`。
5. 若 build 失敗，先定位 phase / task / plugin / dependency conflict，再改設定。

## Maven Rules

- 優先使用 Maven Wrapper；沒有 wrapper 才使用系統 `mvn`。
- 多 module 專案把共用版本放在 parent `dependencyManagement` 或 BOM。
- plugin 版本放在 `pluginManagement`，不要讓 plugin version 隱性漂移。
- 常用驗證：`mvnw.cmd test`、`mvnw.cmd verify`、`mvnw.cmd -pl <module> -am test`。
- 用 `mvnw.cmd dependency:tree` 查 conflict、duplicate dependency、scope 問題。

## Gradle Rules

- 優先使用 Gradle Wrapper；不要假設系統 Gradle 版本正確。
- Kotlin DSL 專案改 `build.gradle.kts`，Groovy DSL 專案改 `build.gradle`，不要混用。
- 版本集中到 version catalog（`libs.versions.toml`）或 convention plugin。
- 常用驗證：`gradlew.bat test`、`gradlew.bat check`、`gradlew.bat :module:test`。
- 用 `gradlew.bat dependencies`、`dependencyInsight` 查 transitive conflict。

## Dependency Upgrades

- 先確認 upgrade 類型：patch/minor/major、framework BOM、security CVE、Java version bump。
- Major upgrade 要查 breaking changes，分階段處理 compile、test、runtime、config。
- 不要只改 version；同時確認 plugin、annotation processor、test libraries、Docker/CI Java image。
- Security upgrade 要保留最小範圍，避免順手升級無關依賴。

## Java Version Alignment

- 同步 `sourceCompatibility` / `targetCompatibility`、Maven compiler release、Gradle toolchain、CI JDK、Docker base image。
- Java 17 / 21 feature 需確認 production runtime 支援。
- Library 專案避免使用超過 consumer baseline 的 classfile target。

## Avoid

- 手動刪 lockfile 或 wrapper 檔案來「修」build。
- 在每個 submodule 重複 hard-code 同一 dependency version。
- 忽略 warning 裡的 deprecation，等到 Gradle/Maven major upgrade 才處理。
- 混用 Maven 與 Gradle 指令驗證同一個專案。
