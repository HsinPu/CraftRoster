# 跨平台介面品質 Skills：分類與實作規劃

研究與規劃日期：2026-10-29。範圍為既有網頁、Windows／macOS 桌面軟體及 iOS／Android 介面的診斷、原始碼修改與驗證；沿用已研究的 Impeccable。本文保留當時的設計方案與完整驗收要求。

實作狀態：1.2.0 已加入 `ui-improvement`、`ui-improvement-engineer` 與第 16 個用途分類 `interface-quality`；最新能力及配套以[使用指南](interface-quality.md)為準。下文的「建議／待實作」是規劃時語境，不是當前安裝狀態。完整 native build／runtime 矩陣尚未執行，不能因規則及案例已加入而視為平台實測完成；實際證據另見[驗證紀錄](audits/interface-quality-2026-10-29/README.md)。未引入上游 engine 或 hooks。

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
| 只審查、不修改程式 | `testing-review` | 診斷模式搭配唯讀角色 | 安裝群組不是權限邊界；由任務意圖、Agent 與工具權限維持唯讀 |

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
4. 新 `interface-quality` bundle 包含共用入口及明確分工的診斷／實作角色；Web／mobile-desktop bundle 亦直接列入共用入口並按目的地去重。`testing-review` 不加入新實作角色；同一 Skill 安裝於該群組時仍必須依本次模式與角色權限控制行為。
5. `ui-visual-validator`、`ui-ux-designer` 可作審查／設計配套，平台實作再選 `frontend-developer`、`electron-pro`、`ios-developer`、`mobile-developer`、`flutter-expert`、`csharp-pro` 等現有角色。它們目前部分 recommended 配套偏 web；加入跨平台 bundle 前須改為合理的條件關聯，避免裝原生 UI 品質時帶入整套網頁實作。C# 角色存在不等於已有 WinUI／WPF 專門能力，亦不把 `ios-developer` 冒充 macOS 專家。
6. Skill taxonomy 與用途 bundle 分開維護。若共用入口放入目前 web 定義的 `frontend-design`，需先擴充其名稱／描述為跨平台介面設計；網頁唯讀審查仍屬 `testing-quality`，平台實作仍屬 `mobile-desktop`。這不必另外增加來源分類。

## 採用方式與驗證門檻

建議先採**可追溯的工作指引改寫＋沿用既有 Skills**。不把上游的 engine、hook、瀏覽器 extension 與 telemetry 一起默認裝入。它們不是 critique／audit／polish 概念的必要前提，且完整上游部署有不同的資源、下載、設定與更新責任。若未來需要 deterministic detector／live 功能，另列可選完整整合並驗證實際行為。

- 引用／改寫須保留適用授權與 NOTICE，正式新增 Skill 時再加入來源 manifest／lock 及安裝資源測試。本次沒有把「僅研究的來源」加入已採用 Skill 的 manifest。
- Windows 原生規則應對照 [Microsoft Windows app design／Fluent](https://learn.microsoft.com/en-us/windows/apps/design/)，macOS 對照 [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)，手機對照 [iOS HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios) 與 [Android design](https://developer.android.com/design/ui)。適用規則應由實際框架、OS、設備能力與已確認品牌決定，不整本照搬。
- 分開驗證唯讀診斷、已授權 polish、品牌保留、局部修改、狀態完整性、平台錯配與缺少 runtime 的誠實回報。網頁 DOM／截圖不代替原生 App 的裝置、視窗、輔助科技與互動證據。
- 加入獨立安裝、必要依賴閉包、用途去重、更新／ownership、相關 Agents 與不觸發無關後端／IPC 工作的測試。

本次交付為來源研究與實作規劃，未執行 upstream installer、engine、detector、hook 或任何被審查 App，亦不宣稱原生平台能力已實作。

## 第一版的明確交付範圍

建議新增 **1 個 Skill＋1 個實作子代理＋1 個用途群組**，將平台規則放在按需載入的 references，保留既有網頁及框架專項。全部採納並實作後，預期為 294 個 Skills、238 個 Agents、16 個用途群組；目前仍是 293／237／15。

| 項目 | 規劃動作 | 責任與邊界 |
|---|---|---|
| `ui-improvement` | 新增總入口 | 選擇 critique／audit／polish；辨識目標平台與框架；對原生分支實際修正並追蹤驗證 |
| `frontend-design-review` | 保留名稱、唯讀契約及網頁主責 | 接手網頁審查，不把其 polish 審查視角當成修改功能 |
| `frontend-design` | 沿用網頁實作基線 | 接手 web／renderer 的實際修改；不擴為 WPF／AppKit 基線 |
| `ui-improvement-engineer` | 新增 `workspace-write` 子代理 | 在已授權範圍修改既有介面；補 Windows／macOS／原生 Android 修改主責，也可直接由主 Agent 套用 Skill |
| `ui-visual-validator`、`ui-ux-designer` | 補平台／證據分支與條件配套 | 維持 `read-only`；不因 polish 被提及而升權，也不自行寫報告檔或修改產品 |
| 既有平台／框架 Skills | 依實際技術選用 | 保留 SwiftUI iOS、Flutter、React Native、Electron 原本的能力邊界 |

第一版包括 WinUI／WPF、AppKit／macOS SwiftUI、iOS SwiftUI／UIKit、Android Compose／Views 的八個原生分支，Flutter／React Native 的 iOS／Android 分工，以及 Electron／Tauri 的 Windows／macOS 分工。Flutter 桌面、React Native Windows／macOS、WinForms、Qt／PySide、Avalonia、MAUI 等其他 target／框架仍須先按其程式與官方版本確認具體做法；平台通用規則可以診斷，尚未備妥的修改配方要明示，擴充實作時須新增對應驗收格，不強制改寫成第一版框架。

## 執行流程與模式契約

1. **辨識任務**：確認目標畫面／流程、只檢查或要求修改、需保留的品牌與行為。清楚的改善要求可直接進入 polish；只要求檢查則產生診斷，不必強制跑完三模式。
2. **辨識真正的平台**：從啟動入口、專案設定、target／scheme、依賴、UI 檔案與執行方式確認產品 OS 與框架。宿主 Windows 不代表產品是 Windows；同一 repository 的 SwiftUI 或 TSX 也不足以決定平台。
3. **建立最小基線**：讀取目標專案 AGENTS／README／DESIGN 與既有規範。產品沒有 DESIGN.md 時，按實作與已確認需求記錄現有設計，不把缺文件當作可以重設計。
4. **選擇主責與證據**：網頁 review 交給既有 review；網頁修改交給 frontend；原生分支由入口的平台配方與 native writer 負責。元件、資料與狀態的 owner 保持單一，子流程不重新啟動整套入口。
5. **分級並修改**：先處理不能完成任務、資料／操作風險及可及性，再處理缺少狀態、版面、字體與局部視覺細節。主觀風格偏好與技術缺陷分開。
6. **重新執行原流程**：對同一修訂版、資料與狀態做修改前後比較，重測行為、取消／返回、焦點與狀態保留。截圖證明外觀，不代替操作或效能量測。
7. **交付結果**：polish 必須有真實原始碼差異；列建議或轉交其他 Skill 不等於完成修改。記錄已做與未做的 build／runtime／輔助科技／效能檢查，必要時將對應驗收標成未完成。

Skill 名稱、模式及用途群組不提供作業系統權限隔離。唯讀角色即使收到修改要求，也只能回報需由具寫入權限的主責執行；不能自行繞過。反之，已存在的有效修改授權不因流程切換而要求使用者重複確認。

## Windows：規則、實際修改與驗證

| 規則／問題 | 實際修改路徑 | 驗證方式 |
|---|---|---|
| 縮窗、文字放大或 DPI 改變後裁切 | WinUI／WPF 的 grid、stretch、wrapping、約束與資源尺寸；僅在問題需要且框架支援時處理 DPI manifest／訊息 | Windows 原生執行；窄窗、產品支援的文字／顯示縮放、多螢幕 DPI 場景；檢查清晰度、裁切和點擊位置 |
| Tab／快捷鍵／對話框焦點失常 | 使用既有 command、accelerator 和焦點路徑；關閉對話框後恢復焦點，避免在輸入文字時截走按鍵 | 純鍵盤完成主要任務，測保存／取消、選單狀態、對話框焦點與資料保留 |
| 亮暗／高對比失效、讀屏無名稱 | 既有 theme resources、語意色及原生控制項；補 AutomationProperties／適用 automation peer、名稱、角色和狀態 | 對照 UI Automation tree，並用 Narrator 或產品指定工具實際操作；不能只檢查樹就稱讀屏通過 |
| 大列表卡頓或重用後顯示錯項 | 先量測，再檢查虛擬化、容器重用、項目狀態與 UI thread 工作；保留排序、選取及資料契約 | 相同資料集比較修改前後的捲動／輸入行為與量測，檢查重用後 state 正確 |
| loading／error／permission 等狀態不完整 | 修正原 View／ViewModel 的可見狀態、重試、禁止重複提交與取消邏輯 | 正常、空資料、失敗重試、快速點擊與關閉重開視窗的原生流程 |

範圍包含真正的 XAML／C# 及相關資源修改；不是只輸出 Fluent 風格建議。WinUI、WPF 和舊框架的 DPI 與主題 API 不混用，也不為單次 polish 升級 SDK 或遷移架構。

依據：[Windows accessibility](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-overview)、[keyboard interactions](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-interactions)、[High DPI](https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows)、[WPF controls performance](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/advanced/optimizing-performance-controls)。

## macOS：規則、實際修改與驗證

| 規則／問題 | 實際修改路徑 | 驗證方式 |
|---|---|---|
| 把手機畫面放大、縮窗或多視窗失效 | AppKit／macOS SwiftUI 原有 window／scene、sidebar、toolbar、constraints 與資訊密度；依實際部署版本選 API | macOS build/run；窄窗、多視窗、重開、全螢幕及 active／inactive 狀態 |
| 選單命令、快捷鍵或焦點不正確 | 現有 menu／commands／responder chain 與狀態啟用邏輯，保存／取消與標準檔案互動 | 選單狀態、文字編輯時的快捷鍵、焦點移動、保存／取消與資料保留 |
| 外觀及可及性不一致 | 原生控制項、semantic colors、適用的文字與版面設定；名稱、role／value、焦點、Reduce Motion 與對比設定 | 支援的外觀／輔助設定下實際操作 VoiceOver；Accessibility Inspector 和 UI tests 作輔助 |
| 畫面卡頓、非同步工作回來覆蓋舊狀態 | UI thread 工作、列表／view identity、圖片負載、取消與載入／錯誤狀態 | 固定裝置、資料和操作路徑比較；需效能結論時使用 Instruments 或等價量測 |

macOS SwiftUI 不自動路由到既有 iOS SwiftUI 專項，也不把 `ios-developer` 當作 AppKit 主責。主 Agent 或新 native writer 應直接依 macOS 配方實作。桌面以鍵盤／指標為重要基線，但仍依設備與產品支援處理其他輸入，避免「桌面沒有觸控」的絕對規則。

依據：[Apple macOS HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)、[SwiftUI scenes](https://developer.apple.com/documentation/swiftui/scenes)、[XCUIAutomation](https://developer.apple.com/documentation/xcuiautomation)。

## 手機：iOS 與 Android 分開處理

| 平台／規則 | 實際修改路徑 | 驗證方式 |
|---|---|---|
| iOS：大字與長文字不應裁切 | SwiftUI 的語意 text styles／換行／布局；UIKit text styles、縮放支援及 constraints | 小手機、產品支援的大字級、長文與語系；主要控制仍可操作 |
| iOS：安全區域、鍵盤與系統導覽 | safe-area／scroll／focus／keyboard layout；NavigationStack 或 UIKit navigation／presentation 的單一 owner | 表單首尾欄位、鍵盤開關、橫直向、sheet、返回手勢及取消後狀態 |
| iOS：VoiceOver、主題與動態 | 名稱／角色／狀態、語意顏色、讀取順序、適當減少動態 | Accessibility Inspector 輔助加 VoiceOver 實際操作；支援外觀與輔助設定 |
| Android：系統／predictive Back | 依 OS、target SDK、AndroidX／導航版本調整 Compose 或 Views 的返回處理，避免全面攔截 | 手勢與按鍵返回、對話框、返回取消、未儲存資料及快速切換 |
| Android：system bars、IME 與文字縮放 | Compose WindowInsets／Scaffold padding／消耗，或 Views 的 insets／constraints；Typography／sp 與語意 | 實際 target OS／SDK 下測鍵盤、切口、edge-to-edge、字體與顯示縮放，避免重複 padding |
| Android：自適應、主題與 TalkBack | 依視窗 size classes 調整導航／雙欄，Material roles、semantics 或 Views 的名稱／狀態 | 手機及產品支援的平板、折疊、多視窗／旋轉；TalkBack 實際完成任務 |
| 兩者：狀態完整與捲動流暢 | 原狀態模型的 loading／empty／error／retry，取消過期工作、穩定 list keys、適當回收與主執行緒更新 | 慢網、離線、重複提交、背景返回／重建與長列表；效能宣告另外提供實測 |

SwiftUI iOS 使用現有 `swiftui-development`；UIKit 修改由新入口的 iOS 配方及 `ios-developer` 承接。Compose／Android Views 目前缺少專用 Skill，第一版必須補 Kotlin／XML／semantics／insets 的修改配方，不能用 Flutter／React Native 指引替代。

Flutter／React Native 依現有專項實作，再套目標 iOS／Android 規則；真正的 web target 才加入 `frontend-design`。同一框架出現在桌面時，按桌面 target 檢查視窗、輸入及系統整合，不能因框架名稱相同就套手機測試。保留專案的狀態管理、導覽及依賴版本。

依據：[iOS HIG](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)、[Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)、[Compose insets](https://developer.android.com/develop/ui/compose/system/insets)、[predictive Back](https://developer.android.com/develop/ui/compose/system/predictive-back)、[adaptive apps](https://developer.android.com/develop/ui/compose/layouts/adaptive/get-started-with-adaptive-apps)、[Compose accessibility testing](https://developer.android.com/develop/ui/compose/accessibility/testing)、[Flutter adaptive UI](https://docs.flutter.dev/ui/adaptive-responsive)、[React Native platform-specific code](https://reactnative.dev/docs/platform-specific-code)。

## 混合桌面與跨框架修改責任

- Electron：renderer 的 DOM／CSS／互動由 frontend 主責；視窗、menu／accelerator、preload 和 IPC 由現有 Electron 分支處理。只改 IPC／後端而沒有介面影響，不自動觸發 UI 品質流程。
- Tauri：區分 WebView、Rust core、commands／capabilities 與 OS integration；不套用 Electron 專用 API。檢查對應 WebView 與實際桌面執行，不能只測開發用 Chrome。
- 圖像／圖示修改按實際資產類型選用既有 SVG 等能力，避免把所有 UI 工作都變成圖片生成。

依據：[Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)、[Tauri process model](https://v2.tauri.app/concept/process-model/)。

## 條件配套、Agent 與分類的具體變更

`ui-improvement` 自帶基本平台規則及修改指引；第一版不設框架類 `required` 依賴。以下為規劃的條件關聯，不會隨單顆安裝全部展開。

| 配套 | 選用條件 |
|---|---|
| `frontend-design-review` | 目標為 web／renderer 且需網頁審查專項 |
| `frontend-design`、合適的語言／CSS Skill | 目標有實際 web UI 修改 |
| `desktop-development` | 實際涉及 Electron 桌面外殼，非 Tauri／一般原生桌面 |
| `swiftui-development` | iOS SwiftUI 的框架實作；不是僅因副檔名為 Swift |
| `flutter-development`／`react-native-expo` | 專案確實使用對應框架與支援 target |
| `accessibility-testing` | 需要獨立輔助科技審查或更完整的可及性驗證 |
| `mobile-app-testing` | 手機裝置、生命週期、權限或 UI automation 矩陣在範圍內 |
| `visual-regression-testing` | 需要其支援的 web baseline／差異比對流程，不把 DOM 契約套成 native 驗證 |

缺少 companion 時，可依本包與既有程式完成的部分應獨立完成，並明示未使用該專項；若關鍵知識／資源不可替代，則列出受影響的未完成部分。安裝支援與真正啟用 Skill／子代理仍需分開驗證。

Agent 的 `recommended` 和 Skill 的依賴種類不同：Skill 只有 `required`／`conditional`／`optional`，不能把「建議」誤寫為 Skill `recommended`。

| 位置 | 規劃改動 |
|---|---|
| 新 `interface-quality` | 直接 Skill：`ui-improvement`；直接 Agents：`ui-improvement-engineer`、`ui-ux-designer`、`ui-visual-validator`；框架依任務選用 |
| 新實作 Agent | recommended `ui-improvement`；框架支援為 conditional；不默認接管架構遷移、SDK 安裝、簽署、部署或全產品重設計 |
| `ui-visual-validator` | recommended 共用入口；將目前 web-oriented 的 `frontend-design-review`、`visual-regression-testing` 改為 web 條件關聯；補原生證據分支，維持唯讀 |
| `ui-ux-designer` | recommended 共用入口和可沿用的 `ux-writing`；web-oriented `design-consultation` 改為符合需求的條件關聯，維持唯讀 |
| `web-interface` | 直接加入共用入口，以及原先透過 validator recommended 帶入的 **`frontend-design-review` 和 `visual-regression-testing` 兩者**，避免調整關聯後失去原有能力 |
| `mobile-desktop-embedded` | 直接加入共用入口與新實作 Agent，保留原有 framework owners |
| `testing-review` | 直接加入共用入口，保留既有審查／驗證主責，不新增 native writer；執行時按明確診斷模式與唯讀角色限制 |
| Source taxonomy | 保留 `frontend-design` ID，擴充其名稱／描述以納入跨平台介面品質；原生既有專項仍在原分類，不把 web-only Skills 的適用範圍一起擴大 |

調整 Agent recommended 支援後，須比較**最終去重的安裝計畫**，不能只看直接成員數；同時測試單一 Agent 的預設推薦配套與原有用途分類。新群組的 bundle、mode 或名稱都不是權限隔離機制。

## 建議檔案結構與變更清單

```text
skills/ui-improvement/
  SKILL.md
  references/
    workflow-and-evidence.md
    web.md
    windows.md                 # WinUI／WPF 的規則、修改、驗證分節
    macos.md                   # AppKit／macOS SwiftUI
    ios.md                     # UIKit；iOS SwiftUI 與既有專項分工
    android.md                 # Compose／Views(XML)
    cross-platform-frameworks.md
    upstream-notice.md
  evals/
    evals.json
    routing.json
agents/ui-improvement-engineer.md
```

每份平台文件都要有「適用框架／版本、規則、具體修改位置、典型修復配方、驗證矩陣、不可由靜態檢查推論的證據」；按目標只讀相關部分，不一次載入所有平台。

其他需修改的 canonical 檔案：`agents/ui-visual-validator.md`、`agents/ui-ux-designer.md`、`scripts/data/skill-catalog.json`、`scripts/data/install-bundles.json`、來源／lock、eval coverage、review registry、README 和 release baseline。既有 frontend／mobile Skill 僅增加必要 handoff／邊界說明，不複製原生規則。新 Agent 的來源參考也要完成實際審閱與 manifest 紀錄。

更新 canonical Agents 後執行 `generate:agents`，更新 Skills 後執行 `generate:skills`，不直接修改 adapters／TSV。來源 manifest 變更時同步顯式 fixture digest，包括 Three.js provenance policy，保留既有檢查。完成新增功能的實作時，依目前 1.1.1 基準採向下相容 MINOR（預計 1.2.0；以實作當時版本為準）；本次文件規劃不升版。

## 驗證矩陣與完成標準

每次結果至少辨識：目標與模式、平台／框架及版本、程式／build 修訂、資料與 UI 狀態、實際工具／裝置、修改檔案、已跑的檢查與缺口。小修改可用精簡對話紀錄；需保存報告時由具寫入權限的主責寫入已授權位置，不強制引入上游工作目錄。

| 驗證層 | 必須驗證的事情 | 第一版驗收案例 |
|---|---|---|
| 路由／權限 | 模式、平台、技術、影響範圍正確 | 只 audit 不改 source；無 UI 合約影響的後端／IPC 或純文字翻譯不誤觸；UI 在地化則檢查長度、換行、RTL 與語意；readonly 不升權 |
| 真正修改 | 有符合目標框架的 source diff 且保留品牌、資料與行為 | Windows 修縮放裁切；macOS 修 menu／視窗；iOS 修鍵盤遮擋；Android 修 insets／返回 |
| 狀態／互動 | 主要任務、取消／返回、錯誤／重試與資料保留 | 大字、長文、窄窗、鍵盤、離線、快速操作；不以關閉縮放／手勢當作修復 |
| 原生 runtime | 在目標平台 build/run，再測實際行為 | Windows UI Automation＋實際鍵盤／讀屏；Mac／iOS Xcode target；Android 實際 target SDK／裝置 |
| 視覺／效能證據 | 外觀、可及性、操作與效能各自有對應證據 | 原生截圖不是 HTML 預覽；效能有相同資料／裝置量測；讀屏實際走完流程 |
| 安裝／更新 | 獨立安裝、分類完整、複選去重、ownership 保護 | 單裝 core 不帶全框架；四類複選 core 一份；web 能力不因推薦關係調整而減少；更新保留使用者檔案 |
| 相容／發布 | 舊入口、名稱、命令、generated artifacts 與來源一致 | 原 frontend review 保持唯讀；新 Agent 五平台 adapters 生成；validate／相關 tests／diff check 通過 |

原生驗收按下列 **8 個 platform×framework 格**逐項完成，不以其中一個框架的通過替另一個分支背書。每格都要有唯讀診斷、具體缺陷修改、縮放／主題／輔助設定的成果案例，以及該 target 的 build／runtime 證據。

| 驗收格／fixture | 代表修改與原生驗證 |
|---|---|
| `windows-winui` | XAML 設定表單的縮放、焦點及主題，實際 Windows window／UI Automation |
| `windows-wpf` | WPF constraints／文字換行／command 或列表狀態，實際 WPF 操作及適用 DPI 場景 |
| `macos-appkit` | 視窗布局、menu／responder command 與焦點，macOS build/run |
| `macos-swiftui` | Scene／toolbar／sidebar 與不同視窗狀態，macOS build/run |
| `ios-swiftui` | 長表單的大字／鍵盤／導航狀態，iOS target 與原生 capture／操作 |
| `ios-uikit` | UIKit constraints／鍵盤／取消與讀屏語意，iOS target 與原生操作 |
| `android-compose` | Compose insets／Back／semantics，對應 target SDK 的 emulator／device 操作 |
| `android-views` | XML／Views 的布局／返回／鍵盤與可及性，對應 Android app 操作 |

另為 web 定義至少三個成果案例。Flutter／React Native 各至少一個實際修改案例，檢查產品支援的 iOS 和 Android 代表 target；Electron／Tauri 各至少一個修改案例，在 Windows 和 macOS 檢查 WebView／renderer 與受影響的外殼行為。這些正向修改案例與混合桌面、缺少 companion／SDK／裝置、平台錯配、無關工作等路由反例分開。案例定義、決定性 fixture 測試、實際模型任務和目標平台實測也分開報告。

自動測試使用專案已有的 XCTest／XCUIAutomation、Compose tests／Espresso、Flutter integration 或 RN E2E 等適用工具；不為了執行診斷強制加裝測試框架。

主機不具備 Xcode、Windows runtime、Android SDK 或測試裝置時，可以完成規劃、來源檢查或修改，但不能把該平台的 build／runtime 判為通過。模擬器提供的證據不代替實機效能與特定手勢／設備行為。優先使用隔離測試環境；若改變測試裝置主題、字體或其他設定，記錄原值並恢復。

## 分階段工作與退出條件

| 階段 | 工作 | 完成條件 |
|---|---|---|
| 1. 共用契約 | 入口、模式、平台／框架辨識、權限、handoff 與證據格式 | 可讀出五類目標並正確區分只審查與修改；既有 web 入口維持責任 |
| 2. 桌面原生 | Windows 與 macOS 規則、具體修復配方、原生 fixtures | 在相應平台驗證指定修改，沒有僅列建議或以 browser mock 代替的結果 |
| 3. 手機原生與框架 | iOS／Android 各自規則、UIKit／Compose／XML 配方、Flutter／RN 路由 | 四種原生框架及選用跨平台框架的修改／證據責任清楚，缺口明列 |
| 4. 配套與安裝 | 新 writer、既有 reviewer 關聯、用途分類、來源與生成 | 共用群組可獨立安裝；既有 web 能力、五平台 adapters、去重與更新均通過 |
| 5. 端到端驗收 | 權限反例、來源／brand 保留、五類目標實測、文件與版本 | 對每項驗收有當前修訂證據；未執行的平台不可計為整體完成 |

這些階段是同一完整範圍的實作順序，不把只完成 web 或只寫平台文件當成全部平台已交付。本文只規劃；建立 Skills、修改 installer／Agent、執行原生範例及發布版本都屬後續實作。
