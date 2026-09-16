# Skill 維護與評估方法

入口：本輪的[實作進度](skill-optimization-progress.md)；修改前的[歷史審查](audits/skill-optimization-2026-09-16/optimization-plan.md)。

## 依賴與可攜性

在 `scripts/data/skill-catalog.json` 的 `skills[name].dependencies` 宣告跨 package 資源。必要依賴使用 `{ "name": "python-development", "kind": "required" }`；條件依賴使用 `"kind": "conditional"` 與具體 `when`；可選依賴使用 `"kind": "optional"`，不帶 `when`。三者都必須指向存在且不同名的 Skill，不允許同一 owner 重複宣告相同 target。只有 conditional 接受 `when`。一般 handoff 不必自動升格為安裝依賴。

執行 `npm run generate:skills`，會同步 `skills.json` 與 `scripts/data/install-skill-dependencies.tsv`。TSV 是安裝資料，不是命令；required 先展開、去重、檢查循環和 placement，conditional／optional 只提示、不自動安裝。optional 由明確名稱、分類或全量選擇納入時，才解析它自己的 required closure。單顆、分類、全量與 Agent companion 共用相同邊界。個別 package 的 ownership、修改偵測、暫存替換及 Force 規則照舊。

跨 package 的根入口 Markdown links 必須宣告依賴且指向存在的檔案；dependency 目錄連結以其 `SKILL.md` 驗證。禁止逃出 package、跨 package traversal 和 symlink escape。這項檢查涵蓋入口可執行 prose；fenced examples 不當作資源。純文字 handoff、任意執行程式的動態路徑，以及 reference 內的所有示例並不因此獲得完整可攜性認證。

針對依賴變更可先跑 `node tests/skill-dependencies.test.js`、`node tests/skill-catalog-generation.test.js`、`node tests/cli.test.js`，再用 `pwsh -NoProfile -File scripts/smoke-install.ps1 -PowerShellExecutable pwsh.exe -DependenciesOnly` 或 `bash scripts/smoke-install.sh --dependencies` 做隔離安裝檢查。PowerShell 可明確改用 `powershell.exe` 作安裝器子程序。Focused 模式會明示其他情境未執行；跨平台驗收仍需各自真實執行 full／quick jobs。

## 改動流程

1. 明確描述觸發、受影響產物與不用此 Skill 的近似情境。
2. 讀主入口及直接相鄰 owner，保留授權、只讀、資料契約與結果驗證。
3. 只把會改變決策的規則留在入口。參考細節按需求讀取，不重述一般知識。
4. 同步案例：保留既有正例，新增重現缺陷、近似反例及必要授權邊界。案例不可只核對剛加入的句子。
5. 產生 catalog、dependency index、release baseline，再跑相關 unit tests、`npm run validate` 和 `git diff --check`。
6. 用受控環境執行行為評估，依案例記錄結果；修改後的文字更精簡不等於模型更好。

## 三種證據不可混用

| 證據 | 能回答 | 不能證明 |
|---|---|---|
| 結構及 unit tests | 案例 schema、解析、評分、依賴與安裝規則是否可靠 | 模型是否會選對 Skill 或做對任務 |
| routing self-report | 給定提示時模型回報選擇了哪些名稱 | 真實 activation、工具行為或任務完成 |
| task outcome | 同一 fixture 下實際產物／工具呼叫／必要停點 | 未測平台、未測情境或整個 catalog 品質 |

`passed`、`failed`、`error`、`not_run` 分開。沒有輸出、未知名稱、非零退出和 timeout 都是 error，不得轉成「沒有選用」通過。routing-only trial 若觀察到工具或不支援的 item 類型，即使最後名稱答對也記為 `error`／`unexpected_task_activity`；包含 started、updated 與 completed，避免漏掉未完成工具。只保存類型，不保存工具參數／輸出或隱藏推理。這是污染偵測，不是宿主隔離。有效召回率與誤觸發率必須連同有效樣本覆蓋率及每次嘗試成功率呈現；無分母回傳 null。

`allowed_skills` 是案例預先列出的合理額外 owner，不能在看到模型結果後無記錄地放寬。所有不在 expected／allowed 的選擇都算 unexpected。嚴格比對揭露原有 corpus 的漏列時，先查 owner 證據再修案例，不為維持漂亮分數而排除錯誤。

## 行為實驗

正式 A/B 應固定 host version、實際 advertised Skill 清單、模型及 reasoning 設定、工具、初始 repo、依賴、fixtures 和 grading 規則；僅改候選 Skill。保留 trial ID、prompt／Skill／fixture hash、可见輸出、操作紀錄、結果、成本與 elapsed time。機密或隱藏推理不得放進 trace。

目前 routing runner 保存 repository 入口雜湊，但不控制 host 的 installed catalog，也不觀測 activation；報告會明示這些限制。`--model`／`--effort` 只代表 requested overrides，無法驗證 effective 值時維持 null。

task outcome 應在隔離工作目錄或假工具中執行：發布、真實扣款、資料刪除、送審等案例只觀測受控 tool calls，不能為評估觸碰真實服務。工具不可用、需要真實憑證或無平台 access 時，記錄具體原因與 `not_run`／`unsupported`，不把文字 walkthrough 當成 runtime pass。

先做小型 harness smoke；通過後才擴大到歷史方案的 8-Skill、多次 A/B pilot。歷史方案以最低案例數估算 624 次；本輪 corpus 為 59 routing＋64 output，A/B 各 3 trials 共 738 次，尚非已執行紀錄或額度授權。類別代表案例也只代表該案例的結果，不能外推整類 Skills。

## 準備獨立任務輸入

`prepare:skill-pilot` 只做本機資料整理，沒有模型／網路呼叫。指定不存在的輸出目錄：

```bash
npm run prepare:skill-pilot -- --skill code-change-workflow --case 1 --output /tmp/craftroster-billing-trial
npm run prepare:skill-pilot -- --skill spec-flow --case 2 --text-only --output /tmp/craftroster-spec-trial
```

Windows 可把 `--output` 換成 `%TEMP%` 中尚不存在的絕對路徑。`--root` 指向固定的案例來源；`--source-root` 可指定另一份 runtime checkout，讓基線與候選使用完全相同的題目與 fixtures。預設取目前 repository。工具不會替來源標籤背書；必須比較完整 package hashes，不能只看入口或自行聲稱 commit。

| 路徑 | 內容 | 提供給受測代理？ |
|---|---|---|
| `public/task.txt` | 當案使用者提示 | 是 |
| `public/workspace/` | `files` 明列的公開輸入，以 `fixture_root` 為根 | 是，寫入權限另由該案 host adapter 決定 |
| `public/skills/` | 固定 catalog 的 runtime packages，保留 references，排除所有 `evals/` | 是，按需讀取 |
| `public/skill-catalog.json` | 名稱／描述／入口路徑的預期清單 | 是；不是實際 advertised snapshot |
| `private/record.json` | 預期結果、逐條 assertions、所有輸入 hashes、尚未執行狀態 | 否 |

**不同目錄不等於存取隔離。** 在執行模型前，host／受控工具代理還必須拒絕讀取 private 目錄、來源 repository、其他案例與真實服務，並限制寫入範圍。準備工具會保留 `requires_host_isolation_and_grader`；它不啟動 Codex，也不會把任務標成 passed。現有 routing runner 仍是未隔離的 self-report 工具，不適合作完整受控評估的替代品。

公開 fixture 根只含任務契約、一般 tests、程式與資料。私有評分程式留在外部；準備工具的 path、symlink、case-collision 與 oracle 排除測試由 `npm run test:skill-pilot-preparation` 執行。Fixture 的故障能否重現、fake staging 的拒絕與狀態變更，由 `npm run test:skill-pilot-fixtures` 驗證；這些都是作者製作的測試材料檢查，沒有執行受測模型。

檔案型案例必須同時提供 `files` 與 `fixture_root`；後者決定 `public/workspace/` 內的相對路徑。只檢查原始檔案存在不足以證明案例可準備：應實際呼叫 `buildBundle`，核對題目使用的路徑、檔案 bytes 及私有 oracle 未進入公開資料。Backend 的 `api-contract-design:1` 與 Documents 的 `spreadsheet-ops:1` 已加入這項回歸，避免附檔存在但準備失敗。

Cloud 的 `deployment-operations:1` 與 Mobile 的 `app-store-release:1` 使用固定、明示虛構的 release evidence。`test:skill-deployment-fixtures`／`test:skill-app-store-fixtures` 只驗證資料自洽、不同 artifact／target／revision／有效期不能互相替代，以及只讀 broker 邊界；不執行真部署、送審或模型。公開契約描述專案的判讀條件，個案結論及 assertions 留在私有 corpus。這些仍是 development 材料，不是新 holdout 或已取得 task outcomes。

分類盤點另見 [16 分類輸入矩陣](audits/skill-optimization-2026-09-16/m4-category-readiness.json)。`text_only` 是打包模式，不能將要求 build／render／deploy 的任務縮成文字答案。缺既有專案／SDK／工具回應時明列 missing inputs。Python 起始專案的 `test:skill-python-config-fixtures` 僅做 Node 材料／權限檢查；若另跑 Python，要在暫存副本使用已確認符合 `requires-python` 的 interpreter，保存實際版本，並區分原有測試與受測者新增功能的驗收。

目前全部 pilot 案例都已供開發審查使用，標為 development。每個 suite 均有 `en`、`zh-TW`、`mixed-zh-TW-en`；語言標籤由人工核對，validator 只檢查 enum 與基本文字存在，不能自動證明翻譯品質。翻譯同一題不會成為新的 held-out family。正式實驗前仍要準備未參與修改的新任務家族、預先固定門檻，並測過 private oracle 讀取被拒絕的負例。

## 受控工具與私有產物檢查

`scripts/lib/skill-eval-broker.js` 提供記憶體中的 JSON 檔案工具。Trusted driver 只傳 `buildBundle()` 的 `publicFiles`，另設 `writable_paths` 或結尾為 `/` 的 `writable_roots`。預設全部唯讀；grant 只能位於 `workspace/`，runtime Skills、task 與 catalog 不可修改。以下為本機作者 probe，並未接模型：

```js
const { buildBundle } = require('./scripts/prepare-skill-pilot');
const { runScriptedProbe } = require('./scripts/lib/skill-eval-broker');
const bundle = buildBundle({ skill: 'code-change-workflow', caseId: 4 });
const report = runScriptedProbe({
  publicFiles: bundle.publicFiles,
  policy: { writable_paths: ['workspace/locales/en.json'] },
  actions: [{ tool: 'read_file', arguments: { path: 'workspace/locales/en.json' } }],
  checks: [{ id: 'handler-preserved', type: 'file_unchanged', path: 'workspace/src/sign-in.js' }],
});
```

模型介面將來只能收到 `call(JSON.stringify({ tool, arguments }))` 的結果；`inspect()`、`snapshot()`、private record 和 grader 都只供 driver 使用。現有四種工具為 `list_files`、`read_file`、`write_file`、`delete_file`。檔案內容預設 UTF-8，二進位用 canonical base64；路徑不解碼、不對應主機 filesystem，也沒有 symlink、shell、network、Git 或 browser 工具。**這不是可執行任意程式的 sandbox，也尚未證明某個模型宿主只會使用此介面。** 不可把模型修改後的程式直接交給未隔離的 Node／shell 執行。

每次 accepted／denied 呼叫保存序號、工具／路徑和 request／response hashes，不保存原始檔案內容；超過 call 上限仍計數，並將 trace 標為不完整。前後 manifest、grant、toolset hash 與讀過的 Skill 入口可供核對；`loaded_skill_entries` 只代表成功讀檔，不代表 routing、activation 或遵循指令。

私有 grader 支援檔案 hash、不變、缺席、JSON 欄位值與完整工具決策序列。語義 rubric 使用 `manual`，維持 `unverified`；沒有 checks 是 `not_run`，不得當作通過。`runScriptedProbe` 即使 artifact checks 全部 passed，整體 `status` 仍為 `not_run`、`model_execution: false`。這些檢查不代替模型任務結果。`npm run test:skill-eval-broker` 驗證越界、路徑別名、寫入 grant、trace、resource limits 與 false-pass 邊界。

Delivery 的 `npm run test:skill-delivery-fixtures` 在暫存副本執行作者程式，驗證 required acceptance、review waiver、build／staging 對應，以及 R1 與 R2 的證據範圍。公開歷史 evidence 使用明示的 `sha256-utf8-lf`；真實作者測試與合成 review 情境分開標記。只有刻意重建凍結情境時才使用 `--record-fixture-evidence`，正常驗證不會更新既有證據。

## Review 的 Git 與 PR 材料

`code-review` cases 1／2 的 `working-tree`／`equivalent-refactor` 包含 source views 與固定 recipe。`npm run test:skill-review-local-fixtures` 在全新暫存 Git repository 建立 base／index／worktree，再核對實際 SHA、porcelain、diff、callers、正常與缺陷輸入。它拒絕既有目的地及暫存根外路徑，隔離 Git 設定與 hooks，不修改 CraftRoster 的 Git 歷史。**打包 source views 不會自動完成 Git setup**；正式模型任務還需要由可信 host 在隔離環境依 recipe 建立 repo。未 setup 時只能稱 source comparison。

Cases 7／14 的公開 `github-snapshot.json` 是離線 PR 資料。SHA／merge base／patches 來自真正的暫存 commits；check logs 來自作者測試，comments／prior findings 是明示的合成情境。初次 review 只含當時可見的 base／head，不包含下一輪資料；重新 review 保留舊 finding ID、rejected／resolved 狀態與各版本原始碼，供確認當前是否修復或回歸。

`scripts/lib/skill-review-snapshot.js` 提供 `createReviewSnapshot(publicSnapshot)`。受測工具只可呼叫 `call(JSON.stringify(request))`；request 帶 `operation`、`repository`、`number`、固定 `head_sha`，`get_file` 額外要求確切 `ref` SHA 和 `path`。可讀 PR、commits、comments、checks、changed files、review history 和該版本檔案；post、approve、merge、其他 PR／repo、過期 head、moving refs 都拒絕並記錄。回應與 inspector 是副本，無 shell／網路／主機檔案能力。尚未接模型 adapter，不能以服務自身只讀推論整個模型宿主已隔離。

`npm run test:skill-review-pr-fixtures` 重建 source Git 歷史、實跑契約並驗證假工具邊界。兩種 author suites 的 `--record-fixture-evidence` 只在刻意更新固定來源時重建公開歷史證據；日常測試不改資料。私有 finding 判定留在 repository tests，未放進受測公開 bundle。實際 review verdict、confidence、finding 去重及 scope adherence 仍需模型執行與私有 grading，作者測試通過不能替代它們。

`npm run test:skill-review-auth-fixtures` 以本機 synthetic dispatcher 檢查 redirect 的正負控制、三行 guard 移除後的角色邊界及保留的 session／organization 邊界；沒有使用真實身份供應商。`npm run test:skill-review-history-fixtures` 重建三個暫存 Git commits，對照一般 tests 與 consumer 邊界輸入；commit message 只是背景，失敗必須從目前 caller／contract 重現。`npm run test:skill-review-payment-fixtures` 對照兩版共用的持久化 JSON 帳本，分開 timeout-before-accept 與 timeout-after-accept、重試耗盡、重開 state。只有後兩個 suites 的 `--record-fixture-evidence` 能在刻意更新 fixture 時重錄普通作者檢查；不得把 private acceptance 結論放進公開 receipt。Payment 題目已指出違約，衡量的是原因追查與證據品質，不是盲測缺陷發現。

`npm run test:skill-review-migration-fixtures` 使用 `node:sqlite` 執行真實 in-memory SQL；該 fixture 額外需要 Node >=22.13，專案 CLI 的最低版本不因此變更。它只驗 sequential 小型資料的 mixed-version、交易、重試及 rollback，不量測 production locks 或大規模 backfill。`npm run test:skill-review-comments-fixtures` 在新暫存副本驗證六個 incoming IDs、修正前後反例及錯誤建議；case 8 的 task owner 是 remediation，不能套用所有 review cases 一律唯讀的 grant。允許修改相關 source／tests／本機 handoff，原 comments、source baseline、未決 policy 仍保留。

`npm run test:skill-review-generated-fixtures` 驗證自製離線 package 格式的 manifest、固定來源 digest、兩份 20,000-line artifact 及 consumer；不是 npm lock 或供應鏈驗證。LF／CRLF 檔案皆須保持在 broker 4 MiB 單檔、64 MiB 總量限制內。`npm run test:skill-review-platform-fixtures` 核對 schema→generated client、Node web 行為及 review 邊界；Swift 原始碼再現不等於編譯、簽章、iOS binary 或 browser 驗證。Unavailable 面向應降低結論範圍，不能用其他平台的成功代替。

### 規劃輸入與瀏覽器案例

`npm run test:skill-spec-fixtures` 檢查 `spec-flow:1` 的公開決策、合成樣本、未決 prerequisites、相容性與 recovery 是否一致，並核對準備工具是否完整收錄 12 個檔案。這些資料不能預填模型應產出的 work items 或 ready／blocked 答案；規劃品質仍交由私有 rubric 判定。

`npm run test:skill-footer-fixtures` 檢查 `threejs-development:12` 的版本／lock、公開打包、footer 寫入 grant 及 viewer 不變條件。純 Node checks 不判定畫面：可另在暫存 npm prefix 安裝固定的 `three@0.180.0`，再以 `node docs/audits/skill-optimization-2026-09-16/serve-footer-author-probe.cjs <prefix>` 服務固定的作者 baseline／candidate 副本。該 probe 只接受 GET、只綁 loopback、不執行模型程式；測完應關閉服務並還原 browser viewport。保存 DOM spacing、links、canvas bounds、實際渲染觀察及來源 hash；無法觀察的 GPU／device／lifecycle 指標保留未測。此 author check 不證明模型 activation 或任務成功，也不是未隔離模型程式的執行宿主。

`npm run test:skill-three-provenance-fixtures` 檢查 `threejs-development:6` 的既有政策、24 條固定 reference paths、三個 primary metadata 觀察及唯讀工具邊界。公開資料只包含事實摘要與 SHA／Git blob，不含上游 code、assets 或 Skill 正文。日常測試完全離線；刻意更新 primary observations 時才使用 `node docs/audits/skill-optimization-2026-09-16/collect-threejs-license-evidence.cjs --record-primary-evidence`，它只讀固定 revision 的 package、LICENSE、notices。HTTP digest 使用原始 bytes，本機政策 source 使用 `sha256-utf8-lf`。Selected notices 不等於完整 tree clearance，也不等於 remote originality 通過；回答若誠實標示 comparison `not_run`，不得因未虛報通過而扣分。

`npm run test:skill-review-react-fixtures` 的預設檢查不安裝依賴、不啟動瀏覽器；它測 controller、真實 timer adapter 與固定 lock。需要重建時設定 `CRAFTROSTER_NPM_CLI` 為本機 npm CLI 的 `.js` 絕對路徑，再加 `--build`，只在新暫存副本執行 `npm ci --ignore-scripts` 及 esbuild。Browser 操作依 fixture `CONTRACT.md`，比較 base／head 的 quick switch、error focus、Enter／Space retry 與 375px 排版，另保存實際 DOM／畫面、來源／編譯 hash。不能把 controller dispose 測試冒稱為 React StrictMode、DOM remount 或 unmounted-update 證據。

`npm run test:skill-delivery-migration-fixtures` 測三個服務的真實 JSON 序列化契約、四組 producer／consumer 配對、混版失敗、暫存修正、rollback 與 source digest 失效。服務在同一 Node process 交換資料，不是 HTTP 部署。Local target 只操作新暫存目錄，獨立 reviewer adapter 缺失時，synthetic commit／deploy 一律拒絕；rehearsal applied 不代表 task deployment passed。Source scope 遞迴納入 regular UTF-8 檔案、正規化 LF、排除頂層 evidence 自指並拒絕 symlinks；新程式或測試也會使舊證據失效。這個作者 helper 不可拿來未隔離地執行模型改寫的 code。

這三案的固定作者測試與 broker probe 可用 `node docs/audits/skill-optimization-2026-09-16/record-ui-delivery-preparation.cjs --record-author-checks` 記錄。它不執行模型，保存真實 stdout、時戳、input／test hashes，並拒絕覆寫既有歷史報告。輸入改變時需建立新版本記錄；舊 browser report 或 preparation hash 不會自動認證新程式。

Delivery 的寫入 grant 包含 `services/`、`test/`、`artifacts/` 與 `evidence/new/`。完成 source／test／handoff 後，將新執行證據寫到 `evidence/new/`，避免 receipt 本身進入 source digest；原 `evidence/initial-checks.json`、`evidence/review.json`、target 與 acceptance 契約仍唯讀。新版 probe 實測新 receipt 可寫／讀／刪、原證據不可改，且收尾後公開 snapshot 不變。第一版曾漏掉 receipt grant，保留為修正前歷史，使用 v2 作目前工具邊界證據。

### Three.js runtime 輸入與作者驗證

`npm run test:skill-three-viewer-fixtures`、`npm run test:skill-three-r3f-fixtures`、`npm run test:skill-three-renderer-fixtures` 預設離線執行，共 9＋7＋5 項；不把純函式或 dispose event 測試當成 GPU 渲染。Case 2 保留待修 GLB viewer、第一方產生的小型 GLB／PNG 與有界壞紋理；case 4 保留 vanilla game，R3F 作者候選只在 private test 和隔離暫存副本；case 5 提供已有 WebGL readback／post-process 契約，沒有預填 WebGPU 遷移答案。

GLB 需要重建時，以 `CRAFTROSTER_NPM_CLI` 指定 npm CLI 絕對路徑，再跑 `node tests/skill-three-viewer-fixtures.test.js --stage-browser`；R3F 使用 `node tests/skill-three-r3f-fixtures.test.js --stage`。兩者只在新暫存目錄安裝固定 dependencies／build，保留 browser staging。R3F 也可用 `--stage-from <既有 author staging 的絕對路徑>` 複用相同 lockfile 的已裝 dependencies，新紀錄必須明寫未重新安裝。依 CONTRACT 啟動 loopback server，透過可用瀏覽器工具驗證；完成後停止服務。不可用這些 helper 執行未隔離的模型改寫程式。

保存 source／private candidate／build hashes，以及真正 DOM、畫面、dispose events 和 renderer 計數；object counts 不等於 GPU bytes，CPU wall-time 不等於 GPU timestamps。R3F demand rendering 必須排除 idle 時间對首幀的影響；不要用每幀 React state 更新驅動 mutable transforms。R3F 的 context-loss 呼叫與 renderer.dispose 呼叫是不同觀察，不得互換。Browser crash 必須保留原始 partial 結果和未知原因，不因另一版本成功就推論 crash 已修復。

`node docs/audits/skill-optimization-2026-09-16/record-three-runtime-preparation.cjs --record-author-checks` 保存三組固定作者測試實際 stdout、38-file manifests、case hashes 與有界 broker probe；拒絕覆寫歷史紀錄。Source／test／tool／artifact 及指定 package／頁檔可寫，scenario、acceptance、既有 level、dependency evidence 與 private oracle 受保護。這仍是 in-memory broker，不證明任意程式或模型宿主已隔離，也不產生模型 pass。

## 按變更選擇回歸

修改共用 owner 後，先建立可審查的離線清單：

```powershell
npm run plan:skill-regressions -- --changed solution-discovery --changed spec-flow --output new-regression-plan.json
```

這個命令只讀本機來源並建立新的 JSON，不執行模型。`--changed` 可重複；輸出不可覆寫。選取變更本身和直接 required／conditional 消費者的全部 output／routing suites，再加一步 routing 鄰居的 routing suites，以及其他 owner 明確引用這次變更的個別 routing cases。Conditional 保守納入而不猜測 `when` 是否成立；optional 只列出與 changed 端點相關的 `optional_dependency_advisories`，不因此增加 Skills 或案例。間接依賴若有實際影響，需另外加入 `--changed`；它不是全圖遞迴或完整覆蓋證明。

先檢閱每項 reason、missing requested suite 和所需 runtime，再決定 variants、trials、host、工具、私有 grader 與額度。Manifest 包含完整 runtime package hashes（不含 evals）、corpus 與選中案例的 input hashes；執行前來源變動必須重建並重查。Oracle hashes 與選取理由只給 evaluator，不應把整份 manifest 當作模型提示。`npm run test:skill-regressions` 驗證一步邊界、三種依賴的選取差異、路徑、型別、雜湊及覆寫拒絕。

`npm run test:skill-three-configurator-fixtures` 驗證 case 10 的舊版 Three.js raster、v1 schema／存檔、單位、明確時間、種子、mobile tier 與自製 PCM；預設不安裝套件。可用 `--stage` 在新暫存目錄建置固定 three@0.152.2。舊版能操作只證明輸入可用；新版本、CSG、deformation、path tracing 和帶標籤／音訊的編碼影片必須另外實作並驗收。

## 受限的任務工具循環

`scripts/lib/skill-task-driver.js` 提供非同步 `runTaskTrial({ publicFiles, policy, checks, adapter, limits, signal })`。先用 `buildBundle` 取得公開輸入，只傳它的 `publicFiles`；`privateRecord` 留在 evaluator。`policy` 沿用 broker 的明確 workspace 寫入範圍。`checks` 是 evaluator 私有資料，不能混入 adapter request。

Trusted adapter 只收到 `{ requestJson, signal }`。JSON 初始訊息包含 task 與 catalog，其後包含已發生的公開對話及工具結果；按需讀取的 Skill 檔案仍經 broker。每次只能回傳其中一種 JSON：

```json
{"type":"tool_call","request":{"tool":"read_file","arguments":{"path":"workspace/CONTRACT.md"}}}
```

```json
{"type":"final","text":"可見的最終回答"}
```

所有 list／read／write／delete 都由 driver 呼叫 broker，不提供 shell、瀏覽器或任意程式執行。未知欄位、批次、非法 JSON、超量回覆與超過步數會終止；一般 broker denial 保留在 trace 並可交回下一輪。沒有自動重試。

`limits` 可在程式硬上限內明確設定。預設為 32 次 adapter 呼叫、30 秒、單一 request 2 MiB、response 256 KiB、history 4 MiB、final text 64 KiB；硬上限依序為 128 次、60 秒、8／1／16 MiB、256 KiB。這些是本機 driver 的界線，不是正式模型評估預算。取消或逾時後忽略晚到的回覆，保留先前已接受的檔案變更作 partial evidence，不宣稱回滾。AbortSignal 能通知 adapter，不能強制停止同程序同步程式或保證遠端計費已停止。

回傳 `{ report, artifacts }` 只交 trusted evaluator：report 保存有限輸出、hash、工具決策、終止原因和私有 grading；artifacts 是記憶體檔案副本。每項 grading 以 index、ID／evidence hash 和 status 記錄，私有原始 ID／判定證據不送到 adapter。`run_status` 與 artifact grading 分開；只有完整 final 且 trace 完整才評分。空 checks 維持 `not_run`，manual check 維持 `unverified`。Driver 頂層 `status` 固定 `not_run`，`model_execution`、`cost`、`usage` 為 null；completed 不等於模型 task pass。

Driver／broker 的 implementation hashes 綁定 module 載入時的版本。每次 adapter、工具及 final grading 前核對來源；來源變更或不可讀時停止並回報 `loaded_source_changed`，不把新磁碟版本誤認為已執行版本。這個檢查不替代作業系統隔離或外部 transport 的版本證據。

`npm run test:skill-task-driver` 驗證協定、資料隔離、取消、晚到回覆、上限及 false-pass 邊界。`record-task-driver-rehearsal.cjs --record-author-driver` 使用兩個既有 corpus cases 和預寫 mock actions 作整合演練；拒絕覆寫歷史報告。登入例只把產出的 JSON 交給未修改的可信元件與 document stub，沒有執行產出的程式，也沒有瀏覽器／模型驗收。模型 transport 的剩餘條件見[邊界紀錄](audits/skill-optimization-2026-09-16/task-driver-transport-notes.md)。

## Codex JSONL transport

`scripts/lib/skill-codex-transport.js` 匯出 `createCodexTransport({ executeTurn, model, effort, limits? })`，提供可傳入 task driver 的 `adapter` 與只讀 `inspect()`。`executeTurn` 是可信 caller 明確注入的執行器；module 不會自行啟動 Codex、讀取登入資料或使用 API。每次執行器接收 `{ prompt, outputSchema, model, effort, signal, limits }`，回傳 `{ stdout, stderr, exit_code }`。Prompt 只有固定協定和公開 driver request，私有 grading 不傳入。

執行器應以新 `codex exec` 的 stdin 接收 prompt、`--output-schema` 指向固定 schema、`--json` 取得事件；不得 resume、不自行重試。執行器必須自行限制串流 bytes，接到取消時終止並等待子程序 close，再結束 Promise。Adapter 另核對回傳 bytes、完整 turn、唯一 final message 與嚴格 action 格式。任意 started／updated／completed 原生工具或未知 item 都拒絕，拒絕結果不能交 broker 執行。唯一已辨識的啟動通知例外是完整字串匹配的「Code Mode 因 host 停用而不可使用」：僅任務開始前接受一次並保留 notice code；虛擬 JSON 協定不依賴這項已停用能力。近似訊息、重複或任務開始後出現仍拒絕。事後拒絕只能否定該次結果，不能證明工具先前沒有執行。

同一批 trials 共用 instance，`max_processes` 限制保留的執行名額；失敗與取消不退回，未結束的執行器仍阻擋並行。**這不是 provider requests 或花費上限。** 目前 CLI 沒有已核實的內部請求總數硬 cap；custom provider 的零 retry 設定也不能直接套到不可覆寫的 built-in `openai` provider。`provider_requests`／金額／effective model／effective effort 保持未知，requested 設定另存。[設定參考](https://learn.chatgpt.com/docs/config-file/config-reference)、[非互動模式](https://learn.chatgpt.com/docs/non-interactive-mode)

有效 `turn.completed` 的 input／cached／output tokens 以 `cli_reported` 留存，即使後續 action 或 exit 驗證失敗；缺失、不合法、逾時與取消維持未知。這不是服務帳單核對。只保留可見 action hashes、數值與有限狀態，不保存 stdout／stderr 原文、工具 payload 或推理內容。`npm run test:skill-codex-transport` 使用離線 JSONL fixtures 與虛擬 broker，不呼叫模型。

Codex 的真實啟動設定、catalog、工具、登入來源與版本仍是執行器責任。通用 adapter 不認證 OS 隔離、自動 Skill activation 或模型任務成功；實際評估前須有對應宿主證據與明確測試範圍。使用者已選擇維持 Codex，以下 Responses 路徑保留為離線工具，未啟用另行計費服務。

### Windows Codex executor 與固定兩案比較

`scripts/lib/skill-codex-executor.js` 提供 `createCodexExecutor({executable, executableSha256, codexHome, model, effort, spawnImpl?})`，回傳 `executeTurn`、`inspect`、`close`。這個執行器目前只支援 Windows `codex.exe`，通用 JSONL transport 本身不限定平台。建立 instance 只驗證指定 executable 的 bytes 和路徑、home 目錄，不啟動程序或讀取認證／設定內容。

每次執行使用自有空白暫存 workspace、固定 output schema、allowlisted 環境及 pinned executable；固定 ChatGPT 登入與內建 OpenAI provider，沒有 API key、proxy 或自訂 endpoint 注入。CLI 本身可能寫入既有 home 的正常 cache／log／更新登入，不能把暫存 workspace 說成完整 host 隔離。取消、bytes 超限或 timeout 會終止程序並等待 close；5 秒後仍未 close 會維持 in-flight、保留 scratch 並阻止下一次啟動。清理失敗不接受動作，若已取得完整 bounded stdout 則保留已知 usage。

`npm run test:skill-codex-executor` 使用 fake ChildProcess，已加入 Windows CI；沒有啟動 native CLI 或模型。`spawnImpl` 是可信作者測試接縫，不是可執行任意來源的 sandbox，使用它的結果必須標為非模型執行。

`docs/audits/skill-optimization-2026-09-16/run-codex-comparison.cjs` 提供 `preflightComparison`、`freezeComparison`、`runComparison`，共用上述五個必填設定。CLI 只有 `--help` 與 `--preflight`，沒有 live 執行命令。固定來源及設定的可審閱內容見[Codex 比較提案](audits/skill-optimization-2026-09-16/codex-comparison-proposal.md)。`runComparison` 另需 frozen `manifest`，可接受 `signal`；呼叫 module API 不代表使用者已授權。

兩案四個 trials 共用 48 次 executor 啟動上限，每 trial 12 輪／60 秒；provider requests、tokens、金額沒有硬 cap。這項限制不同於原 API 提案，必須明確接受才可啟動。每次派送前、收到 action 後和結束時核對來源，失敗保留用量與部分產物並停止。固定 comparison suite `npm run test:skill-codex-comparison` 也是純程序替身，但依賴本輪 raw bytes、完整 Git baseline、Windows；不加入適用後續改動的永久 CI。

### MCP 分類案例的依賴與文件重播

`mcp-creator-design:1` 的公開包提供 8 檔起始專案，固定歷史 SDK `1.17.5`、Zod、TypeScript 與 npm lockfile；這是版本相容性案例，不是 production 版本建議。公開 `host/retrieve-docs.mjs` 只接受兩個文件 ID，回傳依官方 tagged source 撰寫的短摘要與來源，拒絕任意 URL／路徑。它是離線 author replay，不能記為實際遠端文件取得。

`npm run test:skill-mcp-fixtures` 檢查版本一致性、replay 邊界與打包答案排除，不安裝套件或執行模型。[起始專案驗證](audits/skill-optimization-2026-09-16/mcp-starting-project-verification.json)另保存作者在暫存副本用空 npm 設定、獨立快取及 `--ignore-scripts` 安裝／離線 `ci` 的結果：既有 catalog 編譯、2 tests、SDK imports 與 replay CLI 通過。沒有填入目標 server 或宣稱其行為通過。

真正 trial 前仍須由可信 setup 提供 lockfile 對應的唯讀 SDK、可執行 replay 的受限能力，以及程式驗證隔離。現有虛擬檔案 broker 不提供命令執行；材料可打包不代表宿主接線已完成。新增模型呼叫需要其具體範圍授權，且不得沿用已用完的四次文字測試額度。

## Responses transport

`scripts/lib/skill-responses-transport.js` 匯出 `createResponsesTransport({ model, apiKey, fetchImpl, effort?, limits? })`，回傳 `{ adapter, inspect }`。模型、金鑰與 fetch 必須由可信呼叫端明確提供；module 不讀環境變數、檔案或 Codex 登入資料，也不預設使用全域 fetch。將 `adapter` 傳給 `runTaskTrial`；同一批 trials 應共用一個 transport，避免逐案重置請求上限。這是獨立的 Responses API 測試宿主，不能以其結果宣稱 Codex 的自動發現、activation 或原生工具行為相同。

每次 POST 固定送往 `https://api.openai.com/v1/responses`，`tools: []`、`tool_choice: "none"`、`store: false`、`stream: false`、`background: false`、`truncation: "disabled"`，不提供 conversation／previous response。`redirect: "error"`，沒有 SDK 或自動重試。Body 只含固定協定說明、原樣序列化的公開 driver request，以及明確模型／effort／限制。嚴格 schema 使用根物件 `{ "action": ... }`，解析後還原 driver 的單一 final 或虛擬檔案操作；provider 原生 tool output、拒絕、未完成或格式不符都停止，不當作空回覆通過。

| 限制 | 預設 | 可設定硬上限 |
|---|---:|---:|
| 同一 instance 累計請求 | 1 | 128 |
| 每次 `max_output_tokens` | 2048 | 16384 |
| 每次 timeout | 30 秒 | 120 秒 |
| HTTP request body | 2 MiB | 8 MiB |
| HTTP response body | 1 MiB | 8 MiB |

這些與 driver 的步數／總時限分開計算。Request 在呼叫 fetch 前保留名額；HTTP 錯誤、取消與不確定結果不退還。並行呼叫會拒絕；不配合 abort 的 fetch 未結束前，instance 保持 in-flight，不能開啟下一次請求。取消只能停止本機後續派送，不能保證服務端停止運算或計費。可信 `fetchImpl` 必須遵守固定 endpoint、redirect 與無重試語意；注入 callback 本身不是 sandbox。

`inspect()` 只記錄 requested／provider-reported model 與 effort、numeric token usage、請求與可見 action hashes、狀態和時間。完整有效 envelope 即使 incomplete、refusal 或 action 無效，仍保留已知用量；取消、逾時、缺失／不合法 usage 維持 unknown，不算零。`usage_complete` 只代表已回傳有效 token totals，不表示任務完成、全部 cache 明細或價格已知。金額保持 null，不根據模型名稱自行猜算。Provider raw errors、headers、hidden reasoning 不保存或重播；金鑰的直接、JSON escape 與已知 base64 寫入回顯會拒絕，但這不是任意秘密或任意編碼的通用偵測器。

`npm run test:skill-responses-transport` 以注入的 fake fetch 驗證邊界與 driver 虛擬寫入整合，沒有網路或模型呼叫。允許的 effort 詞彙不保證每個模型支援；真實執行前需固定並確認模型的 structured outputs／effort 支援。現有 module 沒有 live CLI、付費執行授權或 Codex 憑證轉接；實際模型 task outcome 仍須另外執行與判讀。

### 固定兩案的比較 runner

`docs/audits/skill-optimization-2026-09-16/run-responses-comparison.cjs` 只處理該次凍結的 locale／readiness 四個 trials。`preflightComparison({model, effort})` 在記憶體核對輸入；`freezeComparison({model, effort, outputPath})` 將相同設定寫到不存在的新檔案。CLI 只有 help／preflight：

```bash
node docs/audits/skill-optimization-2026-09-16/run-responses-comparison.cjs --preflight --model gpt-6-astra --effort low --output /tmp/craftroster-comparison-preflight.json
```

Windows 請改用已存在的暫存目錄內的新絕對路徑。這個歷史 runner 需要原基線 Git commit 與凍結的 raw bytes；line endings、corpus、runtime Skills 或原實作改變都必須拒絕。`test:skill-responses-comparison` 因此是該凍結 checkout 的本機作者測試，沒有加入需適用後續改動與 shallow checkout 的永久 CI。需要新比較時應另製作、審查及批准新版本，不能修改舊 manifest 來消除 drift。

取得額外執行授權後，可信 caller 才能呼叫 `runComparison({manifest, model, effort, apiKey, fetchImpl, signal?})`；module 沒有 live CLI 或自動尋找憑證。四個 trials 共用 48 次 transport 名額，每 trial 最多 12 次 driver 呼叫／60 秒，每次 response 最多 2048 output tokens；不開放 order、policy 或 limits override。這些是次數、時間與輸出限制，沒有貨幣金額保證。首次 infrastructure error、timeout、limit 或 provenance drift 即停止，後續 trials 保持 not_run。

Preflight 額外綁定 Node version／platform／arch、runner／transport 的實際載入版本、私有 checks 與紀錄雜湊。每次 fetch 前、action 回來後及結束時再核對；中途 drift 仍回傳既有 attempts／usage，避免丟失已發請求。回傳 `{report, artifacts}`：report 包含可見 structured actions、final、driver trace 與每次 provider metadata；artifacts 以 UTF-8／base64 記憶體資料交回，不執行其中程式。Deterministic 檔案條件與 manual rubric 分開，manual 一律待人工以可見結果判讀；runner completed 不會自動升為 task passed。
