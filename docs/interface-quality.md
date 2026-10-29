# 跨平台介面檢查與改善

`ui-improvement` 是既有介面的共用入口：先識別產品平台及框架，再依要求診斷或修改。它參考 Impeccable 的 critique／audit／polish 思路，保留專案原有品牌、架構與使用者資料，並加入原生 Windows／macOS／iOS／Android 的具體修改規則。

## 選用方式

| 想完成的事 | 模式 | 交付 |
|---|---|---|
| 找出為什麼不好用或不好看 | critique | 分層、流程與視覺一致性的優先問題，不改產品原始碼 |
| 查出具體技術缺陷 | audit | 位置、觸發條件、影響、證據與修正方向，不改產品原始碼 |
| 直接修正、改善細節 | polish／fix | 實際 source diff、影響狀態與驗證結果 |

例如：「用 ui-improvement audit 這個 WPF 設定視窗，先不要改程式。」或「幫我修正 iOS 表單被鍵盤擋住的問題，保留目前配色、字體和資料綁定。」已清楚要求修正時，可直接完成範圍內的修改。

主 Agent 能直接使用 Skill；需要委派時，由 `ui-improvement-engineer` 執行授權修改。`ui-ux-designer` 與 `ui-visual-validator` 保持唯讀，只交付診斷或驗證結果。分類安裝與模式名稱不會擴張執行權限。

## 平台規則與修改範圍

| 目標 | 規則與實際修改 |
|---|---|
| 網頁／手機版網頁 | 元件、CSS、語意、焦點、主題與狀態；沿用 `frontend-design-review` 和 `frontend-design` 的責任 |
| Windows WinUI／WPF | XAML 配置、文字與 DPI、命令／焦點、資源、Automation 與列表狀態 |
| macOS AppKit／SwiftUI | 視窗／Scene、constraints、menu／responder、焦點、外觀與 VoiceOver 語意 |
| iOS SwiftUI／UIKit | Dynamic Type、布局、安全區域、鍵盤、導航與可及性 |
| Android Compose／Views XML | Kotlin／XML 配置、insets／IME、Back、生命週期、字級與 TalkBack 語意 |
| Flutter／React Native | 對應框架修改及 iOS／Android 行為；原生驗證不能以 web preview 代替 |
| Electron／Tauri | Web renderer／WebView 與 Windows／macOS 外殼分別處理；不混用兩套 shell API |

入口只載入相關 references。WinForms、Qt/PySide、Avalonia、MAUI、Flutter desktop、RN Windows/macOS 尚未具備本套專屬修復配方及驗收案例，不能直接沿用其他框架的通過結果。

## 安裝及配套

原本的一行[互動安裝](../README.md#互動式安裝)不變：選環境 → 全域／專案 → 指定用途 → **跨平台介面檢查與改善**。這是第 16 個用途分類，ID 為 `interface-quality`。

| 分類 | 直接加入的內容 |
|---|---|
| `interface-quality` | `ui-improvement`；`ui-improvement-engineer`、`ui-ux-designer`、`ui-visual-validator` |
| `web-interface` | 加入 `ui-improvement`，並直接保留原本透過角色配套取得的 `frontend-design-review`、`visual-regression-testing` |
| `mobile-desktop-embedded` | 加入 `ui-improvement` 與實作 Agent，保留原有框架角色 |
| `testing-review` | 加入 `ui-improvement`；不因此加入實作 Agent 或允許唯讀角色寫檔 |

預設推薦策略下，共用分類的最終計畫是 **2 個 Skills**（共用入口與設計角色的 `ux-writing`）及 **3 個 Agents**。多選用途會去重。單裝 `ui-improvement` 沒有必需的其他 Skill。

以下為本機 checkout 的 Codex 專案安裝預覽，不修改全域設定：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install.ps1 -SourceDir . -Target project -ProjectPlatform codex -Type bundle -Bundle interface-quality -DryRun
```

```bash
bash scripts/install.sh --source-dir . --target project --project-platform codex --type bundle --bundle interface-quality --dry-run
```

確認目的地後移除 `-DryRun`／`--dry-run` 才安裝。單顆改用 `-Type skill -Name ui-improvement`／`--type skill --name ui-improvement`。更新沿用相同選取和目的地；安裝器先檢查 ownership，遇到本機修改或額外檔案會拒絕覆寫。

框架或測試 companions 都是條件關係，包括 web review／implementation、Electron、iOS SwiftUI、Flutter、RN、iOS 架構／Swift concurrency、accessibility／mobile／web visual testing。依當前任務選取，不會因安裝共用入口而全部下載。缺少選用配套時仍可依內附規則完成可獨立處理的部分；不可虛構配套執行或平台驗證。

## 來源與授權

固定研究來源：[pbakaus/impeccable](https://github.com/pbakaus/impeccable/tree/5e745ace7e151feb2a93d360d0281fe39448b857)，commit `5e745ace7e151feb2a93d360d0281fe39448b857`，Apache-2.0。已記錄 commit、tree、逐檔 blob 與 license evidence；Skill 內含上游授權及來源通知。

參考的是既有設計背景、設計診斷、原生技術稽核與修改驗證流程；本套重新撰寫平台分流、權限、獨立安裝及原生修復規則。未帶入上游 engine、launcher、detector、hooks、telemetry 或 browser extension。平台 API 依 Microsoft／Apple／Android 等官方文件核對，使用時仍須符合專案的 SDK、OS 與框架版本。

詳細通知見 [`upstream-notice.md`](../skills/ui-improvement/references/upstream-notice.md)，原始規劃見[設計決策](interface-quality-skill-plan.md)。

## 驗證範圍

本套包含 35 個成果案例、154 個 assertions 與 24 個路由案例。8 個原生 platform×framework 分支各有診斷、修改及縮放／主題／可及性案例，另有 web、Flutter／RN／Electron／Tauri、唯讀、缺少配套及平台錯配案例。Fixtures 是原創的部分程式輸入，**不是完整可建置應用**。

`npm run test:interface-quality` 以隔離目的地驗證實際互動安裝、五環境 adapters、原網頁配套、去重及更新保護；CI 在既有 Windows PowerShell、Linux 與 macOS Bash jobs 執行。`--definitions` 只檢查目錄及 adapter 契約。這些測試不等於 native app 執行。

模型修改案例、來源檢查、實際 build、操作、原生截圖、讀屏與效能需分開記錄。平台沒有 SDK、裝置或執行環境時，可以改 source，但該平台的 build／runtime 仍未驗證。當次實作的已執行檢查與保留限制見[驗證紀錄](audits/interface-quality-2026-10-29/README.md)。
