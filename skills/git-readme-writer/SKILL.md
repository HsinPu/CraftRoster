---
name: git-readme-writer
description: README design and authoring guide for Git-based repositories, covering apps, libraries, CLIs, APIs, templates, monorepos, and internal or Gerrit-based projects. Use when creating, rewriting, expanding, or standardizing repository README documentation after inspecting project structure, setup flow, and usage patterns.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Git README Writer

## Purpose

此 skill 協助分析 Git-based 專案結構，為不同類型的 repository 撰寫或重構專業 README.md。
不要假設所有 GitHub README 都套用同一種模板；先判斷專案類型與主要讀者，再選擇合適的結構。
適用於一般 Git repository，也適用於託管在 GitHub 或 Gerrit 的專案。

## Handoff

- Use `markdown-writer` for general Markdown formatting and structure after the README scope is clear.
- Use `repo-ready` when README work is part of broader repository hygiene, CI, release, or packaging readiness.
- Use `github-operations` when README links, issues, releases, or repository metadata need live GitHub checks.
- Use `specification-authoring` when the target is a formal spec rather than a repository README.

## When to Use

- 使用者要求為 Git / GitHub / Gerrit 專案建立、重寫或補強 README.md
- 現有 README 過於簡短、內容過時，或缺少安裝、使用、設定、貢獻說明
- 需要判斷 README 應偏向 Product / Library / CLI / API / Template / Monorepo / Internal / Enterprise / Gerrit 等寫法
- 需要把 README 標準化，同時保留不同專案類型與託管平台的差異
- 需要補充 GitHub 的 Issues / Pull Requests / Actions，或 Gerrit 的 review flow / Change-Id 要求
- 需要把 onboarding、developer workflow、contribution process 寫清楚

## README Type Selection

1. 先判斷 repository 的主要目標：展示產品、提供套件、發布 CLI、說明 API、提供 template、管理 monorepo，或支援內部開發。
2. 再判斷主要讀者：end users、integrators、contributors、internal developers。
3. 選擇一個 primary README type；必要時只借用少數次要章節，不要把所有模板混在一起。
4. 需要類型判斷、必填/選填章節、平台差異與骨架時，讀 [reference/readme-types.md](reference/readme-types.md)。
5. 需要可直接參考的 example pack 時，先讀 [reference/readme-examples.md](reference/readme-examples.md)，再打開對應類型的範例檔。

## Which Reference to Read

- **還不確定 README 類型**：先讀 [reference/readme-types.md](reference/readme-types.md)
- **想看所有可用範例分類**：先讀 [reference/readme-examples.md](reference/readme-examples.md)
- **只需要最小可用版本**：讀 [reference/readme-example-minimal.md](reference/readme-example-minimal.md)
- **需要完整類型 skeleton**：依類型打開對應 example file，例如 `Product / App`、`Library / SDK`、`CLI Tool`、`API Service`、`Template / Boilerplate`、`Monorepo`、`Internal / Enterprise / Gerrit`、`Research / Demo`
- **只需要 GitHub / Gerrit 補充段落**：讀 [reference/readme-example-platform-overlays.md](reference/readme-example-platform-overlays.md)
- **只需要局部 section**：讀 [reference/readme-example-section-snippets.md](reference/readme-example-section-snippets.md)

## Workflow

### Step 1: 分析專案結構

執行以下命令了解專案：

```bash
# 查看專案檔案結構
ls -la

# 查看 Git 遠端與託管平台
git remote -v
git branch --show-current

# 查看套件定義（若有）
cat package.json  # Node.js
cat pyproject.toml  # Python
cat pom.xml  # Java/Maven
cat Cargo.toml  # Rust

# 查看現有文件
ls *.md 2>/dev/null || echo "No markdown files"

# 查看原始碼結構
find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.java" | head -20
```

### Step 2: 收集專案資訊

從以下來源提取資訊：

1. **套件檔案**（package.json, pyproject.toml 等）：
   - 專案名稱、版本、描述
   - 主要依賴
   - Scripts/命令

2. **原始碼結構**：
   - 主要模組/元件
   - 架構模式
   - 對外提供的功能或入口

3. **現有文件**（若有）：
   - 既有說明
   - 使用範例
   - 開發與部署資訊

4. **託管平台資訊**（GitHub / Gerrit / 其他 Git hosting）：
   - Repository URL、default branch、clone 方式
   - Issue tracker / Pull Request / Code Review 入口
   - CI/CD 或平台功能（GitHub Actions、Releases、Pages、Gerrit review flow）
   - 貢獻流程限制（例如 Change-Id、commit message 規範、submit 流程）

### Step 3: 選擇 README 類型

- 依專案主要交付物與使用方式選擇 primary type。
- 若 repo root 是 monorepo，root README 先寫 workspace overview，再導向各 package / app 的子文件。
- 若 repo 同時有 GitHub 與 Gerrit，核心說明保持平台中立，review / issue / contribution 差異分章節呈現。
- 需要具體類型骨架時，讀 [reference/readme-types.md](reference/readme-types.md)。

### Step 4: 撰寫 common core

先寫大多數 README 都需要的核心內容：

- `Title` 與一句價值說明
- `Quick Start` 或 `Installation`
- `Usage` 或最小可執行範例
- 依 selected type 加入 type-specific sections
- `Contributing`、`License`、`Links` 等收尾章節

### Step 5: 依託管平台調整內容

- **Generic Git**：保持平台中立，優先說明 clone、install、usage、project structure、license。
- **GitHub**：視需要加入 repository links、badges、Issues、Pull Requests、GitHub Actions、Releases、Packages、Pages 或 Demo 連結。
- **Gerrit**：視需要加入 clone URL、review URL、Change-Id 要求、`git review` 或 `git push origin HEAD:refs/for/<branch>` 流程。
- **GitHub + Gerrit 並存**：主體保持平台通用，把 review / issue / contribution 差異獨立寫在 `Contributing`、`Development` 或 `Links` 章節。

### Step 6: 依專案類型細化內容

- **Product / App**：強調功能、畫面、Demo、部署或本機執行。
- **Library / SDK**：強調安裝、版本相容性、API surface 與使用範例。
- **CLI Tool**：強調命令、參數、範例、輸出與安裝方式。
- **API Service**：強調啟動方式、認證、端點、環境變數與文件連結。
- **Template / Monorepo / Internal / Enterprise / Gerrit / Research**：依需要讀 [reference/readme-types.md](reference/readme-types.md) 的對應章節。

## Writing Guidelines

1. **型別優先**：先選 README 類型，再決定章節，不要硬套單一萬用模板。
2. **讀者優先**：先回答主要讀者最先想知道的事，再補內部細節。
3. **保留核心**：至少涵蓋 Overview、Install/Quick Start、Usage，以及必要的 contribution / license 資訊。
4. **提供範例**：程式碼範例、命令範例、畫面連結通常比長段文字更有價值。
5. **平台分層**：先寫平台通用內容，再補 GitHub / Gerrit 專屬資訊，避免 README 過度綁定單一平台。
6. **避免冗餘**：README 負責導覽與入門；過長細節可連到 `docs/`、API 文件或子 README。
7. **避免 emoji**：除非使用者明確要求。

## References

- README 類型與骨架：見 [reference/readme-types.md](reference/readme-types.md)
- README 範例索引：見 [reference/readme-examples.md](reference/readme-examples.md)
- Minimal 範例：見 [reference/readme-example-minimal.md](reference/readme-example-minimal.md)
- Product / App 範例：見 [reference/readme-example-product-app.md](reference/readme-example-product-app.md)
- Library / SDK 範例：見 [reference/readme-example-library-sdk.md](reference/readme-example-library-sdk.md)
- CLI Tool 範例：見 [reference/readme-example-cli-tool.md](reference/readme-example-cli-tool.md)
- API Service 範例：見 [reference/readme-example-api-service.md](reference/readme-example-api-service.md)
- Template / Boilerplate 範例：見 [reference/readme-example-template-boilerplate.md](reference/readme-example-template-boilerplate.md)
- Monorepo 範例：見 [reference/readme-example-monorepo.md](reference/readme-example-monorepo.md)
- Internal / Enterprise / Gerrit 範例：見 [reference/readme-example-internal-enterprise-gerrit.md](reference/readme-example-internal-enterprise-gerrit.md)
- Research / Demo 範例：見 [reference/readme-example-research-demo.md](reference/readme-example-research-demo.md)
- Platform Overlay 範例：見 [reference/readme-example-platform-overlays.md](reference/readme-example-platform-overlays.md)
- Common Section Snippets：見 [reference/readme-example-section-snippets.md](reference/readme-example-section-snippets.md)
- 可攜式 README 結構：參考內附 [README 類型與骨架](reference/readme-types.md)，並以目前專案內容填入可驗證的資訊。
- Markdown 撰寫規範：參考 [markdown-writer](../markdown-writer/) skill
