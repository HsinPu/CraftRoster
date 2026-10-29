# 跨平台介面品質 Skills：分類研究

研究日期：2026-10-29。範圍為既有網頁、Windows／macOS 桌面軟體及手機介面的診斷與改善；先研究 Impeccable，不包含其他候選工具。本文是提案，尚未新增 Skill、安裝分類、上游 engine 或 hook。

## 建議放在哪一組

建議規劃一個共用用途分類：**「介面設計檢查與優化」`interface-quality`**。它負責「檢查既有介面、指出問題、實際修整」，可供各平台共用；原本的網頁／行動桌面開發分類仍負責各自的實作技術。

如果實作這項提案，用途分類會由目前 15 類增加為 16 類；本次研究維持現況。建議第一版建立一個 `ui-improvement` 總入口，內含三種模式與分平台 references，而非立即複製成多套近似的 Skills。

| 使用者需求 | 現有用途群組 | 建議的新共用關係 | 檢查重點 |
|---|---|---|---|
| 網頁、手機版網頁、PWA | `web-interface` | 共用 `interface-quality` 入口 | DOM、鍵盤焦點、響應式、主題、元件狀態與瀏覽器實測 |
| Windows／macOS Electron 桌面軟體 | `mobile-desktop-embedded`，renderer 涉及網頁時加 `web-interface` | 共用入口，結合桌面外殼分支 | 網頁 renderer 與視窗、選單、快捷鍵、IPC 的不同責任 |
| Tauri 等 WebView 桌面軟體 | 最接近 `mobile-desktop-embedded` | 同樣依 WebView 與桌面整合分支 | 不因同樣使用 HTML 就套用 Electron 的 main/preload/IPC 合約；目前沒有專用 Tauri Skill |
| Windows 原生介面：WinUI、WPF 等 | `mobile-desktop-embedded` | 新增 Windows 原生檢查 references | 平台控制項、鍵盤操作、DPI／文字縮放、主題、視窗與輔助工具 |
| macOS 原生介面：AppKit、macOS SwiftUI 等 | `mobile-desktop-embedded` | 新增 macOS 原生檢查 references | 視窗、選單列、快捷鍵、不同輸入方式與 VoiceOver；不能當成大版 iPhone |
| iOS／Android、Flutter／React Native App | `mobile-desktop-embedded` | 使用對應手機平台 references 與框架條件配套 | 系統返回／手勢、觸控、字體縮放、安全區域、鍵盤遮擋與裝置實測 |
| 只審查、不修改程式 | `testing-review` | 只暴露 review／audit 路由 | 報告問題與證據，不因審查而自動修改 |

這裡的 Windows／macOS／iOS／Android 是**被開發產品的目標平台**。安裝選擇器的 Codex／Claude／Cursor 是**使用 Skills 的 AI 工具環境**，兩個維度不應混成同一份選單。

## 現有能力與真正缺口

| 現有項目 | 已有能力 | 邊界與缺口 |
|---|---|---|
| [`frontend-design-review`](../skills/frontend-design-review/SKILL.md) | 已有 experience critique、production audit、polish 三種審查視角 | 預設唯讀，內容偏網頁；不能當成已實作跨平台 polish |
| [`frontend-design`](../skills/frontend-design/SKILL.md) | 既有網頁 UI 的實作與驗證入口 | 適用真正的 web／renderer 工作，不能因為 native app 也是 UI 就要求使用 |
| [`desktop-development`](../skills/desktop-development/SKILL.md) | Electron 外殼、視窗、preload、IPC 與桌面整合 | 不是通用 WinUI／WPF／AppKit 指南 |
| [`swiftui-development`](../skills/swiftui-development/SKILL.md) | iOS SwiftUI 狀態、導覽、無障礙與實測 | 現有契約以 iOS／UIKit 為主，不能直接宣稱已覆蓋 macOS／AppKit |
| [`flutter-development`](../skills/flutter-development/SKILL.md)、[`react-native-expo`](../skills/react-native-expo/SKILL.md) | 對應行動框架的實作 | 應依實際技術選用，不強迫安裝兩套框架 |
| [`accessibility-testing`](../skills/accessibility-testing/SKILL.md)、[`mobile-app-testing`](../skills/mobile-app-testing/SKILL.md) | 輔助科技／裝置與生命週期驗證 | 應明確記錄實際 OS、裝置、工具與未執行部分 |
| [`ui-styling`](../skills/ui-styling/SKILL.md) | React、shadcn、Radix、Tailwind 的具體樣式工作 | 不適合作為所有原生平台的必需依賴 |

專案在 [既有視覺設計來源紀錄](visual-design-skill-sources.md) 已研究過 Impeccable。這次的增量應是共用路由、原生平台規則和可執行的改善流程，而不是把同一份網頁 review 換三個名字。

## 三種模式怎麼分工

| 模式 | 主責 | 修改權限 | 交付 |
|---|---|---|---|
| `critique` | 使用流程、資訊層級、視覺一致性、品牌與介面清晰度 | 不修改產品程式 | 有證據的優先問題，區分觀察與主觀判斷 |
| `audit` | 可及性、主題、狀態、輸入、平台行為及實測效能 | 不修改產品程式 | 位置、影響、嚴重程度、修正方向與未驗證部分 |
| `polish` | 在既有方向下修正間距、字體、對齊、互動與狀態 | 使用者要求改善的範圍內可實作 | 實際差異、修改前後證據、功能與平台回歸 |

三者可依需求單獨進入，不強制每次串完三步。已有清楚改善授權就沿用；只要求 critique／audit 不等於要求重設計。既有品牌、正式文案與平台慣例是約束，不能因為反對「AI 模板感」就換掉系統字體或原生控制項。

## Impeccable 的實際範圍與來源

固定研究版本：[`5e745ace7e151feb2a93d360d0281fe39448b857`](https://github.com/pbakaus/impeccable/tree/5e745ace7e151feb2a93d360d0281fe39448b857)，tree `43e7d9e1e4e59f4354c0e55e6ffd4d4f6925c03c`。以下是直接讀取的上游來源，不代表已安裝或執行上游。

| 上游檔案 | 核對結果 | Blob |
|---|---|---|
| [`skill/SKILL.src.md`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/skill/SKILL.src.md) | 一個總 Skill、24 個命令；指定 web 與 iOS／Android；啟動器可載入上下文 | `2aedc373dc6834d11a823816fac6696f47af4bfe` |
| [`audit.native.md`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/skill/reference/audit.native.md) | 原生分支明確為 iOS／Android／adaptive，不執行 web detector | `b158b602f0d79367487d0012c745a6317499fa9b` |
| [`critique.md`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/skill/reference/critique.md) | 設計評估；區分原生與網頁 detector 證據 | `03acd2f77a484abb736fd4f8230bc3bc78503565` |
| [`polish.md`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/skill/reference/polish.md) | 在既有設計方向內實際改善，並核對渲染及互動 | `f2146990505863574e3c8298613a37d4c31ee73c` |
| [`ios.md`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/skill/reference/ios.md)、[`android.md`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/skill/reference/android.md) | 分開原生控制項、字體／主題、系統行為及 simulator／emulator 證據 | iOS `bff06b2a3ccd029930be7df19794bb20aa02be26`；Android `e0f1c175a9e3bc5eb5fa1568e6939d1b903a7bab` |
| [`impeccable.cmd`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/skill/scripts/impeccable.cmd) | 可尋找／下載與驗證 engine；Windows 啟動器不等於原生 Windows App 品質規則，且該版本註明其測試仍以解析／字串檢查為主 | `5f2039ec9ed66a899809b3becdc660089b68fa7f` |
| [`LICENSE`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/LICENSE)、[`NOTICE.md`](https://github.com/pbakaus/impeccable/blob/5e745ace7e151feb2a93d360d0281fe39448b857/NOTICE.md) | 根目錄 Apache-2.0；iOS／Android 指引另有 ehmo/platform-design-skills 的 MIT 來源通知 | LICENSE `bb3f6d23b1f8025514a62a12b51b47d73e3c9aa9`；NOTICE `0468271c904ae334cfaf27da6f8df3d5f419a1f0` |

網站的 [critique](https://impeccable.style/docs/critique/)、[audit](https://impeccable.style/docs/audit/)、[polish](https://impeccable.style/docs/polish/) 文件與該模式分工一致。網站內容會更新；來源採用與未來實作仍應綁定明確版本。

在已閱讀的 entry／native references 中，沒有專用 Windows／macOS 原生分支，這兩個是本次整合的明確缺口。上游的 Windows/macOS **執行環境支援**和被檢查產品的**目標介面支援**必須分開。名稱含 `native capture` 的上游文件也涉及瀏覽器原生擷取，不能據此推論 WPF／AppKit 支援。

## 建議的安裝與配套設計

1. `ui-improvement` 先自帶模式與平台參考，能獨立進行診斷，不 required 全部框架。工作開始時辨識「模式＋目標平台＋UI 技術＋可用證據」。
2. 網頁實作才條件選用 `frontend-design`／CSS／框架；原生手機才選 SwiftUI／Flutter／React Native 等配套。Windows／macOS 原生指引是待補項，不能以改名方式宣稱完成。
3. 現有 `frontend-design-review` 保留為網頁審查主責；共用入口路由過去，避免再複製其整套 checklist。未來若拆出 `ui-critique`／`ui-audit`／`ui-polish`，先證明各自有獨立成果、資源或安裝價值。
4. 新 `interface-quality` bundle 只包含品質工作流及適當共用角色；Web／mobile-desktop bundle 亦可直接列入共用入口並按目的地去重。`testing-review` 只加入診斷主責與唯讀關聯。
5. `ui-visual-validator`、`ui-ux-designer` 可作審查／設計配套，平台實作再選 `frontend-developer`、`electron-pro`、`ios-developer`、`mobile-developer`、`flutter-expert`、`csharp-pro` 等現有角色。它們目前部分 recommended 配套偏 web；加入跨平台 bundle 前須改為合理的條件關聯，避免裝原生 UI 品質時帶入整套網頁實作。C# 角色存在不等於已有 WinUI／WPF 專門能力，亦不把 `ios-developer` 冒充 macOS 專家。
6. Skill taxonomy 與用途 bundle 分開維護。若共用入口放入目前 web 定義的 `frontend-design`，需先擴充其名稱／描述為跨平台介面設計；網頁唯讀審查仍屬 `testing-quality`，平台實作仍屬 `mobile-desktop`。這不必另外增加來源分類。

## 採用方式與驗證門檻

建議先採**可追溯的工作指引改寫＋沿用既有 Skills**。不把上游的 engine、hook、瀏覽器 extension 與 telemetry 一起默認裝入。它們不是 critique／audit／polish 概念的必要前提，且完整上游部署有不同的資源、下載、設定與更新責任。若未來需要 deterministic detector／live 功能，另列可選完整整合並驗證實際行為。

- 引用／改寫須保留適用授權與 NOTICE，正式新增 Skill 時再加入來源 manifest／lock 及安裝資源測試。本次沒有把「僅研究的來源」加入已採用 Skill 的 manifest。
- Windows 原生規則應對照 [Microsoft Windows app design／Fluent](https://learn.microsoft.com/en-us/windows/apps/design/)，macOS 對照 [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)，手機對照 [iOS HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios) 與 [Android design](https://developer.android.com/design/ui)。適用規則應由實際框架、OS、設備能力與已確認品牌決定，不整本照搬。
- 分開驗證唯讀診斷、已授權 polish、品牌保留、局部修改、狀態完整性、平台錯配與缺少 runtime 的誠實回報。網頁 DOM／截圖不代替原生 App 的裝置、視窗、輔助科技與互動證據。
- 加入獨立安裝、必要依賴閉包、用途去重、更新／ownership、相關 Agents 與不觸發無關後端／IPC 工作的測試。

本次完成的是來源、既有能力與分類研究，未執行 upstream installer、engine、detector、hook 或任何被審查 App，亦不宣稱原生平台能力已實作。
