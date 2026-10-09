---
name: code-refactoring
description: Behavior-preserving code refactoring guide for improving structure, readability, and maintainability without changing outputs. Use when cleaning up legacy code, reducing complexity, replacing magic values or hardcoded values with named constants, or simplifying code after the current behavior and verification path are understood.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Code Refactoring（通用重構原則）

在不改變行為的前提下改善程式結構與可讀性。適用於整理舊程式碼、降低複雜度、提升可維護性。以下原則適用於 **Java、Python、TypeScript/JavaScript、C#、Go** 等任何語言。重構時應遵守這些共通準則，再依語言慣例撰寫程式。

若使用者還沒決定目標架構，或是在問「目前專案架構是不是不好、應該調成什麼樣子」，先使用 `project-architecture-review`；本 skill 負責目標已明確後的行為不變重構。

---

## When To Use

Use this skill when the requested change is behavior-preserving cleanup of existing code.

- Improve readability, naming, structure, duplication, or maintainability without changing outputs.
- Address code smells such as long functions, deep conditionals, primitive obsession, feature envy, or magic values.
- Make a future behavior change easier after the current behavior is understood and protected.

Do not use this skill for feature work, bug fixes, or architecture selection unless the refactor is the current slice.

## Handoff

- Use `code-change-workflow` first when the entry point, data flow, caller impact, current behavior, or verification path is unclear.
- Use `incremental-implementation` when the refactor spans many files and needs small verified slices, checkpoints, or commits.
- Use `project-architecture-review` when the task is to choose a target architecture or migration plan.
- Use `java-development` for Java language, type, API, exception, resource, and compatibility decisions during a Java refactor.
- Use stack-specific skills for language or framework implementation details.

## 核心原則

- **不改變行為**：重構只改結構與可讀性，對外行為與結果不變。
- **小步進行**：一次一種重構，每步都可驗證、可還原。
- **先有保護再動**：有測試或可驗證方式再重構，避免無意改壞行為。

---

## 何時重構 / 何時不重構

### 適合重構的時機

| 時機 | 說明 |
|------|------|
| 加新功能前 | 先讓「改動」變容易，再加功能（make change easy, then make easy change）。 |
| 測試通過後 | 紅—綠—重構（red-green-refactor）：綠燈後再整理程式。 |
| 發現 code smell | 辨識出下列臭味時，排入重構。 |
| Code review 建議 | 審查時指出可讀性、複雜度、重複時，依建議重構。 |

### 不適合重構的時機

| 情況 | 說明 |
|------|------|
| 沒有足夠驗證方式 | 無法確認行為不變，風險高；先建立測試或其他可重現的行為證據再重構。 |
| 時程緊且無安全網 | 沒有自動化測試或回滾計畫時，避免大範圍重構。 |
| 程式即將被替換 | 若短期內會整塊替換，重構效益低。 |
| 尚未理解程式在做什麼 | 先讀懂、必要時加註解或小範圍補測試，再重構。 |

若任務需要先追入口、呼叫鏈、資料流與驗證方式，再決定如何修改，先使用 `code-change-workflow`。

---

## Code Smells（共通定義與應對）

不論語言，以下臭味與應對方向一致。

### Long methods / Long functions

- **定義**：一個方法/函式做多件事、過長、難以命名或難以測試。
- **應對**：抽出「做一件事」的區塊成新方法/函式，用描述性名稱；保持單一職責。

### Deeply nested conditionals

- **定義**：多層 if/else 巢狀（箭頭式程式碼），難以閱讀與測試。
- **應對**：用 early return（guard clauses）先處理不成立或邊界情況並回傳，讓主邏輯保持一層或少層巢狀。

### Primitive obsession

- **定義**：到處用基本型別（string、number）表示領域概念，驗證與語意分散重複。
- **應對**：引入 value object / 小物件封裝（如 Email、Phone、Money），在建立時驗證，其餘程式使用型別而非裸 primitives。

### Feature envy

- **定義**：某方法大量使用「其他物件」的資料或 getter，自己的類別資料用得少。
- **應對**：考慮將方法移到「資料所在」的類別（Move Method），或讓該類別提供一個完整行為介面，減少跨物件拉資料。

### 其他常見臭味（共通）

- **重複程式碼**：抽出共用函式/方法或模組，避免複製貼上。
- **過多參數**：用參數物件或 options 結構收納，或拆成較小介面。
- **魔術數字/字串**：用具名常數或列舉表達語意與修改點。
- **過大類別/模組**：依職責拆成多個較小單元。

---

## 重構技巧（共通模式）

以下為語言無關的「做什麼」與「步驟」，實作時用該語言的語法即可。

### Extract Method / Extract Function

- **意圖**：把一段「做一件事」的程式抽成獨立方法/函式。
- **步驟**：  
  1) 找出可命名的一區塊。  
  2) 新增方法/函式，名稱描述該區塊的用途。  
  3) 將區塊移入新方法，必要參數與回傳值明確化。  
  4) 原處改為呼叫新方法。

### Replace Conditional with Polymorphism

- **意圖**：依型別/種類做不同行為時，用多型取代 if/switch。
- **步驟**：  
  1) 定義共通介面/抽象（單一行為方法，如 getArea）。  
  2) 每種型別一個實作類別。  
  3) 呼叫端依介面呼叫，由多型分派，不再依型別分支。

### Introduce Parameter Object

- **意圖**：參數過多時，收成一個參數物件/結構。
- **步驟**：  
  1) 定義結構/類別，欄位對應現有參數（可含巢狀，如 priceRange、sort）。  
  2) 將函式簽名改為接受單一參數物件。  
  3) 呼叫端改為組裝並傳入該物件。

### Replace Magic Numbers / Strings with Named Constants

- **意圖**：讓數字與字串的語意與修改點集中。
- **步驟**：  
  1) 找出代表業務或設定意義的魔術數字/字串。  
  2) 以常數/列舉/設定檔具名（如 MINIMUM_AGE、DISCOUNT_THRESHOLD）。  
  3) 原處改為使用該名稱。

### Move Method

- **意圖**：方法與某類別資料互動遠多於自己類別時，把方法移到該類別。
- **步驟**：  
  1) 在目標類別新增方法，必要時傳入原物件或其部分。  
  2) 原方法改為委派給新方法，或呼叫端改為呼叫新位置。  
  3) 移除原方法。

---

## 安全重構流程

1. **先有行為安全網**：依風險與 repo 要求，選既有測試、characterization test 或其他可重現且足以證明行為不變的驗證。證據不足時先補足，並記錄無法驗證的部分；本流程不固定要求 TDD 或某種語言測試 Skill。
2. **小步進行**：一次一種重構，不混入新功能。
3. **每次改動後驗證**：執行選定的測試或行為檢查，立刻發現行為變化。
4. **常 commit**：每步可還原，commit message 說明重構內容。
5. **檢查 diff**：確認只改結構與命名，不改行為與邊界條件。

---

## Refactoring Checklist

- [ ] 重構前測試通過（或已有可驗證方式）
- [ ] 每次改動小且聚焦於單一重構
- [ ] 每次改動後選定的測試或行為檢查通過
- [ ] 僅改結構、命名、組織，不改對外行為
- [ ] 可讀性提升（命名、長度、層級）
- [ ] Commit message 說明重構內容（例如：Extract method X、Replace magic number）

---

## 實作範例（跨檔案連結）

特定語言的具體 BEFORE / AFTER 程式碼範例（包含各語言特有重構技巧），請參考各語言專屬的 Skill：

- **TypeScript 範例**：見 `typescript-development` Skill 內的 `reference/refactoring.md`
- **Java 範例**：見 `java-development` Skill 內的 `reference/refactoring.md`
