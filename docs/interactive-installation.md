# 互動式配套安裝

[回到 README](../README.md#快速開始) · [15 個用途分類](../README.md#用途分類與配套) · [Agent 與 Skill 關聯審核](audits/agent-skill-bundles-2026-10-09/README.md)

執行一行命令，安裝時選環境、全域或專案，再選全部或指定用途分類。每個分類會一起安裝相關 Skills、子代理及必要的 Skill 依賴，不需要另外選兩套分類。

## 啟動

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/setup.ps1; & ([scriptblock]::Create($s))'
```

Linux／macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/setup.sh | bash
```

Windows 使用 PowerShell 5.1 或 PowerShell 7；Linux／macOS 使用 Bash 3.2 以上。一般安裝不需要 Node.js，也不需要管理員或 `sudo`。遠端安裝需要網路；Bash 需要 `curl`、`tar`、`awk`、`sort` 和 SHA-256 工具。

若在 OpenCode 啟用主動委派，而且需要合併既有 JSON 設定，Bash 後端會使用 Python 3 或 Node.js 解析設定。沒有可用解析器時會在預檢停止，並提示手動設定方式。

## 選單流程

1. **環境**：`1` Codex、`2` Claude Code、`3` Cursor、`4` GitHub Copilot、`5` OpenCode。Enter 預設 Codex；`6` Project (all platforms) 可選跨平台專案安裝。
2. **範圍**：`1` User global 或 `2` Current project，Enter 預設全域。跨平台 Project 選項直接使用專案範圍。
3. **專案目錄**：選專案後立即確認路徑；Enter 使用啟動命令時的目前目錄。安裝器不會自行改成 Git 根目錄。
4. **安裝方式**：`1` 全部、`2` 指定用途分類，Enter 預設全部。全部包含完整來源目錄的 **237 個 Agents 與 286 個 Skills**，並跳過分類選單。
5. **用途分類**：指定模式提供同一張分類選單，可用逗號或空白多選，例如 `1,2`。重複選項會合併；空白或 `0` 無效，全部安裝在上一層選擇。
6. **主動委派選配**：全域 Codex／OpenCode 可另外啟用主動委派；預設不啟用。專案安裝不修改全域委派設定。
7. **完整預覽與預檢**：一次列出 Agent、Skill、加入原因、實際目的地及數量。共享 Skills 去重，所有目的地先預檢。
8. **確認安裝**：只有明確輸入 `y` 才寫入。輸入 `n` 或 Enter 取消。

選單可用 `q` 取消。無效輸入最多重試三次；輸入結束（EOF）會停止。取消、EOF、來源或預檢錯誤都不會開始安裝。

例如要在一個 Codex 專案裝畫圖與程式開發：

```text
環境             → Codex
範圍             → Current project
專案目錄         → D:\projects\my-project
安裝方式         → 指定用途分類
用途分類         → 畫圖與圖像處理 + 程式開發
預覽             → Skills、Agents、必要依賴與目的地
確認             → y
```

## 15 個用途分類

以下數量是分類直接指定的成員。實際預覽還會加入 Agent 配套與 Skill 必需依賴，多選後會合併重複項目。

| 用途 | ID |
| --- | --- |
| 畫圖與圖像處理 | `image-graphics` |
| 程式開發 | `software-development` |
| 網頁與介面設計 | `web-interface` |
| 測試與程式審查 | `testing-review` |
| 資料庫與資料分析 | `data-analysis` |
| AI 與 LLM | `ai-llm` |
| 雲端部署與維運 | `cloud-operations` |
| 資安與治理 | `security-governance` |
| 影片與音訊製作 | `video-audio` |
| 文件與辦公 | `documents-office` |
| 研究、需求與專案規劃 | `research-planning` |
| 寫作與商務營運 | `writing-business` |
| 行動、桌面與嵌入式開發 | `mobile-desktop-embedded` |
| 3D 與互動圖形 | `threejs-graphics` |
| Agent、Skill 與自動化工具 | `agent-automation` |

分類來源是 [install-bundles.json](../scripts/data/install-bundles.json)。驗證要求所有 Skills 與 Agents 至少屬於一個用途，包含目前沒有 Agent 關聯的 Skills。原有 16 個 Skill 分類、31 個 Agent 分類仍提供進階命令使用。

有 Node.js 時也可查詢：

```bash
node craftroster-cli.js bundles
node craftroster-cli.js bundles image-graphics
```

## 配套如何補齊

用途分類直接指定的 Agent 與 Skill 都會安裝。接著依 Agent 的關聯補齊：

| 關聯 | 預設配套安裝 |
| --- | --- |
| `required` 必需 | 加入；不能用排除建議的選項移除 |
| `recommended` 建議 | 加入 |
| `conditional` 條件式 | 不自動加入；有適用情境時明確選擇 |
| `optional` 選配 | 不自動加入；需要時明確選擇 |

每個被選中的 Skill 還會遞迴補齊自己的 `required` 依賴。選到 Skill 不會反向拉入所有使用它的 Agents。若條件式或選配 Skill 本身就是所選用途的直接成員，仍會因為分類選擇而安裝。

選擇全部 Agents，或啟用全域主動委派時，會沿用既有規則加入 `subagent-architecture`。全部安裝本來就涵蓋它。

## 安裝位置與執行環境

Codex 的預設位置：

| 範圍 | Skills | Agents |
| --- | --- | --- |
| 全域 | `$CODEX_HOME/skills`，未設定時 `~/.codex/skills` | `$CODEX_HOME/agents`，未設定時 `~/.codex/agents` |
| 專案 | `<project>/.agents/skills` | `<project>/.codex/agents` |

選擇單一平台的專案安裝，只產生該平台使用的檔案。Project (all platforms) 會產生跨平台檔案，預覽會顯示每個實際目的地。其他環境的路徑見 [README 安裝位置](../README.md#支援平台與安裝位置)。

安裝後，宿主需重新整理或重啟以發現新內容。工具、帳號與 API 權限由宿主及使用者設定提供，安裝檔案不會自動授予服務權限。

Codex 會先發現 Skill 的 metadata，選用時才讀完整內容；子代理未另設 `skills.config` 時繼承父代理的 Skill 設定。[Codex Skill 文件](https://learn.chatgpt.com/docs/build-skills)、[Codex 子代理文件](https://learn.chatgpt.com/docs/agent-configuration/subagents)。

Claude Code 的原生 `skills` 欄位會預載完整 Skill，因此產生器只將真正必需的 Skill 寫入這個欄位。建議、條件式及選配關聯寫入角色指引，執行時按需發現和使用；未列入預載清單的可用 Skills 仍可透過 Skill 工具使用。[Claude Code 子代理文件](https://code.claude.com/docs/en/sub-agents#preload-skills-into-subagents)。

## 既有檔案保護

Wrapper 只下載一次來源 archive，預覽與正式安裝使用同一份快照。確認之前，安裝器已對整份 Agent、Skill 與委派設定計畫完成預檢。

既有 ownership、來源及內容 digest 保護持續適用。使用者檔案或被修改的已安裝內容會阻擋覆寫；`Force`／`--force` 是明確覆寫選項，會傳入後端。正常重新安裝不會刪除其他分類、共用內容或未選項目。

寫入期間每個套件有個別還原措施；整個計畫不是單一交易。若途中失敗，會列出已完成與待安裝項目，先前完成的套件會保留，修正原因後可重試。

## 本機與進階用法

使用目前 checkout，不下載遠端來源：

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -File scripts/setup.ps1 -SourceDir .
```

```bash
bash scripts/setup.sh --source-dir .
```

Wrapper 仍支援來源、分支、目的地、dry-run 與 force 選項，完整參數見 `-Help`／`--help`。全域配套模式指定自訂安裝目錄時，Skill 資料夾和 Agent 檔案都直接寫到該目錄；專案模式的目錄則是專案根目錄。

無互動的指定分類預覽：

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -File scripts/install.ps1 -SourceDir . -Target project -ProjectPlatform codex -InstallDir 'D:\projects\my-project' -Type bundle -Bundle 'image-graphics,software-development' -DryRun
```

```bash
bash scripts/install.sh --source-dir . --target project --project-platform codex --dir ./my-project --type bundle --bundle image-graphics,software-development --dry-run
```

`Type bundle`／`--type bundle` 預設選 `all`，不可同時指定 Name 或舊 Category。其 Agent Skill policy 預設是 `recommended`；`required` 可只補必需關聯，分類直接成員仍會保留。配套模式拒絕 `legacy` policy。

原有 `Type agent`／`--type agent` 命令省略 policy 時維持 `legacy` 行為。想完整配套，可指定 `-AgentSkillPolicy recommended`／`--agent-skill-policy recommended`；`required` 可只補必需 Skill。舊 Skill 單獨安裝與來源分類命令仍可使用。

`-AgentSkillInclude`／`--agent-skill-include` 只接受所選 Agents 有宣告的 Skill 關聯，可用來補條件式或選配 Skill。`-AgentSkillExclude`／`--agent-skill-exclude` 只移除建議關聯的加入原因；用途直接成員、其他 Agent 的必需關聯或 Skill 必需依賴都會保留。未宣告名稱、無效排除或未知分類會在寫入前拒絕。

## 常見問題

- **命令以 pipe 啟動，選單沒有輸入**：Bash Wrapper 會從控制終端讀答案，需在互動式終端執行。CI 使用後端的非互動參數；Wrapper 遇到 EOF 不會自動同意。
- **來源沒有配套索引，或後端不支援新參數**：安裝器會在呼叫後端前停止。改用同一版本的完整 checkout 或較新的來源，不會回退成看似成功的舊流程。
- **索引內容有重複、未知名稱或沒有涵蓋完整來源**：安裝前拒絕。不要手動編輯 TSV；修正 canonical Agent 或分類 JSON 後執行 `npm run generate:agents`，再 `npm run validate`。
- **預檢發現檔案衝突**：先查看顯示的路徑及原因；需要覆寫時再使用 force。
- **臨時目錄清理**：Wrapper 只清理自己建立的下載目錄，不會刪除傳入的 SourceDir。
