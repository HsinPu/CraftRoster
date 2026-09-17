# Skills 優化實作與驗收紀錄

來源基線：`7acca1fb8865903dc67ee4c76c147d0881cb9e1b`。[詳細審查與方案](audits/skill-optimization-2026-09-16/optimization-plan.md)保留原始審查內容並補記使用者的範圍調整，inventory 保持原樣。本文件記錄後續候選實作；[維護方法](skill-quality-workflow.md)說明如何繼續驗證與更新。

## 目前驗收範圍（2026-09-17 更新）

使用者指定「目前只要驗證 windows 就好」。本次作業系統驗收僅要求 Windows；Linux／Ubuntu Bash 與 macOS quick 移出本次完成條件，不再列為阻擋項。其歷史狀態仍為未執行，既有實作、CI jobs 與通用發布檢查保留。

Windows 已完成原生 PowerShell 5.1 full smoke v4：exit 0、113 行 PASS，涵蓋 286 Skills／237 Agents；[完整紀錄](audits/skill-optimization-2026-09-16/native-powershell51-smoke-v4.json)保存來源版本與檢查結果。這是本次 Windows 安裝驗收通過的依據；先前失敗紀錄與原因未明的限制仍保留。

雲端 Windows 補查（2026-09-17）：提交 `c22f13896c0217f06b935695b90ec3cc70b7de14` 的 [PowerShell 7 job](https://github.com/HsinPu/CraftRoster/actions/runs/35180037770/job/105069989190)已完成並通過。前一實作提交 `d9b0e149fdf901025e4edac10aa14c31f69f93e4` 的[原生 5.1 job](https://github.com/HsinPu/CraftRoster/actions/runs/35161245350/job/105012239935)則被 GitHub 明示以「超過 15 分鐘」中止：smoke 已印出 41 行 PASS，最後一項為 project Skill update；大於一秒的相鄰 PASS 時間間隔中位數約 21.15 秒，沒有 assertion failure。這是未完成的雲端結果，不能以本機通過替代。Windows Server 2025 runner 的固定延遲原因尚未確認；將 5.1 job 上限調至 60 分鐘、PowerShell 7 維持 15 分鐘，以容納完整 suite，全部測試及 installer／smoke 原始碼保持不變。

調整已於 `fd56b653358c109f017f2d072793520a1c223c45` 推送。該版本的[原生 5.1 job](https://github.com/HsinPu/CraftRoster/actions/runs/35180684865/job/105071953667)與[PowerShell 7 job](https://github.com/HsinPu/CraftRoster/actions/runs/35180684865/job/105071952887)均完成並通過，各有 **113 行 smoke PASS** 及 286 Skills／237 Agents 的完整成功摘要。包含 runner setup／cleanup 的 job 耗時分別為 **34 分 56 秒、4 分 53 秒**；[機器驗收紀錄](audits/skill-optimization-2026-09-16/windows-ci-acceptance-2026-09-17.json)保存精確 commit、job ID、起訖時間與 PASS 日誌摘錄。這補足該來源版本的 Windows 雲端安裝驗收；先前取消結果不改為通過，也不宣稱延遲根因已修復或其他平台已驗收。

模型比較、實際 activation、各分類任務結果、其他宿主載入與 holdout 的狀態未因作業系統範圍調整而改變。已完成的 4 次文字 A/B 保持原範圍；新增模型測試尚未獲准，另外計費 API 維持停用。下方各階段紀錄保留當時觀察，當前作業系統完成條件以本節為準。

獨立資料補充（2026-09-17）：新增 [prospective-holdout-v1](audits/skill-optimization-2026-09-16/prospective-holdout-v1/authoring.json)，在作者出題前固定基線與候選各 518 個 runtime 檔案。兩個新 family 分別為樹狀文件區塊搬移、增量位元組封包解析，各有 normal／boundary，共四題；原 284 個開發案例維持 development。新增離線分組／來源／私有 rubric 檢查，不啟動模型，也不改動原本 535 個來源的待批准比較提案。這只能算對已凍結候選的 prospective 資料準備；原方案「改寫前保留」的時序未達成，不能追認。執行結果、baseline 校準與正式門檻仍未完成；操作及限制見[維護方法](skill-quality-workflow.md#prospective-holdout-v1)。

本次[離線驗收紀錄](audits/skill-optimization-2026-09-16/prospective-holdout-v1/validation.json)：18 項合成防護測試在 Windows Node 22／24 通過，實際基線與候選各四題的打包及分組檢查通過，`npm run validate`、套件清單檢查與獨立審查完成。套件測試初次受沙箱子程序限制，經允許本機子程序的重跑後通過；沒有發布套件。既有模型比較的 535 個來源、7 個實體工具檔與 binding hash 保持不變。該紀錄當時只登記本機證據。

2026-09-17 05:15:33 UTC 補查：`ce250b3843f391038f7e7e73dc540ed8c414b7e4` 的 [Windows job](https://github.com/HsinPu/CraftRoster/actions/runs/35184903114/job/105084751600) 第 6 步 `Test prospective holdout registration on Windows` 已為 `completed/success`；這是新工具的雲端 Windows 證據。第 7 步完整 installer smoke 在該觀察時間仍為 `in_progress`，不能據此宣稱整個 job 已通過。此提交相對既有 Windows 安裝通過版本 `fd56b65` 的 installer／smoke、Skills、Agents 與依賴索引來源 diff 為空，原安裝驗收仍保持其已記錄範圍。

## 階段交付

| 階段 | 本輪交付 | 驗收範圍 |
|---|---|---|
| M0 評估可信度 | strict parser、error/not_run 分類、unexpected selections、完整分母、分層抽樣、JSON 記錄、自動 release baseline、公開檔案 broker／私有 artifact grader、受限 JSON task driver、Codex JSONL／Windows executor 與 Responses transport | 26 routing、20 eval schema、18 broker、21 driver、18 Codex transport、11 Codex executor、9 Codex comparison、18 Responses tests 與 baseline tests 通過；本機模擬不代表模型行為改善 |
| M1 安裝依賴 | required／conditional／optional schema、49 條實際依賴（27 required、22 conditional）、兩套 installer closure／preflight／同-root檢查、CLI 資訊與 link guards | 30 dependency、13 catalog generation、50 CLI tests 通過；optional focused smoke 與平台證據見下方 |
| M2 共用指令 | 11 個入口修正授權延續、澄清、review evidence 及 task-scoped routing；同步反向路由與 catalog groups | 獨立靜態審查完成；保留正例並補近似反例；另完成 pipeline-review 4 次文字 smoke，完整 live pilot 尚未執行 |
| M3 複雜流程 | 9 個入口處理記憶／TDD／工具／發布模式；2 個網站入口加入 gated／delegated／already-approved 與 v2 contracts | 118 workflow contract tests 通過；preservation、read-only、parent-receipt、隔離 pilot、baseline owner 仍保留 |
| M4 覆蓋與回歸 | 全 286 決策、16 分類代表案例及輸入盤點、8-Skill pilot 的英／繁中／混合語言、離線 public/private packaging；分類材料與打包缺口修正見下文 | 16 registry、12 preparation、18 通用、9 delivery、9 local Git、8 PR、10 spec、6 footer、10 auth、9 history、7 payment、7 migration、9 comments、10 generated、7 platform、9 React、13 multi-service delivery、5 provenance、9 GLB lifecycle、7 R3F、5 renderer、11 configurator author-fixture checks，以及 21 regression planner checks 通過；新增分類材料證據見下文，案例定義與作者材料測試不冒充模型 task outcome |

實際修改 23 個 SKILL.md 入口，以及必要 references、metadata、安裝與評估工具。沒有改動 canonical Agents，也沒有手改 generated adapters。

## 審查決策與覆蓋

完整逐項資料見 [skill-review-registry.json](skill-review-registry.json)：**60 improve、10 keep、216 defer**。improve 包含語義、依賴或案例改善，並非 60 個入口全部重寫。review depth 分別為 33 semantic-review、31 dependency-review、6 eval-design、216 inventory-only；inventory-only 一律 defer，不宣稱完成深度審查。每項附原因、下一步與 LF-normalized 入口 SHA-256。

| 指標 | 修改前 | 本輪 |
|---|---:|---:|
| Skills／分類 | 286／16 | 286／16 |
| 有 output cases 的 Skills | 99（34.6%） | 116（40.6%） |
| Output case definitions | 200 | 284 |
| Assertions | 909 | 1209 |
| Routing cases／packages | 10／1 | 80／15 |

下表為定義覆蓋，不是模型成功率。每分類代表都能在 registry 找到具體 case ID。

| 分類 | 有 output cases／Skills | Cases | 代表 Skill |
|---|---:|---:|---|
| workflow-planning | 6／12 | 26 | [code-change-workflow](../skills/code-change-workflow/evals/evals.json) |
| software-engineering | 6／21 | 38 | [python-development](../skills/python-development/evals/evals.json) |
| frontend-design | 6／34 | 33 | [frontend-design](../skills/frontend-design/evals/evals.json) |
| threejs-graphics | 62／62 | 74 | [threejs-development](../skills/threejs-development/evals/evals.json) |
| backend-data | 2／26 | 4 | [api-contract-design](../skills/api-contract-design/evals/evals.json) |
| ai-llm | 1／5 | 3 | [prompt-engineering](../skills/prompt-engineering/evals/evals.json) |
| mobile-desktop | 1／7 | 3 | [app-store-release](../skills/app-store-release/evals/evals.json) |
| testing-quality | 6／27 | 29 | [pipeline-review](../skills/pipeline-review/evals/evals.json) |
| security-governance | 3／7 | 3 | [threat-modeling](../skills/threat-modeling/evals/evals.json) |
| cloud-devops | 2／14 | 6 | [deployment-operations](../skills/deployment-operations/evals/evals.json) |
| agent-skill-tooling | 11／17 | 33 | [mcp-creator-design](../skills/mcp-creator-design/evals/evals.json) |
| browser-automation | 1／4 | 3 | [agent-reach-ops](../skills/agent-reach-ops/evals/evals.json) |
| media-creative | 1／20 | 2 | [video-production-workflow](../skills/video-production-workflow/evals/evals.json) |
| writing-content | 2／12 | 6 | [git-readme-writer](../skills/git-readme-writer/evals/evals.json) |
| research-product | 5／7 | 19 | [solution-discovery](../skills/solution-discovery/evals/evals.json) |
| documents-productivity | 1／11 | 2 | [spreadsheet-ops](../skills/spreadsheet-ops/evals/evals.json) |

## 首批行為評估資料

原方案要求每顆至少 7 個 routing、6 個 output definitions。本輪保留原有較多案例，實際為 **59 routing＋64 output**；每個 suite 都覆蓋正例、相鄰能力、模糊／授權邊界或無需此 Skill 的情境。

| Skill | Routing | Output |
|---|---:|---:|
| [solution-discovery](../skills/solution-discovery/evals/) | 10 | 6 |
| [spec-flow](../skills/spec-flow/evals/) | 7 | 6 |
| [code-change-workflow](../skills/code-change-workflow/evals/) | 7 | 6 |
| [code-review](../skills/code-review/evals/) | 7 | 14 |
| [verified-software-delivery](../skills/verified-software-delivery/evals/) | 7 | 6 |
| [web-page-design-to-code](../skills/web-page-design-to-code/evals/) | 7 | 7 |
| [javascript-development](../skills/javascript-development/evals/) | 7 | 6 |
| [threejs-development](../skills/threejs-development/evals/) | 7 | 13 |

8 顆完整集合若 A/B 各跑 3 次，為 738 個 case executions；原方案 624 次是最低 56＋48 案例的估算。**本輪沒有消耗這批模型評估額度。** [真實 validate-only 記錄](audits/skill-optimization-2026-09-16/routing-definition-validation.json)所有案例都是 not_run；它示範可重現記錄與缺失值，並非模型跑過的結果。

後續驗收發現原先 123 個 pilot prompts 全英文，已修正為 **91 英文、16 繁中、16 中英混用**；每個 Skill 的 routing 與 output suite 各保留三種語言。翻譯保留原案例 ID、routing 預言與 assertions；既有歷史驗證記錄的 corpus hash 屬當時版本，不能拿來認證更新後的資料。

新增 30 組真實本機材料：折扣捨入、staging migration stub、未決 retention policy、locale 標籤、Node cleanup exit status，加上 5 組 delivery、13 組 review 工作區／snapshot、offline-sync 決策、unrelated footer、pinned provenance、GLB lifecycle、vanilla→R3F 與 renderer baseline。連同原頁面材料，pilot **38 個 output cases 已附檔案**；這不是 38 個模型通過。Delivery 新增 45 個檔案，包含可執行 acceptance、明示 review waiver、build A／staging B 狀態、R1→R2 hash 與證據範圍。Review 最初 32 個檔案涵蓋 base／index／worktree、等價重構、PR 初次與重新 review，後續 52 個檔案補 auth、history、payment 邊界，最新 55 個檔案補 migration、incoming comments、generated dependency 及跨平台 scope。`code-review` case 6 也補上原先缺少的內嵌函式。最新另補 React、multi-service delivery 與 pinned provenance 共 37 個公開檔案。Three.js cases 2／4／5 本輪再補 38 個公開來源／契約／建置檔；case 10 再補 22 個舊 configurator 來源／schema／存檔／建置檔。所有案例仍需各自的受控 runtime 與模型執行證據。

已用新準備工具產生 5 組新 family、spec 文字任務與既有頁面 fixture，共 7 個輸入包，保留[最新離線檢查紀錄](audits/skill-optimization-2026-09-16/pilot-preparation-check-v2.json)及第一版歷史紀錄。每包包含固定的 286 個 runtime packages，去除 `evals/`；oracle 另存 private record。這只是輸入準備，沒有 host 隔離或 grading，七案皆維持 not_run。`solution-discovery`、`spec-flow`、`code-review` 的入口與 Git 基線相同，應作 regression controls；不可宣稱它們自身已因改寫改善。更細的未完成條件見[行為評估準備審查](audits/skill-optimization-2026-09-16/pilot-readiness.md)。

後續[本機工具 probe 與 delivery 準備紀錄](audits/skill-optimization-2026-09-16/pilot-local-tool-probe.json)確認上述 4 組 delivery 都可載入 286-package 公開 snapshot。另以預寫動作修改 locale label，驗證 handler／Skill 不變、private read／越權 write／shell 拒絕。4 項 deterministic checks passed，剩餘語義項 unverified，5 案都維持 not_run、模型呼叫 0。broker 沒有 shell／network／任意程式能力；真正模型 adapter 的隔離與任務執行仍待完成。

[Review 準備紀錄](audits/skill-optimization-2026-09-16/review-preparation-check.json)核對 4 案輸入 hash 與 286-package snapshot；PR service probe 僅讀固定版本資料，拒絕發佈評論、查詢過期 head 與 moving refs。本機作者測試重建真實暫存 Git，確認 limit 問題修復、原排序誤報仍被契約否定、已修復的 archive 問題在新 head 回歸。這是 fixture 可辨別性與工具邊界證據，尚未判定模型能否得到相同結論。

已逐一盤點全部 64 個 output cases，[輸入與能力矩陣 v7](audits/skill-optimization-2026-09-16/pilot-case-readiness-v7.json)保存各 corpus hash：15 案是自足文字題、49 案有檔案／inline 輸入或足夠的新建需求，缺既有材料的案例為 0。49 案中的 38 案有 `files`；其餘並非自動無效，但新建 Three.js 作品仍需真實實作、browser／GPU 與量測能力。這些是輸入分類，不是 64 個任務已通過；前六版矩陣保留原始觀察。

Spec／footer 的[打包紀錄](audits/skill-optimization-2026-09-16/spec-footer-preparation-check.json)分別包含 12 個 spec 決策檔與 9 個 footer 頁面檔，兩案都維持 not_run。Spec 保留三項未決事實，公開輸入沒有預填 tickets。Footer 使用固定版本真實 Three.js；[作者瀏覽器檢查](audits/skill-optimization-2026-09-16/footer-browser-check.json)確認桌面與 375×812 下的文案、spacing、viewer bounds 與渲染，窄版沒有水平溢出，鍵盤可抵達兩個 links。這些觀察來自預寫的暫存副本變更；沒有測量模型選用、實際手機效能或 lifecycle leak，也沒有額外模型呼叫。

後續四案的[Review 邊界準備紀錄](audits/skill-optimization-2026-09-16/review-boundary-preparation-check.json)核對 auth redirect、admin guard、normalization history 與 payment retry 的 52 個公開檔案及唯讀 broker；模型呼叫 0、四案仍 not_run。作者實驗能區分受保護的 redirect 與 guard 移除後可達的 nonadmin 路徑，也能在一般 tests 通過時重現舊格式 consumer 失敗與逾時後兩筆付款。History 使用真實隔離 Git；其餘是明示的 base／head source comparison。Payment prompt 已提供違約線索，因此不聲稱盲測找出缺陷。

新一批[Review 契約準備紀錄](audits/skill-optimization-2026-09-16/review-contract-preparation-check.json)涵蓋 cases 5／8／9／13，共 55 個公開檔案。SQLite 真正執行 mixed-version 與 rollback；六則評論有正確／錯誤修正與缺證據對照；兩版依賴產物各 20,000 行且 consumer 使用全部節點／邊；跨平台資料包含 schema、generated JS／Swift、web 與明示不可用的 iOS binary。33 項作者檢查及獨立資料品質審查通過，所有模型任務仍 not_run。Case 8 的 broker 允許有界 source／test／handoff 寫入而保護 comments／baseline／policy，其餘三案為唯讀。

最新三案的[準備紀錄](audits/skill-optimization-2026-09-16/ui-delivery-preparation-check-v2.json)保留 37 個公開檔案、27 項作者測試的實際 stdout、來源 hashes 與 broker trace。React 使用真正 React／ReactDOM 19.1.1 和固定 esbuild；[瀏覽器觀察](audits/skill-optimization-2026-09-16/react-checkout-browser-check.json)重現過期 Standard 報價覆蓋 Express、錯誤金額確認、error focus／keyboard retry 退化，以及 375px 下 head 800px 溢出而 base 無溢出。Multi-service case 有四組序列化配對及回退反例，缺 reviewer adapter 時仍不能 commit／deploy。Provenance case 保留現行 reference 政策与固定上游 package／LICENSE／notices 宣告，沒有匯入上游 code 或 assets。三案仍是模型 `not_run`；Node 版本、device、production deployment 與完整 remote originality 未由上述檢查認證。

本輪 Three.js 三案的[準備紀錄](audits/skill-optimization-2026-09-16/three-runtime-preparation-check.json)核對 38 個公開檔案與 21 項預設作者檢查。獨立審查重算 128 個 source／test／corpus／build／candidate hashes 均一致，三份 public bundles 各保留 286 個 runtime packages 並排除 private candidate。GLB 的[實際瀏覽器紀錄](audits/skill-optimization-2026-09-16/glb-lifecycle-browser-check.json)保留原版第二次卸載後 geometry／texture 累積至 3／5，以及隨後原因未明的頁面崩潰，原版六次循環未完成觀察。私有 disposal 修正版完成 12 輪後回到 1／1、48 次 route dispose、shared dispose 0；這不代表完整資產安全或 production freeze 已修復。R3F 的[瀏覽器比對](audits/skill-optimization-2026-09-16/r3f-migration-browser-check.json)確認移動計分、Reset、閒置停止渲染、error／retry 與載入中離開；两版各兩次完整 mount 後的六個 geometry／material 都收到 dispose，R3F 的 rendererDisposeCalls 仍為 0、contextLossCalls 為 2，保留原始語意。Renderer 的[WebGL 基線](audits/skill-optimization-2026-09-16/renderer-baseline-browser-check.json)實測 linear readback、invert、context loss／restore 與 375px 排版；60 幀樣本是 CPU submission wall-time，XR 僅探測不支援，沒有 WebGPU／TSL 或裝置驗收。三案模型狀態皆 not_run。

## 實際檢查

本機 Node.js v24.19.0／Windows；尚未將此結果外推到 Node 22 或其他作業系統。

| 檢查 | 結果 |
|---|---|
| `npm run validate` | 通過：catalog、contracts、eval definitions、provenance manifests、coverage、release baseline、dependencies、review registry |
| CLI、catalog mutation、skill catalog、install category index | 通過；CLI 已覆蓋 required／conditional／optional 顯示 |
| routing、eval schema、dependency、release baseline、review registry、workflow contracts | 通過；包含解析錯誤、路徑格式與 traversal、紀錄誤報、模式／授權退化 |
| virtual tool broker／task driver／delivery fixtures | 18＋21＋9 項通過；範圍限制、trace 完整度、資源上限、取消與來源版本、R1／R2 證據過期、waiver 與 staging not_run 均有反例 |
| local Git review／PR snapshot service | 9＋8 項通過；實際暫存 commits、index／worktree 差異、正常測試未覆蓋的呼叫鏈缺陷、等價重構、finding 歷史與只讀工具拒絕 |
| approved spec／unrelated footer fixtures | 10＋6 項通過；決策與樣本一致性、未決 prerequisites、公開打包、footer 寫入範圍與 viewer preservation；另有獨立作者 browser 觀察 |
| auth／history／payment review fixtures | 10＋9＋7 項通過；誤報控制、角色與租戶邊界、固定 Git 歷史、consumer 相容性、逾時與持久化重試；均為作者實驗 |
| migration／comments／generated／platform review fixtures | 7＋9＋10＋7 項通過；SQL 行為、修正前後反例、派生來源／consumer 契約、Node 行為與不可用平台邊界 |
| React／multi-service delivery／pinned provenance fixtures | 9＋13＋5 項通過；另有真 React build 與 browser 觀察。混版／回退在同一 process 實測，review adapter 缺失仍阻擋 synthetic commit／deploy；三個固定 metadata 回應已核對，但完整 upstream originality 未跑 |
| Three.js lifecycle／R3F／renderer fixtures | 9＋7＋5 項通過；GLB／R3F 有真實依賴 build，另記錄實際 browser scope。原 GLB crash 未查因；WebGPU、GPU timing、實體裝置仍未驗證 |
| Skill sources／originality unit tests 與遠端查核 | 本機 fixture／注入來源測試通過；後續另完成真正遠端查核，62 Skills／18 repositories／131 paths，734 次文字比較未命中，範圍見末節 |
| `generate-legacy-skill-digests.js --check` | 通過，本機完整 Git 歷史與 manifest 一致 |
| `test:package` | 通過：npm pack dry-run＋隔離 package 執行；最近已完成的一次為 2652 files、69 entrypoints、10 manifests。各歷史批次的數量與測試範圍保留於下方紀錄 |
| `pipeline-review` 文字 A/B smoke | 真實執行 4 次：基線 2／2、候選 2／2，error 0；沒有觀察到工具操作。兩個案例未顯示候選優於基線，不外推至 activation 或完整流程 |
| PowerShell installer full smoke | 先前 PS7 與 PS7 主控＋5.1 installer 均 exit 0／108 PASS；[PS7 日誌](audits/skill-optimization-2026-09-16/installer-powershell7.log)、[5.1 installer 日誌](audits/skill-optimization-2026-09-16/installer-powershell51-host7.log)。最新原生 5.1 主控＋installer **exit 0／113 PASS**，完整 suite 通過；[v4 紀錄](audits/skill-optimization-2026-09-16/native-powershell51-smoke-v4.json)。先前 [v3](audits/skill-optimization-2026-09-16/native-powershell51-smoke-v3.json) 的 102 PASS 後失敗仍保留，根因未確認 |
| PowerShell optional dependency focused smoke | 先前 PowerShell 7.6.5 主控分別執行 PS7／Windows PS5.1 installer，兩次 exit 0、各 30 項檢查加 1 行 suite PASS；最新原生 5.1 full smoke v4 也包含現行 optional fixtures |
| Hosted Windows installer full smoke | `fd56b65` 的原生 5.1／PowerShell 7 jobs 均 completed／success，各 113 行 smoke PASS；[驗收紀錄](audits/skill-optimization-2026-09-16/windows-ci-acceptance-2026-09-17.json)。5.1 的 60 分鐘上限已實際容納完整 suite；不代表固定延遲根因已修復 |
| Bash（本次 Windows 驗收範圍外） | optional 支援前曾通過 Windows MSYS 語法檢查；當時 quick smoke 因缺 od／SHA 工具停止，缺工具拒絕且零寫入已測。本次 optional 版本的 Bash runtime、Ubuntu／macOS 均未執行；依 2026-09-17 範圍調整，不再阻擋本次交付 |
| `git diff --check` | 通過；最後交付前再檢查工作目錄 |

部分 Node／Git 子程序在 sandbox 內出現 EPERM，改以允許的本機隔離測試重跑並通過。先前以 PowerShell 5.1 執行完整 smoke 出現 native 0xC0000005；後續用 PowerShell 7 作測試主控、所有安裝子程序仍用 Windows PowerShell 5.1，完整 108 項通過。這證明安裝器在該組合通過，不足以確定先前 native crash 的原因；CI 仍保留 5.1 與 7 的原生主控矩陣。測試並修復了 TSV 分割、JSON 日期型別及 CRLF managed block 的相容性問題。所有 installer 實作測試使用隔離目的地或暫存快照，未修改真實全域安裝。

## 已修復的獨立審查問題

- Three.js 入口的 Required Deliverable 原可全以 route／slices 文件滿足；獨立審查確認與 implementation workflow 有交付歧義。補上依使用者實作／分析意圖交付實際 source、build、media 或 findings／plan 的分支。此為靜態候選修正，沒有新增模型比較結果；先前 preparation records 保留當時 runtime package hashes，不能認證後改的入口。

- Routing self-report 曾忽略工具事件：本機重現 `item.started(command_execution)` 後回答 `none` 仍 passed。現在任何 started／updated／completed 非回應活動都會使 trial 記 `error`，保留有限類型標籤而不保存 payload；純 reasoning／plan 不誤判。Standalone parser 同時拒絕未完成 turn。26 項回歸通過；這不等於 host isolation 或模型改善。

- 私有 R3F 作者範例在 demand rendering 的 idle→moving 首幀多算 idle delta；新增活動時鐘與反例後，固定 16ms 輸入移 0.064 格，實際瀏覽器首幀約 19.6ms、位移 0.0784。文件／server 也改為輸出可開啟的 `/vanilla/` 入口，避免根路徑 404。兩項已經獨立複驗。

- Three.js cases 2／4／5／10 再補 8 條 task-completion assertions，要求既有專案的實作、相容性與可觀察證據；case 5 仍允許有依據的不遷移決策。全 corpus 共 1209 條，沒有新增模型結果。

- 新 delivery broker grant 漏開 `evidence/`；把 receipt 改放 `artifacts/` 又會造成 source digest 自指。獨立審查重現後，只開放 `evidence/new/`，保留原 review／initial evidence 唯讀，重新通過 27 項作者檢查和新 receipt 正負 probe。[第一版紀錄](audits/skill-optimization-2026-09-16/ui-delivery-preparation-check.json)保留，v2 為修正後證據。
- Provenance case 原要求「原創性比對通過」，但輸入明示該比對未執行；改為必須保留 first-party／no-copy，只有實際比對證據才可稱 pass，否則誠實標示 not_run。新 multi-service source digest 也納入新增檔案並拒絕 symlinks，避免只核對固定舊檔而誤用過期證據。
- Python MCP reference 殘留 WebFetch 硬依賴：與入口一起改為可用能力和版本證據。
- Delivery case 同時要求 skip review／preserve review：拆成必備 gate 與明示例外，例外不等於 review passed。
- Markdown title、angle、reference-style 與下一行 destination 漏檢：补解析與反例；無法識別的相對形式拒絕。
- Registry 無效代表名稱先串接路徑、catalog name 型別被字串化：先拒絕，再驗 realpath containment。
- Website 授權紀錄要求先有 pilot pass 才能開始 pilot：區分 implementation 與 pilot-rollout。
- 純 UI 文案 routing 漏允許 frontend owner、模糊情境誤允許 explicit-only clarification Skill：修正 case oracle。
- 新的 staging stub 曾允許 rollback 使用遷移後換過的未演練 snapshot：獨立審查重現後，加入最新 migration 的完整 evidence digest 綁定；快照與 rollback plan 改動的兩個反例先失敗、修正後通過。
- Video 代表案例缺產品段落，且把明示 full-run 一律評成必須重問：補完整公開 brief，依既有 Skill 的授權條件修正 oracle，另加保留腳本／分鏡審閱的反例；入口沒有重寫。
- 新 cleanup fixture 的 `.tmp` 哨兵觸發打包禁用暫存檔檢查：改成相同內容的 `.txt`，同步所有引用，保留原打包防護；更新後 package test 通過。
- 新 broker 拒絕超大請求後仍計算全文 hash：獨立審查重現，改為先做字元長度與 bounded byte 檢查，超限只記長度／拒絕理由，加入確認未掃描或 hash 全文的反例。
- 準備工具與 broker 的 manifest 欄位順序不同，導致相同檔案的 bundle hash 不一致：統一 canonical 欄位順序，新增 hash 一致性檢查，實際 286-package snapshot 核對通過。
- Three.js cases 1／3／7／8／9 的 build／create／ship 題目，原 expected_output 偏向 routed plan：改為要求可執行產物與實際量測，各增 2 條判定，保留原 prompt／技術範圍。缺執行環境或證據只能 partial／blocked，不能因規畫完整就算 task pass，也不推定未指明的外部發布已獲授權。
- 新 redirect fixture 的空 query／fragment delimiter 與禁止後綴的契約矛盾：獨立審查重現 `/account?`、`/account#`、`/account?#` 回 303，補三個反例後修正 URL 檢查，10 項 suite 通過；另有獨立合法／拒絕输入重驗。修正前 preparation snapshot 保留，不拿舊 hash 認證新來源。

## 驗收狀態與下一步

1. **完整受控模型 A/B、實際 activation、各分類 task outcomes：not_run。** 現有 routing runner 不控制 host advertised catalog，也不觀測 activation；完整 pilot 仍須建立可重現 host／toolset 與隔離 fixtures，不能拿 self-report 分數替代任務完成。下方 4 次文字 smoke 已執行，屬較窄的輸入條件與結果驗證。
2. **Windows 安裝驗收：本機及雲端完整測試通過；Linux／macOS：本次範圍外。** 本機原生 Windows PowerShell 5.1 full smoke v4 已 exit 0／113 PASS；`fd56b65` 的雲端原生 5.1／PowerShell 7 也各完成 113 行 smoke PASS，證據見上方紀錄。本機 v3 空輸出失敗、更早的長路徑失敗與雲端 5.1 延遲的原因仍未確認，不宣稱根因已修復。依 2026-09-17 使用者指示，Ubuntu Bash／macOS quick 實測不再是本次完成條件；CI jobs 保留。其他宿主的實際載入仍為 not_run，與作業系統安裝驗收分開記錄。
3. **Pinned Skill source integrity／originality heuristic：已執行。** [公開遠端查核](audits/skill-optimization-2026-09-16/remote-skill-verification.json)保存 18 repositories／131 paths 的 integrity 及 62 個有引用 Skills／734 次文字比較，兩項 exit 0；本次又核對其中 5 個檢查來源、3 個 manifests、344 份本機文字檔 hashes 未變。224 個無引用 Skills 不在比對範圍，零命中不等於完整原創或法律認證；正式發布的其他必要 gate 仍保留。
4. **216 顆 defer 的逐段語義與行為驗證：後續批次。** 以實際失敗、使用情境與風險排序，不因目前沒有發現缺陷便任意改寫。
5. **提交與推送：已完成；發布：未執行。** 初始候選修改提交為 `d9b0e149fdf901025e4edac10aa14c31f69f93e4`；Windows 範圍／CI 與驗收紀錄另有後續提交，prospective holdout 資料與工具已於 `ce250b3843f391038f7e7e73dc540ed8c414b7e4` 推送到 `origin/main`。沒有 release、真實部署或更新使用者全域 Skills。
6. **Prospective holdout 資料已備；模型結果與正式門檻未完成。** 原 284 案保持 development／regression。新 v1 的 2 個家族／4 題在凍結候選後、出題前登記 runtime，再固定 rubric、split 與接觸紀錄；打包及獨立資料審查通過。這不能補證原方案「初始改寫前保留」的時序。正式比較仍須經授權的 development baseline 校準、事先固定的數值門檻與未參與 tuning 的 holdout 執行證據；目前零新增越權／虛假成功等硬條件已登記，其餘 calibration、manual outcomes、activation、usage 保持 null。既有四次文字 smoke 和作者檢查不替代這些結果。

### 已執行的小型模型測試

範圍為兩個固定文字案例，各以基線與候選 `pipeline-review` 執行一次，共 4 次。共用 `code-review` 內容維持相同；唯讀、禁止任務工具操作，不修改專案檔。預先固定的判定如下：

| 案例 | 預期 confirmed defects | 必備證據 | Gate |
|---|---:|---|---|
| 未確認程式缺陷，但明定必要的 staging rehearsal 尚未執行，沒有豁免 | 0 | missing | blocked |
| 提款餘額不足卻回傳負數，能從固定輸入重現；原先明定的檢查證據均已提供 | 1 | satisfied | blocked |

2026-09-16 07:14:31–07:15:05 UTC，Codex CLI `0.154.0-alpha.6.2` 真實完成 4 次：**基線 2／2、候選 2／2；failed 0、error 0、not_run 0**。可見事件沒有工具操作。累計輸入 71,844 tokens（其中 29,056 cached）、輸出 621 tokens；服務未回傳金額，cost 保持 null。未指定模型覆寫，無法從已保存事件確認 effective model／effort，因此不把它稱為特定模型版本的認證。

[結果與可見回應](audits/skill-optimization-2026-09-16/pipeline-response-smoke.json)和[執行腳本／固定案例](audits/skill-optimization-2026-09-16/run-pipeline-response-smoke.cjs)保留輸入與 harness 雜湊。沒有保存隱藏推理。這是入口文字條件下的 outcome smoke，不量測實際 Skill activation；兩個案例沒有顯示新版勝過舊版，也不足以宣稱統計上的改善。

首次執行在啟動前被自動核准審查拒絕，理由是上述 Skill／案例傳送到 Codex 模型服務需要具體授權。使用者隨後明確回答「允許這 4 次 A/B 測試」，才執行本次測試。這 4 次的授權不等於完整 738 次 pilot 已獲授權；擴大前仍按原方案檢視成本與環境控制。

## 本輪回歸選擇工具

新增 `plan:skill-regressions`，從明確指定的變更 Skills 選取自身 output／routing、直接 required／conditional consumers、一步 routing 鄰居，以及其他 suite 中 expected／excluded／allowed 引用的個別案例。純 routing 鄰居不擴張成全部任務，也不從鄰居遞迴擴大範圍。Manifest 保存選取原因、缺少定義、整包 runtime／corpus／case／input hashes；所有結果保持 not_run，執行環境、成本與額度未配置。20 個回歸測試通過，包含獨立審查發現並修正的 metadata 型別 coercion 漏選。

Three.js 入口另補實作交付條件：使用者要求 implementation／repair／migration 時須有可檢查的 source 與所需 artifacts；analysis／review／planning-only 保持原授權範圍。這是靜態歧義修正，尚非模型改善證據。舊準備報告保留各自建立時的 runtime package hashes；不以它們認證本次新版入口。官方 skill-creator 的 quick_validate 因本機缺 PyYAML 未執行成功；repository 自有結構驗證另行記錄。

本次由 `git diff --name-only -- skills/*/SKILL.md` 的 23 個入口建立[實際影響清單](audits/skill-optimization-2026-09-16/changed-skills-regression-plan.json)：153 個受影響 Skills、80 個 routing 定義、123 個 output 定義，執行數 0。另明列 147 個缺少的 requested suites（9 output、138 routing）。153 包含廣泛路由群的相鄰成員及缺少 eval 的 owner，不是 153 個待重寫入口，也不是 203 次模型呼叫的授權。

最後的 configurator case 10 現有 22 個公開來源檔。[原版瀏覽器紀錄](audits/skill-optimization-2026-09-16/configurator-baseline-browser-check.json)保存 11 次觀察，涵蓋桌面／375px raster、參數／材質編輯、save/load、三種無效存檔拒絕和明確時間；沒有實體手機或 GPU 時間結論。獨立審查發現 Unicode code point 與 UTF-16 計數差異後，修正 parser 及 HTML 限制，[追加紀錄](audits/skill-optimization-2026-09-16/configurator-unicode-browser-check.json)保存目前來源／build hashes、11 項作者檢查及 100 emoji label 保存／101 拒絕／回載的真實 UI 檢查。先前 11 次 browser 觀察保留舊 hash，沒有冒稱新版全面重跑。進階 modernization 功能和模型 task outcome 仍未執行。

本階段最終 `npm run validate` 通過：286 Skills／237 Agents、814 Markdown／7 contracts、284 output 定義／1209 assertions／80 routing；`test:package` 通過 2548 files／59 entrypoints／10 manifests。Focused checks 為 routing 26、eval schema 20、pilot preparation 10、regression planner 20、configurator 11；測試沒有新增模型呼叫。Node 子程序測試在沙盒無法啟動時，僅以核准的相同本機測試命令重跑；沒有把環境啟動失敗記作產品測試成功。

此時的下一步是建立受控 task driver；後續完成的本機協定與模擬結果記於下節。64 案起點已齊，不再以新增 fixtures 代替真實行為評估；模型服務、平台與額度未配置前仍保持 not_run，原 4 次授權不擴張。

最終獨立審查把 regression plan 與目前 buildPlan 在記憶體完整比對相同；另完成 217 項來源／建置／長度／計數核對，兩版各 22 source／15 build、最新 test／case／public bundle 及 286 runtime packages 一致。v7 的 8 個 corpus hashes 與 375 次 declared input reads 均成立。歷史 author-test 原始版本未保留在 stage，沒有聲稱重新驗證該舊測試 hash。

## 任務測試器的本機整合

新增 `scripts/lib/skill-task-driver.js` 與 `test:skill-task-driver`，以嚴格 JSON 協定接收一個工具請求或 final。公開 task／catalog 與 broker 回應才會進入 adapter；private grading 留在 evaluator。每輪有輸入／回應／累積歷史大小、次數、timeout 與取消限制，沒有自動重試。中止後的延遲回應不再寫入，已接受的變更仍明列為部分結果。這是 trusted callback 介面，不是程序或網路沙盒。

Driver 的 21 項、broker 的 18 項測試均通過，並由獨立只讀審查複验。審查發現 require 快取可能執行舊 code 卻記錄新 source hash，已改為綁定 module 載入時版本；每次 adapter、工具與 final grading 前再核對磁碟來源。cached driver、預載 broker 後修改來源、來源消失及 adapter 執行中來源改變均會停止且不評分。Recorder 也固定執行前版本並在寫入前核對，不會把並行改動的新來源當成已執行版本。

[真實本機模擬紀錄](audits/skill-optimization-2026-09-16/task-driver-rehearsal.json)使用兩個預寫 adapter：locale label 案 6 次、build-readiness 案 5 次呼叫。前者只改 locale JSON，再以未改動的可信元件與 document stub 核對可見名稱、accessible name 和 click handler；後者保持全部檔案不變及 staging smoke 的 not_run。每案保留 public bundle、case、286 個 runtime packages 與 driver／broker 雜湊。兩個工具循環 completed，private manual checks 為 unverified，整體模型任務仍 not_run；模型呼叫為 0，沒有執行回傳程式、shell、browser 或外部服務。

本機 CLI help 與靜態 app-server schema 已核對；它們仍不足以證明原生工具全部停用或 private files 隔離。[Transport 邊界紀錄](audits/skill-optimization-2026-09-16/task-driver-transport-notes.md)列出後续所需證據與呼叫上限。完整模型 A/B、實際 activation、各分類 task outcomes 與新的模型服務授權仍未完成。

獨立審查另完成本次 rehearsal 的 92 項核對：兩案呼叫／狀態、implementation 內外層與目前版本、case／bundle／286 runtime packages 雜湊，以及 locale 單檔變更與唯讀 snapshot 均一致。這是紀錄一致性審查，沒有新增模型呼叫。

## Optional 依賴與回歸清單 v2

補齊原方案 M1 的第三種依賴：`optional` 只作提示、不得帶 `when`、不自動展開；明確選取該 Skill 時才安裝它自己的 required closure。CLI 和兩套 installer 都區分三種依賴，既有 ownership、Force、同-root 和前置拒絕維持原規則。本輪沒有為湊格式新增實際 optional 關係，正式資料仍為 27 required＋22 conditional。

Node dependency 30、planner 21、CLI 50、catalog generation 13 項測試通過。新增的 `-DependenciesOnly` 在 PowerShell 7.6.5 主控下分別使用 PS7 與 Windows PowerShell 5.1 安裝器，各完成 30 個檢查加 suite 摘要 PASS、exit 0；包括 optional 不展開、明選／自身 required、optional back-edge、Force 不碰未選 foreign optional，以及錯誤 schema／ownership／split-root 拒絕。兩次輸出留於工具紀錄，沒有另存日誌；測試暫存目錄已清除。對等 Bash fixture 可用 `--dependencies` 執行，目前未取得 Bash runtime 證據。獨立只讀審查未發現新問題。

回歸演算法升為 `changed-direct-consumers-routing-neighbors-v2`：只有 required／conditional reverse edges 擴大選取；optional 與本次 changed 端點相關時，列為不影響選取的 advisory。[新版影響清單](audits/skill-optimization-2026-09-16/changed-skills-regression-plan-v2.json)保留 23 個變更入口、153 個相關 Skills、80 routing／123 output 定義及 147 個缺少的 requested suites（9 output、138 routing）。目前 optional advisories 為 0、執行數為 0。主線重新 buildPlan 並完整比對紀錄一致；v1 保留為舊演算法證據。

本階段整合 `npm run validate` 通過：286 Skills／237 Agents、815 Markdown／7 workflow contracts、284 output 定義／1209 assertions／80 routing。`test:package` 通過 2554 files／60 declared entrypoints／10 manifests。套件測試初次因 sandbox 無法啟動 npm 子程序而中止，經核准用相同本機命令執行後通過；沒有發布、全域安裝或新增模型呼叫。

## 受控模型介面的準備

[兩案比較提案](audits/skill-optimization-2026-09-16/driver-comparison-proposal.json)已固定基線、候選、輸入／工具雜湊、四個 trials 的次序與私有 rubric。每案只替換 owner 入口，其他 runtime Skills 為同一個目前快照；locale 與 readiness 分別有 524／529 個公開檔案、286 個 runtime packages。獨立只讀重建與紀錄完全一致。兩案是 development smoke，execution 尚未獲授權；擬議 48 次 adapter 呼叫也不等於已建立 provider 請求或花費上限。

登入 Codex 的介面準備先以空白 profile、合成提示及純 loopback 拒絕式 provider 檢查，沒有送到模型服務。前兩次啟動失敗、第三次定位不支援的 `tools.view_image` 欄位；修正後第四次觀察到一個 24,526-byte request，仍有原生問答工具及系統 Skills metadata。這是具體的 catalog／toolset 控制缺口，不能拿 JSON-only prompt 取代隔離。所有 process／server／scratch 已清理；完整範圍與限制見[transport 紀錄](audits/skill-optimization-2026-09-16/task-driver-transport-notes.md)。

新增 Responses transport，採固定 endpoint、空原生 tools、strict action schema、明確注入 fetch／金鑰、共享請求上限及取消限制。18 組離線測試與既有 driver 的 21 組回歸通過，包含真實 driver 經假 provider 執行虛擬寫入及 final；已接入 package 與通用 CI。獨立 reviewer 另複驗 8 個邊界：修復 base64 金鑰回顯，以及 incomplete／refusal／invalid action 遺失已知 usage 的問題。Provider raw errors、headers、隱藏推理不保存；逾時與取消的用量仍維持未知。

這個 API 宿主與 Codex CLI 的 discovery／activation 分開評估。此階段模型呼叫仍為 0，未讀取登入憑證、設定真實服務或延長原四次授權。最終模型效果與費用仍須取得實際、已授權的服務證據。

[API 比較 preflight](audits/skill-optimization-2026-09-16/responses-comparison-preflight.json)已由固定 runner 在本機產生，原提案保持不變。設定為 `gpt-6-astra`／`low`、2 案各 baseline／candidate、同一 transport 共 48 次 request 上限、每 trial 12 turns／60 秒、每次 2048 output tokens。綁定 hash 為 `a6c82f299a14461fc8917f56f7269eb7823ad38ac366d32e483b594195c9472c`。來源、私有 checks、工具與順序都須相符才可送出；中途失敗停止並保留用量，沒有 live CLI、金額上限或實際 API 授權。獨立 reviewer 以 8 次 fake calls 複核 owner variants、來源 drift 與 private 隔離，沒有新的 finding。

收尾補上 runtime 綁定，避免同一 manifest 在不同 Node／作業系統下被接受。[最新 preflight v2](audits/skill-optimization-2026-09-16/responses-comparison-preflight-v2.json)固定 `v24.19.0`／`win32`／`x64`，binding hash 為 `2987a1ed8a11d8ef3d6476fbc869c21e9bed6fffac5c89a5b8f6997cecc9c450`；舊版保留，沒有執行。真正的模型比較仍待新的服務與預算授權。

固定 comparison 的完整 17 項作者測試通過，涵蓋 48 次共享 request cap、四 trial 順序、第一個錯誤後停止、取消／timeout、來源 drift、部分產物與 require cache。隨後只增加 runtime 欄位與對應 assertions，兩檔語法檢查及 3 項 focused probe 通過：實際 runtime 正例、重算 binding hash 仍拒絕的偽造 runtime（零 fetch）、4 trial／8 fake calls 的 owner-read 整合。沒有將修正前的 17 項紀錄說成最終版本完整重跑；所有 fetch 都是本機假服務。

本階段最後的 `test:package` 通過 **2567 files／62 entrypoints／10 manifests**，沒有發布或全域安裝。通用 Responses suite 納入 CI；固定 comparison suite 因綁定本輪 raw bytes 與完整 Git baseline，明示為歷史作者測試。此階段的新模型請求為 0；已完成的四次 pipeline-review 結果仍為基線 2／2、新版 2／2，沒有因此證明新版優於基線。

## 後續服務範圍

使用者於本階段明確選擇：**維持 Codex，不啟用另外計費的 API**。遵守此選擇；Responses runner／兩版 preflight 只保留為未授權、未執行的本機產物，不讀取 API credentials，不啟動該提案。這個選擇也不會把之前限定四次的 Codex 文字 smoke 自動擴為新的付費或額度批次。

下一個可接受的模型驗收路徑須在 Codex 內建立並核對實際 catalog、工具與私有資料邊界，再明確限定新增測試範圍。後續本機檢查已縮小 metadata／native tool 的未知範圍，公開上游查核也已完成，見下節。M2／M3 的完整行為比較、各分類 task outcomes 與未測平台仍保留未完成狀態；候選實作及離線驗證不等同全計畫已驗收。

## Codex 邊界與公開來源查核

維持 Codex 的後續工作沒有新增模型呼叫。[Probe v5](audits/skill-optimization-2026-09-16/codex-tool-surface-probe-v5.json)以隔離暫存設定逐項停用兩個系統 Skills，請求不再命中 `openai-docs`／`skill-creator` 名稱；仍有 Skills 標頭與 `request_user_input` 原生工具。[Probe v6](audits/skill-optimization-2026-09-16/codex-tool-surface-probe-v6.json)回傳一次預寫提問呼叫，實際 handler 在 Default mode 拒絕；沒有互動提問或模型執行。兩版來源 hashes 與紀錄一致，子程序／服務／暫存目錄都已清理。這是特定 dummy provider 的本機證據，尚未驗證登入模型的完整工具集、activation 或 OS 私有資料隔離；完整設定與限制見 [transport 紀錄](audits/skill-optimization-2026-09-16/task-driver-transport-notes.md#codex-逐項停用與提問工具邊界)。

[公開遠端查核](audits/skill-optimization-2026-09-16/remote-skill-verification.json)於 2026-09-16 12:07:12–12:08:44 UTC 真正執行兩項 CLI，均 exit 0、stderr 空：

| 查核 | 實際涵蓋 | 結果 |
|---|---|---|
| Pinned source integrity | 18 repositories、131 個固定路徑、18 份授權證據 | commit／tree／path／license evidence 驗證通過 |
| Originality heuristic | 62 個有引用 Skills、344 份本機文字檔、114 份固定上游檔、734 次比較 | 未觸發可疑文字重疊規則 |

兩項各耗時 14.392／77.947 秒，來源程式、manifest 與受查核 Skills 的前後 hashes 相同。主線重新核對 before／after 的每個檔案與 stdout／stderr hashes。初次 sandbox 的 EPERM 是未執行子程序的環境錯誤，另外保留[原始失敗紀錄](audits/skill-optimization-2026-09-16/remote-skill-verification.sandbox-error.json)，沒有當成 pass 或刪除。正式紀錄 SHA-256 為 `1495da2fdd24636e0825cc9dfc9c0659dc49510cf697d47d48553aa27aeec092`。

查核只讀公開 GitHub／raw URLs，沒有使用憑證、更新 lock 或匯入上游程式。其餘 224 個無引用 Skills 不在比對範圍；零命中僅代表現有文字規則未發現重疊，不是完全原創或法律合規認證。早期 fixture 段落中的「remote 未跑」保留當時範圍，此節是本次完整遠端查核的新證據。

M1 的平台補查確認本機兩份 Git `sh.exe` 可啟動，均為 Bash 5.2.37／MSYS；缺少 `bash` 命令、`od`、`sha256sum`／`shasum`、`cksum`、`chmod`，不能執行原版 Bash installer smoke。沒有可確認的 WSL Linux runtime，也沒有下載、安裝或用替代指令湊出 pass。Bash／Linux／macOS 的實際安裝驗收仍未完成，已完成的 PowerShell 證據保持原範圍。

本輪獨立只讀審查核對 v5／v6 的 source／executable hashes、Default mode 回覆與遠端查核 coverage，沒有待修 finding；未重跑網路或模型。收尾 `npm run validate` 通過（815 Markdown、7 contracts、286 Skills／237 Agents），`test:package` 通過（2574 files／62 entrypoints／10 manifests），`git diff --check` 通過。Package test 初次受 sandbox 子程序限制失敗，相同本機測試經窄範圍允許後通過，沒有發布或全域安裝。全工作目錄仍為 23 個 Skill 入口修改、0 個 canonical Agent／adapter 修改；本輪未增加模型評估用量。

## Codex task adapter 本機整合

新增 [Codex JSONL transport](../scripts/lib/skill-codex-transport.js)，透過可信 `executeTurn` 接既有 task driver；不預設啟動 CLI、讀帳戶或使用 API。18 項離線測試通過，涵蓋嚴格完整 trace／action、原生工具拒絕、單次特定啟動通知、共享執行名額、bytes／時間限制、失敗用量保留及取消／晚到結果，已加入 CI 與 package。

[最終本機整合 v6](audits/skill-optimization-2026-09-16/codex-task-adapter-probe-v6.json)使用真 Codex CLI 與固定假 SSE 回覆，4 個子程序／4 個 loopback requests 全部正常結束。實際送出的 `gpt-6-astra`／`low`、schema 與公開 prompt 均一致，原生 tools 清單為空；只有指定 locale JSON 改變，524 項 deterministic checks 通過，1 項 manual check 保持 unverified。五個 implementation hashes 與目前來源相符，子程序、服務、暫存目錄均清理完成。這是接入流程驗證，模型呼叫 0，不是 GPT-6 任務成果。

前四版錯誤與第五版修正前成功紀錄都保留：先修錯誤的工具清單預期，再定位 CLI 把已停用 Code Mode 通知記為 startup error item；僅精確允許該單次任務前通知。獨立審查又補上缺失 thread prefix 拒絕，以及 stderr 超限時保留 bounded stdout 的已知 usage，最終版重新驗證通過。完整來源與每版限制見[transport 紀錄](audits/skill-optimization-2026-09-16/task-driver-transport-notes.md#codex-jsonl-與虛擬檔案流程接入)。

`max_processes` 只限制本機 executor 次數，不能宣稱限制 Codex 內部 provider requests；CLI 未提供已核實的總請求硬 cap。有效模型／effort、金額仍未知，假服務的零 usage 不算帳戶用量證據。登入 Codex 的 executor、實際服務資料界線、下一批範圍與授權仍待完成；沒有啟用另外計費 API，也沒有擴用之前四次文字測試授權。

獨立 reviewer 已核對最後兩項修正與 v6 全部 implementation hashes，沒有未處理 finding。本輪收尾 `npm run validate`、`test:package`（2588 files／63 entrypoints／10 manifests）與 `git diff --check` 通過。未更動 canonical Agents／adapters，Skill 入口修改總數仍為 23；沒有提交、發布或全域安裝。全計畫的實際模型 outcomes、平台驗收與 holdout 證據仍未完成，目標保持進行中。

## Codex 登入執行器與兩案凍結清單

已完成 Windows [Codex executor](../scripts/lib/skill-codex-executor.js)及[兩案 runner](audits/skill-optimization-2026-09-16/run-codex-comparison.cjs)，仍未呼叫模型。執行器固定 ChatGPT 登入／內建 OpenAI、pinned CLI bytes、空暫存工作目錄、output schema 和 allowlisted 環境；不讀取或複製 auth/config。CLI 本身仍可能寫 cache／log 或更新登入。程序 timeout／取消後等待 close；5 秒仍未結束就保留 in-flight 與 scratch，阻止後續啟動。

[設定檢查 v2](audits/skill-optimization-2026-09-16/codex-chatgpt-config-preflight-v2.json)使用空暫存 home，`features list -c` 接受 `forced_login_method=chatgpt`／`model_provider=openai`，無效登入 enum 被拒絕；未執行 exec／login／model list，未讀真實登入。`--strict-config` 不適用 features 的原始失敗證據保留。此檢查只證明設定解析，不能證明完整 strict exec、帳號可用性或登入模型工具集。

最終 executor **11 項**與固定 comparison **9 項**離線測試通過。後者實際走四 trial／10 次程序替身，核對 owner hashes、共享次序、只有指定 locale 可寫、私有 rubric 不進 prompt、原生工具拒絕、來源變更阻止 write、取消保留部分產物。獨立只讀審查找到「暫存清理失敗覆蓋完整 stdout，導致已知 usage 遺失」，已修復且先用負例重現，再通過回歸；清理失敗仍拒絕動作，沒有冒充清理成功。Windows executor suite 加入 Windows CI；依賴固定 Git/raw bytes 的 comparison suite 維持歷史作者測試。

[可審閱提案](audits/skill-optimization-2026-09-16/codex-comparison-proposal.md)及[機器凍結清單](audits/skill-optimization-2026-09-16/codex-comparison-preflight.json)固定 `gpt-6-astra`／`low`、Node `v24.19.0`／Windows x64、535 個來源和 8 個 implementation entries。binding hash 為 `d082e15305a23fa5c70069bb9571d9f3e81cff00055f074e7f793db236c0b4e1`。兩案各 baseline／candidate，每次只換 owner 入口，其他 runtime packages 相同。每 trial 12 輪／60 秒、整批最多 48 次 executor；**這不是 provider requests、output tokens 或金額硬 cap**。原提案的 provider request ceiling 在 Codex 路徑無法滿足，須另明確接受這個程序／時間限制。

此階段模型呼叫仍為 **0**，凍結清單保持 `not_run`／未授權。使用者選擇維持 Codex 不會擴大已完成的四次文字 smoke；新增測試等待具體範圍授權，另外計費 API 保持停用。M2／M3 實際比較、各分類 outcomes、holdout 與其餘平台驗收尚未完成，目標仍在進行中。

收尾 `npm run validate` 通過（816 Markdown、7 contracts、286 Skills／237 Agents）；`test:package` 通過（2597 files／65 entrypoints／10 manifests），`git diff --check` 通過。獨立 reviewer 確認清理失敗修正、提案範圍、binding 及七個實體 implementation hashes 均相符，沒有未處理 finding。Skill 入口變更仍為 23，canonical Agents／adapters 為 0；沒有提交、發布或全域安裝。

## M4 優先分類的任務材料

新增模型比較尚待授權期間，按原方案優先補 Backend、Cloud、Mobile、Documents 的輸入準備。[四分類準備紀錄](audits/skill-optimization-2026-09-16/m4-category-input-preparation.json)由實際 `buildBundle` 產生，保存 case／prompt／fixture／public bundle hashes、檔案清單與準備工具版本；四案都保持 `task_outcome=not_run`，模型呼叫 0。

| 分類與代表案例 | 本次修正 | 可核對材料 |
|---|---|---|
| Backend：`api-contract-design:1` | 原本有附檔卻缺 `fixture_root`，實際準備失敗；補上根路徑 | 既有 orders contract 原樣進入 `workspace/orders-contract.json` |
| Cloud：`deployment-operations:1` | 補足原題要求但未提供的 build／config／recovery／health 證據 | 6 檔；目前 artifact A／B-r2 與歷史 B-r1，區分 rollout 前條件和部署健康條件 |
| Mobile：`app-store-release:1` | 補足 exact-build 的只讀就緒判讀材料 | 6 檔；4 份有效紀錄、build 41 與過期舊 revision 干擾、2 項待補證據 |
| Documents：`spreadsheet-ops:1` | 同樣重現缺 `fixture_root` 的準備失敗並修復 | 原 CSV 三列含零數量資料完整進入 `workspace/sales.csv` |

兩組新 release fixtures 明示為**作者製作的虛構 development 資料**，不是實際 CI、staging、裝置、App Store 或政策查核。公開契約只說明任務的判讀規則；本案答案、assertions、作者 checker 與其他案例留在公開包之外。只讀案例的 broker 無寫入 grants，不提供部署或送審工具。Documents 的 workbook 任務此處只準備輸入，未製作 workbook、執行重算或宣稱產物通過。

Cloud **5 項**、Mobile **13 項**作者檢查及準備工具 **11 項**測試通過；驗證 scope／digest／revision／時效不可混用、未跑不等於失敗或成功、private oracle 排除與只讀 mutation 拒絕。Cloud 另經獨立只讀審查，沒有待修 finding；主線核對 Mobile 規則、資料與測試並實際重跑。兩個既有打包缺口先重現 `fixture_root: normalized relative path required`，修後才記為可準備。

新增 12 份公開材料，沒有新增案例或 assertions 總數：仍為 284 output 定義／1209 assertions／80 routing。兩個只讀案例的 case 2／3、Skill 入口與 runtime 資源沒有改動。原待批准的 Codex 兩案 preflight 已重新完整建構比對一致，binding 仍為 `d082e15305a23fa5c70069bb9571d9f3e81cff00055f074e7f793db236c0b4e1`，未改變授權待確認的範圍。

此階段完成的是四個代表案例的輸入準備。M4 的 16 分類實際 task outcomes、M2／M3 的行為比較、holdout 及未測平台仍未完成；不以增加檔案或作者測試代替模型驗收。

本輪最終 `npm run validate` 通過（818 Markdown、7 contracts、286 Skills／237 Agents），`test:package` 通過（2612 files／67 entrypoints／10 manifests），`git diff --check` 通過。Mobile 的 fixture／case hashes 已與獨立作者結果及整合紀錄再次比對一致。沒有變動 canonical Agents／adapters、提交、發布或全域安裝；既有額度授權不擴大。

## M4 全分類輸入盤點與 Python 起始專案

[16 分類輸入矩陣](audits/skill-optimization-2026-09-16/m4-category-readiness.json)與[重現程式](audits/skill-optimization-2026-09-16/record-category-readiness.cjs)已對 registry 的每個代表案例核對題目與材料：**8 個附檔包、7 個自足題目包、1 個缺少必要輸入**。這是人工分類加實際打包結果，不是 15 個 task pass。Frontend、Three.js、Video 雖以文字 brief 開始，原要求仍是實作／產物／驗證；矩陣保留 browser、XR、renderer、delivery 等能力需求，不把 routed plan 當完成。Pipeline 代表題已給定無缺陷／缺證據前提，因此只可用來檢查文字判讀，不能聲稱驗證獨立找 bug。

本輪再修正兩處附檔包裝缺口。`git-readme-writer:1` 補 `fixture_root`；`agent-reach-ops` 三案把原本位於 `evals/files/` 的證據移至受支援的 `evals/fixtures/` 並同步宣告，三份檔案的移動前後 SHA-256 相同，沒有刪掉社群截圖內的對抗文字或更改證據內容。原有題目、答案及 assertions 不變。準備工具 **12 項**測試通過，新增檢查涵蓋四案的正確 workspace 路徑與私有答案排除。

`python-development:1` 補上 8 檔起始專案：Python `>=3.12`、純標準函式庫／unittest、既有獨立 helper 與測試，以及 `service_name`／`workers` 契約和有效／無效設定。待受測者新增的 `summary.py`／`test_summary.py` 沒有預填。Node **10 項**作者材料檢查通過；另以 Python **3.12.14** 的 `-I -B` 在隔離暫存副本執行既有 **2 個 unittest**，均通過，無 bytecode 快取且暫存清理完成。這只證明提供的既有專案起點可用，不證明尚未實作的設定摘要功能。Case 1 維持 4 assertions，其他 Python 案例不變。

目前唯一缺原始輸入的分類代表是 `mcp-creator-design:1`：題目要求依已安裝 SDK 建立 TypeScript server，但沒有提供專案／版本、具體 server/tool 契約或可用文件取得介面的回應。矩陣明列 missing inputs，沒有用泛用 MCP 說明充作實作結果。其餘案例依然需要各自受控 runtime、私有 grader 與新增模型授權；所有模型 task outcomes 仍為 `not_run`，資料仍為 development。

本輪收尾 `npm run validate` 通過（819 Markdown、7 contracts），`test:package` 通過（2623 files／68 entrypoints／10 manifests），`git diff --check` 通過。總數仍為 286 Skills／237 Agents、284 output 定義／1209 assertions／80 routing。分類矩陣 SHA-256 為 `791113b558e2df94b3fd973f099f4406a55ea1489db2f9e0ad60ed727d3796a6`；Python 的 case／fixture／public bundle hashes 與獨立作者結果相符。待確認 Codex 比較的 535 份來源和 7 份實體 implementation hashes 再次核對未變，本輪模型呼叫 0。目標繼續進行，未宣稱完成 M2／M3／M4 行為驗收。

## M4 MCP 起始專案與分類材料收尾

`mcp-creator-design:1` 補上 8 份公開材料：固定 SDK `1.17.5`／Zod／TypeScript 的 manifest 與 lockfile、NodeNext 設定、唯讀 catalog 與既有測試、具體 `lookup_component` 行為契約，以及兩個官方文件來源的離線取得 replay。此歷史版本用來測版本相容性，不作 production 版本建議。文件內容是根據官方 tagged [README](https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/1.17.5/README.md)與[server source](https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/1.17.5/src/server/mcp.ts)撰寫的短摘要，明示來源與版本；不冒充原文或即時 web fetch。

受測任務仍要求實作 factory、stdio entrypoint、MCP client 驗證及簡短交付說明，沒有把缺材料的建置任務改成泛用文字規畫。目標 server／測試仍未預填。其他 MCP case 不變，case 1 保持 3 assertions，補明已知／未知／無效 ID 與 stdio 的可驗證邊界。

新增 **6 項**離線材料檢查並加入 CI／package，驗證 lock 版本、replay 拒絕 URL／路徑／繼承鍵、精確打包與 private oracle 排除。獨立只讀 reviewer 重跑通過，未發現需修正問題。[起始專案實測](audits/skill-optimization-2026-09-16/mcp-starting-project-verification.json)另在自有暫存副本安裝 92 個公開套件：空 npm 設定、獨立 cache、停用 install scripts；接著離線 `npm ci`、catalog TypeScript 編譯、既有 **2 tests**、SDK imports、replay 成功／拒絕 CLI 路徑均通過，lock 未改且暫存清理完成。沙箱 EPERM 的[首次紀錄](audits/skill-optimization-2026-09-16/mcp-author-setup-attempt.json)與[重跑結果](audits/skill-optimization-2026-09-16/mcp-author-setup-result.json)保留。這些不是目標 server 的 protocol 驗收。

[16 分類矩陣 v2](audits/skill-optimization-2026-09-16/m4-category-readiness-v2.json)與[產生程式](audits/skill-optimization-2026-09-16/record-category-readiness-v2.cjs)保留各案 hashes：**9 案附檔、7 案自足 brief、0 案缺原始輸入**；v1 不覆寫。這只結束代表案例的材料缺口，不表示 16 案都能在現有 broker 執行。MCP 尚需每個 trial 的可信 dependency setup、受限 replay／TypeScript 能力与私有 grader；其他分類的 browser、renderer、spreadsheet 等要求也保留。所有分類模型 outcomes 仍為 `not_run`，本輪模型呼叫 **0**。

MCP fixture hash 為 `2307bc927f756d72580873d360c2b283407b10c8c3d71b73b90ce8a1f18c3b0a`，矩陣 v2 hash 為 `9f29eca840173c92918450fd8e5391ed8a144298804d896ade964e486ab83f97`。Codex 待確認比較的 535 份來源、7 個實體 implementation 與 binding 再次核對未變。`npm run validate` 通過（820 Markdown、7 contracts，案例／assertions 總數不變）；套件測試因沙箱子程序失敗，以已授權的本機測試重跑通過（該次 2643 files／69 entrypoints／10 manifests）。沒有啟用另外計費 API、擴大模型呼叫授權、修改 canonical Agents／adapters、提交或發布。

## M1 原生 Windows PowerShell 5.1 實測

[原生測試審查](audits/skill-optimization-2026-09-16/native-powershell51-audit.md)確認主控與 installer 都是 64-bit Desktop **5.1.19041.3803**，使用原本 smoke 腳本、本地 SourceDir 與暫存目的地。沒有改 installer／smoke 原始碼，也沒有安裝至真實使用者 home。

初次沙箱子程序未啟動；許可後的第一個全量測試額外套一層 TEMP，34 行 PASS 後遇到 261 字元目的地複製失敗。使用正常 TEMP 的第二次全量測試越過該處與完整 catalog 安裝，但 **102 行 PASS 後仍 exit 1**：ownership alias 拒絕案例收到非零 child exit 和空輸出，缺少預期訊息。原 helper 未保存該 child 的精確 exit code，原因未知，不能判定為 native crash 或 ownership 邏輯缺陷，也不能算全量通過。

兩次最小重現都正常：先安裝一個 Agent，再把暫存 ownership target 改為 `vscode`，重試 `claude` 安裝得到正確拒絕。第二次[分流紀錄](audits/skill-optimization-2026-09-16/native-powershell51-alias-repro-v2.json)保存 child PID、stdout／stderr、exit 0／1、無 timeout 與已關閉狀態。所有新測試目錄已清理，兩份腳本前後 hashes 一致；原全量失敗紀錄保留。最新原生 5.1 狀態因此由 `not_run` 更新為 **failed**，尚需補足未知失敗的診斷與原生全量驗收；Linux／macOS 仍未執行，不能用這些本機結果替代。

## M1 失敗診斷與原生 5.1 全量通過證據

本輪僅改 `smoke-install.ps1` 兩個 helper 的失敗訊息，保留十進位／十六進位 child exit 與 captured line count；執行方式、ownership 判準和 expected-message 條件不變，installer 沒有變更。[診斷檢查](audits/skill-optimization-2026-09-16/smoke-diagnostics-check.json)在 5.1.19041.3803 與 7.6.5 主控各執行 4 個無輸出 exit 診斷及 3 個成功／拒絕控制，全部通過且暫存清理完成。負值 exit 是無害 child 明確回傳的測試值，不是實際誘發 access violation。

[原生 5.1 全量 v4](audits/skill-optimization-2026-09-16/native-powershell51-smoke-v4.json)於 13:51:53–13:56:07 UTC 實際完成，**exit 0、113 行 PASS、stderr 0 bytes、未逾時**，末行確認 286 Skills／237 Agents。主控與 installer 都是原生 5.1，使用正常 TEMP；本次新增 smoke root 已刪除，既有 root 未碰，兩個來源檔 before／after hashes 相同。本次只有一次 full run，沒有失敗後自動重試。

v4 是目前來源的全量通過證據；v2 長路徑與 v3 空輸出的歷史失敗不覆写，沒有證明其根因已被修復。診斷變更不改成功分支，不能據此主張它造成成功。Linux／macOS、其他宿主載入、M2／M3 行為比較、M4 分類 outcomes 與 holdout 仍未完成。本轮沒有模型呼叫；待確認 Codex 比較的 535 個來源和 7 個實體 implementation hashes 仍吻合，另外計費 API 維持停用。

本機 `npm run validate`、套件檢查（2652 files／69 entrypoints／10 manifests）及 `git diff --check` 通過。另修正本文件的過期遠端查核狀態，核對已有報告的 5 個檢查來源、3 個 manifests 與 344 個本機檔案 hashes 都未變；沒有重跑網路查核或宣稱超出原涵蓋範圍。
