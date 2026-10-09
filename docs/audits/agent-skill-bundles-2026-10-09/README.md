# Agent 與 Skill 配套關聯審核

日期：2026-10-09。基準：`26d01851f1a000ad71f3c003bbe36f71e0397cfe`。

本次完成 **237 個 canonical Agent 的逐角色審核、969 筆原有關聯的逐項判定，以及 15 個統一用途分類**。分類聯集覆蓋全部 237 個 Agents 和 286 個 Skills，包含原本沒有被 Agent 引用的 148 個 Skills。

審核對照 repository 內的 Agent `Role`、`Task`、`Constraints`、`Output`，以及 Skill 的 invocation、workflow、rules 和 owner 邊界。先以各節的逐項摘錄核對，再對不明確的關聯讀完整正文；分類決策以明確的角色矩陣記錄，不由名稱、舊 category、引用次數或預設類型推論。不使用已安裝個人 Skills 作為 metadata 來源。

這份紀錄確認目錄的語意與資料完整性。平台實際載入、工具可用性、外部帳號授權與安裝執行的驗證，屬於後續整合檢查，不能從配套檔案存在推定完成。

## 結果

| 項目 | 數量 |
|---|---:|
| 逐角色審核 | 237 |
| 原有關聯已判定 | 969 / 969 |
| 移除過寬或不符 owner 的原有關聯 | 70 |
| 補上缺漏關聯 | 68 |
| 最終關聯 | 967 |
| `required` | 5 |
| `recommended` | 387 |
| `conditional` | 530 |
| `optional` | 45 |
| 沒有無條件必需 Skill 的獨立角色 | 232 |
| 最終 Agent 清單涉及的不同 Skills | 155 |

每項保留或新增關聯都有單行 English `reason`；每個 `conditional` 另外有明確的 `when`。非條件項目沒有 `when`。原有 969 筆全部有保留、重新分類或移除結果，沒有未審核的預設 `recommended`。

大多數角色已有足以獨立工作的正文契約。同名或常用 Skill 可以是核心建議，但不等於缺少該檔案就無法完成角色；最小安裝不為了配套而製造硬依賴。一般預設仍加入必需與建議，因此相關配套照常一起安裝。

## 真正的無條件必需契約

| Agent | 必需 Skill | 正文依據 |
|---|---|---|
| `marketing-measurement-specialist` | `product-experimentation` | Task 1 明確呼叫，維持 hypothesis、assignment、exposure、metric 與 acceptance 的共享量測契約 |
| `product-spec-orchestrator` | `solution-discovery` | Task 4 明確執行方向比較與決策，先於規格及實作交接 |
| `project-manager` | `spec-flow` | Task 2 明確以 spec flow 分解已批准的 initiative、驗收、工作及依賴 gates |
| `ux-researcher` | `ux-research` | Task 1 明確呼叫研究流程，取得研究問題、倫理 protocol、participant criteria 與證據門檻 |
| `video-director` | `video-production-workflow` | Constraints 和 Output 明確依賴跨文件 canonical production artifacts 與 sequential fallback 契約 |

有條件的必需流程以 `conditional` 表達其場景，例如 WordPress CMS、正式 technical Spec、React、Python 安全修補、OpenAI 或 AWS。安裝器不解析自然語言或自行猜測情境。

## 重要邊界裁決

- **一般前端不強綁 React／TypeScript。** `frontend-developer` 的 React 與 TypeScript 關聯皆為 `conditional`；核心建議為 frontend baseline、JavaScript 與 responsive guidance。`test-automator` 的 React/TypeScript component tests 與 browser E2E 也各自有條件。
- **畫圖不混入網頁或整個影音團隊。** 畫圖只選 `image-generator`、`gallery-researcher` 與六個圖片／Logo／後製 roots。移除 `image-generator` 的 web-only `design-consultation`。`design-intelligence-search` 的正文是 UI 知識庫，因此屬於網頁與設計研究，沒有放進畫圖。
- **程式語言與平台各有範圍。** `coding-standards` 實際是 JS/TS/React/Node team conventions，移除 C、C++、C#、Go、Rust、ARM 等角色的錯誤泛用關聯。`desktop-development` 是 Electron，移除 C# 與 .NET architecture 的誤綁；原生 iOS 改補 native architecture、Swift concurrency 與 SwiftUI 的真實用途。
- **專業紀錄不等於固定格式 technical Spec。** 移除財務、HR、臨床、採購及其他業務角色的誤綁；技術角色只在明確要求正式 Spec 時帶入 `specification-authoring`。ordinary business analysis、editorial brief、delivery plan 維持各自 owner。
- **資料與模型角色不強綁單一工具。** Python、OpenAI、AWS、Kubernetes、MongoDB、PostgreSQL、React Native、Flutter、Stripe、Remotion 等都依實際角色及場景分類；一般 ML model validation 不等於 LLM evaluation。
- **電影工具與 UI 工具分開。** 移除 cinematographer、storyboard artist、production designer、motion graphics 等角色的 web animation／responsive／palette 誤綁。影音角色的生成、caption、transcription、TTS、Remotion、frame extraction 依階段和輸入條件加入。
- **補上原本缺少的 owner。** 包含 `accessibility-testing`、`article-writing`、`market-research`、`prompt-engineering`、`event-sourcing-cqrs`、`data-pipeline-orchestration`、`reverse-engineering`、`systematic-debugging`、`receiving-code-review`、`verification-before-completion`、`service-mesh-engineering` 和 `temporal-workflow-engineering`。
- **本地實驗不冒充一般研究。** `autoresearch` 需要固定 metric、可重複的本地 measurement 與 keep/revert cycle，因此放在程式、測試和 AI，用途沒有一般 web research 或 feature discovery。

## 十五個用途分類

| 分類 | 直接 Agents | 直接 Skill roots | 預設邏輯 Skills |
|---|---:|---:|---:|
| 畫圖與圖像處理 | 2 | 6 | 7 |
| 程式開發 | 45 | 40 | 51 |
| 網頁與介面設計 | 11 | 40 | 50 |
| 測試與程式審查 | 16 | 28 | 37 |
| 資料庫與資料分析 | 15 | 13 | 19 |
| AI 與 LLM | 13 | 7 | 12 |
| 雲端部署與維運 | 25 | 14 | 19 |
| 資安與治理 | 23 | 8 | 18 |
| 影片與音訊製作 | 23 | 14 | 17 |
| 文件與辦公 | 10 | 16 | 20 |
| 研究、需求與專案規劃 | 19 | 15 | 19 |
| 寫作與商務營運 | 38 | 11 | 19 |
| 行動桌面與嵌入式開發 | 13 | 9 | 14 |
| 3D 與互動圖形 | 4 | 62 | 70 |
| Agent、Skill 與自動化工具 | 15 | 26 | 34 |

「預設邏輯 Skills」是該分類的直接 roots，加所選角色的 `required`／`recommended`，再遞迴補齊 Skill 自身 `required`，以名稱去重的此次來源試算。它不是目的地副本數，也不包含額外手選、跨平台副本、另行啟用委派或未來來源目錄的變化；正式預覽以當次安裝計畫為準。跨分類共用是有意的，表格不能直接相加當成全部數量。

分類 roots 是使用者明確選取的用途能力，不受最小 Agent 配套策略取消。例如網頁分類本身直接包含 React／TypeScript 能力，因此選整個網頁分類會有這些檔案；單獨選一般 frontend Agent 不會因條件 metadata 自動帶入它們。

3D 的直接 roots 是 62 個 Three.js specialists。可搭配的通用前端、runtime performance、real-time synchronization 和 visual-validation 角色提供對應的實作及驗證責任；沒有把 Unity 或 Minecraft Bukkit 角色當成 Three.js owner。Bukkit 屬於 Java server-plugin 程式開發。

## 可回查的證據與唯一來源

- [Agent→Skill 決策與來源 hash](relation-decisions.json)：237 個角色的 contract sections、body hash、permission、原有／新增關聯數，以及每個角色與 Skill 的決定、理由、條件和來源路徑。原有 `removed` 項目保留移除理由。
- [用途成員與 Skill 邊界](bundle-membership.json)：每個角色的用途 memberships，以及 286 個 Skill 的原始 description 與直接分類。
- [逐角色審核矩陣](review-decisions.js)：明確覆蓋 969 個原有 positions 的決策、68 個補項，以及 reason／when 文字。這是此次遷移的可檢查證據，不是 production generator。
- [用途決策記錄](bundle-decisions.js)：人工列出的 15 類成員與 coverage 檢查，也是此次遷移證據。
- 正式唯一來源為 [canonical Agents](../../../agents/) 與 [用途 registry](../../../scripts/data/install-bundles.json)。`agents.json`、adapters 和 TSV 應由正式 generators 生成，不從 audit helpers 維護第二份正式來源。

已檢查全部角色的 canonical body 與紀錄 SHA-256 一致，原有正文、permission、作者、license 和 provenance 保持不變；每個分類至少有一個 Agent 和 Skill，分類內名稱無重複、引用有效，聯集完整覆蓋 237／286。未解關聯：**0**。
