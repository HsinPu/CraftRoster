# 四來源遊戲開發整合與實測

本次把 EL4CTEO、arjun988、majidmanzarpour、setcodes 四份固定來源一起納入，保留原有 108 個 Blender Skills，加入獨立的遊戲設計與 Godot 開發。`game-development` 用途安裝 110 個 Skills／4 個 Agents。來源與分類細節見 [使用指南](../../blender-skills.md)及[逐項覆蓋表](../../blender-source-coverage.md)。

## 已交付內容

- 126 個 canonical 來源條目、443 個 inventoried 檔案都有固定 commit、tree、Git blob 與用途紀錄；不重複計算 Cursor mirror。
- 新增 18 份 Majid／setcodes Blender 專項文件，以及 11 份遊戲設計／Godot 專項文件。內容包含輸入、測量、操作、失敗修正及接受條件。
- 兩個本機 helper 分別負責明確前景遮罩比較，以及保留既有 GLB binary 的指定材質圖片替換；它們不給藝術品質評分，也不自動安裝外部服務。
- 配套角色、五平台 adapters、分類安裝、必要依賴、來源授權與 GitHub 文件同步更新。設計／Godot 單裝各 1 包；Blender 的 1／2／3／4 包必要依賴規則保留。

## 實際執行的證據

| 檢查 | 觀察結果 | 證據範圍 |
|---|---|---|
| Godot 4.7.2 獨立送貨原型 | 27 assertions、退出碼 0、明確完成標記 | 共用 Job Resource 與獨立 session 狀態、容量、目的地、重複獎勵、重設、合成輸入／暫停 |
| Blender 5.2.2 GLB 圖片替換／回讀 | 指定材質像素改變，共用者保持原樣；幾何、矩陣與 PBR 保留 | 兩個立方體的原生 export/import 與資料比較；未渲染藝術驗收 |
| 遮罩 helper | 10 個 host 測試通過，包含實際 PNG | 正規化會隱藏的比例／位移差異、註冊校準、空遮罩、不合法輸入、過期 hash 與輸出保護 |
| GLB helper | 9 個 host 測試通過 | 共用圖片、sampler／UV transform、BIN 保留、錯誤欄位、輸出保護及 opaque extras |
| 分類安裝／更新 | PowerShell 5.1 與 7 各 12 項通過 | 真正安裝至隔離目錄、必要依賴、整包內容、四角色權限及重跑更新 |
| 覆蓋 gate | 34 項回歸通過 | 來源遺漏、偽造 blob、資源缺失、分類與依賴錯誤會拒絕 |

Godot 最初的合成輸入測試有 4 個 timing failures：harness 在累積事件送達前判斷，診斷後改為等候兩個 frame；未放寬玩法規則。初始失敗、診斷及最後的 [runtime log](godot/runtime.log) 都保留。Skill 現在提醒先觀察事件送達。這仍不是實體鍵盤、畫面、駕駛手感或真人試玩證據。

獨立程式審查發現 GLB helper 把自訂 `extras.uri`／`extras.sourceTexture` 誤認成 glTF 結構。已修正為保留 opaque metadata，並確認真正的外部 URI、不支援 extension 與錯誤材質索引仍會拒絕。

Blender 的 extension cache 寫入受限，Godot 有 certificate-store 警告，Godot editor import 另遇設定檔寫入限制。原生行為 assertions 完成，但不宣稱乾淨的 editor 環境、完整平台矩陣或所有流程成功。完整紀錄與輸入身分見 [evidence.json](evidence.json)／[files.json](files.json)。

整體 `npm run validate` 通過；實際 npm package gate 檢查 3517 個檔案、82 個宣告入口與 15 份 manifests，並驗證解包後的相關命令。來源比對沿用 repository 的原始 matcher：110 個套件／566 份本地文字，對照 434 份固定來源，完成 7783 次比較。Primary mappings 沒有命中；擴充的 secondary 比對保留 139 個必要 MIT 授權原文命中，以及 1 個既有、未修改的 Blender units API 欄位紀錄命中，逐項分類後沒有未解釋的內容重疊。本次未執行尚未推送版本的 GitHub CI。

封裝檢查另重現了 Python 測試快取被包入的問題。測試已停寫 bytecode，Git／npm 排除快取，package gate 新增 `.pyc` sentinel 與快取檔拒絕規則；最終封裝和兩版 PowerShell 安裝更新已重跑通過。

## 重現

先讀 [送貨設計](godot/design.md)。把 [Godot project](godot/project/) 複製到自己的可寫測試目錄，選擇相容的 Godot 4.7.2 binary，先 `--import`，再以 `--headless --path <copied-project> --quit-after 600` 執行。必須同時看到退出碼 0 與 `FORWARD_TEST_COMPLETE assertions=27 failures=0`；僅達到 frame 上限不算成功。

Blender fixture 必須在新的背景程序與可寫測試目錄執行。將 [source.glb](blender/source.glb) 與 [candidate.png](blender/candidate.png) 複製到該目錄，以 `skills/blender-texturing/scripts/replace_glb_basecolor.py source.glb candidate.png candidate.glb --material-name Body` 產生全新候選，再以 Blender `--background --factory-startup --python <fixture.py> -- <test-directory> import` 執行[回讀比較](blender/fixture.py)。不對使用者開啟中的場景執行這份 fixture。

來源原文未直接作為本地工作流程散布；安裝包保留必要的 MIT 通知。模型案例 JSON 是測試定義，本頁的有限實測不能替代全部 110 個 Skills 的實際製作、影像審查或各引擎驗收。
