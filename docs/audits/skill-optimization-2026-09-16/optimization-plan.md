# CraftRoster Skills 優化審查與執行方案

審查日期：2026-09-16。來源版本：`7acca1fb8865903dc67ee4c76c147d0881cb9e1b`。

執行範圍更新（2026-09-17）：依使用者「目前只要驗證 windows 就好」，本次作業系統驗收僅要求 Windows。Linux／Ubuntu Bash 與 macOS quick 的實測移出本次完成條件，保留為未來擴充驗證，不再阻擋本次交付，也不記為通過。Windows 已有原生 PowerShell 5.1 full smoke v4 的通過證據，詳見[目前進度與驗收狀態](../../skill-optimization-progress.md)。本次範圍調整不改變模型比較的待驗狀態與既有授權，也不變更通用發布檢查或既有跨平台實作。

本次目標是檢查現有 Skills 並提出可落地的優化方法。範圍為 CraftRoster 的 `skills/`，不包含電腦上其他插件或全域安裝副本。工作假設為保留 Codex、Claude Code、Cursor、Copilot、OpenCode 共用能力，以 GPT-6 Astra／Codex 作為第一個行為驗證環境；此假設不是已完成五平台相容性認證。

## 1. 決策摘要

**建議保留現有 catalog 架構，先改善量測、依賴與觸發邊界，再用小批實驗調整指令。** 全面換格式、把每顆 Skill 改得更長，或一律刪除批准步驟，都沒有足夠依據。

CraftRoster 已有相當好的基礎：來源追溯、產生檔一致性、安裝 ownership、明確的角色分工，以及 `skillforge`、`skill-audit`、`skill-creator-design` 的方法論。最需要補上的，是把這些方法接到能觀察真實選用、工具動作、產物及成功率的評估流程。

本次最重要的結果：

1. **確定的結構問題**：單顆安裝不解析一般 Skill 依賴，但部分入口要求讀取相鄰 Skill 的文件。
2. **確定的量測限制**：200 個 output evals 是案例定義；目前 validator 沒有執行任務，也沒有對模型結果執行 909 條 assertions。
3. **可重現的評分風險**：routing parser 會把否定句中的 Skill 名稱算成選用，部分空結果與額外選擇也能通過。
4. **高信心的指令風險**：少數規則依 billing／security 等領域直接要求停下；另有規則在使用者接受預設之後仍要求再次確認。
5. **需要實驗的改善機會**：語言與 Three.js 的強制路由、全站設計 gates、長入口的拆分及 TDD 選用，需要比較任務結果後再推廣。

本報告沒有執行 GPT-6 A/B 任務實驗。因此不宣稱完成率已提升、詢問已減少或 token 已節省。以下「優先」指實施順序，不是漏洞嚴重度。

## 2. 審查方法與可信度

| 層次 | 本次做了什麼 | 能支持的結論 |
|---|---|---|
| 全量盤點 | 286 個入口的 metadata、字數、行數、資源、eval 定義；掃描 Skill 包內 515 個 Markdown 檔 | 數量、分布、候選檢查點 |
| 選樣語意審查 | 深讀共用流程、詢問、review、語言／前端路由、Skill 工具、記憶、設計 gates；補讀部署、資料遷移、研究、文件等代表入口 | 具體文字風險與既有好模式 |
| 程式追蹤 | 追蹤安裝器、catalog 產生器、contracts／eval validators、routing runner 與 CI | 實際的包裝與驗證邊界 |
| 確定性重現 | 在記憶體中呼叫現有 routing parser／scorer | 特定輸入的解析與評分結果 |
| 官方核對 | 閱讀 GPT-6、Build skills 與 evaluation 官方文件 | 設計方向依據，不能代替本專案實驗 |

三個獨立審查分別採用專案 `prompt-engineer`、`eval-orchestrator`、`agent-harness-optimizer` 的專業定位，均限制為只讀；重要數字及核心發現由主線再次查核。不是對 286 個 Skills 的每一句話與每個支援平台完成行為認證。未深入檢查的領域仍列入後續分批語意審查。

證據分類：

- **D：直接證據**，檔案、計數、程式路徑或確定性重現可以支持。
- **S：靜態風險**，能指出具體文字與合理失敗情境，尚未觀察模型實際失敗。
- **P：方案假設**，建議設計、門檻與工期；尚未落地或量測。

可重現資料：[全量 inventory](inventory.json)、[盤點程式](collect-inventory.cjs)。字元數使用 JavaScript UTF-16 字串長度，**不是 tokenizer 的 token 數**；行數包含檔尾空行。references 統計同時接受現有 `reference/` 和 `references/`。關鍵字命中只是人工檢查線索，包含範例內容，不作品質分數。

## 3. 現況基線

### 3.1 規模與內容成本

| 指標 | 實際數值 | 解讀 |
|---|---:|---|
| Skills／分類 | 286／16 | 保留這個來源基線，後续改名或合併必須追蹤 |
| description 總長度 | 94,737 字元 | 尚未加上名稱、路徑與其他 metadata |
| description 中位數／P90／最大 | 313.5／437／658 字元 | 最長不一定最差，需要看是否有可區分的觸發資訊 |
| description 超過 300／500 字元 | 168／9 顆 | 可以作排序線索，不能直接判定超標 |
| 正文中位數／P90 | 2,181／5,643 字元 | 多數入口已相對短，全面縮寫未必有益 |
| 入口行數中位數／P90 | 51.5／114 行 | 不適合機械要求所有 Skills 再砍半 |
| 超過 200／400 行 | 4／0 顆 | 長入口集中於少量流程 |
| 有 reference 資源 | 86 顆 | 已具漸進載入基礎 |
| 有 scripts／assets／openai.yaml | 3／1／3 顆 | 這些都不是每顆必須具備的欄位或資源 |
| routing groups／涉及的不同 Skills | 18／192 | 已有鄰近能力比較，不代表 host 自動讀取 catalog |

官方說明 Skills 先以名稱與描述參與選用，正文按需載入；大量安裝時初始清單可能被壓縮或省略。因此應量測實際 advertised metadata，而非假定 286 個描述都完整進入每次任務。[Build skills](https://learn.chatgpt.com/docs/build-skills)

目前較長入口包括 `website-redesign-to-code`（270 行、正文 21,856 字元）、`image-to-code`（227 行、15,468 字元）、`web-page-design-to-code`（204 行、17,732 字元）。這些有真實多階段責任，不能只按行數砍除 preservation、source authority 或驗收條件。

### 3.2 評估覆蓋偏向 Three.js

下表的「有 eval」只表示存在 output case 定義，不表示成功執行過。

| 分類 | Skills | 有 output eval 的 Skills | output cases | routing cases |
|---|---:|---:|---:|---:|
| Workflow & Planning | 12 | 2 | 2 | 0 |
| Software Engineering | 21 | 4 | 25 | 0 |
| Frontend & Design | 34 | 5 | 17 | 0 |
| Three.js & 3D Graphics | 62 | 62 | 72 | 0 |
| Backend & Data | 26 | 1 | 2 | 0 |
| AI & LLM | 5 | 1 | 3 | 0 |
| Mobile & Desktop | 7 | 0 | 0 | 0 |
| Testing & Quality | 27 | 3 | 21 | 0 |
| Security & Governance | 7 | 3 | 3 | 0 |
| Cloud & DevOps | 14 | 0 | 0 | 0 |
| Agent & Skill Tooling | 17 | 10 | 31 | 0 |
| Browser & Automation | 4 | 1 | 3 | 0 |
| Media & Creative | 20 | 1 | 1 | 0 |
| Writing & Content | 12 | 1 | 4 | 0 |
| Research & Product | 7 | 5 | 16 | 10 |
| Documents & Productivity | 11 | 0 | 0 | 0 |
| **合計** | **286** | **99** | **200** | **10** |

整體定義覆蓋為 34.6%；排除 62 顆 Three.js 後是 **37／224，16.5%**。99 顆有案例的 Skills 中，71 顆只有一個 case。200 cases 有 5 個明確宣告 `files` fixtures，分布於 `agent-reach-ops`、`web-research-ops`；其他案例可能有內嵌輸入，不能因此全判無效。

10 個 routing cases 全在 `solution-discovery/evals/routing.json`，包含 4 個 positive、4 個 near-match、2 個 negative。它能檢查部分相鄰規劃能力的選擇，沒有覆蓋整個 catalog 的觸發分布。

## 4. 優先改善項目與證據

以下位置以來源 commit 的行號為準；程式碼改動後請以片段重新定位。

### F01：讓依賴在安裝後仍可取得（D，優先處理）

`scripts/install.ps1:331–338` 對具名 Skill 只選擇該資料夾；Bash 的 `scripts/install.sh:2764–2770,2794–2798` 同樣只安裝所選項。一般 Skill 沒有必要依賴的自動解析。

但 [python-backend-development](../../../skills/python-backend-development/SKILL.md) 第 16 行要求先讀 `../python-development/SKILL.md`；[threejs-accessibility](../../../skills/threejs-accessibility/SKILL.md) 第 17 行要求讀取相鄰 umbrella 的 accessibility contract。乾淨目的地僅安裝這一顆時，必要文件不會隨包取得。這是條件式的確定性缺口，不代表使用者目前的全量安裝已壞。

入口中共有 51 個 `../` Markdown links，分布於 38 顆 Skills：50 次 sibling 引用、1 次 repo-root README 引用。來源 checkout 的目標全部存在；數量不是缺陷數，純文字的跨 Skill handoff 也尚未包含在這個計數內。

`scripts/validate-catalog.js:321` 的 local link regex 只檢查 `reference(s)/`、`scripts/`、`assets/` 開頭，未涵蓋這些 sibling links 的完整安裝後可達性。

**做法：**把依賴分類為必要、條件式、建議搭配。先在 catalog 層描述與檢查，再決定安裝閉包。必要依賴出現在 dry-run；未滿足的條件式依賴有清楚 fallback 或局部 blocked 結果。不要讓執行中的模型自行下載一批未宣告 Skills。

### F02：修正 repo-root 文件定位（D，小範圍先修）

[git-readme-writer](../../../skills/git-readme-writer/SKILL.md) 第 160 行的 `../../README.md` 在原始 repo 是 CraftRoster README；安裝後可能指向 `.agents/README.md`，不再是同一份文件。

**做法：**若這只是非必要示例，移除這個 link；若需要固定例子，使用現有內附 `reference/` 範本；若想讀使用者的 README，先確認 project root 再探索。驗收以乾淨單包 fixture 中的 resolved path 為準。

### F03：修好評估器，才有可信的優化結果（D，優先處理）

`scripts/validate-skill-evals.js:197–220` 檢查 prompt、expected_output 與 assertions 是否為有效文字；它沒有執行模型或 assertions。`scripts/run-skill-routing-evals.js:10` 的 live prompt 要求模型不要執行任務、不要讀寫檔案，只說出它認為會選的 Skills。這應標示為「routing self-report」。

主線直接呼叫現有 parser／scorer，確認以下結果：

| 輸入情境 | 目前結果 | 應如何處理 |
|---|---|---|
| agent message 為 `Do not select solution-discovery.` | 算選中 solution-discovery | 不應以全文名稱匹配解析；不合輸出契約應為 error |
| agent message 為 `unknown-skill` | 解析為空集合 | unknown label 要記為格式／協定錯誤 |
| expected 只有 solution-discovery，額外輸出 spec-flow，excluded 為空 | pass | 記錄 unexpected，依 case 的 allowed 集合判定 |
| 沒有 agent message，expected 為空 | 可能 negative pass | missing response 必須與有效的空選擇區分 |

證據：runner 第 64–102 行。另第 153–168 行在 execution error 後直接略過該案的 recall／false-positive 分母；overall pass 仍含全部案例，摘要的兩種分母可能造成誤解。`--max-cases` 取前 N 筆，也可能只跑到目前排序最前的 positive cases。

**做法：**strict JSON/schema 或嚴格逐行名稱協定；顯式保留 valid empty、malformed、unknown、timeout。把總執行數、有效樣本數、error 數分開。自報選擇與真實 activation trace 不能合併成同一指標。

### F04：依「下一個動作與既有授權」決定是否詢問（S，高優先）

[code-change-workflow](../../../skills/code-change-workflow/SKILL.md) 第 72–77 行，在 `Stop And Ask When` 下把 security-sensitive、billing-related、migration-heavy 並列為停止條件。[karpathy-guidelines](../../../skills/karpathy-guidelines/SKILL.md) 第 89–98 行也有相似規則。

例如使用者明確要求修正本地付款折扣函式、補回歸測試，並沒有要求真實扣款或部署，仍可能被「billing」觸發再次確認。

**做法：**領域標籤用來提高影響分析的深度；只有關鍵需求未決、或具體下一步超出已建立的目標／操作／環境／副作用授權，才詢問。真實扣款、未知刪除清單、production migration 等必要邊界保留。

### F05：讓使用者的新決定能結束提問流程（S，高優先）

[ask-questions-if-underspecified](../../../skills/ask-questions-if-underspecified/SKILL.md) 第 74–77 行在使用者要求「先做再說」後仍要求確認或修正才开始。第 71 行的「不要執行指令」與第 72 行允許低風險讀取 repo，在 shell 環境也有字面歧義。

**做法：**保留「明確要求 question-first 才使用」；使用者接受已列預設或授權以假設繼續後，記錄必要假設便推進。阻擋只限依賴未決答案的變更或副作用，不阻擋獨立的只讀探索。

### F06：依任務路徑觸發，避免只因 repo 有某技術就載入（S，高優先）

[python-development](../../../skills/python-development/SKILL.md) 第 20 行以「repository contains Python」作觸發條件；[frontend-design](../../../skills/frontend-design/SKILL.md) 第 24–26 行以 repository／manifest 提到 Three.js 就要求先讀 umbrella。

例如 monorepo 有 Python backend，但此刻只修 React footer；或 package.json 有 `three`，此次只改一般表單文案。這些條件可能載入無關專家，再引出更多 references 和檢查。

**做法：**保留 baseline 加必要 specialists 的架構，觸發改看 requested outcome、affected code path、diagnostic evidence 或已證實的依賴。repo 的套件存在只是探索線索。測量實際 loaded Skills／bytes 與任務結果，不能只猜 context 變多就一定變差。

### F07：分開 review 缺陷與 gate 缺證據（D＋S，高優先）

[pipeline-review](../../../skills/pipeline-review/SKILL.md) 第 58 行把 material defect 或 verification gap 都列為 Major；第 61 行又要求 unverified risks 留在 findings 之外；其引入的 [code-review](../../../skills/code-review/SKILL.md) 第 73 行也將未能證明缺陷的 missing tests 列為 verification gaps。

**做法：**分成 `findings` 與 `gateEvidence`。必要證據缺失仍可阻擋 release，但不能因此增加一個「已確認缺陷」。例如 migration rehearsal 是明定驗收條件卻未跑，可輸出「0 confirmed findings、1 required evidence missing、gate blocked」。

### F08：全站設計 gates 應區分需要審批與已委派實作（S，第二批實驗）

[website-redesign-to-code](../../../skills/website-redesign-to-code/SKILL.md) 第 41、107、203、226 行要求多次停等批准。其 description 對多 route redesign 廣泛適用；單頁 [web-page-design-to-code](../../../skills/web-page-design-to-code/SKILL.md) 第 3 行則明確限定 design 必須先 review 的情境。

四道 gates 對品牌審批、大型商務站有價值，但「這三頁照現有品牌重設並做完，細節你決定」可能不需要使用者逐次知道 gate 名稱並回覆。

**做法：**先在現有 Skill 內設計 `approval-first` 與 `delegated-implementation` 分支。後者將已被有效委派的設計決策變成內部 evidence checkpoints；前者維持人工選定方向。兩者都保留 product preservation、真實發布與資料／API 變更的範圍界線。未測出穩定改善前，不擅拆成新 Skill 或刪去四道 gates。

這些文件受 `validate-skill-contracts.js` 的 exact text／hash 與階段順序檢查約束。需要一起評審合約、更新 canonical expectations 及 mutation tests；不能只更新 hash 讓現有驗證轉綠。

### F09：一次錯誤不要自動變成長期規則（S，第二批）

[self-improvement](../../../skills/self-improvement/SKILL.md) 第 3、16–19、27 行從 command failure 或 user correction 進入記錄與長期 guidance；[context-governance](../../../skills/context-governance/SKILL.md) 第 25 行也要求適時 promote。

缺少「單次觀察、已重現規律、持續性使用者偏好」的區分，容易把一次 timeout 或僅當次適用的修正變成永久限制。正常 `rg` 無匹配也不能算工具失效；只讀任務不應因此冒出 memory 檔。

**做法：**先保留任務內必要筆記；確認重現性或明確持續偏好後，才依既有記憶機制與授權範圍持久化。可記 scope、evidence、applicable condition、exceptions、supersedes／recheck trigger，不必為每次失敗建立檔案。

### F10：工具名稱改為能力需求，保留具體證據（S，小批修改）

[mcp-creator-design](../../../skills/mcp-creator-design/SKILL.md) 第 51–53 行直接要求 WebFetch。某些 host 沒有這個名字，但有等效 retrieval 能力。

**做法：**描述要取得的官方文件與版本證據，使用當前可用的 retrieval 能力；來源不可用時清楚記為未核對，並繼續不依賴它的工作。不要只為跨平台而鎖定 `allowed-tools` 清單。

### F11：不要把 TDD 例外變成新的人工批准點（S，先評估）

[test-driven-development](../../../skills/test-driven-development/SKILL.md) 第 36 行要求看見 intended failure 後才能寫 production code，除非 explicitly exempted；[verified-software-delivery](../../../skills/verified-software-delivery/SKILL.md) 也有 TDD 與 exemption 流程。

**做法：**使用者或 repo 明確要求 TDD 時保留嚴格循環。其他任務由風險、現有測試與可重現性決定，說明合理例外不等於每次需要人工批准。先測已有有效 regression、接手已修改程式、簡單可逆修正等案例；不得為省時間略過真正必要的 bug 驗證。

### F12：避免「準備／審查發布」滑入實際發布（S，後續邊界案例）

[app-store-release](../../../skills/app-store-release/SKILL.md) 第 3 行涵蓋 preparing、reviewing、troubleshooting，但第 29–30 行的 workflow 直接進入 submit 與 rollout；[deployment-operations](../../../skills/deployment-operations/SKILL.md) 第 16–21 行也以執行 deployment 為主。

這不是已發生的越權發布。建議補清楚 prepare／review／execute 模式與已授權 target，讓「幫我檢查 release 是否準備好」以報告結束；「發布這個確切 build 到指定測試軌」才走相應動作。這與 F04 配對：既避免沒必要的詢問，也避免沒授權的行動。

### F13：發布文件的數字已漂移（D，小範圍先修）

[release-checklist](../../release-checklist.md) 第 48–55 行仍列 217 Skills、15 categories、14 required eval packages、17／82 evals/assertions。現况是 286、16、99、200／909。

**做法：**由 canonical metadata 產生 snapshot 或在驗證時檢查文件 parity。避免每次靠人工記得更新多處統計。不要把 dated 歷史審查報告當成應隨版本更新的 current baseline。

## 5. 應保留的設計

| 現有模式 | 證據與價值 | 優化時的限制 |
|---|---|---|
| 按風險驗證 | code-change-workflow:42、testing-strategy:17,20 已要求最小有用檢查 | 不可概括成全庫要求每次跑全 suite |
| 明確 evidence standard | code-review:65–75 支持少量高信心 findings 與 no-op | 不以「一定要找出 N 個問題」取代 |
| 有界自主設計 | frontend-design:18,42 允許沿用現有系統自行處理小決策 | 不把每次 CSS 變更變成視覺審批 |
| 工具不存在時有 fallback | todo-first:16–22 支援 native planning 或 inline checklist | 不強制所有平台實作同名工具 |
| 專家按需載入 | Python references、Three.js capability map 已按責任選用 | 縮小觸發，不拆掉所有 specialist |
| 安裝 ownership 與交易檢查 | install.ps1:1337–1370 有 staging、identity、digest 與 ownership 保護 | 新依賴功能不可用簡易 copy loop 繞過 |
| 生產資料／檔案保護 | database-migration-workflow、file-organizer 的明確副作用界線 | 不以減少詢問為由移除精確刪除／遷移範圍 |
| 評估與證據方法 | skillforge、llm-evals 已有 baseline、holdout、trace、cost 原則 | 先接執行器，不再堆一份重複宣言 |

在移除長 reference 前先追查用途。例如 MCP 的 Node reference 約 991 行，但已有目錄及主入口的主題導航。較合理的改善是 section anchors、搜尋詞與局部讀取，而非硬裁到相同篇幅。

## 6. 統一優化方法：八個步驟

### 步驟一：為每顆 Skill 建立一張簡短審查卡

卡片放在審查資料或 issue，不強制增加到每個 runtime package。至少記錄：

| 欄位 | 要回答的問題 |
|---|---|
| Owned outcome | 它獨立負責產出什麼？ |
| Positive trigger | 哪些可觀察請求或證據需要它？ |
| Near neighbors | 最容易混淆的 2–3 顆是誰？ |
| Exclusion | 哪個常見近似需求不應選它？ |
| Required inputs | 缺什麼才真的不能進行下一步？ |
| Authority | 哪些動作已在任務內，哪些需要另有具體授權？ |
| Completion／no-op | 如何證明完成，已滿足時如何乾淨結束？ |
| Dependencies | 必要文件、條件式 specialist、可選參考、外部能力 |
| Evidence | 現有 case、fixture、真實失敗或尚待測試的假設 |

沒有使用量資料時，先按共用入口、影響範圍、已確認問題與易混淆程度排序；不要捏造「最常用」排行。

### 步驟二：先決定保留、改善、路由、合併或淘汰

- **保留**：有清楚增益與獨立責任，案例表現好。
- **改善**：責任正確，只需修觸發、局部規則或缺失分支。
- **路由**：多個能力不同，但需要一個明確 owner 選擇。
- **合併**：相同輸入、相同產物、相同失敗模式，且區分沒有實際價值。
- **淘汰／轉 reference**：經 no-Skill 比較沒有可辨識增益，或內容只是別處的泛用重述。

不先依名稱相似合併。例如 `code-review` 與 `pipeline-review` 分別擁有 finding quality 與階段協調，適合修合同邊界；`frontend-design` 與 Three.js specialists 也有不同責任。

### 步驟三：改寫 description，讓最重要的區別提早出現

寫法以「能力＋何時選用＋一個必要邊界」為骨架，不強制固定長度。移除 exhaustive capability lists 前，用相鄰 prompt 測試確認辨識力沒降低。catalog 的 `routingGroups.when` 不應是唯一保存選用邊界的位置。

以下是**候選範例，未套用、未通過 A/B**：

```yaml
name: python-development
description: Implement, review, or debug Python code when the requested change or diagnostic requires Python-specific decisions. Route to the relevant specialist; a Python dependency elsewhere in the repository is not enough to activate this skill.
```

```yaml
name: design-consultation
description: Recommend a bounded visual direction, palette, typography, or component tone when the user asks for design advice before implementation. For an approved design or a small UI fix, use the implementation workflow.
```

英文 description 可維持既有跨工具慣例；測試 prompt 必須包含繁體中文與中英混用，因為這是使用者真實使用方式。不要只測英文名稱精確出現的正例。

### 步驟四：把每條規則轉成「條件、動作、證據」

每個 must／stop／ask 都要能回答：觸發條件是什麼？要做什麼？為什麼必要？完成後如何繼續？如果只是偏好，就寫為可調整的預設，不製造新的批准制度。

候選改寫 A：替換泛化 Stop And Ask。

```text
Before the next consequential action, check the user's established authority
for the target, operation, environment, and material effects. Continue
authorized inspection, reversible implementation, and safe verification.
Ask only for a material unresolved decision or an action beyond that scope.
Continue independent work while the dependent action remains blocked.
```

候選改寫 B：使用者接受假設後繼續。

```text
If the user accepts the stated defaults or authorizes reasonable assumptions,
record the assumptions and continue. Do not ask for the same decision again.
Preserve any specific unresolved authority or irreversible-action boundary.
```

候選改寫 C：review evidence 不充當 defect。

```text
Record supported defects under Findings. Record missing acceptance evidence
under Verification gaps, including the affected claim and next required check.
A predeclared evidence requirement may block a gate without creating a defect.
```

候選改寫 D：工具能力 fallback。

```text
Retrieve the official SDK documentation with the available documentation,
web-fetch, or browser capability. Match the installed SDK version when relevant.
If retrieval is unavailable, identify the unverified dependency and continue
work supported by local evidence; do not claim the documentation was fetched.
```

這些候選規則不能覆蓋 host 的權限、平台政策或真實存取限制。Skill 也不能自行授予原本未獲授權的外部動作。

### 步驟五：按任務分支配置內容，控制實際載入量

入口保留 purpose、selection、必要 invariant、最小流程、完成與失敗分支。長範例、特定 framework 配方與完整 schemas 放在已連結的 references；只在適用模式讀取。簡單 Skill 不需要人造 router 或空目錄。

優先試做兩種實驗：

1. 只縮短 descriptor，不動正文，測 selection 與近似誤選。
2. 只移出一組條件式細節，保持 mandatory invariants 可見，測任務結果與載入量。

測量 entrypoint、實際 references 與跨 Skill 加總，不能只說入口變短。某個短 router 若每次引入十份文件，可能比原本單一入口更昂貴。重複載入可用 package identity／revision 去重，但要保留主流程 owner 與必要規則。

不把「全部 descriptions 控制在 200 字元」或「全部正文 100 行」設為硬 gate。可把過長值當 warning，人工判斷原因；實際 token 預算以 host 顯示與 tokenizer 量測為準。

### 步驟六：在 catalog 層設計依賴，維持可攜格式

先沿用 `SKILL.md` 的現有 fields。現有 frontmatter validator 有欄位白名單，metadata 要求 string-to-string；generator 也不會自動輸出新增複雜欄位。不要直接添加一個未支援的 top-level `dependencies` 然後假定五平台會處理。

可在中央 catalog config 設計以下**提案欄位**，schema、generator、CLI、installer 需一起實作：

```json
{
  "skillDependencies": {
    "python-backend-development": {
      "required": ["python-development"],
      "conditional": [],
      "optional": []
    },
    "frontend-design": {
      "required": [],
      "conditional": [{
        "skill": "threejs-development",
        "when": "The affected code path changes the scene, renderer, or canvas lifecycle"
      }],
      "optional": []
    }
  }
}
```

條件文字是使用語意說明，不是要求 shell 執行任意條件程式。安裝策略要顯式定義：具名安裝可包含 required closure；conditional／optional 僅列示或由使用者選定的 profile 帶入，不能自動膨脹成全量安裝。

實施順序：先解析並驗證 closure → dry-run 顯示理由與目標 → 預檢整批 ownership／衝突／特殊檔 → 沿用現有 staging 與 digest 機制 → 驗證已安裝檔案與來源版本。若只支援單包原子性，必須明確回報部分成功與復原步驟，不能聲稱整批原子回滾。要支援整批交易，另設 batch journal 並測 failure injection。

必要案例包括 missing dependency、循環依賴、重複合併、跨分類安裝、使用者已修改依賴、版本不一致、symbolic link 逃逸、rollback、離線安裝與未知新檔保留。

OpenAI 專用 `agents/openai.yaml` 僅在需要 UI 或 invocation 設定時增加；不要因為工作高成本就批量改為 explicit-only。保留現有使用者偏好，人工批准應放在真正的動作邊界。

### 步驟七：用配對實驗判斷改寫是否有用

同一模型、effort、host、工具與 fixture 比較 A＝現有 Skill、B＝候選 Skill。針對泛用／疑似重複的 Skills 才增加 C＝無該 Skill。模型升級與 Skill 改寫不要同時變，否則無法歸因。

同一批案例隨機化順序、獨立 session、重置 fixture。已有上層指令會覆蓋舊 Skill 的情況要保留並記錄，不能把舊 Skill 影響未顯現解讀為所有環境都沒有風險。需要時另在相同有效權限下比較最小 host 和正常安裝組合，但不可刻意移除真實平台安全邊界。

### 步驟八：小批發布、維持追蹤與回滾

每批改少量共用流程或同一責任群，附 hypothesis、before／after、case IDs、結果與已知限制。模型、Skill、references、工具或 adapter 更新後，只重驗受到影響的切片，再跑必要發布 gate。

rename／merge 需要 alias 或明確 migration map，同步 agents 的 skill references、catalog、installer index 與文件。現階段先改善既有 names，避免把相容性成本混進指令實驗。

## 7. 可執行的評估架構

### 7.1 分層，分開報告

| 層 | 檢查內容 | 證據 | 頻率 |
|---|---|---|---|
| L0 結構 | YAML、來源、產生檔、資源、依賴 closure、contract parity | deterministic validator | 每次相關 PR |
| L1 選用 | positive、near-neighbor、negative、中文、明確指定、否定指定 | advertised snapshot＋實際 load trace；self-report 另列 | 改 description／router 時 |
| L2 結果 | 工作產物、功能、既有內容保留、正確引用、no-op | fixture＋執行結果／可讀產物 | 改 workflow 時 |
| L3 組合 | AGENTS＋多 Skills、已授權、多輪轉向、缺工具、局部 blocked | 對話／工具 trace＋diff／外部 stub 記錄 | 改共用規則時 |
| L4 效率 | loaded context、tool calls、重試、有效成本、延遲 | usage＋timing＋完成率 | A/B 與 release |
| L5 平台 | discovery、包裝、fallback、權限、行為 | 每個 platform＋model 組合獨立結果 | installer／平台版本變更 |

官方建議評估貼近真實任務，儘早建立案例、持續累積實際失敗，並以人工判斷校準自動評分。此處的具體層級、數量與門檻是對 CraftRoster 的方案設計。[Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

### 7.2 結果紀錄格式

可沿用 `skillforge/references/evaluation-and-certification.md` 的設計，先做最小 runnable harness。建議 run record 至少有：

```json
{
  "run_id": "unique-run-id",
  "candidate_commit": "source revision",
  "skill_package_hashes": {},
  "dataset_version": "versioned-corpus-id",
  "case_id": "billing-local-fix-authorized",
  "variant": "A-or-B",
  "trial": 1,
  "host": {"name": "codex", "version": "captured-at-run"},
  "model": "exact-model-or-snapshot-at-run",
  "reasoning_effort": "captured-at-run",
  "advertised_catalog_hash": "hash",
  "toolset_hash": "hash",
  "fixture_hash": "hash",
  "grader_version": "version",
  "harness_version": "runner-and-parser-version-or-hash",
  "status": "passed|failed|error|unsupported|not_run",
  "observed_skills": [],
  "artifact_paths": [],
  "metrics": {"input_tokens": null, "output_tokens": null, "wall_ms": null},
  "limitations": []
}
```

範例中的字串是欄位說明，不是實際有效模型版本或已存在的結果。拿不到 usage 就保持 null／unavailable，不用字元數假冒。原始 trace 應去除秘密，保存必要可重現片段，不保存隱藏推理。

當 host 不提供 activation trace 時，可在受控環境記錄資源讀取或明確 instrumented loader；仍無法觀察時把 L1 標為 self-report-only／unavailable，不推測 activation。受測代理只能取得該 run 的任務輸入與必要原始材料，不得讀取其他 holdout 題目、預期答案、grader 或本份 findings，以免測試洩題。

在開始改寫前，按 task family／fixture family 分開 development set 與 held-out set，避免把同一題的近似改寫分到兩邊。開發時用 development set 調整；事先固定門檻後才跑 holdout。不得依同一份 holdout 反覆調整 Skill；若結果揭露新問題，先建立新的 development 案例處理，再準備未用於調整的 held-out 證據。記錄資料拆分版本及任何受到污染的案例。

### 7.3 建議先建立的 12 種情境

| 情境 | 關鍵結果 |
|---|---|
| 已授權修付款純函式 | 完成可逆修正與測試，不因 billing 重問 |
| 修正需要真實退款才能驗證 | 先做本地部分，在未授權退款前停下 |
| 問題流程中回答「defaults，直接做」 | 接受預設並續做，不重啟確認 |
| 只讀 review 發生 command failure | 不產生 memory 或修改 production code |
| Python monorepo 只改 CSS | 不因 repo presence 加載無關 Python |
| three 存在但只改 footer link | 不載無關 scene／rendering 流程 |
| React unmount 造成 GPU resource leak | 正確引入 Three.js／lifecycle owner |
| 完整圖像已批准並要求實作 | 沿用該批准，不重新設計或重問同一 gate |
| 要求先看兩個 mockups、不要改碼 | 按授權完成 mockups 後停止實作 |
| 缺必要 review evidence 但沒有已證實 bug | 缺陷與 evidence gap 分開 |
| 單顆安裝 python-backend-development | required dependency 可達，版本與 ownership 正確 |
| 不存在 WebFetch 但有 retrieval capability | 使用等效能力或清楚標為未核對 |

另外用 deployment／app-store 的 prepare-only 案例檢查不會自動提交。每個「少問一次」案例都配一個「這裡確實必須停」的反例，避免把自主性優化變成授權範圍擴張。

### 7.4 成效與驗收指標

| 指標 | 定義與使用方式 |
|---|---|
| Routing precision／recall | 依事先標註的 required／allowed／excluded 集合計算，額外選擇不可全被忽略；按類別另報 |
| Task success | 可用產物或可執行驗收成立的比例；不以模型自己宣稱完成算成功 |
| Unnecessary clarification | 已有充分任務與授權證據仍停問的比例，由 rubric／人工標註 |
| Scope violation | 越過檔案、環境、對象或外部動作邊界；重大個案獨立阻擋，平均分不得抵銷 |
| No-op integrity | 已滿足的任務沒有制造無意義修改或持久檔 |
| Verification honesty | 未執行檢查被誤報為通過的個案數 |
| Effective cost | 所有嘗試的總成本／成功完成數；不能只看成功個案成本 |
| Context／latency | 實際載入量、input／output／cached tokens、工具呼叫、p50／p95；說明 cache／網路狀態 |
| Infrastructure health | error、timeout、unsupported、not_run 個別列出，避免從分母偷偷刪除 |

正式門檻應在 baseline 後預先固定。可先以 routing precision 95%、recall 90% 作**營運目標**，不能拿七個案例全過就聲稱達標。工作完成率應不退步，重大越權與虛假成功不可新增。若要接受小幅差異，先約定 noninferiority margin 並報不確定性；小 pilot 樣本不夠時應判「需更多證據」，不能強作統計結論。

成本與延遲先要求配對數據，再決定是否採「相同完成率下降低中位成本」或「增加少量成本換取明顯正確性」。不要先承諾一個沒有量測依據的節省百分比。

## 8. 執行批次、交付物與停止條件

以下工期是單一主要維護者的粗估，取決於 fixtures 與平台可用性；並非本次已執行工作。先交付規劃及基線，再按批次實施。

| 批次 | 工作 | 主要交付 | 完成條件 |
|---|---|---|---|
| M0 量測可信度，約 1–2 工作天 | strict routing parser、valid-empty/error 分類、完整分母、run record、release baseline | evaluator 改動與 regression tests | 四個已重現解析情境正確處理；未跑不再表示 pass |
| M1 包裝依賴，約 2–4 工作天 | 宣告 required／conditional／optional、驗 source 與 installed links、dry-run closure | schema／generator／兩套 installer 對等改動及 isolated fixtures | 單包、分類、全量與衝突／復原案例通過；保持 ownership |
| M2 首批指令，約 3–5 工作天 | 先改澄清、授權、review、task-scoped routing | 小批 Skill 候選與 A/B 結果 | 沒有新增關鍵失敗；必要反例仍正確停下；有效成本可比較 |
| M3 複雜流程，約 3–5 工作天 | website gates 模式、記憶規則、TDD 條件、長入口按需拆分 | contract 與行為測試同步更新 | 既有 approved／read-only／preservation 情境不回歸 |
| M4 擴展覆蓋，分期維護 | 優先填 backend、cloud、mobile、documents 空缺；補其他分類 | 每分類結果與回歸集 | 全部 286 有明確審查狀態；各類別都有代表性 task outcome |

建議首批分成互不混雜的 PR：

1. **評估器與文件**：`run-skill-routing-evals.js`、其 tests、run schema、release baseline。先不改 Skills。
2. **依賴與包裝**：中央 config／generator／validator／CLI／兩套 installers 和 isolated smoke fixtures。以 Python backend、Three.js accessibility、README link 為起始案例。
3. **通用流程**：`code-change-workflow`、`karpathy-guidelines`、`ask-questions-if-underspecified`、`pipeline-review`；`code-review` 只在合同一致性需要時動。
4. **選用邊界**：`python-development`、`frontend-design`、`typescript-development` 與直接相關 CSS／JavaScript／debugging 入口；同步對應 routingGroups。
5. **第二輪模式**：`website-redesign-to-code`、`web-page-design-to-code`、`self-improvement`、`context-governance`、`mcp-creator-design`、TDD／delivery。分成更小 PR，避免一次混改所有驗收合約。

每批停止條件：出現新的重大 scope violation、不可用產物、必備 evidence 遺失、依賴覆蓋使用者修改、或無法確定升降來自候選變更，就保留上一個有效版本，先定位再續推。這不是要求所有未解問題都回頭詢問使用者；實作與除錯仍可在既有授權範圍內持續。

### 第一個行為 pilot 的規模

以 8 顆作觀察集：`solution-discovery`、`spec-flow`、`code-change-workflow`、`code-review`、`verified-software-delivery`、`web-page-design-to-code`、`javascript-development`、`threejs-development`。它們橫跨規劃、實作、review、設計與領域路由；不是根據未取得的使用頻率挑選。受測候選可以只有其中一個 owner 改動，其餘作組合與回歸觀察。

- 每顆先 7 個 routing 定義：2 正例、2 鄰近、1 模糊、1 不需此 Skill、1 授權／對抗情境，共 56。
- 每顆 6 個 outcome／boundary 定義，共 48；涵蓋正常、失敗恢復、no-op、缺工具、已授權、多 Skill 組合。
- 先做一小輪 smoke 排除 harness 問題，再以 A／B 各 3 trials：routing 336 runs，outcome 288 runs，**合計 624 次**。這只是算術工作量，不是已執行，也不是預算承諾。
- 每個 run 可含多次模型與工具呼叫；先用少量代表 runs 量測每個成功任務成本，再設定實際花費上限與 timeout，不能把 624 runs 當成 624 次固定價格 API calls。
- 模型／工具 judge 會增加額外成本。費用、時間上限與可用憑證在實驗啟動前確認，不需要現在為純規劃建立金鑰。

擴大階段可把「每顆至少 7 個 routing 定義」當盤點目標，即 2,002 個定義；不必每次 PR 全部付費執行。按改動 Skill 與相鄰群選擇 suite。output cases 依風險設計，參考型、執行型、多階段型不必有相同數量。

## 9. 跨平台策略

保留 portable skill 內容；host 專屬設定只放需要的 adapter／metadata。此次沒有核對另外四個平台的最新 loader 規格，也未執行其 live 行為，因此具體格式相容性需在實施時用各自官方文件確認。

| 平台層 | 每平台都要驗什麼 | 不可推論什麼 |
|---|---|---|
| 安裝 | 目的地、資源完整、ownership、版本、依賴 closure | 安裝成功不代表模型會選它 |
| 發現 | 實際可見 name／description、是否截斷、顯式選用 | 檔案存在不代表 metadata 已載入 |
| 執行 | 支援工具、fallback、授權邊界、任務產物 | 同樣 Skill 不代表同樣工具／模型 |
| 評估 | platform＋version＋model＋effort＋toolset 組合結果 | 不可把全部差異歸因於 Skill 或 adapter |

先跑 Codex 完整 pilot，再對另外四平台跑發現／安裝與少量代表性任務。若那些平台實際使用不同模型，結果標為組合比較。任何沒有存取或不支援的能力都標 `unsupported`／`not_run`。

Plugins 可作未來分發選项，但與指令優化分開評估。先解決目前 installer 的依賴完整性，不把重建整個分發系統列為 GPT-6 必需項。

## 10. 變更驗證與完成定義

按目前專案規則：

```bash
# Skill 或 catalog inputs 有修改時
npm run generate:skills
npm run validate

# 若 canonical Agents 因 rename／引用改變而修改
npm run generate:agents
npm run validate

# 依本次修改面執行對應 tests
npm run test:skill-catalog
npm run test:skill-contracts
npm run test:skill-evals
npm run test:skill-routing

# installer 修改時再執行相應平台 smoke
npm run smoke:install:powershell
npm run smoke:install:bash
npm run smoke:install:bash:quick

git diff --check
git status --short
```

這不是每次小改都一律跑上面所有測試的要求。既有 repository-required validate 必須完成；其餘按 generator、contract、installer 或 evaluator 變更面選擇，發布時再依 release checklist 跑完整必要 gate。不要直接編輯 generated adapters。

**一顆 Skill 可以標為「已優化」的條件：**

1. 有具體問題或可測試的改善假設，以及明確責任邊界。
2. description 能區分正例、鄰近與不適用情境。
3. 必要資源在所宣告安裝方式中可達；缺失能力不被假裝存在。
4. 已授權工作能推進，未授權動作仍停在正確邊界。
5. required outputs、no-op、錯誤與恢復分支有可觀察結果。
6. 對應結構驗證與有代表性的行為比較完成；未覆蓋切片如實記錄。
7. 候選有 source／dataset／grader／runtime 版本、評估結果及可回滾基線。

**整套優化方法完成的條件：**所有 286 顆都有 inventory 與 keep／improve／route／merge／defer 決策；各分類有任務評估代表；共用 owner 的變更會連動相鄰 regression；結果能區分有效 pass 與未跑；新失敗可持續轉入測試資料。這是後續實施的完成定義，不是本次已達成的執行認證。

## 11. 官方依據與本次產物

GPT-6 官方建議審查 Skills／AGENTS 的模糊或衝突指令，並調整自主執行、委派與驗證深度。本方案把這個方向轉成具體條件、fixture 與結果檢查；沒有因此假設 Skill 必须換格式。[GPT-6 model guidance](https://developers.openai.com/api/docs/guides/latest-model#instruction-following)

本次也參照本機官方 Skill Creator 的原則：保留能改變決策的知識，按任務風險決定細節，維持使用者範圍，並以有意義的行為測試確認效果。CraftRoster 自己的 Skill 設計與評估方法已相當接近這個方向，值得優先落實而非重建。

本次產物只有本目錄的審查報告、全量 inventory 與重跑盤點程式。未修改現有 Skills、Agents、adapters、installers、production validators 或 catalog。未執行遠端來源重新驗證、真實業務任務、live 模型 A/B 或五平台安裝；上述均是實施階段的明確工作。

### 本次驗證紀錄

- 以 bundled Node 執行 `package.json` 的 `validate` 對應全部九段指令，全部通過。此環境的 npm 不在 PATH，所以使用相同 Node 指令序列，未安裝或變更系統工具。
- 最終 catalog 仍為 286 Skills／237 Agents；contracts 是 760 個 Markdown 檔與 7 個 workflow contracts。新增本報告使 Markdown 掃描數從審查前 759 變成 760；這個數字不表示完整語意驗證了 760 份合約。
- 主線重現 F03 的四個 parser／scorer 情境，結果如表；未啟動 live Codex 子任務作模型評估。
- inventory 類別加總、Skills 總數、eval 加總及本報告的本機 Markdown links 已作程式核對。
- 既有來源檔未改動；本次新增檔案限本審查目錄。Git diff／狀態於交付前再檢查，不提交 commit 或發布。
