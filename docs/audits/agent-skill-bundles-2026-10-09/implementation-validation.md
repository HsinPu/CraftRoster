# 配套安裝實作與驗證

日期：2026-10-09。實作基準：`26d01851f1a000ad71f3c003bbe36f71e0397cfe`。

## 交付內容

單一互動入口依序選環境、全域／專案、專案路徑、全部／指定用途。指定模式只選一次用途，可複選；同一次預覽、預檢和確認包含 Skills、Agents 與必要依賴。

15 個用途完整覆蓋 237 個 Agents 與 286 個 Skills。969 筆原有角色關聯經審核後移除 70、補入 68，最終 967 筆：必需 5、建議 387、條件式 530、選配 45。分類直接成員固定加入，預設補必需與建議，條件／選配需要明確選取。Skill 必需依賴遞迴展開，共享內容按目的地去重。

- [GitHub 安裝說明](../../../README.md#快速開始)
- [完整互動與進階用法](../../interactive-installation.md)
- [關聯與用途審核](README.md)
- [原始規劃](../../agent-skill-bundled-installation-plan.md)

## 維護來源

`agents/<role>.md` 的結構化 `skill-dependencies`、`scripts/data/install-bundles.json` 是正式維護來源。共用 parser 和 generators 產生 adapters、相容的 `agents.json.skills`、新的 `skillDependencies`、用途與 Agent 關聯 TSV。安裝後端只讀 TSV，不需 Node.js。

五個平台 adapters 都有依情境使用 Skills 的指引。Claude 原生預載欄位只包含必需 Skill；其他關聯不會被當成強制預載。非法 canonical metadata 會在清除舊 adapters 前拒絕，避免失敗重建留下不完整輸出。

既有單顆／來源分類命令、全域與單平台專案位置、ownership、digest、Force、舊品牌升級及委派設定保護保持相容。更新不刪除未選分類或共用內容；個別套件復原不等於整批回滾。

## 本機已完成檢查

| 檢查 | 實際結果 |
| --- | --- |
| `npm run generate:agents` | 成功產生 237 個角色的五平台 adapters、catalog 和 15 類索引 |
| `npm run validate` | catalog、contracts、來源 manifest、coverage、生成索引 freshness 全部通過 |
| `npm run test:install-bundles` | 8 個案例通過：metadata、完整覆蓋、索引 stale、相容欄位、五平台輸出及失敗保留 |
| `npm run test:cli` | 57 個案例通過 |
| `npm run test:catalog` | 5 個案例通過 |
| `npm run test:install-categories` | 4 個案例通過 |
| `npm run test:skill-dependencies` | 55 個案例通過 |
| `npm run test:package` | 2734 個檔案、74 個 entrypoints、13 個 manifests；封裝依賴完整 |
| PowerShell 7 原有依賴 smoke | 必需 closure、條件／選配、ownership、placement、非法索引全部通過；此 focused 執行未跑其餘 smoke |
| 原生 Linux Bash 5.2.15 | 畫圖 backend 和 wizard 實裝／重裝 2 Agents + 7 Skills；中文及空格專案路徑通過 |
| 原生 Linux 全部 dry-run | 237 Agents + 286 Skills；目的地未建立 |
| 原生 Linux 無 Node 驗證 | `PATH=/usr/bin:/bin`，確認沒有 Node／Python／Python 3，配套實裝與預覽仍成功 |
| Linux 原有 `smoke-install.sh --quick` | 隔離來源、全域平台矩陣、ownership、digest、rollback、race、委派通過；Node 22.23.3 僅用於 test harness |
| PowerShell 5.1／7 個別自測 | parser 無錯；16 個配套案例、8 個來源能力 AST 檢查通過；真實 catalog 預覽和中文選單通過 |
| PowerShell 5.1／7 正式互動整合 | 各自完整 28 個案例通過、零跳過；另各自 1 個中途故障案例通過，共 29 個不同案例 |
| 中途故障復原 | 已完成 base 保留、失敗 alpha 更新回復原內容與 ownership、Agent 留待安裝；Windows／Linux Bash 個別 6 個情境通過，原始失敗碼保留 |
| 獨立程式審查 | elevated review；問答、argv、計畫、配套策略、索引和 EXIT／cleanup 無 actionable findings |
| Linux 正式互動整合 | 33 個不同案例通過、零跳過（完整執行的前 26 個，加 parser 修正後補驗的 7 個） |
| Linux 真實 PTY | 4 個 pipeline／控制終端案例實際執行並通過：腳本完整、q、EOF、Ctrl+C |
| Windows Git Bash 正式互動整合 | 29 個不同案例分批通過（26 個一般案例 + 最後版本 3 個補驗）；Windows 跳過 1 組 POSIX PTY，4 個情境由原生 Linux／macOS 驗證 |

整合 fixture 使用獨立使用者與專案目錄，未安裝到實際使用者設定。Linux 使用已有映像的無網路、唯讀 repository、`--rm` 容器；已確認自己的容器移除，未拉映像或修改既有 volumes。

Git Bash 分批程序最後在舊版中途故障報告 parser 的 assertion 停止；修正 parser 後，該案例與 remote／no-TTY 案例已用最後版本單獨通過。沒有把舊程序的 exit 1 記為完整 suite 成功。最初 90 秒 timeout 發生於 Windows fork／digest／owned update 成本；26 個一般案例後續均在較嚴的 300 秒上限內通過。最終 test harness 僅將 Windows Bash 安裝 budget 設為 600 秒，其他 Bash 平台仍為 90 秒，EOF／probe 界限沒有放寬。專用暫存和自己的 Bash 程序均已清理。

## GitHub 跨平台驗證

功能提交：`8342206137233db2c6da8c58593574687f32f9ac`。[CI 37929602368](https://github.com/HsinPu/CraftRoster/actions/runs/37929602368) 驗證該提交：9 個 jobs 中 8 個成功、1 個既有遠端來源閘門失敗。下表不以本機結果代替 CI 結果；後續補驗提交只更新本報告，安裝程式與生成索引維持此功能提交的內容。

| Job | 實際結果 |
| --- | --- |
| Node 22／24 runtime | 兩個 jobs 通過，包含新配套、既有依賴、CLI、catalog 與 package tests |
| catalog | 通過 |
| Legacy Skill digest history | 通過 |
| Ubuntu Bash | 通過；Bash 5.2.21，原有完整 smoke 驗證 286 Skills／237 Agents，互動 33 個不同案例、零跳過，包含 4 個真實 PTY 情境 |
| macOS Bash | 通過；`/bin/bash` 3.2.57，互動 33 個不同案例、零跳過，包含 4 個真實 PTY 情境；quick smoke 與注入故障傳遞通過 |
| macOS 從 GitHub 遠端實裝 | 通過；隔離 HOME，實裝 286 Skills、237 Agents，啟用 Codex 委派；沿用進階單類型指令 |
| Windows PowerShell 5.1 | 通過；5.1.26100.33438，29 個互動案例、零跳過，原有完整 smoke 驗證 286 Skills／237 Agents，Windows executor／holdout 檢查通過 |
| Windows PowerShell 7 | 通過；7.6.6，29 個互動案例、零跳過，原有完整 smoke 驗證 286 Skills／237 Agents，ownership、遷移及委派回歸通過 |
| Pinned source integrity | 失敗；Agent 上游 commit API 三次回傳 301，後續遠端來源／原創性步驟未執行 |

上游 `supatest-ai/awesome-claude-code-sub-agents` 的 commit `85d8ceac2fdfee5f27a3d3f38d83e925b4c6bd6d` API 在本次 CI 及上一個基準提交的 [CI 37913553970](https://github.com/HsinPu/CraftRoster/actions/runs/37913553970) 都回傳 301。這是既有遠端來源檢查問題，本次未修改來源查核或放寬 provenance 閘門；不把整個 CI 記為全綠。

等待 PowerShell 5.1 時另做唯讀審查：`smoke-install.ps1` 與基準相同，未指定配套策略的舊 Agent 入口仍使用 `legacy`，沒有進入新配套遍歷。EOF、重試上限、stderr 排空和退出碼檢查未發現新的無限等待或吞錯路徑。此審查不替代測試；最後以 CI 的完整 smoke 成功結果結案。

## 證據範圍

這些檢查證明檔案安裝、計畫展開、產物一致性與相容保護。沒有執行收費模型或以五個宿主實際呼叫每個 Skill；API key、外部服務授權及模型工作成果不由檔案安裝測試證明。

原創性／provenance 遠端閘門的成功與否另外記錄；本機 manifest 通過不能代替上游查核。
