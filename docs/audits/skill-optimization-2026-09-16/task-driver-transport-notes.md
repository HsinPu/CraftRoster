# Task driver 與模型 transport 邊界

本輪已實作本機 JSON 工具循環、可注入 executor 的 Codex JSONL transport 與可注入 fetch 的 Responses transport，新增驗證全部使用假服務；沒有新模型服務呼叫。先前允許的 4 次 pipeline-review 文字 A/B 已用完，不能視為新的多輪任務評估授權。

## 已確認的本機與官方資訊

- 本機 `codex --version` 回傳 `0.154.0-alpha.6.2`。
- 本機 `codex exec --help` 列出 `--ignore-user-config`、`--ephemeral`、`--sandbox`、`--output-schema`、`--json` 及 stdin prompt；這些是啟動介面，沒有因此執行模型。讀取 help/version 時，CLI 無法寫入受保護的 arg0 暫存路徑，但仍回傳資訊；沒有繞過限制。
- 官方設定文件分別定義 shell、unified exec、apps 與 web search 控制。`features.shell_tool` 只描述預設 shell 工具；不能從這一個 flag 推論所有原生工具都已停用。[Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- 官方 CLI 文件區分當次 `--enable`／`--disable` 與會持久變更設定的 `codex features enable/disable`。本輪沒有執行任何持久設定變更。[Developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- 本機以 `codex app-server generate-json-schema --out <temporary-directory> --experimental` 匯出靜態協定，未啟動 app-server、建立 thread 或傳送任務。`ThreadStartParams` 提供 `dynamicTools`、`config`、`ephemeral`、`permissions`／`sandbox`；`TurnStartParams` 提供 `sandboxPolicy` 與 `toolOutput`。這只證明欄位存在，沒有證明 dynamic tools 會取代全部原生工具、檔案不可讀或私有資料不會被載入。兩個 schema 的 SHA-256 分別為 `25f490368ec6df52a2a3b82a5469d2413307eb93439121b309f415b5648eee7a`、`b36fb37326b1cf69f75c8b306f1f886d53a57c4b1b985e08e298e2407ea2ad02`；實驗性介面需在實際 transport 整合時重新核對。

## 下一個 transport 必須提供的證據

1. 固定 public bundle、protocol、工具 schema／grants、私有 grader、host／模型設定，以及實際送出的請求版本。不得把 private record、其他案例或工作目錄檔案自動加入請求。
2. 證明模型只能回傳協定 JSON，檔案工具由 trusted driver 代為執行；若使用具原生工具的 CLI，須另證明其能力限制與實際 trace。Prompt 中要求「不要用工具」和收到事後拒絕都不等於讀取隔離。
3. 先用固定 fake transport 驗證協定、拒絕、取消與預算計數，實際 transport 再以明確授權的最小案例驗證；不得把工程子代理當受測模型。
4. 設定整批和單一 trial 的呼叫上限、timeout、輸入／輸出限制；中止後若可能已有服務用量，維持未知或不完整，不算零。模型、effort 與金額以服務證據為準，未回傳則 null。
5. 先挑能在受控工具內完整驗收的案例。需要 shell、GPU、瀏覽器或外部系統的任務，應另提供相應隔離環境；檔案 broker 不具這些能力。

目前沒有啟用真實模型服務 transport、讀取或複製憑證、建立新登入、安裝全域工具、變更個人設定，或宣稱宿主隔離已成立。模型 transport、受控任務 outcomes 與額度批准仍待後續工作；這份文件沒有授權任何服務呼叫。

## Codex JSON transport 的適用範圍

後續只讀調查確認 `--output-schema` 約束最終回答；`--json` 提供事件，不能由此推論中途 tools 已停用。App-server 的 `dynamicTools` 是額外 client tool 協定，官方沒有承諾空陣列取代 built-ins。這兩種介面可以承載 JSON adapter，但仍需分別驗證工具與資料邊界。[Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)、[App Server](https://learn.chatgpt.com/docs/app-server)

官方 named permission profile 支援 filesystem path／glob 的 `deny`，與本機 legacy `SandboxPolicy.readOnly`（只有 networkAccess）不同。它是待驗證的控制選項；network profile 明示不限制 web search、apps、MCP，不能由一項設定推論全面隔離。[Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference)

Skill discovery 另有 repo／user／admin／system 層級及 symlinks；逐 path 停用與 implicit invocation 設定各有範圍。忽略 user config、改 CWD 或沒有主動讀取 Skill，都不足以證明 discovery context 為空。[Build skills](https://learn.chatgpt.com/docs/build-skills)

## 已凍結的下一輪比較輸入

[比較提案](driver-comparison-proposal.json)由 [prepare-driver-comparison.cjs](prepare-driver-comparison.cjs) 在本機產生，沒有呼叫模型。兩案為 `code-change-workflow:4` 的 locale 修改，以及 `verified-software-delivery:5` 的 readiness report。每案一個基線與候選，總共四個擬議 trials；基線只替換該案 owner 的 `SKILL.md`，取自 `7acca1fb8865903dc67ee4c76c147d0881cb9e1b`。其餘 runtime Skills 使用共同的目前候選版本，所以這是 owner-entry 比較，不是整個舊版 repo 對新版 repo。

兩個 owner 在兩版本都只有單一 runtime 入口，frontmatter 相同；script 若發現新增 references 或 discovery metadata 改變會拒絕。提案保存 case／fixture／catalog／共同公開檔案／owner／兩版本 bundle／policy／toolset／implementation hashes，並檢查準備途中輸入是否改變。私有 rubric 不供受測模型；locale 只允許寫指定 JSON，readiness 全部唯讀。

擬議上限為每 trial 12 次 adapter 呼叫、60 秒，四案最多 48 次 adapter 呼叫，無自動重試。這些數字**尚未成為 provider request 或花費上限**；Codex 中途工具、內部重試、取消與服務用量仍須驗證，完成後才具備請求實際執行批准的條件。提案保持 `execution_authorized: false`、`not_run`。兩案均為已參與開發的 development cases，不可充作 holdout、完整分類驗收或統計改善證據。

## 純本機 Codex 請求觀察

[Probe](probe-codex-tool-surface.cjs)建立空白暫存 profile／CODEX_HOME 與只綁 `127.0.0.1` 的假 provider；使用合成提示、明示非模型的 model ID、無認證、零重試，服務只回 terminal HTTP 400，不轉送流量或產生工具動作。每次限一個 process、30 秒、兩個請求及每個請求 2 MiB；設定只作用於該次子程序，結束後清除暫存目錄並停止服務。

前兩次皆 exit 1／零請求；當時診斷分類器沒有保留真正原因。[第三次紀錄](codex-tool-surface-probe-v3.json)在零請求且 stdout 空白時保留有界、遮罩的 startup error，定位為這個 alpha 版不接受 `tools.view_image`。這顯示現行官方文件中的設定仍須與實際版本核對；沒有把啟動失敗當成工具停用證據。

保留受支援的 `features.view_image=false`，移除無效欄位後，[第四次紀錄](codex-tool-surface-probe-v4.json)收到 **1 個 24,526-byte Responses 請求**，再由本機假服務回 400。請求仍列出 `request_user_input` 原生工具，developer context 仍含系統 `skill-creator`／`openai-docs` metadata 的標記；因此這個設定尚未達成「只有 broker 工具、只有固定 catalog」的條件。`CraftRoster` 標記也會匹配本程式命名的暫存路徑，不能把它直接解讀為來源 repo 內容洩漏。

四次均無模型回答，清理欄位均為 true。紀錄不保存 raw instructions、headers、一般 stdout 或隱藏推理。前三版來源 hash 屬歷史 revision；目前 source 對應 v4，不能用目前來源重新認證前三版。這是特定 dummy provider／model 的初始請求觀察，不是登入帳戶的實際模型工具清單或 OS 隔離證明。

獨立審查核對 v4 source／兩次 executable hashes，並以三處已知差異重建 v3 source hash，一致成立。V1／v2 原始來源沒有另存，未作相同認證。四份 JSON 的 `model_execution` 保持 null，沒有 `model_calls` 欄位；此處補明這四次皆為固定本機假服務檢查，實際模型呼叫 0，並保留原紀錄不覆寫。

後續實作使用直接 Responses API adapter，明確傳空 tools、固定 endpoint、禁止重試與 redirect，並在發送前計入共享請求上限。這條路徑不使用 Codex CLI 的 discovery 或帳戶登入；結果只代表明確的 API 模型與受控檔案介面，不能替代 Codex activation 評估。

## Responses transport 離線驗證

[transport module](../../../scripts/lib/skill-responses-transport.js) 與 [18 組測試](../../../tests/skill-responses-transport.test.js) 已通過本機執行。測試使用 fake fetch，涵蓋四種虛擬操作、strict schema、原生工具／refusal／incomplete 拒絕、HTTP／redirect、stream bytes、共享上限、並行、取消、timeout、晚到回應、private rubric 隔離，以及虛擬寫入後 final 的真實 driver 流程。它們是 transport correctness 證據，模型呼叫 0。

獨立審查重現兩個問題後已修正：`write_file` 的已知 base64 payload 也檢查金鑰回顯；完整有效 provider envelope 的 usage 先經 numeric allowlist 保存，因此未完成／拒絕／無效 action 的已知 token 不會從成本分母消失。取消、逾時或完整 body 未取得仍維持 unknown。只保留可見 action hashes，不保存 provider raw envelope、headers、錯誤文字或隱藏推理。

修正後獨立 reviewer 另跑 8 個針對性 fake-fetch checks：base64 金鑰拒絕與一般資料接受、incomplete／refusal／invalid action 的用量保留、取消／逾時的不退額度及晚到資料不改寫，均通過。

預設限制是 1 request、2048 output tokens、30 秒、2 MiB request／1 MiB response；呼叫端需為整批明確設定並共用 instance。`fetchImpl` 與 `apiKey` 是必要參數，沒有自動讀取或全域 fallback。新 module 的完整用法及限制見[維護方法](../../skill-quality-workflow.md#responses-transport)。Strict schema 與 effort 的依據為 [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) 及 [Reasoning effort](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort)；API 接受的詞彙仍須與所選模型的能力分開驗證。

2026-09-16 的[官方 GPT-6 Astra 模型頁](https://developers.openai.com/api/docs/models/gpt-6-astra)列出 model ID `gpt-6-astra`、Responses／structured outputs，以及 `low`／`medium`／`high`／`xhigh`／`max`。下一個 preflight 可固定 `gpt-6-astra`＋`low` 作為小型 smoke 的提案設定；這不是已驗證的帳戶 access、有效模型版本或服務執行。既有 API module 不會自動選用或降級模型。

## 可審閱的 API 比較 preflight

[固定 runner](run-responses-comparison.cjs) 已接上既有四個 trials 與同一 transport。[新 preflight](responses-comparison-preflight.json)使用 `gpt-6-astra`／`low`，綁定 hash `a6c82f299a14461fc8917f56f7269eb7823ad38ac366d32e483b594195c9472c`；它保留原 proposal 並增加 runner／transport loaded source、私有 checks／record、每案 public manifest 與來源清單。CLI 只提供 help／preflight，沒有 live 執行模式；freeze 的真實結果為 `not_run`、`execution_authorized: false`、模型請求 0。

首版之後補上實際 Node version／platform／arch 綁定；[目前 preflight v2](responses-comparison-preflight-v2.json)固定 Node `v24.19.0`、`win32`、`x64`，hash 為 `2987a1ed8a11d8ef3d6476fbc869c21e9bed6fffac5c89a5b8f6997cecc9c450`。不同 runtime 或舊版 manifest 不能通過目前 runner。首版仍保存原內容，沒有執行或被覆寫；四案、資料與模型／effort 設定未變。

完整 comparison 作者 suite 17 項先行通過；runtime 最小修正後另通過語法檢查及 3 項 targeted probes（runtime 正例、偽造 runtime 零 fetch 拒絕、4 trial／8 fake calls 整合），未宣稱原 17 項在該修正後全部重跑。最終 runner SHA-256 為 `b963d1923a6b6da0e245c1f11c0d15520c868a4e0a00defa0d66043c178b87cd`，與 v2 manifest 相符；全部測試均無網路／模型呼叫。

整批固定最多 48 次 transport requests，每 trial 12 turns／60 秒、每次 2048 output tokens，沒有自動 retry、model fallback 或 order／policy override。第一次 infrastructure failure 即保留已知 usage／partial artifacts 並停止；後續 trials 保持 not_run。這是可核對的呼叫與輸出上限，沒有金額上限。API 使用另行提供的 credentials／fetch，不能以之前的 Codex 四次額度批准視為授權。

獨立只讀審查以 8 次 fake calls 核對四 variants 的 owner hash、固定模型／limits、private rubric 隔離；來源中途改變時拒絕虛擬寫入並保留 usage，proposal drift 則在零請求時拒絕。未發現待修問題；只有固定基線的只讀 Git 查詢，沒有真 API 或憑證讀取。Deterministic artifact checks 與 manual rubric 分開，後者仍為 unverified，不把 driver completed 當成 task passed。

此 runner 是原 freeze 的歷史實驗工具：改變 raw bytes／line endings、缺少基線 Git history 或修改舊提案都會拒絕。通用 transport suite 已加入 CI，這份歷史 comparison suite 沒有加入永久 CI，以免把後續合法來源改動誤當成產品回歸。新的比較需建立新版本提案；不得覆寫既有證據。

## 使用者的後續選擇

使用者已明確選擇「維持 Codex，不啟用另外計費的 API」。因此上述 API preflight 保持未授權／未執行，沒有讀取金鑰或啟用服務；本機實作與 fake-fetch 證據仍可保留。下一輪若繼續模型驗收，應先解決 Codex 路徑的實際 catalog／tool／private 邊界，並另限定新增 Codex 測試範圍。不能把拒絕另計費 API 解讀為批准新的 48 次 Codex 呼叫。

## Codex 逐項停用與提問工具邊界

2026-09-16 後續只做本機 loopback 檢查，沒有模型或 API 呼叫。依官方 [Build skills](https://learn.chatgpt.com/docs/build-skills) 與 [Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference) 的 `skills.config`，在隔離的暫存 CODEX_HOME 對 `openai-docs`、`skill-creator` 各加入 folder 與 `SKILL.md` 兩種 path 的 `enabled=false`。兩種形式同時設定，因此此次證據不能判定哪一種單独有效。個人設定與安裝未改動。

[第五次紀錄](codex-tool-surface-probe-v5.json)及其[固定來源](probe-codex-skill-overrides.cjs)收到一個 23,855-byte 請求。兩個已知系統 Skill 名稱及 host Skill path 標記皆未命中，developer context 由 v4 的 2,888 bytes 降為 2,219 bytes；`Available skills` 標頭仍存在。這支持已知 metadata 標記消失，不能擴大解讀為所有自動 context 都已排除。原生工具清單仍只有 `request_user_input`。

[第六次紀錄](codex-tool-surface-probe-v6.json)及其[固定來源](probe-codex-question-boundary.cjs)讓同一假服務回傳一次預寫的 `request_user_input` function call。第二個請求帶回 49-byte tool output，匹配「Default mode 不可用」判別，沒有參數驗證錯誤；隨後服務回 terminal 400。這是實際 native handler 的拒絕證據，沒有向使用者發出問題、沒有生成 shell／file 動作，也沒有模型回答。SSE 中的零 usage 是作者填入的假資料，不是模型用量。

V5／v6 均只有一個子程序、30 秒上限、最多兩個請求；觀察到的請求數分別為 1／2，process／server／scratch 清理皆完成。兩份紀錄的 `model_execution=false`、`model_calls=0`，目前 source SHA-256 分別為 `4f86416c357853abfe27b3a941c402da1e1d7d75f8c01862b2f8885d79fd0bf9`、`25cdc1ee112fd6644f38e4516a64027078c8dadc2368415e3ae29302a7d8efc3`，已與紀錄核對。V1–v4 的歷史來源／紀錄保持原樣。

結果只適用於 CLI `0.154.0-alpha.6.2` 的這組設定、dummy provider／model、非互動 Default mode。不能從中推論登入模型的 tools 相同、私有檔案已由 OS 隔離，或 Skill activation 已正確觀察。下一步應以這些已驗證控制設計有界的 Codex adapter，先確認實際模型設定與完整輸入／輸出界線，再提出具體的新增 Codex 測試範圍；API preflight 不啟動。

## Codex JSONL 與虛擬檔案流程接入

[Codex transport](../../../scripts/lib/skill-codex-transport.js)接上既有 driver，使用明確注入的可信 `executeTurn`，沒有預設模型服務、CLI、登入或網路入口。它驗證完整單一 CLI turn 與嚴格 action schema，維持 native tool／未知事件拒絕、共享子程序次數、時間／bytes 限制、取消與晚到結果處理。使用方式見[維護方法](../../skill-quality-workflow.md#codex-jsonl-transport)。

進一步核對 help 與官方設定後，沒有發現可確實限制 `codex exec` 內部 provider requests 總數的介面。自訂 provider 的 retry 設定不是整批上限；built-in `openai` provider 不能按自訂 provider 方式覆寫。開發中的 rollout budget 描述 tracking／reminders，也不作硬 cap 證據。因此 `max_processes` 只限制 executor 次數，`provider_requests`、effective model／effort、金額保持 null；不將 argv 或假 SSE 回傳模型名稱當成服務證明。[Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference)、[Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)

整合過程保留各版來源與結果，沒有覆寫失敗紀錄：

- [第一版](codex-task-adapter-probe.json)送出 literal `gpt-6-astra`／`low`、固定 output schema 與停用設定後，實際 wire tools 為空。它錯誤沿用較早 dummy-model probe 的 `request_user_input` 預期，故假服務主動回 400；這次不是模型失敗。
- [第二版](codex-task-adapter-probe-v2.json)改為嚴格要求空工具清單，CLI 已正常完成預寫回覆，但任務前的 error item 使 parser 拒絕。[第三版](codex-task-adapter-probe-v3.json)加入官方 `suppress_unstable_features_warning=true` 後仍有一項通知，沒有把診斷假設當成解決。[設定依據](https://learn.chatgpt.com/docs/config-file/config-sample)
- [第四版](codex-task-adapter-probe-v4.json)只額外保存有界、遮罩的啟動 error item，確定是「Code Mode host 停用，因此 fail closed」通知。虛擬檔案協定不需要 native Code Mode；parser 僅為這個完整字串增加一次、turn 前的 notice code，其他 errors 與原生工具仍拒絕。
- [第五版](codex-task-adapter-probe-v5.json)完成四個預寫動作、524 個 deterministic checks，1 個 manual check 維持 unverified。獨立審查隨後再要求完整 `thread.started`，並修正 stderr 超限時遺失已知 stdout usage 的問題；第五版屬修正前核心的歷史整合證據。

這些演練只連 `127.0.0.1`，沒有轉送，使用空白暫存 CODEX_HOME，沒有讀取／複製帳戶憑證。Literal model／effort 僅用於檢查這個 CLI 的請求生成；假服務回傳的 action 和零 usage 都是作者資料，不是模型能力或計費證據。空 tools 的觀察只支持這組 model／schema／feature 設定的組合，尚未分離各設定的因果，也沒有認證登入服務工具表或 OS 讀取隔離。

[第六版最終整合](codex-task-adapter-probe-v6.json)與[固定演練來源](probe-codex-task-adapter-v6.cjs)驗證修正後核心，完成 **4 個 Codex 子程序／4 個 loopback requests**，四次 exit 0。每個 wire request 都核對 requested model／effort、公開 prompt、嚴格 schema、空 native tools；沒有 private sentinel 或兩個已知系統 Skill 名稱。四個動作依序為讀 owner、讀 locale、寫 locale、final；524 個檔案條件通過，1 個 manual check 仍為 unverified，唯一變更是 `workspace/locales/en.json`。未執行該 fixture 程式、瀏覽器或真模型。

核心 [18 組離線測試](../../../tests/skill-codex-transport.test.js)全部通過，已加入通用 CI／package。修正先以負例重現：缺 thread prefix 拒絕；bounded stdout 的有效 usage 在 stderr 超限時仍保存；stdout 超限、不完整／多 turn、取消或 timeout 不推測用量。原生工具、近似啟動通知及晚到結果的拒絕不變。演練的 process／server／scratch 均完成清理；最終五個 implementation hashes 已與目前來源重算一致。

最終核心 SHA-256 為 `6822d95ad47435dfe3d27b07d725748bada8bc07e6e513e003f69d086f608d8a`，v6 report 為 `4c6b2cc2865822e9396b6c60fef8230e09380e68d612a1b4c6a0bfed49fcf957`。六版合計 12 個本機子程序／12 個 loopback requests，模型呼叫 **0**；不得將其中假 SSE 的零 usage 當成帳戶零消耗測量。下一步仍需登入 Codex 的受控 executor、設定／資料界線與有界實際測試範圍；現有 module 不會自動使用帳戶，也沒有新增測試授權。

## ChatGPT 登入設定與固定 Codex 比較

新 [executor](../../../scripts/lib/skill-codex-executor.js)補齊 Windows 程序生命週期、明確登入/provider 設定與環境過濾，並由 [runner](run-codex-comparison.cjs)接到四 trial。最終來源 SHA-256 分別為 `32efdc57171661675586639ccc24c26c1111860c8bb8b3cb520868ab8d4567f1`、`29fdbf61d0853b3686b226914bda2b4aa6fc4e153ab7cc9fe3c902580cc8af3f`。constructor／CLI preflight 均不啟動模型；只有明確呼叫 module 的 runComparison 才可啟動執行器。

[設定 recorder](probe-codex-chatgpt-config.cjs)以空暫存 home 呼叫 version／help／features。原版 strict features [失敗紀錄](codex-chatgpt-config-preflight.json)保持不變；[v2](codex-chatgpt-config-preflight-v2.json)以支援的 `-c` 設定取得 exit 0／139 筆 feature rows，無效 enum 負控制 exit 1，所有暫存清理成功。有效值解析不等於整體 strict exec 或帳號登入已驗證，沒有執行任何模型。[官方設定參考](https://learn.chatgpt.com/docs/config-file/config-reference)

11 項 executor 與 9 項 comparison 最終作者測試通過，全部 fake ChildProcess，不是原生 CLI／模型。獨立審查要求保存 cleanup failure 時的完整 bounded stdout usage，修正後以 null exit 拒絕 action，仍報 cleanup_failed／scratch_removed=false。首次 comparison 運行在核心修正期間停止；最終核心固定後，九項完整重跑通過，不能以早期中斷結果作 pass。

新增 [Codex 提案](codex-comparison-proposal.md)與 [preflight](codex-comparison-preflight.json)，bind `d082e15305a23fa5c70069bb9571d9f3e81cff00055f074e7f793db236c0b4e1`。原資料 proposal 及 API preflight 未修改。48 executor／四次 60 秒限制不能滿足原 provider request hard cap；必須明確接受這個不同的上限才啟動。新批次未獲授權、模型呼叫 0；實際工具表、自動 context、activation、effective model、OS isolation 保持未驗證。完整資料範圍、時間／bytes 限制與讀寫界線均列於新提案。
