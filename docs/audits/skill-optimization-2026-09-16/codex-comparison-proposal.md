# 下一階段：使用既有 Codex 登入比較兩個 Skill 入口

此提案尚未執行，也不代表新增授權。使用者已選擇維持 Codex，不啟用另外計費的 OpenAI API；先前批准的四次 pipeline-review 文字測試已全部用完。

## 比較內容

| 次序 | 測試 | 版本 | 允許的任務動作 |
|---|---|---|---|
| 1 | `code-change-workflow:4`：更改登入文字 | baseline | 讀取公開檔案；只可寫入虛擬 `workspace/locales/en.json` |
| 2 | 同上 | candidate | 同上 |
| 3 | `verified-software-delivery:5`：判斷交付證據是否足夠 | candidate | 只讀公開檔案、回答 |
| 4 | 同上 | baseline | 同上 |

每案只替換 owner 的 `SKILL.md`；其他 286 個 runtime Skill packages、catalog、任務及工具權限相同。基線固定在 Git commit `7acca1fb8865903dc67ee4c76c147d0881cb9e1b`。這是 development smoke，每版本每案一次，不能證明統計改善、泛化能力或自動觸發正確。

## 送到服務的資料與動作

模型先收到固定虛擬工具協定、任務、286 Skills 的 catalog metadata；後續依模型的虛擬讀取要求傳回同一公開快照內的檔案。兩案快照分別有 524／529 檔，包含 runtime Skill 資源及人工測試 fixture；約各 2 MB，並非第一輪全部送入。歷史對話只包含本 trial 已接受的公開互動。

私有 rubric、評分條件和原始 CLI 推理內容不送入公開 driver request。實際專案檔案不被模型寫入；broker 的變更存在記憶體副本，由評估者另存結果。不執行模型產生的 shell、程式、瀏覽器動作或部署。

執行器將現有 Codex home 路徑交給 CLI 自行使用登入；評估程式不讀取或複製 auth/config 內容。CLI 仍可能寫入正常 cache、log 或更新登入 token，不能宣稱整台電腦完全唯讀。停用設定、空工作目錄與 CLI read-only sandbox 也不是已證實的 OS 隔離。

## 固定設定與上限

| 項目 | 值 |
|---|---|
| 登入與供應商 | `forced_login_method=chatgpt`、內建 `openai`；無 API key、自訂 endpoint 或模型 fallback |
| 要求的模型／effort | `gpt-6-astra`／`low`；實際帳號可用性與 effective model 尚未確認 |
| 整批 | 4 trials；最多 48 次 Codex executor 啟動 |
| 每 trial | 最多 12 輪、60 秒 driver deadline |
| 每次取消／終止 | 送 kill 並等 close，最多另等 5 秒；未 close 就保留失敗紀錄與 in-flight 狀態，禁止再啟動 |
| 資料 | 每 request／stdout 各 2 MiB，stderr／action 各 256 KiB，history 4 MiB，final text 64 KiB |
| 重試 | 比較器不自動重試；第一個執行錯誤即停止其餘 trials |

**48 是本機程序數上限，不是服務請求數。** Codex CLI 內部 provider requests、輸出 token 數及金額沒有已驗證的硬上限；這些也不能從程序數推算。會使用既有 Codex 額度；不啟用另行計費 API。原資料提案的 provider request ceiling 在此路徑無法滿足，改用程序／時間上限須得到明確接受。

## 已有證據與仍待觀察之處

- [本機設定 preflight v2](codex-chatgpt-config-preflight-v2.json)：`features list -c` 接受 ChatGPT／OpenAI 設定，無效登入 enum 被拒絕。`features list` 不支援 `--strict-config`；此檢查不證明完整 strict exec 已通過。
- [CLI 與假 SSE 整合 v6](codex-task-adapter-probe-v6.json)：特定設定下，wire tools 為空、四個預寫動作通過。0 模型呼叫，不能當作登入模型的能力、工具相同或 Skill activation 證據。
- [凍結清單](codex-comparison-preflight.json)：535 個來源、8 個 implementation entries，固定 Node `v24.19.0`／Windows x64、CLI bytes、設定、案例、順序、權限與私有 checks 的 hashes。binding SHA-256：`d082e15305a23fa5c70069bb9571d9f3e81cff00055f074e7f793db236c0b4e1`。
- 最終版本的 executor 11 項與 comparison 9 項本機測試通過，均使用程序替身；涵蓋四 trial 的 owner 差異、權限、來源改變、取消、部分產物及失敗用量。獨立審查發現的清理失敗用量遺失已修復並加入負例測試。

目前 `status=not_run`、`execution_authorized=false`。真正執行後，會分開保存可見 action、檔案條件、人工 rubric、已知 CLI usage 與未知用量；`completed` 不自動等於任務通過。若服務不接受設定、回覆出現原生工具事件、來源改變或取消，停止並保留部分證據，不自行換服務或擴大範圍。

評估完成後才能判斷這兩個 owner 入口是否需調整。其餘分類的任務 outcomes 與 holdout 測試仍是分開的後續階段。依使用者 2026-09-17 的範圍調整，本次只驗收 Windows，現已具有原生 PowerShell 5.1／PowerShell 7 的本機及雲端安裝證據；Bash／Linux／macOS 移出本次完成條件。此說明不改變上方凍結的模型比較設定或新增執行授權。
