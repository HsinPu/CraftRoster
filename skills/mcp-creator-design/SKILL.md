---
name: mcp-creator-design
description: MCP server design guide for creating high-quality Model Context Protocol integrations with well-designed tools, workflows, and service boundaries. Use when building MCP servers that connect LLMs to external APIs or services in Python or Node/TypeScript.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# MCP Server 開發指南（MCP Creator Design）

建立能讓 LLM 透過設計良好的 **tools** 與外部服務互動的 MCP（Model Context Protocol）伺服器。MCP 伺服器的品質取決於能否協助 LLM 完成真實任務。

---

## When To Use

Use this skill when the task is to design, build, review, or evaluate an MCP server or MCP tool surface.

- Create a new MCP server in TypeScript, Python, or Java.
- Design tool names, schemas, annotations, authentication, pagination, errors, or output formats.
- Review whether an MCP server is useful for agents and safe to expose.
- Build evals that prove an LLM can use the MCP tools for realistic tasks.

## 流程總覽（High-Level Workflow）

高品質 MCP 伺服器分為四個階段：**研究與規劃 → 實作 → 審查與測試 → 建立評測**。

---

## Phase 1：深入研究與規劃

### 1.1 理解現代 MCP 設計

- **API 覆蓋 vs 工作流程工具**：在完整 API 端點覆蓋與專用工作流程工具之間取得平衡。工作流程工具對特定任務較方便；完整覆蓋則讓 agent 能自由組合操作。不確定時優先**完整 API 覆蓋**。
- **Tool 命名與可發現性**：使用清楚、描述性名稱與一致前綴（如 `github_create_issue`、`github_list_repos`），採**動詞導向**命名。
- **Context 管理**：Tool 描述簡潔、支援篩選與分頁；回傳精簡、相關的資料。
- **可執行的錯誤訊息**：錯誤訊息應提供具體建議與下一步，引導 agent 修正。

### 1.2 研讀 MCP 協定文件

- 從 sitemap 開始：`https://modelcontextprotocol.io/sitemap.xml`
- 取得具體頁面時使用 `.md` 後綴（如 `https://modelcontextprotocol.io/specification/draft.md`）
- 重點：規格總覽與架構、傳輸機制（streamable HTTP、stdio）、tool / resource / prompt 定義

### 1.3 研讀框架文件

**建議技術棧**：**TypeScript**（SDK 支援佳、執行環境相容性高）；**傳輸**：遠端用 **Streamable HTTP**（stateless JSON）、本機用 **stdio**。

- **MCP 最佳實踐**：必讀 [reference/mcp_best_practices.md](reference/mcp_best_practices.md)
使用目前可用、已授權的文件擷取能力，取得所選 SDK 的官方文件並核對專案使用的版本；不依賴工具必須叫做 WebFetch。下列 main README 是導航起點，不代表與已安裝版本相同。必要時查對應 release/tag 或本地 SDK source。

- **TypeScript**：官方 SDK `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`；參閱 [reference/node_mcp_server.md](reference/node_mcp_server.md)
- **Python**：官方 SDK `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`；參閱 [reference/python_mcp_server.md](reference/python_mcp_server.md)
- **Java**：官方 SDK `https://raw.githubusercontent.com/modelcontextprotocol/java-sdk/main/README.md`；參閱 [reference/java_mcp_server.md](reference/java_mcp_server.md)

文件來源不可用時，先查已安裝 SDK source、版本資訊或可用的官方快取，標示核對範圍與未驗證 API。繼續不依賴缺失證據的工作；只有該版本／能力差異會影響正確性時才暫停相應實作，不捏造已讀過最新文件。

### 1.4 規劃實作

- 理解目標服務的 API：端點、認證、資料模型；需要外部證據時使用可用的搜尋或官方文件擷取能力。
- **Tool 選擇**：優先完整 API 覆蓋，列出要實作的端點，從最常用操作開始

---

## Phase 2：實作

### 2.1 專案結構

- TypeScript：見 [reference/node_mcp_server.md](reference/node_mcp_server.md) 的專案結構、package.json、tsconfig.json
- Python：見 [reference/python_mcp_server.md](reference/python_mcp_server.md) 的模組與依賴
- Java：見 [reference/java_mcp_server.md](reference/java_mcp_server.md) 的 Maven/Gradle 依賴與結構

### 2.2 核心基礎設施

建立共用工具：API 客戶端與認證、錯誤處理、回應格式（JSON/Markdown）、分頁支援。

### 2.3 實作每個 Tool

對每個 tool：

| 項目 | 作法 |
|------|------|
| **Input Schema** | 使用 Zod（TypeScript）或 Pydantic（Python）；含約束與清楚描述，欄位描述可加範例 |
| **Output Schema** | 盡量定義 `outputSchema`；TypeScript 可用 `structuredContent`；利於客戶端理解與處理 |
| **Tool 描述** | 簡短功能摘要、參數說明、回傳型別 |
| **實作** | I/O 用 async/await、錯誤處理並給出可執行的錯誤訊息、支援分頁、可同時回傳文字與結構化資料 |
| **Annotations** | 依情況設定 `readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint` |

細節與範例見 [reference/node_mcp_server.md](reference/node_mcp_server.md)、[reference/python_mcp_server.md](reference/python_mcp_server.md)。

---

## Phase 3：審查與測試

### 3.1 程式品質

- 無重複程式碼（DRY）
- 一致的錯誤處理
- 完整型別覆蓋
- Tool 描述清楚

### 3.2 建置與測試

- **TypeScript**：`npm run build` 確認編譯；以 MCP Inspector 測試：`npx @modelcontextprotocol/inspector`
- **Python**：`python -m py_compile your_server.py` 檢查語法；以 MCP Inspector 測試
- **Java**：`mvn -q test` 或 `./mvnw test`；以 MCP Inspector 測試

語言別檢查清單見對應 reference。

---

## Phase 4：建立評測（Evaluations）

實作完成後建立評測，驗證 LLM 能否有效使用此 MCP 伺服器回答真實、複雜問題。

**完整步驟與格式見 [reference/evaluation.md](reference/evaluation.md)。**

要點：

1. **目的**：測試 LLM 是否能透過 MCP 工具回答複雜、貼近真實的題目。
2. **題目數量**：建議 10 題；經 tool 檢視 → 唯讀探索 → 出題 → 自行驗證答案。
3. **題目條件**：獨立、唯讀（非破壞性）、需多步 tool 呼叫與深入探索、貼近真實、可驗證（單一明確答案、可字串比對）、答案穩定。
4. **輸出格式**：XML，內含多組 `<qa_pair><question>...</question><answer>...</answer></qa_pair>`。

---

## Handoff

- Use `mcp-ops` when the task is listing, configuring, authenticating, or calling existing MCP servers/tools.
- Use `api-contract-design` or `openapi-spec-generation` when the work is API contract design rather than MCP implementation.
- Use `typescript-development`, `python-development`, or `java-development` for language-specific implementation details.
- Use `skill-security-review` when adopting third-party MCP code, scripts, or templates.

## 進階與參考（Bundled resources）

需查閱下列主題時，依表格載入對應檔案：

| 檔案 | 用途 |
|------|------|
| [reference/mcp_best_practices.md](reference/mcp_best_practices.md) | 命名、回應格式、分頁、傳輸、安全與錯誤處理 |
| [reference/node_mcp_server.md](reference/node_mcp_server.md) | TypeScript 專案結構、Zod、tool 註冊、範例與檢查清單 |
| [reference/python_mcp_server.md](reference/python_mcp_server.md) | Python/FastMCP 結構、Pydantic、`@mcp.tool`、範例與檢查清單 |
| [reference/java_mcp_server.md](reference/java_mcp_server.md) | Java/MCP Java SDK 結構、Tool 註冊、傳輸（stdio/streamable HTTP）、範例與檢查清單 |
| [reference/evaluation.md](reference/evaluation.md) | 評測題目產出流程、XML 格式與範例 |

**外部文件（Phase 1 依需載入）**：MCP 規格自 sitemap 取得；TypeScript SDK README、Python SDK README 見 Phase 1.3 所列 URL。
