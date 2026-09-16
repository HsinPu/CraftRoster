---
name: ask-questions-if-underspecified
description: Requirement-clarification guide for identifying the minimum missing information before implementation. Use when the user explicitly asks to clarify requirements first or requests a question-first approach before coding. Do not use automatically.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Ask Questions If Underspecified

先釐清需求再實作。**僅在使用者明確要求時使用**，不要自動套用。

## Goal

問最少必要的澄清問題，避免做錯方向；在必答問題有答案（或使用者明確同意以所述假設進行）之前，不要開始實作。

## Handoff

- Use `requirements-deep-dive` when the user wants assumptions challenged through a deliberate multi-decision interview rather than the minimum blocking question.
- Use `todo-first` after clarification when the confirmed task is multi-step or needs execution tracking.
- Use `code-change-workflow` when clarification is enough and the next step is to inspect an existing code path.
- Use `spec-flow` or `specification-authoring` when the missing information should become a structured spec.
- Use `answer-writing` when the user only needs a concise response, recommendation, or explanation.

## Request Triage

在問之前，先確認這個需求是否真的需要問：

- 如果能用既有 repo 慣例、文件或設定直接回答，直接回答，不要問。
- 如果是推薦、比較或取捨，且資訊已足夠，就交給 `answer-writing`，不要硬問。
- 如果問題只涉及小範圍、低風險的探索，而且能在不鎖定方向的情況下先讀文件或設定，先探索再決定。
- 只有在缺失資訊會改變結果、帶來風險，或存在多種合理解讀時，才進入提問流程。
- 問題要少而關鍵，避免把可以用預設值處理的事情問成開放題。

---

## Workflow

### 1) 判斷是否規格不足（underspecified）

若在思考如何執行後，下列仍有不清楚之處，即視為規格不足：

- **目標**：什麼要改、什麼不變
- **完成條件**：驗收標準、範例、邊界情況
- **範圍**：哪些檔案／元件／使用者納入、排除
- **約束**：相容性、效能、風格、依賴、時間
- **環境**：語言／執行環境版本、OS、建置／測試工具
- **安全與可逆性**：資料遷移、上線／回滾、風險

若存在多種合理解讀，視為規格不足。

### 2) 先問必答題（數量少）

第一輪只問 1～5 個問題，優先問能排除整塊工作的問題。

讓回答容易：

- **好掃描**：簡短、編號，避免長段落
- **多選題**：盡量提供選項（A/B/C）
- **預設值**：標明建議／預設（如加粗「Recommended」、在選項旁註 default）
- **快徑**：例如回覆 `defaults` 即接受所有建議
- **不確定**：提供「不確定就用預設」選項
- **必要 vs 選答**：分開「Need to know」與「Nice to know」
- **簡短回覆**：讓使用者可用 `1b 2a 3c` 回答；確認時用白話重述選擇

### 3) 在取得答案前暫停實作

在必答題有答案前：

- **不要**：執行依賴未決答案的變更或副作用指令、編輯依賴該答案的檔案，或產出假裝答案已定的詳細計畫
- **可以**：做清楚標示、低風險的探索（包括用唯讀指令看 repo 結構、讀相關設定），且不因此鎖定方向

若使用者接受已列預設、授權依假設進行，或明確改要求「先做再說」：

- 記錄必要假設後繼續，不再為相同決定要求確認。
- 只有未決的重大需求、超出既有範圍的外部動作，或尚未明確的不可逆操作仍需答案；暫停其依賴工作，繼續其他已授權部分。
- 「先做」不代表可以自行選擇刪除清單、真實扣款或 production 變更範圍。指出具體缺少的決定，不把一般實作判斷交回使用者。

### 4) 確認理解後再動手

有答案後，用 1～3 句話重述需求（含關鍵約束與成功條件），再開始實作。

---

## Question 範本

- "Before I start, I need: (1) ..., (2) ..., (3) .... If you don't care about (2), I will assume ...."
- "Which of these should it be? A) ... B) ... C) ... (pick one)"
- "What would you consider 'done'? For example: ..."
- "Any constraints I must follow (versions, performance, style, deps)? If none, I will target the existing project defaults."
- 用編號題 + 字母選項 + 明確回覆格式：

```text
1) Scope?
a) Minimal change (default)
b) Refactor while touching the area
c) Not sure - use default
2) Compatibility target?
a) Current project defaults (default)
b) Also support older versions: <specify>
c) Not sure - use default

Reply with: defaults (or 1a 2a)
```

---

## Anti-patterns

- **不要**問可以透過快速、低風險的探索就能回答的題目（例如讀 config、既有慣例、文件）。
- **不要**在可以用緊一點的多選或是非題就消除歧義時，改用開放式問法。
