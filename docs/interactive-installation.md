# 互動式安裝

[回到 README](../README.md#快速開始) · [分類與 Skill 配套](audits/skill-installability-2026-10-09/README.md)

執行一行命令，安裝時再選平台、全域或專案範圍、Skills／Agents，以及要安裝的分類。不需要先記分類名稱或選擇參數。

## 啟動

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/setup.ps1; & ([scriptblock]::Create($s))'
```

Linux／macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/setup.sh | bash
```

Windows 使用 PowerShell 5.1 或 PowerShell 7；Linux／macOS 使用 Bash 3.2 以上。一般安裝不需要 Node.js，也不需要管理員或 `sudo`。遠端安裝需要網路；Bash 需要系統常見的 `curl`、`tar`、`awk`、`sort` 和 SHA-256 工具。

若在 OpenCode 啟用主動委派，而且需要合併既有 JSON 設定，Bash 後端會使用 Python 3 或 Node.js 解析設定。這是既有安裝器的條件需求；沒有可用解析器時會在預檢停止，並提示手動設定方式。

## 選單流程

1. **平台**：`1` Codex、`2` Claude Code、`3` Cursor、`4` GitHub Copilot、`5` OpenCode。按 Enter 預設 Codex；另有 `6` Project (all platforms)，可直接選跨平台專案安裝。
2. **安裝範圍**：選一個平台後，選 `1` User global 或 `2` Current project，Enter 預設全域。全域安裝寫入使用者目錄，供不同專案使用；專案安裝只寫入所選專案和平台需要的目錄。跨平台 Project 選項直接使用專案範圍。
3. **內容**：`1` Skills、`2` Agents、`3` 兩者。按 Enter 預設兩者。
4. **分類**：按分類編號選取，`1,3` 或 `1 3` 可一次選多個；`0` 或 Enter 代表該類型全部。兩種類型會分別顯示分類選單。分類依來源目錄排序，編號可能隨目錄更新，請以當次選單為準。
5. **專案目錄**：選專案範圍時，確認專案根目錄。Enter 預設啟動命令時的目前目錄，不會自行尋找 Git root。也可輸入另一個專案的完整路徑。
6. **主動委派**：選全域 Codex／OpenCode Agents 時，可輸入 `y` 啟用主動委派。預設不啟用；預覽會列出 companion Skill 與全域設定變更。專案範圍不會修改全域委派設定。
7. **預覽與預檢**：列出選取的平台、安裝範圍、內容、必要配套、實際目的地與設定變更。所有選取批次都通過預檢後，才出現最後確認。
8. **確認安裝**：輸入 `y` 才寫入。輸入 `n` 或直接 Enter 會取消。

任何選單都可以輸入 `q` 取消。輸入不合法時會重試，最多三次；輸入結束（EOF）會失敗並停止，不會採用預設選項或自動確認。全選 `0` 不能和其他編號混用，重複分類編號會去重。

例如只要 Frontend & Design Skills：選 Codex → User global 或 Current project → Skills → 選單中的 `frontend-design` 編號 → 查看預覽 → `y`。該分類會自動補齊跨分類必要配套；目前 34 個分類元件，加上 5 個必要配套，共 39 個 Skill 套件。

### Codex 全域與專案安裝

兩種範圍使用同一個啟動指令，安裝時再選：

| 範圍 | Skills 位置 | Agents 位置 |
|---|---|---|
| User global | `$CODEX_HOME/skills/`，未設定時為 `~/.codex/skills/` | `$CODEX_HOME/agents/`，未設定時為 `~/.codex/agents/` |
| Current project | `<project-root>/.agents/skills/` | `<project-root>/.codex/agents/` |

全域沿用既有 CraftRoster 安裝位置與更新規則。專案路徑對應 OpenAI 官方的 [repository Skills](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills) 與 [project-scoped custom Agents](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents)。兩個範圍可以同時安裝；選專案不會搬移或刪除既有全域內容。官方文件說明同名 Skills 不會合併，可能同時出現在選擇器中。

只選 Codex 專案時會建立 `.agents/skills/` 與／或 `.codex/agents/`；選 `6) Project (all platforms)` 才會建立其他平台的相容目錄。其他平台也能分別選全域或專案範圍；完整路徑見 [README](../README.md#支援平台與安裝位置)。

安裝完成後，開啟新的工具工作階段，讓 runtime 重新載入內容。

## 依賴與寫入規則

遠端流程只下載一次 repository archive，所有預檢與安裝批次共用這份來源。下載仍包含完整 repository；只有選取的元件與必要配套會寫入安裝目錄。

Skill 的 `required` 依賴會遞迴補齊；`conditional` 與 `optional` 不會自動補齊。全量 Agents 安裝會加入 `subagent-architecture`，配套寫入同一個平台與安裝範圍；單一 Agent 分類只有啟用全域主動委派時才加入該配套。

各分類依序交給既有安裝器執行。跨分類共用的必要 Skill 可能由多個批次核對與更新，但同一個目的地只有一份套件。保留既有 ownership 檢查：來源不同、缺少 metadata 或已被使用者修改的內容，不會直接覆蓋。

任一批次預檢失敗時，整個互動流程不會開始安裝。正式安裝中若後續批次失敗，會停止並回報；已完成的批次會保留，沒有跨批次的全域回滾。個別套件仍使用後端原有的寫入與復原機制。

## 本機與進階選項

已下載本專案時，可在 repository 根目錄執行：

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -File .\scripts\setup.ps1 -SourceDir .
```

```bash
bash scripts/setup.sh --source-dir .
```

本機 `scripts/install.cmd` 不帶參數時啟動遠端互動入口；帶參數時保留原本的參數安裝介面。

以下為可選參數，一般互動安裝不需要輸入：

| 用途 | PowerShell | Bash |
|---|---|---|
| 使用本機 checkout，不下載 archive | `-SourceDir <path>` | `--source-dir <path>` |
| 指定目的地；專案範圍時為專案根目錄 | `-InstallDir <path>` | `--dir <path>` |
| 指定 GitHub repository | `-Repo <owner/name>` | `--repo <owner/name>` |
| 指定 branch，預設 `main` | `-Branch <name>` | `--branch <name>` |
| 只走選單與預檢，不要求寫入確認 | `-DryRun` | `--dry-run` |
| 略過 ownership／digest 覆蓋保護，保留 link／設定合併保護 | `-Force` | `--force` |
| 顯示說明 | `-Help` | `--help` |

`-Force`／`--force` 也會套用到必要配套，請先備份並檢視預覽。互動入口不提供單一元件名稱選單；指定名稱與 CI／無人值守安裝可使用原本的 [`install.ps1`](../scripts/install.ps1)／[`install.sh`](../scripts/install.sh)，命令見 [README](../README.md#進階參數安裝)。

## 輸入與疑難排解

- **`curl | bash` 必須有互動終端**：程式從 stdin 載入，答案改由 `/dev/tty` 讀取。沒有控制終端時會在下載來源前停止；CI 請使用參數安裝器。
- **本機答案檔**：從檔案執行 `setup.sh`／`setup.ps1` 時可重新導向 stdin 供測試或重複操作。PowerShell 遠端 scriptblock 也可讀取重新導向的答案。答案最後仍須明確提供 `y`，輸入耗盡不會自動確認。
- **預檢顯示 ownership 衝突**：先檢視實際目的地及現有內容，再決定是否改目的地或使用 `Force`；取消不會改動現有安裝。
- **來源或分類索引無效**：流程會停止，確認 checkout／branch 包含安裝器和產生的分類索引。不要手動修改產生的 TSV；應更新 catalog 並重新產生。
- **來源安裝器版本太舊**：單平台專案安裝需要來源後端支援 `ProjectPlatform`。使用舊 `SourceDir` 或 branch 時請先更新來源；流程會停止，不會改成跨平台安裝。跨平台 Project 選項仍可使用原本的後端介面。
- **中斷或取消**：wrapper 會清理自己下載的暫存來源，不會刪除使用者提供的 `SourceDir`。強制終止程序或主機關機可能留下暫存目錄。
