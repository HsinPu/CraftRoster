# 介面品質功能驗證紀錄

日期：2026-10-29。版本：1.2.0。目標為新增 Skill、Agent、分類及依賴整合；[原規劃](../../interface-quality-skill-plan.md)要求的完整原生 runtime 矩陣仍未執行。

## 已交付內容

- `ui-improvement` 共用入口、web／Windows／macOS／iOS／Android／跨平台框架 references，以及來源通知。
- `ui-improvement-engineer` 與五環境 adapters；兩個共用審查角色保持唯讀。
- 第 16 個用途 `interface-quality`，整合 web、mobile/desktop、testing 既有用途；保留 web 先前 55 Skills／11 Agents 的最終安裝能力。
- 35 個成果定義、154 個 assertions、24 個路由定義及 13 組原創部分原始碼 fixtures。

新增功能保持原安裝入口相容，因此由 1.1.1 升至 MINOR 1.2.0。這裡的計數描述 catalog／案例，不代表全部案例或平台已通過實測。

## 結構、來源與安裝檢查

使用 Node v24.22.1。`npm run validate` 通過：294 Skills、238 Agents、16 用途、16 Skill source categories、125 個有案例的 packages，以及來源／review／release baseline 一致性。

相關回歸：CLI 57、catalog validation 5、Skill catalog generation 14、category index 4、bundle metadata 8、eval validator 20、source revisions 21、dependency 55、review registry 16、Three.js provenance fixture 5、SVG 定義 2，以及 release baseline 檢查均通過。CLI 原有「15 分類」斷言已更新為 16，並要求新分類可見。

Impeccable commit/tree 與 LICENSE、NOTICE、選取的原始檔已查閱。新 Skill 與新 Agent 的 focused originality 檢查比較 41 個本機文字檔、5 個固定來源檔，共 206 次比較，無重疊 findings；同時核對原始檔 Git blob。範圍僅本次新增內容，並非宣稱重新執行所有既有上游的完整遠端稽核。證據見 [source-originality.json](source-originality.json)。

PowerShell 5.1.19041.6093 與 PowerShell 7.6.5 的完整測試各 **10 通過／0 略過／0 失敗**，涵蓋單裝 core、完整 package resources、五環境 adapters、舊 web 能力、分類合併去重、角色配套、ownership 更新與拒絕覆寫本機修改。實際互動選單已走過 Codex → project → 指定用途 → `interface-quality` → 確認，核對 2 Skills／3 Agents 與全域設定隔離。

實際 package inventory／打包解包驗證通過：2857 個檔案、77 個宣告 entrypoints、13 個 manifests。沒有發布 npm package。提交前核對 68 個變更 Markdown 檔的標題與 340 個相對連結，無失效目標；最終 `npm run validate`、generated parity 與 Git whitespace 檢查通過。

初次 sandbox 子程序啟動遇到 `EPERM`，相同隔離測試在核准的執行環境重跑；沒有將未啟動的測試當成成功。skill-creator 的 Python quick validator 因 PyYAML 未安裝而未能執行，沒有安裝全域套件；正式 repository 的 frontmatter、contract、source 及 eval validators 已通過。

## 獨立模型任務

3 位執行者只收到 Skill 與案例原始輸入／請求，沒有收到預期答案或 assertions。16 個樣本均為明確載入 Skill 的任務，**不是自動選擇 Skill 的 routing 測試**。

| 案例 | 實際執行結果 | 驗證界線 |
|---|---|---|
| 2／5 WinUI／WPF | XAML 內容尺寸、換行、捲動與語意資源修正，保留 binding／command | XML／source 檢查；未 build 或執行原生 app |
| 8／11 AppKit／macOS SwiftUI | 可伸縮布局、文字與 action 語意修正 | Swift source 審查；無 Xcode／macOS runtime |
| 14／17 iOS SwiftUI／UIKit | Dynamic Type、可捲動表單、鍵盤／safe area 修正 | Swift source 審查；無原生模擬器／裝置操作 |
| 20／23 Compose／Views | insets／IME、Back 與表單布局修正 | Kotlin／XML source 檢查；無完整 Gradle target／Android runtime |
| 25／26 web critique／audit | 對裁切、標籤及焦點提出診斷，原目錄不變 | source 診斷，未宣稱渲染原始頁 |
| 27 web polish | 實際 HTML 修正 | 320px 無水平溢出、標籤關聯與 Tab 焦點；1024px 保留寬度。深色與讀屏仍未驗證 |
| 28／29 Flutter／RN | 真正 Dart／TSX 修改，保留 controller／props／callbacks | 無框架 SDK、manifest 或原生 build；IME 整合仍待 host 檢查 |
| 30 Electron | main/menu 與 renderer 修改，Copy 保留原生編輯行為 | JS 語法與隔離 stub、320px browser 檢查；未執行 Windows／macOS shell |
| 31 Tauri | WebView HTML 修改，保留 Rust／capabilities | 320px browser 與 Save 名稱；不是實際 Tauri/WKWebView 結果 |
| 32 readonly＋polish 衝突 | 保持唯讀，未寫 source 或報告 | 實際核對整個目錄無新增或變更 |

共保存 13 份實際 source diff；3 個唯讀目錄的檔案與清單核對未變。另有獨立 reviewer 比對 8 個原生修正與原請求，未發現需要修正的 source-level 缺陷。這不代表原生編譯、操作或外觀通過；執行者的字串斷言也不替代行為測試。

[forward-results.json](forward-results.json) 記錄輸入 digest、Skill 修訂、未執行案例及每個成果位置；`forward-cases/<id>/changes.patch` 為零 context 的 unified diff，`model-report.json` 保留執行者的檢查及限制。臨時測試目錄不屬於可安裝內容。

## 仍未驗證

- 8 個原生 framework targets 的完整 build／runtime／讀屏矩陣；fixtures 只有部分 source，不能拿它們冒充可建置應用。
- Flutter／RN 的 iOS、Android；Electron／Tauri 的 Windows、macOS 原生流程與跨裝置效能。
- 其餘 19 個成果案例的模型執行，以及 24 個路由案例的自動選擇／activation。
- 本機沒有執行 Linux／macOS Bash 安裝；已加入相應 CI jobs，未 Push 的本次 Commit 尚未產生新的雲端 CI 結果。

這些缺口是平台驗收限制；Skill 原始碼、角色／依賴與分類整合已實作，不將所有平台描述為已驗證可發布。
