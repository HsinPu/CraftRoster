# 行為評估準備審查

本記錄延續原方案第 7–10 節的驗收要求。案例 schema、作者 fixture tests、離線 packaging、小型文字 smoke 與完整模型任務結果分開；目前尚未完成完整受控 pilot。

[64 案逐項矩陣 v7](pilot-case-readiness-v7.json)含目前 corpus hashes、缺失輸入與必要能力：15 案自足文字、49 案有 fixture／inline brief，缺既有材料為 0。`fixture-present` 不代表 runtime 或 grader 可用；其中有 38 案宣告 `files`。[第一版](pilot-case-readiness.json)、[第二版](pilot-case-readiness-v2.json)、[第三版](pilot-case-readiness-v3.json)、[第四版](pilot-case-readiness-v4.json)、[第五版](pilot-case-readiness-v5.json)與[第六版](pilot-case-readiness-v6.json)保留當時的缺口與舊 corpus hashes。Three.js 新建題不必先有 repo，但不能只交 routed plan 當成 build／create／ship 完成。

## 已補齊的材料

- 8 個 pilot 的 59 routing 與 64 output 維持案例 ID 和數量；現在有 91 英文、16 繁中、16 中英混用。各 suite 三種語言都有，語言標籤接受 validator 檢查。
- `code-change-workflow` cases 1–6 都有可複製的公開工作區。1／6 為整數 cents／basis points 的捨入缺陷；2／5 為授權明確、只操作本機 JSON 的 staging stub；3 為未決 retention policy；4 為共用 locale 的 visible／accessible label。
- `javascript-development` cases 2／6 有真正的 `scripts/cleanup.js`、有效／無效輸入與無關 TypeScript app。腳本保留需修正的 exit-status bug；只做 dry-run，不刪資料。
- `web-page-design-to-code` cases 1–5 原本的三份文件已補 `fixture_root`，可直接整理成獨立 workspace。
- `code-review` case 6 原本聲稱有 pasted snippet 卻沒有提供，現在補上內嵌函式，仍保留缺 callers／版本／測試的限制。
- `video-production-workflow` 的分類代表已補公開產品段落、具體範圍、明示 full-run 與保留人工 review 的對照。原 oracle 不應把合法 full-run 一律當成必須重新問。
- `verified-software-delivery` cases 2／4／5／6 新增 4 個 family、45 個公開檔案：approved local change、review-waived refactor、build A／staging B、R1→R2 evidence。9 項作者檢查通過；歷史 unit 結果有真實本機執行紀錄，review 明示為合成情境，未跑的 acceptance／staging smoke 保持 `not_run`。
- 新的 JSON virtual file broker 只接收公開輸入，限制寫入 grant，保存 accepted／denied trace、前後 manifest 和入口讀取。17 項本機測試通過；[實際離線 probe](pilot-local-tool-probe.json)記錄 4 項產物／工具判定 passed、語義項 unverified，沒有模型呼叫。這尚不是模型宿主的隔離認證。
- `code-review` cases 1／2／7／14 新增 4 個 family、32 個公開檔案。前兩案有可重建的 Git base／index／worktree 與等價重構；PR 兩案有固定 SHA、diff、checks、comments 及 prior finding IDs。9 項 local Git 與 8 項 PR 作者檢查通過；[準備紀錄](review-preparation-check.json)四案維持 not_run，沒有模型呼叫。
- Three.js cases 1／3／7／8／9 已修正 planning-only 的 expected_output：要求與原需求對應的實作、量測及證據，缺必要能力時清楚標記未完成；全 corpus assertions 由 1191 增至 1201，沒有新增模型結果。
- `spec-flow` case 1 新增 12 個已批准 offline-sync 情境檔案，含 immutable retry、post-send edits、v1／v2 相容、telemetry 限制與 rollout／recovery。retention／owner、release commander、staging 可用性仍未決；公開輸入不提供標準工單答案。10 項作者一致性與打包檢查通過。
- `threejs-development` case 12 新增 9 個檔案，保留真實 `three@0.180.0` viewer，footer 獨立於 scene、CSS 與輸入控制。6 項作者檢查與[本機瀏覽器檢查](footer-browser-check.json)通過：1280×720／375×812 下，預寫的 footer 變更可觀察，canvas bounds 不變、窄版無水平溢出、鍵盤可抵達兩個 footer links。這是暫存副本的作者檢查，不是模型 routing／任務結果。
- [兩案離線打包紀錄](spec-footer-preparation-check.json)各保存 286-package 公開 snapshot hash 與 fixture manifest；模型呼叫 0，兩案仍為 not_run。
- `code-review` cases 3／10／11／12 新增 4 個 family、52 個公開檔案。Redirect 的本機 framework 保護形成誤報對照；administrator endpoint 僅刪除三行角色 guard，保留 session／organization 邊界，nonadmin 在 head 真正可達。History 可重建三個固定 Git commits，base 接受的合法 partner row 在 head 失敗。Payment 在接受後遺失回應時，head 的新 key 造成重複帳本紀錄；兩版普通 tests 都通過。10 auth＋9 history＋7 payment 作者檢查通過，四案仍 not_run，詳見[準備與邊界紀錄](review-boundary-preparation-check.json)。
- 獨立審查發現 redirect 的空 `?`／`#` 後綴與 fixture 契約矛盾；新增三個反例先重現 303，修正 normalized URL 檢查後 suite 通過，另有獨立正負重驗。[修正前 snapshot](review-boundary-preparation-before-redirect-fix.json)保留舊 hashes，不能用來認證目前 fixture。
- `code-review` cases 5／8／9／13 新增 4 個 family、55 個公開檔案，另有 7 migration＋9 comments＋10 generated＋7 platform 作者檢查。SQLite 真正重現 mixed-version 讀寫失敗、marker 失敗時的 DDL rollback、重試與最新資料保留。Six-comment remediation 在暫存副本區分正確修正、三項錯誤建議及缺證據項目。Dependency 兩版各有可再現的 20,000 行／3,000,084 bytes 派生資料，全部節點及依賴邊由 consumer 使用；獨立 CRLF 重驗與 broker 大小檢查亦通過。Platform 提供 canonical schema、generated JS／Swift、web path 及明示 unavailable 的 iOS binary 背景，Node 路徑可重現 milliseconds 單位錯誤，沒有假造手機或 browser 執行。詳見[準備紀錄](review-contract-preparation-check.json)，四案模型狀態仍 not_run。

最新三案共 37 個公開檔案與 27 項作者檢查，見[可重現準備紀錄](ui-delivery-preparation-check-v2.json)。React 的[實際瀏覽器觀察](react-checkout-browser-check.json)涵蓋快速切換 race、金額確認、焦點、Enter／Space retry 及窄版；只是固定作者 comparison。Delivery 具有真 serialized service 配對、rollback、新增 source／test 導致證據失效與 review unavailable 的誠實拒絕。Provenance 只收 selected metadata；獨立審查亦修正 originality oracle，防止它獎勵未執行卻宣稱 passed 的回答。這些工作沒有新增模型呼叫。

Three.js cases 2／4／5 已新增 38 個公開檔案及 [21 項作者檢查紀錄](three-runtime-preparation-check.json)，模型呼叫 0。GLB [browser 紀錄](glb-lifecycle-browser-check.json)包含原版原因未明的 crash，修正版 12 輪 route 資源回收是獨立作者證據；R3F [browser 紀錄](r3f-migration-browser-check.json)涵蓋真實 StrictMode／demand runtime 的所列操作；[renderer 紀錄](renderer-baseline-browser-check.json)只驗 WebGL baseline。Cases 2／4／5／10 另補 8 條實作／證據 assertions，全 corpus 共 1209 條。沒有將 prototype、GPU timing 或模型 outcome 標成已完成。

## 尚未達成的驗收條件

| 要求 | 現在的證據 | 必須補上的實際工作 |
|---|---|---|
| 同環境配對 A/B | 4 次 pipeline-review 文字 smoke；基線／候選都 2／2 | 固定有效模型／effort、host／工具、來源 packages、fixtures；隨機配對順序與重複 trials |
| Public／private 分離 | 準備工具排除 `evals/`；virtual broker 無主機 filesystem、只接受公開檔案，越界讀寫負例通過 | 模型 adapter 必須只暴露 broker call，禁止其他主機工具；另取得實際 host 隔離證據 |
| L1 真實選用 | routing runner 是 self-report，actual advertised catalog 與 activation 未觀察 | Host adapter 回傳實際 metadata 與資源載入 trace；無法取得時標 unsupported，不用回答名稱推測 activation |
| L2 任務完成 | 38 個 pilot output cases 附檔案；broker 可驗 hash／JSON／不變／工具序列，manual 保持 unverified；footer／React checkout 有作者 browser 證據 | 模型在受控工具中操作，再執行私有任務 grader；任意程式／browser 仍須真正的執行隔離，全部案例仍須相應 runtime／grading 能力 |
| L3 組合／授權／no-op | staging stub 有 accepted／denied；broker 記錄範圍外 attempt、前後 manifest、overflow | 接模型後收集同樣證據；adapter 必須限制輸入，禁止真實扣款／發布／DB／GitHub |
| L4 成本與效率 | 小型 smoke 保存 usage／wall time；金額與 effective model 未取得 | 完整 trials 保留全部失敗與消耗，依成功任務計有效成本；不把字元數當 tokens |
| Development／holdout | 現有案例全部被審查或用於開發 | 另設未參與修改的新 task／fixture families，先固定 rubric／門檻；翻譯不能充當新 holdout |
| L5 平台 | PowerShell 7 完整通過；7 主控＋5.1 安裝器完整通過 | Ubuntu／macOS 與其他宿主的 discovery／behavior 證據；CI 的 5.1 原生主控結果 |

## 後續 fixture 清單

這是執行準備缺口，不代表下列 Skill 指令已有缺陷。

| Suite／case | 執行前需要的材料 |
|---|---|
| spec-flow 1 | 公開決策與限制已備；待受控模型與盲化人工 rubric，檢查 work slices、依賴與未決事項處理 |
| code-review 1／2 | 材料與作者 Git 重建檢查已備；模型 host 仍須先可信 setup，提供受限 Git／程式驗證能力，不能把 source-view 目錄直接稱為真實 review repo |
| code-review 7／14 | 固定 PR snapshot 與唯讀 service 已備；待受限模型 adapter 接線及私有 review grader |
| code-review 3／10／11／12 | 公開 framework／guard／Git history／payment-retry 材料與作者反例已備；待受限模型 adapter 與私有 semantic review。Case 12 prompt 已指出有重複付款，不能用作盲測發現缺陷 |
| code-review 5／8／9／13 | SQLite migration、六則原始 comments、20,000-line generated dependency artifact、跨平台 schema／clients 等材料已備；待受控模型任務與 semantic review。Case 8 要給 src／test／handoff 的有界寫入 grant，保留原 comments／baseline／policy；case 13 的 iOS binary 不可用是題目指定限制，不以其他測試補稱通過 |
| code-review 4 | 16 個真 React base／head inputs、9 項 Node checks、temp fresh build 與作者 browser 觀察已備；仍須隔離的模型 review 與私有 grader，不能把作者發現算作模型找到問題 |
| verified-software-delivery 2／4／5／6 | 本機 fixture 已備；仍需隔離的程式執行 adapter 與私有 completion grader，不能直接執行模型修改的 Node 檔 |
| verified-software-delivery 1 | 18 個多服務契約／source／evidence／target inputs 與 13 項作者檢查已備；同一 process 真實 serialized exchange 不等於 HTTP。獨立 review adapter 缺失，synthetic commit／deploy 維持 denied，不影響獨立的實作與相容性工作 |
| threejs-development 12 | 最小真實 viewer、footer 邊界及作者 browser 比對已備；待模型操作與實際 selection trace，不能把作者檢查當成模型已避免誤選 |
| threejs-development 2／4／5 | 已附 13 個 GLB lifecycle、14 個 vanilla-game migration、11 個 WebGL renderer baseline 檔案。固定作者 candidate 與 browser observations 分開記錄；仍需受控模型修正／遷移、完整資產政策、WebGPU／TSL prototype 與裝置證據，不能把作者 feasibility 或 partial crash 紀錄算成 task pass |
| threejs-development 6 | 3 個輸入保留現行政策／24 reference paths 與固定 primary declarations；足以審查 bulk import 要求，不是完整 path clearance，remote originality 仍 not_run |
| threejs-development 10 | 已有 22 檔舊 configurator、存檔、assets 與作者基線觀察；依然需要模型 modernization 和所要求的 CSG／布料／path tracing／影片驗收 |
| python-development 分類代表 | 已有 8 檔起始專案、Python >=3.12／unittest 與兩欄位契約；Python 3.12.14 的既有 2 tests 通過，設定摘要功能仍待模型實作及私有驗收 |
| app-store-release／deployment-operations 分類代表 case 1 | 各 6 檔只讀材料與 broker 禁止寫入已備；仍需模型判讀與私有 rubric，不能據此宣稱其執行發布 cases 也已驗收 |
| mcp-creator-design 分類代表 | 8 檔起始專案、SDK 1.17.5 lockfile、官方文件離線 replay 與唯讀工具契約已備；作者在暫存副本驗證安裝／編譯及既有 2 tests。每次 trial 仍須建立隔離環境、提供受限命令能力並驗證 installed SDK，server 及私有行為驗收仍待實作 |
| spreadsheet-ops 分類代表 | 真實生成 xlsx，再讀回 worksheets／formulas／cached results，不能僅以文字答案通過 |
| video-production-workflow 分類代表 | 可用的隔離 renderer 或明確 capability-blocked 結果；影片產物與規畫產物分開 |

`solution-discovery` 與 `spec-flow` 的自足文字規畫案例可以使用盲化人工 rubric，不需要人造程式專案。其他沒有 `files` 的案例也不能只因缺檔便判無效，須按真實任務需求檢查。

完整 16 分類代表的最新輸入狀態見 [M4 矩陣 v2](m4-category-readiness-v2.json)：9 案附檔、7 案自足 brief，缺原始輸入為 0；[v1](m4-category-readiness.json) 保留 MCP 材料未備時的狀態。這不是 16 案可直接執行或 task pass。`git-readme-writer:1`、`agent-reach-ops` 三案也已修復 fixture root／位置，原始證據 bytes 保留。矩陣將輸入包裝與產物任務分開；文字 brief 的 Three.js／Frontend／Video 題仍需真正的實作和驗證，不得以計畫降格完成。

## 治理與比較限制

`solution-discovery`、`spec-flow`、`code-review` 入口與 Git 基線相同，應作 regression controls。其他 5 個 pilot 入口有變更；正式比較仍須核對完整 runtime package 與相鄰 owner，不只入口。若 A 用基線入口但載入候選 references／dependency，那是組合比較，不是單一 Skill 的因果效果。

單次 pipeline-review smoke 的 packet 已提供具體缺陷／缺證據狀態，schema 又要求分開欄位，因此主要證明基本文字輸出路徑可用；不能證明能在陌生 repo 獨立找出缺陷。四次的授權已使用完畢。新增離線 fixtures／準備檢查未啟動額外模型呼叫；正式 pilot 仍須依原方案確認範圍、執行能力與預算。

Case 10 最後補上 22 檔的真實 `three@0.152.2` 舊 configurator，兩份有效 v1 存檔、三種拒絕樣本、first-party 幾何／材質／音訊及窄版 raster 都可在暫存副本使用。[原版 browser evidence](configurator-baseline-browser-check.json)與[Unicode 修正追加 evidence](configurator-unicode-browser-check.json)分別保留版本雜湊；最新 11 項 default author checks 通過。這只是可執行起點；case 10 要求的 dependency modernization、CSG、布料、path tracing 及 encoded video 尚非完成。
