# Skills 與子代理配套安裝規劃

日期：2026-10-09。狀態：**已依本規劃實作；交付驗證見[實作與驗證紀錄](audits/agent-skill-bundles-2026-10-09/implementation-validation.md)**。

規劃時查核基準：`26d01851f1a000ad71f3c003bbe36f71e0397cfe`。下方「現況」及未來式保留原規劃基準；目前操作方式以[互動式配套安裝](interactive-installation.md)為準。

已落地 15 個統一用途、配套後端及單次確認選單。969 筆原有 Agent 關聯已逐角色審核，移除 70、補入 68；最終 967 筆分為必需 5、建議 387、條件式 530、選配 45。詳見[關聯審核報告](audits/agent-skill-bundles-2026-10-09/README.md)。

目標是保留一個安裝指令，依使用者指定的順序：**選環境 → 選全域或專案 → 選全部或指定分類 → 相關 Skills 與子代理一起安裝**。一般流程只選用途，不必分別挑 Skills 與子代理。

[現有安裝方式](interactive-installation.md) · [Agent 目錄](../agents.json) · [Skill 目錄](../skills.json)

## 1. 現況與需要補上的部分

| 已查核的項目 | 現況 |
|---|---|
| 子代理 | 237 個，分成 31 類；全部都有 `skills` 清單 |
| 子代理與 Skill 的關聯 | 969 筆，涉及 138 個不同 Skills；尚未區分必需、建議、條件與可選 |
| Skill 目錄 | 286 個，分成 16 類；有 995 筆 Skill 之間的依賴 |
| Skill 安裝 | 已會遞迴補齊 `required`；`conditional`、`optional` 不會自動加入 |
| 子代理安裝 | 尚未根據每個子代理的 `skills` 清單補齊配套 |
| 共通委派配套 | 全量子代理安裝，或啟用全域主動委派時，會加入 `subagent-architecture` |
| 互動選單 | Skills 與 Agents 的分類分開選；已支援全域、專案及單平台專案安裝 |

現有 `skills` 清單表示「有關聯」，不是已經審核過的必要依賴。969 筆不能直接全部改成必需。Agent 與 Skill 分類也不能按名稱直接配對，因為它們使用不同分類方式。

資料來源：[canonical Agents](../agents/)、[Agent 安裝後端](../scripts/install.ps1)、[Skill 依賴驗證](../scripts/lib/skill-dependencies.js)、[現有寫入規則](interactive-installation.md#既有檔案保護)。

## 2. 使用者指定的安裝流程

一般使用者仍執行現在的一行啟動指令，再完成以下流程：

1. **環境**：Codex、Claude Code、Cursor、GitHub Copilot、OpenCode；保留跨平台專案選項。
2. **安裝範圍**：全域或專案。選專案時確認專案根目錄，沿用既有平台目的地。
3. **安裝方式**：全部安裝，或指定分類。
4. **分類**：只有選指定分類時才顯示「畫圖、程式開發、網頁設計、測試」等用途，可複選。
5. **配套預覽**：自動列出相關 Skills、子代理、必要依賴、實際總數與目的地。
6. **確認安裝**：通過預檢後，明確輸入 `y` 才開始寫入。

示意操作：

```text
選擇環境：Codex
安裝範圍：專案
專案目錄：D:\projects\my-project
安裝方式：指定分類
選擇分類：畫圖、程式開發
預覽：兩個分類的 Skills + 子代理 + 必要配套，共用項目去重
確認安裝：y
```

**全部安裝**代表目前目錄的全部 286 個 Skills 與 237 個子代理，寫入選定環境與範圍；不能把「所有子代理的相關 Skills」當成全部，因為目前只涵蓋 138 個不同 Skills。數量由當次來源目錄計算，不寫死在安裝器。全部模式直接進入預覽，不再顯示分類選單。

**指定分類**使用一份新的統一用途分類，每一類都是 Skills 與子代理的配套。這份分類需在首次交付時完成，不能先用目前 Agent 的 31 類選單替代使用者要的畫圖／程式用途選單。現有 16 類 Skills 和 31 類 Agents 保留作為來源索引與進階查詢。

一般流程不再顯示「Skills／Agents／兩者」選單，也不再要求兩種類型分別選分類。只裝 Skills、只選角色、調整配套等能力保留在進階入口或既有參數 CLI。

分類直接指定的 Agents／Skills 固定加入。普通配套安裝還會補齊所選子代理的 **必需 + 建議** Skills，不另外要求每個人回答依賴問題。最小、建議與自訂策略只控制 Agent 關聯所追加的 Skills，不能取消分類直接選取的元件或必要依賴。進階選項提供：

| 模式 | 由子代理追加的 Skills |
|---|---|
| 建議配套，預設 | 必需 + 建議，再展開所有選取 Skill 的必需依賴 |
| 最小配套 | 必需，再展開它們的必需依賴 |
| 自訂配套 | 必需固定保留；可取消建議項目，勾選條件與可選項目 |

上述配套模式放在進階選項，不增加一般使用者的必要操作。分類可複選與去重；全部模式在上一層已可選，不讓空白輸入在分類選單中意外變成全裝。`q`、取消和 EOF 的既有保護繼續有效。

### 統一用途分類的初版方向

| 顯示給使用者的分類 | 內容方向 |
|---|---|
| 畫圖與圖像處理 | 圖片生成、提示詞、圖像處理、Logo，搭配圖像相關子代理 |
| 程式開發 | 一般實作、程式語言、重構、版本控制，搭配開發角色 |
| 網頁與介面設計 | 前端、UI、設計系統、響應式介面，搭配設計與前端角色 |
| 測試與程式審查 | 測試策略、除錯、品質與程式審查，搭配測試和審查角色 |
| 資料庫與資料分析 | API 資料、資料庫、資料工程與分析 |
| AI 與 LLM | AI 應用、模型評估、檢索與機器學習 |
| 雲端部署與維運 | 部署、容器、CI、雲端、觀測與維運 |
| 資安與治理 | 安全分析、威脅模型、政策與操作治理 |
| 影片與音訊製作 | 影片、動畫、配音、字幕、影音製作角色 |
| 文件與辦公 | 文件、簡報、試算表與工作區管理 |
| 研究、需求與專案規劃 | 研究、需求、產品、專案與流程管理 |
| 寫作與商務營運 | 寫作、行銷、銷售、商務及其他專業職能 |
| 行動、桌面與嵌入式開發 | App、桌面、韌體及平台專業角色 |
| 3D 與互動圖形 | Three.js、3D 資產、渲染與互動 |
| Agent、Skill 與自動化工具 | 角色／Skill 開發、MCP、瀏覽器與工作自動化 |

這是分類方向提案，成員需逐項審核；過大的專業職能分類可以細分，不把不相關的角色硬塞在一起。每個 Skill 和子代理至少屬於一個用途分類，可合理跨類共用。分類中也要包含沒有被 Agent 清單引用的 Skills，避免 148 個目前未被引用的 Skills 無法按分類安裝。

## 3. 關聯分類與自動補齊方向

| 類型 | 判定標準 | 安裝規則 |
|---|---|---|
| `required` 必需 | 子代理的基本責任直接需要該 Skill 的流程或資源；缺少它就無法滿足角色契約 | 所有完整配套模式都加入，不能取消 |
| `recommended` 建議 | 提高一般工作的品質或效率，但角色能在缺少它時完成基本責任 | 建議配套預設加入；最小配套省略 |
| `conditional` 條件 | 特定框架、工作類型或明確情境才需要 | 顯示條件，由使用者選取，或由明確包含該能力的用途套裝選取 |
| `optional` 可選 | 延伸用途，沒有預設帶入的理由 | 使用者主動勾選才加入 |

每筆關聯都要有理由；條件關聯還要有清楚的 `when`。若角色本身已足以獨立工作，可沒有必需 Skill，不為了配套而製造依賴。

審核時必須一起看角色的 Task、Constraints、Output，以及 Skill 的實際使用範圍。正文中未列進清單的真實必要呼叫也要補上；無關、重複或過時的清單項目要移除。不能只依名稱或出現次數分類。

這是新的 **Agent → Skill** 關聯分類，不改寫目前 **Skill → Skill** 的 `required`／`conditional`／`optional` 定義。`recommended` 只新增到 Agent 配套關聯。

補齊方向採以下規則：

- **選用途分類 → 一起加入該分類定義的 Skills 與子代理**，再補所選子代理的必需與建議 Skills，以及 Skill 的必需依賴。
- **進階選子代理 → 自動補它的必需與建議 Skills**，再展開 Skill 的必需依賴。
- **進階只選 Skill → 提供相關子代理建議，不自動安裝子代理**。勾選某個子代理後，再套用正常配套規則。
- 不做雙向遞迴。加入的 Skill 不會再拉入所有使用它的子代理。
- 條件文字供人閱讀，不讓 shell 猜測自然語言或掃描專案後自行套用框架。
- `subagent-architecture` 的現有加入條件先保留；另行審核角色需求後才能擴大，不先假設每個子代理都依賴它。

例如 `web-research-ops` 現在與 52 個子代理有關聯。選這個 Skill 就自動安裝 52 個角色，不符合使用者只想安裝一項能力的需求。

## 4. 配套範例與第一批審核

以下是**依現有清單提出的審核候選**，不是已完成的正式依賴分類。

| 用途／子代理 | 現有相關 Skills | 審核重點 |
|---|---|---|
| 畫圖：`image-generator` | `baoyu-image-gen`、`ai-image-prompt-design`、`image-utils`、`design-consultation` | 分清圖片生成與網頁設計；工具、供應商和 API 設定需有清楚需求，不能把網頁角色全帶進來 |
| 程式開發：`python-pro` | `python-development`、`python-testing-engineering`、`python-security-hardening`、`python-packaging-release` | 區分基本開發、測試、安全檢查與正式打包發布；同分類其他語言角色另行審核 |
| 前端開發：`frontend-developer` | `frontend-design`、`javascript-development`、`typescript-development`、`react-ui-patterns`、`responsive-design` | React、TypeScript 有情境限制，不能當成所有前端工作的必需項目 |
| 程式審查：`code-reviewer` | `code-review`、`pipeline-review`、`security-code-review`、`testing-strategy`、`git-operations` | 區分日常審查配套與特定 CI／安全工作；確認哪些流程在角色正文中真的不可省略 |
| 測試：`test-automator` | `testing-strategy`、`frontend-testing`、`e2e-testing-patterns` | 前端與端對端測試的適用條件，不應套用到所有測試任務 |
| 需求分析：`business-analyst` | `requirements-deep-dive`、`solution-discovery`、`domain-modeling`、`data-organization-system`、`spreadsheet-ops` | 區分一般分析流程、領域建模，以及真的需要處理試算表的情境 |

共享項目要去重。例如現在選 `code-reviewer` 與 `test-automator`，共有 8 筆直接關聯，其中 `testing-strategy` 共用，只有 7 個不同 Skills。這是現有關聯的試算；正式預設安裝數量要等分類審核與依賴展開後才能確定。

用途套裝可以組合多個角色，例如「程式審查與測試」組合上述兩個子代理。套裝記錄角色成員及屬於該用途的 Skill 根項目，不複製每個角色的整份配套清單；角色配套仍由 canonical metadata 計算。

## 5. 資料來源與生成方式

### Agent 關聯的唯一來源

仍以 `agents/<role>.md` 為 canonical source。建議將平面 `skills` 改成結構化 `skill-dependencies`，每項包含 `name`、`kind`、`reason`，條件項目再含 `when`。不能維護兩份手寫清單。

以下只是 schema 示意，分類待角色審核確認：

```yaml
skill-dependencies:
  - name: frontend-design
    kind: recommended
    reason: 提供前端介面規劃與實作品質流程
  - name: react-ui-patterns
    kind: conditional
    when: 使用者選擇 React 開發能力
    reason: 提供 React 元件與狀態處理模式
```

生成的 `agents.json` 保留舊的 `skills: string[]`，由結構化關聯推導，供既有查詢和外部讀取者相容使用；另新增 `skillDependencies` 提供分類與理由。沒有關聯的獨立角色可使用空清單。

### 給安裝器的索引

新增生成檔 `scripts/data/install-agent-skill-dependencies.tsv`，欄位為：

```text
agent    skill    kind    when    reason
```

維護時由 Node.js 生成與驗證，使用者安裝時由 PowerShell／Bash 讀取，不增加一般安裝的 Node.js 需求。

驗證項目包含：角色與 Skill 存在、同角色無重複 Skill、類型有效、理由非空、條件有明確 `when`、TSV 欄位不能含 tab 或換行，以及生成檔與 canonical source 一致。完成遷移後不得留下未分類的舊關聯；第一階段審核須覆蓋全部 237 個角色，而非只完成範例。

Skill 自身依賴繼續使用既有 `scripts/data/skill-catalog.json` 與生成的 `install-skill-dependencies.tsv`。

### 用途分類的唯一來源

新增 `scripts/data/install-bundles.json`，每一類記錄穩定 `id`、顯示名稱、說明、Agent 成員及 Skill 根項目，再產生 `install-bundles.tsv` 等 shell 可讀索引。它引用既有 role／Skill 名稱，不建立新的角色副本，也不依兩套分類的同名推論關係。

分類成員按能力審核，允許共用，但不複製 Agent 的配套關聯。驗證必須確認名稱有效、分類不空、沒有重複成員，且分類聯集涵蓋全部 237 個角色及 286 個 Skills。分類編號只用於當次選單，穩定 id 用於文件、索引與進階 CLI。

## 6. 安裝計畫、範圍與相容性

安裝器先建立一份完整計畫：

1. 全部模式以所有 Skills／Agents 為根項目；分類模式合併選取套裝的角色與 Skills。再合併進階手選項目及角色配套。
2. 展開所有 Skill 的 `required` 依賴；條件與可選依賴維持明確選擇。
3. 以元件、名稱與實際目的地去重，保留各項加入原因。
4. 對整份計畫預檢 ownership、digest、來源、路徑與設定變更。
5. 顯示預覽並取得明確確認，再依既有套件寫入機制執行。

預覽要區分：全部或所選用途分類、分類內角色與 Skills、直接配套、遞迴必要配套、已安裝可更新的項目、邏輯套件總數與實際目的地。同一個共享 Skill 可以列多個加入原因，但在同一目的地只安排一次寫入。

配套沿用本次平台與安裝範圍。例如 Codex 專案模式，角色寫入 `<project-root>/.codex/agents/`，Skills 寫入 `<project-root>/.agents/skills/`。不把已有全域 Skill 默默當成專案配套已完成。跨平台專案會依原有 profiles 寫入各必要目的地，預覽要說明同一套件可能有多個平台副本。

保留以下行為：

- 同一次遠端流程共用一份來源 archive；分類安裝不等於分類下載。
- 來源或已修改內容的覆蓋保護繼續有效；配套也受同一規則保護。
- 任一預檢衝突、取消或 EOF 都不開始寫入；執行前再次檢查目的地狀態。
- 安裝或更新配套不自動移除未再選取的子代理或共享 Skills。
- 現有主動委派是獨立選項，安裝配套不等於同意修改全域委派設定。
- 沿用個別套件的復原機制；正式執行中途失敗時回報已完成與未完成清單，不宣稱整批會完整回滾。

進階 CLI 建議新增 `-AgentSkillPolicy`／`--agent-skill-policy`，支援 `required`、`recommended`、`legacy`。新互動入口明確傳入配套策略；舊參數入口未指定時保留目前的 `legacy` 行為，避免既有腳本突然增加安裝項目。`legacy` 預覽必須標示「尚未補齊角色配套」，不能宣稱滿足已分類的必需依賴。自訂選項可由共用計畫格式傳入。

新入口要檢查來源後端能力與索引版本；遇到舊 checkout／branch 時清楚提示更新，不能靜默忽略新策略而顯示成功。

## 7. 套件安裝與角色使用要分開驗證

目前 [adapter generator](../scripts/generate-agent-adapters.js) 會將平面 `skills` 清單寫入 Claude adapter，但 Codex 等 adapters 沒有同樣輸出。檔案一起安裝，尚不能證明各平台會自動載入或呼叫相應 Skill。

實作時要先查核各平台 runtime 支援，再決定 adapter 的能力提示或原生載入欄位。不得把所有建議／條件／可選 Skills 一律當成強制預載清單；任何會強制載入的宣告，都必須在最小配套下也能找到必要內容。改 generator 後重新生成，不直接修改 `adapters/`。

外部工具、API key、插件或服務帳號的啟用不是本次檔案安裝的自動效果，說明文件應分別列出實際需求。

## 8. 修正清單與交付順序

| 階段 | 要修改的範圍 | 完成條件 |
|---|---|---|
| A：關聯與用途審核 | 全部 `agents/<role>.md`、Skills 目錄；先用畫圖、程式、前端、審查、測試、分析驗證判定方式，再覆蓋全目錄 | 969 筆既有關聯逐項判定；補缺漏、刪無效；每項有理由、條件明確；確定統一用途分類及成員 |
| B：資料與驗證 | `generate-agent-catalog.js`、`generate-agent-adapters.js`、共用 Agent metadata parser、`validate-catalog.js`、新用途 registry 與 TSV generators、`package.json` | 唯一來源、舊查詢欄位相容、生成檔可檢查；用途涵蓋全部元件；adapter 宣告與安裝模式一致 |
| C：安裝後端 | `scripts/install.ps1`、`scripts/install.sh`；必要時抽出共用計畫格式 | 全部／用途分類 + 角色配套 + Skill 必需依賴完整展開、跨分類去重、同範圍預檢與寫入 |
| D：互動入口 | `scripts/setup.ps1`、`scripts/setup.sh`、入口相容檢查 | 環境 → 範圍 → 全部／指定 → 用途分類 → 預覽；一般流程不分別選 Skills 與 Agents；舊來源不能假成功 |
| E：文件與交付 | README、`docs/interactive-installation.md`、查詢 CLI／package inventory、安裝與 catalog 測試、CI | GitHub 安裝說明與已發布行為一致，Windows／Linux／macOS 驗證通過 |

A–E 共同構成首次交付，統一用途分類與配套連動一起完成。代表角色用於試作與審查，不把未審核的其他關聯自動轉成建議並發布為完整配套。

改 canonical Agents 後執行 `npm run generate:agents`；新增關聯索引生成要接入該命令。交付前執行 `npm run validate`、適用的 catalog／依賴／互動安裝／package 測試、跨平台安裝驗證，以及 `git diff --check` 與 Git 狀態檢查。

## 9. 驗收案例

- 一般選單依序是環境、範圍、全部／指定；指定模式只選一次用途分類，不另問要裝 Skills 或 Agents。
- 選全部時，計畫包含來源目錄的全部 Skills 與子代理，數量與來源一致（本次查核基準為 286／237），不再顯示分類選單。
- 選畫圖時，同時加入已審核的圖像 Skills 與相關子代理；不把整個影音或前端分類直接當成畫圖配套。
- 選程式開發，或同時選畫圖與程式時，各用途的 Skills 和子代理一起加入；分類來源與配套原因可追溯。
- 分類 registry 完整涵蓋目錄，沒有被 Agent 引用的 Skills 也能透過用途分類安裝。
- 進階選一個 Agent，只加入已審核的預設配套與 Skill 必需依賴；預覽顯示全部加入原因。
- 選多個分類時，共用 Skill 在同一目的地只出現一份寫入計畫。
- 最小模式可完整滿足角色的必需依賴；自訂模式不能取消必需項目。
- 若分類沒有直接包含 React、TypeScript 或其他條件能力，也未在進階選取，不因平面舊清單而加入它們。全部模式明確包含所有 Skills。
- 某 Skill 若同時是其他選取項目的必需依賴，仍須保留，並顯示真正的加入原因。
- 只裝 Skill 不會反向自動加入 Agent；明確勾選推薦角色後才建立配套。
- 全域配套寫入全域目的地，專案配套只寫入選定專案與平台；另一個範圍的內容不被修改。
- 配套 Skill 有衝突時，在任何角色或 Skill 寫入前停止；取消和 EOF 零寫入。
- 重裝、追加分類及切換配套模式時，保留原有 ownership 與更新相容性；不刪共享或其他套件。
- 缺索引、未知依賴、未分類關聯或舊後端不支援新策略時，預檢失敗，不假稱配套已完成。
- 使用真實生成 adapters 驗證最小與建議模式；分別記錄「安裝成功」及平台實際載入／使用結果。
- PowerShell 5.1／7、macOS Bash 3.2、Linux Bash 都覆蓋同一組核心行為，並保留既有單平台專案及無 Node.js 安裝能力。

後續若要加入套裝解除安裝、共用 Skill 引用計數或整批回滾，另作規劃，避免第一階段更新時誤刪既有安裝。
