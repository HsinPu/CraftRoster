# Skill 安裝配套與修訂清單

[回到專案 README](../../../README.md) · [分類安裝命令](../../../README.md#依分類安裝) · [逐個 Skill 配套](#逐個-skill-配套)

此頁保留 2026-10-09 修訂後的安裝規則快照，可直接在 GitHub 閱讀。涵蓋全部 286 個 Skills；目前目錄以 [`skills.json`](../../../skills.json) 與 `node craftroster-cli.js info <skill-name>` 為準。

## 如何選擇安裝範圍

| 需求 | 使用方式 | 會安裝什麼 |
|---|---|---|
| 一個 Skill | `-Name <skill>`／`--name <skill>` | 指定 Skill 與遞迴必要配套 |
| 一個分類 | `-Category <category>`／`--category <category>` | 分類中的 Skills 與遞迴必要配套，可能跨分類 |
| 全部 Skills | `-Type skill`／`--type skill`，同時省略名稱與分類 | 全部 286 個 Skills |

上表為 `install.ps1`／`install.sh` 的參數介面，每次可選一個名稱或一個分類，兩者互斥。新版 `setup.ps1`／`setup.sh` 提供單一指令啟動的互動選單，可一次選取多個分類、預檢後再確認安裝；詳見[互動式安裝指南](../../interactive-installation.md)。`-DryRun`／`--dry-run` 可只預覽實際套件計畫。

## 依賴種類

| 種類 | 是否自動安裝 | 使用時機 |
|---|---|---|
| `required` 必要配套 | 是，遞迴補齊並去重 | 入口流程的核心交付或共用文件依賴 |
| `conditional` 條件依賴 | 否 | 實際任務符合 `when` 條件時，再明確安裝與使用 |
| `optional` 可選配套 | 否 | 選用的增強能力 |
| `routes.alternative` 替代入口 | 否 | 改由另一個 Skill 負責成果 |
| `routes.related` 相關能力 | 否 | 提示可參考的鄰近能力 |

`usage: "resource"` 表示套件提供共用文件，可以用於必要或條件依賴。安裝與讀取共用文件不會啟用提供套件的整個入口流程；例如安裝 `threejs-capture-recording` 只會自動補上 `threejs-development`，不會一次裝入其 61 個條件專項。

「套件可單裝」只表示沒有其他自動安裝的必要套件。若任務選中了某個條件分支，仍須補齊該分支的主責 Skill。外部工具、帳號、API 與執行環境也應按各 Skill 指引準備。

## 分類安裝數量

以下為每個分類單獨選取時的去重結果。數量是不同 Skill 套件數；`project` target 會寫入兩個 Skill profile，實際資料夾副本數會不同。

| 分類 | 分類本身 | 跨分類必要配套 | 去重後總數 | 額外套件 |
|---|---:|---:|---:|---|
| `workflow-planning` | 12 | 0 | 12 | 無 |
| `software-engineering` | 21 | 0 | 21 | 無 |
| `frontend-design` | 34 | 5 | 39 | [`accessibility-testing`](../../../skills/accessibility-testing/SKILL.md), [`frontend-testing`](../../../skills/frontend-testing/SKILL.md), [`image-utils`](../../../skills/image-utils/SKILL.md), [`visual-regression-testing`](../../../skills/visual-regression-testing/SKILL.md), [`webapp-testing`](../../../skills/webapp-testing/SKILL.md) |
| `threejs-graphics` | 62 | 0 | 62 | 無 |
| `backend-data` | 26 | 2 | 28 | [`python-development`](../../../skills/python-development/SKILL.md), [`verification-before-completion`](../../../skills/verification-before-completion/SKILL.md) |
| `ai-llm` | 5 | 0 | 5 | 無 |
| `mobile-desktop` | 7 | 0 | 7 | 無 |
| `testing-quality` | 27 | 1 | 28 | [`python-development`](../../../skills/python-development/SKILL.md) |
| `security-governance` | 7 | 1 | 8 | [`python-development`](../../../skills/python-development/SKILL.md) |
| `cloud-devops` | 14 | 0 | 14 | 無 |
| `agent-skill-tooling` | 17 | 0 | 17 | 無 |
| `browser-automation` | 4 | 1 | 5 | [`python-development`](../../../skills/python-development/SKILL.md) |
| `media-creative` | 20 | 0 | 20 | 無 |
| `writing-content` | 12 | 0 | 12 | 無 |
| `research-product` | 7 | 0 | 7 | 無 |
| `documents-productivity` | 11 | 1 | 12 | [`markdown-writer`](../../../skills/markdown-writer/SKILL.md) |

## 常見最小安裝範例

| 選取 Skill | 自動補齊的必要配套 | 套件數 |
|---|---|---:|
| [`frontend-code-review`](../../../skills/frontend-code-review/SKILL.md) | 無 | 1 |
| [`security-code-review`](../../../skills/security-code-review/SKILL.md) | 無 | 1 |
| [`python-packaging-release`](../../../skills/python-packaging-release/SKILL.md) | 無 | 1 |
| [`document-to-markdown`](../../../skills/document-to-markdown/SKILL.md) | [`markdown-writer`](../../../skills/markdown-writer/SKILL.md) | 2 |
| [`image-to-code-assets`](../../../skills/image-to-code-assets/SKILL.md) | [`image-utils`](../../../skills/image-utils/SKILL.md) | 2 |
| [`threejs-capture-recording`](../../../skills/threejs-capture-recording/SKILL.md) | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 2 |
| [`threejs-webxr-accessibility`](../../../skills/threejs-webxr-accessibility/SKILL.md) | [`threejs-accessibility`](../../../skills/threejs-accessibility/SKILL.md), [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 3 |
| [`web-page-design-to-code`](../../../skills/web-page-design-to-code/SKILL.md) | [`frontend-design`](../../../skills/frontend-design/SKILL.md), [`webapp-testing`](../../../skills/webapp-testing/SKILL.md) | 3 |
| [`website-redesign-to-code`](../../../skills/website-redesign-to-code/SKILL.md) | [`accessibility-testing`](../../../skills/accessibility-testing/SKILL.md), [`frontend-design`](../../../skills/frontend-design/SKILL.md), [`frontend-stack-inference`](../../../skills/frontend-stack-inference/SKILL.md), [`frontend-testing`](../../../skills/frontend-testing/SKILL.md), [`visual-regression-testing`](../../../skills/visual-regression-testing/SKILL.md), [`webapp-testing`](../../../skills/webapp-testing/SKILL.md) | 7 |

## 本輪修正與驗證

原清單共 941 項，包含 85 項指引歧義與 856 項 metadata 處置，已逐項對齊。修訂釐清必要配套、條件觸發、共用文件、替代主責，以及既有成果可重用的條件。

修後共有 40 條必要依賴、889 條條件依賴、66 條可選依賴與 320 條替代／相關入口關係，其中 17 條依賴標示為共用資源。這些數量是關係數，不是 Skill 套件數。

修訂時已通過 `npm run validate`、280 項本機回歸測試、PowerShell／Git Bash 隔離依賴安裝測試，以及 52 組目前目錄的安裝預覽。這些檢查驗證文件、目錄、規劃與安裝行為；未執行模型任務或外部生成 API。

| 證據 | 內容 |
|---|---|
| [原始修正清單](clarification-backlog.json) | 研究階段的逐項問題 |
| [逐項處置與最小套件](remediation-status.json) | 每個問題的處置、依賴與來源雜湊 |
| [驗證紀錄](remediation-verification.json) | 執行命令、輸出、來源身份與檢查結果 |
| [52 組安裝預覽](remediation-install-plans.json) | 預期／實際套件、去重與零目的地寫入 |
| [報告操作驗證](remediation-browser-check.json) | 搜尋、分類與共用資源顯示 |
| [互動式 HTML 報告](remediation-report.html) | 下載後用瀏覽器開啟，可搜尋分類與逐項修正 |

## 逐個 Skill 配套

下表列出完整 286 個 Skills 的最小安裝配套。必要配套包含遞迴展開；條件數與可選數是該 Skill 的直接宣告。點選名稱閱讀入口指引；觸發條件、共用資源與替代入口詳情可用 CLI 或 [`skills.json`](../../../skills.json) 查看。

<details>
<summary>workflow-planning — 12 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`ask-questions-if-underspecified`](../../../skills/ask-questions-if-underspecified/SKILL.md) | 1 | 無；套件可單裝 | 1 | 1 | 4 |
| [`code-change-workflow`](../../../skills/code-change-workflow/SKILL.md) | 1 | 無；套件可單裝 | 10 | 4 | 2 |
| [`context-governance`](../../../skills/context-governance/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 2 |
| [`incremental-implementation`](../../../skills/incremental-implementation/SKILL.md) | 1 | 無；套件可單裝 | 8 | 1 | 1 |
| [`multi-session-planning`](../../../skills/multi-session-planning/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 2 |
| [`requirements-deep-dive`](../../../skills/requirements-deep-dive/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`self-improvement`](../../../skills/self-improvement/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 0 |
| [`session-handoff`](../../../skills/session-handoff/SKILL.md) | 1 | 無；套件可單裝 | 1 | 3 | 1 |
| [`spec-flow`](../../../skills/spec-flow/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 2 |
| [`throwaway-prototyping`](../../../skills/throwaway-prototyping/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 2 |
| [`todo-first`](../../../skills/todo-first/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 0 |
| [`verified-software-delivery`](../../../skills/verified-software-delivery/SKILL.md) | 1 | 無；套件可單裝 | 12 | 2 | 0 |

</details>

<details>
<summary>software-engineering — 21 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`code-refactoring`](../../../skills/code-refactoring/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 2 |
| [`coding-standards`](../../../skills/coding-standards/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 2 |
| [`domain-modeling`](../../../skills/domain-modeling/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 0 |
| [`git-advanced`](../../../skills/git-advanced/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 2 |
| [`git-operations`](../../../skills/git-operations/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 5 |
| [`i18n-localization`](../../../skills/i18n-localization/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`java-architecture`](../../../skills/java-architecture/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 1 |
| [`java-development`](../../../skills/java-development/SKILL.md) | 1 | 無；套件可單裝 | 12 | 0 | 0 |
| [`javascript-development`](../../../skills/javascript-development/SKILL.md) | 1 | 無；套件可單裝 | 3 | 4 | 0 |
| [`jquery-4-migration`](../../../skills/jquery-4-migration/SKILL.md) | 1 | 無；套件可單裝 | 1 | 1 | 1 |
| [`jquery-development`](../../../skills/jquery-development/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 3 |
| [`jquery-version-migration`](../../../skills/jquery-version-migration/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 2 |
| [`jvm-build-tooling`](../../../skills/jvm-build-tooling/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 2 |
| [`karpathy-guidelines`](../../../skills/karpathy-guidelines/SKILL.md) | 1 | 無；套件可單裝 | 1 | 4 | 4 |
| [`logging-patterns`](../../../skills/logging-patterns/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`project-architecture-review`](../../../skills/project-architecture-review/SKILL.md) | 1 | 無；套件可單裝 | 12 | 0 | 1 |
| [`python-automation-scripting`](../../../skills/python-automation-scripting/SKILL.md) | 2 | [`python-development`](../../../skills/python-development/SKILL.md) | 0 | 0 | 2 |
| [`python-concurrency-patterns`](../../../skills/python-concurrency-patterns/SKILL.md) | 2 | [`python-development`](../../../skills/python-development/SKILL.md) | 2 | 0 | 0 |
| [`python-development`](../../../skills/python-development/SKILL.md) | 1 | 無；套件可單裝 | 10 | 0 | 3 |
| [`python-packaging-release`](../../../skills/python-packaging-release/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`typescript-development`](../../../skills/typescript-development/SKILL.md) | 1 | 無；套件可單裝 | 12 | 0 | 2 |

</details>

<details>
<summary>frontend-design — 34 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`animation-best-practices`](../../../skills/animation-best-practices/SKILL.md) | 2 | [`frontend-design`](../../../skills/frontend-design/SKILL.md) | 2 | 0 | 0 |
| [`color-font-skill`](../../../skills/color-font-skill/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 1 |
| [`command-palette`](../../../skills/command-palette/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`css-development`](../../../skills/css-development/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 3 |
| [`dashboard-design`](../../../skills/dashboard-design/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 2 |
| [`design-consultation`](../../../skills/design-consultation/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 2 |
| [`design-system`](../../../skills/design-system/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 2 |
| [`design-system-patterns`](../../../skills/design-system-patterns/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`figma-to-code`](../../../skills/figma-to-code/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 4 |
| [`frontend-design`](../../../skills/frontend-design/SKILL.md) | 1 | 無；套件可單裝 | 9 | 2 | 2 |
| [`frontend-stack-inference`](../../../skills/frontend-stack-inference/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 9 |
| [`hotkey`](../../../skills/hotkey/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 0 |
| [`image-to-code`](../../../skills/image-to-code/SKILL.md) | 1 | 無；套件可單裝 | 9 | 0 | 2 |
| [`image-to-code-assets`](../../../skills/image-to-code-assets/SKILL.md) | 2 | [`image-utils`](../../../skills/image-utils/SKILL.md) | 2 | 0 | 1 |
| [`interaction-patterns`](../../../skills/interaction-patterns/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`legacy-frontend-modernization`](../../../skills/legacy-frontend-modernization/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 2 |
| [`lobe-icons-usage`](../../../skills/lobe-icons-usage/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 3 |
| [`lobe-ui-development`](../../../skills/lobe-ui-development/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 2 |
| [`nextjs-development`](../../../skills/nextjs-development/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 0 |
| [`nuxt-development`](../../../skills/nuxt-development/SKILL.md) | 1 | 無；套件可單裝 | 8 | 0 | 0 |
| [`pinia-state-management`](../../../skills/pinia-state-management/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`react-ui-patterns`](../../../skills/react-ui-patterns/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`responsive-design`](../../../skills/responsive-design/SKILL.md) | 2 | [`frontend-design`](../../../skills/frontend-design/SKILL.md) | 2 | 0 | 2 |
| [`shadcn-ui`](../../../skills/shadcn-ui/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 0 |
| [`tailwind-development`](../../../skills/tailwind-development/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 5 |
| [`tailwind-patterns`](../../../skills/tailwind-patterns/SKILL.md) | 2 | [`frontend-design`](../../../skills/frontend-design/SKILL.md) | 1 | 0 | 2 |
| [`taste-skill`](../../../skills/taste-skill/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 5 |
| [`ui-styling`](../../../skills/ui-styling/SKILL.md) | 2 | [`frontend-design`](../../../skills/frontend-design/SKILL.md) | 3 | 0 | 2 |
| [`vite`](../../../skills/vite/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 2 |
| [`vue-composition-api`](../../../skills/vue-composition-api/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 0 |
| [`vue-development`](../../../skills/vue-development/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 3 |
| [`vue-router-patterns`](../../../skills/vue-router-patterns/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`web-page-design-to-code`](../../../skills/web-page-design-to-code/SKILL.md) | 3 | [`frontend-design`](../../../skills/frontend-design/SKILL.md), [`webapp-testing`](../../../skills/webapp-testing/SKILL.md) | 9 | 0 | 3 |
| [`website-redesign-to-code`](../../../skills/website-redesign-to-code/SKILL.md) | 7 | [`accessibility-testing`](../../../skills/accessibility-testing/SKILL.md), [`frontend-design`](../../../skills/frontend-design/SKILL.md), [`frontend-stack-inference`](../../../skills/frontend-stack-inference/SKILL.md), [`frontend-testing`](../../../skills/frontend-testing/SKILL.md), [`visual-regression-testing`](../../../skills/visual-regression-testing/SKILL.md), [`webapp-testing`](../../../skills/webapp-testing/SKILL.md) | 8 | 0 | 3 |

</details>

<details>
<summary>threejs-graphics — 62 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`threejs-accessibility`](../../../skills/threejs-accessibility/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 1 | 0 | 1 |
| [`threejs-animation-system`](../../../skills/threejs-animation-system/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 0 |
| [`threejs-assets-gltf`](../../../skills/threejs-assets-gltf/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 2 |
| [`threejs-atmosphere-aerial-perspective`](../../../skills/threejs-atmosphere-aerial-perspective/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-bloom`](../../../skills/threejs-bloom/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-cad-bim`](../../../skills/threejs-cad-bim/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-camera-direction`](../../../skills/threejs-camera-direction/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-capture-recording`](../../../skills/threejs-capture-recording/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-csg-modeling`](../../../skills/threejs-csg-modeling/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-data-visualization`](../../../skills/threejs-data-visualization/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 2 |
| [`threejs-deformable-simulation`](../../../skills/threejs-deformable-simulation/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 1 | 無；套件可單裝 | 64 | 0 | 0 |
| [`threejs-editor-authoring`](../../../skills/threejs-editor-authoring/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 1 | 0 | 0 |
| [`threejs-exposure-color-grading`](../../../skills/threejs-exposure-color-grading/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-framework-integrations`](../../../skills/threejs-framework-integrations/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 1 | 0 | 1 |
| [`threejs-gameplay-systems`](../../../skills/threejs-gameplay-systems/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-geometry`](../../../skills/threejs-geometry/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 2 |
| [`threejs-image-pipeline`](../../../skills/threejs-image-pipeline/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 0 |
| [`threejs-interaction-input`](../../../skills/threejs-interaction-input/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-large-worlds-geospatial`](../../../skills/threejs-large-worlds-geospatial/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-materials-lighting`](../../../skills/threejs-materials-lighting/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-math-transforms`](../../../skills/threejs-math-transforms/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-navigation-crowds`](../../../skills/threejs-navigation-crowds/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-networked-experiences`](../../../skills/threejs-networked-experiences/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-offscreen-workers`](../../../skills/threejs-offscreen-workers/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-parallax-occlusion-mapping`](../../../skills/threejs-parallax-occlusion-mapping/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-path-tracing`](../../../skills/threejs-path-tracing/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-performance-memory`](../../../skills/threejs-performance-memory/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-physics-audio`](../../../skills/threejs-physics-audio/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 0 |
| [`threejs-physics-simulation`](../../../skills/threejs-physics-simulation/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 1 |
| [`threejs-point-clouds-splats`](../../../skills/threejs-point-clouds-splats/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-postprocessing`](../../../skills/threejs-postprocessing/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-precipitation-surfaces`](../../../skills/threejs-precipitation-surfaces/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-procedural-animation`](../../../skills/threejs-procedural-animation/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-procedural-architecture`](../../../skills/threejs-procedural-architecture/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-procedural-characters`](../../../skills/threejs-procedural-characters/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |
| [`threejs-procedural-fields`](../../../skills/threejs-procedural-fields/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-procedural-geometry`](../../../skills/threejs-procedural-geometry/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-procedural-materials`](../../../skills/threejs-procedural-materials/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-procedural-planets`](../../../skills/threejs-procedural-planets/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-procedural-vegetation`](../../../skills/threejs-procedural-vegetation/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-procedural-vfx`](../../../skills/threejs-procedural-vfx/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-project-architecture`](../../../skills/threejs-project-architecture/SKILL.md) | 1 | 無；套件可單裝 | 7 | 0 | 0 |
| [`threejs-raymarched-space-effects`](../../../skills/threejs-raymarched-space-effects/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-react-three-fiber`](../../../skills/threejs-react-three-fiber/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-rendering-platforms`](../../../skills/threejs-rendering-platforms/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 1 |
| [`threejs-scene-lifecycle`](../../../skills/threejs-scene-lifecycle/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-screen-space-ambient-occlusion`](../../../skills/threejs-screen-space-ambient-occlusion/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-security-deployment`](../../../skills/threejs-security-deployment/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-shaders`](../../../skills/threejs-shaders/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-shadow-systems`](../../../skills/threejs-shadow-systems/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-spatial-audio`](../../../skills/threejs-spatial-audio/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-spectral-ocean`](../../../skills/threejs-spectral-ocean/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-temporal-surfaces`](../../../skills/threejs-temporal-surfaces/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-testing-debugging`](../../../skills/threejs-testing-debugging/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-ui-overlays`](../../../skills/threejs-ui-overlays/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-version-migration`](../../../skills/threejs-version-migration/SKILL.md) | 2 | [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 2 | 0 | 0 |
| [`threejs-visual-validation`](../../../skills/threejs-visual-validation/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 0 |
| [`threejs-volumetric-clouds`](../../../skills/threejs-volumetric-clouds/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-water-optics`](../../../skills/threejs-water-optics/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-webgpu-tsl`](../../../skills/threejs-webgpu-tsl/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`threejs-webxr-accessibility`](../../../skills/threejs-webxr-accessibility/SKILL.md) | 3 | [`threejs-accessibility`](../../../skills/threejs-accessibility/SKILL.md), [`threejs-development`](../../../skills/threejs-development/SKILL.md) | 0 | 0 | 0 |

</details>

<details>
<summary>backend-data — 26 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`api-contract-design`](../../../skills/api-contract-design/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 2 |
| [`auth-integration`](../../../skills/auth-integration/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`data-pipeline-orchestration`](../../../skills/data-pipeline-orchestration/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`database-design`](../../../skills/database-design/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 3 |
| [`database-migration-workflow`](../../../skills/database-migration-workflow/SKILL.md) | 2 | [`verification-before-completion`](../../../skills/verification-before-completion/SKILL.md) | 10 | 0 | 1 |
| [`event-sourcing-cqrs`](../../../skills/event-sourcing-cqrs/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`firebase-development`](../../../skills/firebase-development/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`jpa-hibernate-development`](../../../skills/jpa-hibernate-development/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 2 |
| [`mongodb-development`](../../../skills/mongodb-development/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`mybatis-development`](../../../skills/mybatis-development/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 2 |
| [`openapi-spec-generation`](../../../skills/openapi-spec-generation/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`postgres-operations`](../../../skills/postgres-operations/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 0 |
| [`prisma-drizzle`](../../../skills/prisma-drizzle/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 0 |
| [`python-api-client-development`](../../../skills/python-api-client-development/SKILL.md) | 2 | [`python-development`](../../../skills/python-development/SKILL.md) | 4 | 0 | 1 |
| [`python-backend-development`](../../../skills/python-backend-development/SKILL.md) | 2 | [`python-development`](../../../skills/python-development/SKILL.md) | 3 | 0 | 2 |
| [`python-data-engineering`](../../../skills/python-data-engineering/SKILL.md) | 2 | [`python-development`](../../../skills/python-development/SKILL.md) | 0 | 0 | 3 |
| [`redis-upstash`](../../../skills/redis-upstash/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`spring-cloud-microservices`](../../../skills/spring-cloud-microservices/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 1 |
| [`spring-development`](../../../skills/spring-development/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 0 |
| [`spring-security`](../../../skills/spring-security/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 3 |
| [`spring-webflux`](../../../skills/spring-webflux/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 2 |
| [`sql-best-practices`](../../../skills/sql-best-practices/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`stripe-payments`](../../../skills/stripe-payments/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`supabase-development`](../../../skills/supabase-development/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`temporal-workflow-engineering`](../../../skills/temporal-workflow-engineering/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`wordpress-development`](../../../skills/wordpress-development/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 3 |

</details>

<details>
<summary>ai-llm — 5 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`llm-application-delivery-workflow`](../../../skills/llm-application-delivery-workflow/SKILL.md) | 1 | 無；套件可單裝 | 16 | 2 | 0 |
| [`llm-evals`](../../../skills/llm-evals/SKILL.md) | 1 | 無；套件可單裝 | 7 | 0 | 0 |
| [`openai-api-development`](../../../skills/openai-api-development/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 0 |
| [`prompt-engineering`](../../../skills/prompt-engineering/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 6 |
| [`rag-vector-search`](../../../skills/rag-vector-search/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 0 |

</details>

<details>
<summary>mobile-desktop — 7 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`app-store-release`](../../../skills/app-store-release/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`desktop-development`](../../../skills/desktop-development/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`flutter-development`](../../../skills/flutter-development/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 0 |
| [`ios-architecture`](../../../skills/ios-architecture/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`react-native-expo`](../../../skills/react-native-expo/SKILL.md) | 1 | 無；套件可單裝 | 4 | 1 | 0 |
| [`swift-concurrency`](../../../skills/swift-concurrency/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 2 |
| [`swiftui-development`](../../../skills/swiftui-development/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |

</details>

<details>
<summary>testing-quality — 27 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`accessibility-testing`](../../../skills/accessibility-testing/SKILL.md) | 1 | 無；套件可單裝 | 3 | 1 | 0 |
| [`api-contract-testing`](../../../skills/api-contract-testing/SKILL.md) | 1 | 無；套件可單裝 | 4 | 1 | 2 |
| [`browser-compatibility-testing`](../../../skills/browser-compatibility-testing/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 1 |
| [`chrome-devtools-debugging`](../../../skills/chrome-devtools-debugging/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 1 |
| [`code-review`](../../../skills/code-review/SKILL.md) | 1 | 無；套件可單裝 | 12 | 0 | 2 |
| [`e2e-testing-patterns`](../../../skills/e2e-testing-patterns/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 3 |
| [`frontend-code-review`](../../../skills/frontend-code-review/SKILL.md) | 1 | 無；套件可單裝 | 1 | 1 | 1 |
| [`frontend-design-review`](../../../skills/frontend-design-review/SKILL.md) | 1 | 無；套件可單裝 | 0 | 3 | 0 |
| [`frontend-testing`](../../../skills/frontend-testing/SKILL.md) | 1 | 無；套件可單裝 | 1 | 1 | 1 |
| [`github-code-review`](../../../skills/github-code-review/SKILL.md) | 2 | [`code-review`](../../../skills/code-review/SKILL.md) | 1 | 0 | 2 |
| [`github-inline-review`](../../../skills/github-inline-review/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 1 |
| [`java-testing`](../../../skills/java-testing/SKILL.md) | 1 | 無；套件可單裝 | 5 | 1 | 0 |
| [`mobile-app-testing`](../../../skills/mobile-app-testing/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 1 |
| [`pipeline-review`](../../../skills/pipeline-review/SKILL.md) | 2 | [`code-review`](../../../skills/code-review/SKILL.md) | 4 | 2 | 0 |
| [`python-observability-debugging`](../../../skills/python-observability-debugging/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 1 |
| [`python-testing-engineering`](../../../skills/python-testing-engineering/SKILL.md) | 2 | [`python-development`](../../../skills/python-development/SKILL.md) | 2 | 1 | 0 |
| [`react-perf`](../../../skills/react-perf/SKILL.md) | 1 | 無；套件可單裝 | 0 | 2 | 0 |
| [`receiving-code-review`](../../../skills/receiving-code-review/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 0 |
| [`swift-testing`](../../../skills/swift-testing/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 2 |
| [`systematic-debugging`](../../../skills/systematic-debugging/SKILL.md) | 1 | 無；套件可單裝 | 11 | 1 | 1 |
| [`test-driven-development`](../../../skills/test-driven-development/SKILL.md) | 1 | 無；套件可單裝 | 12 | 0 | 0 |
| [`testing-strategy`](../../../skills/testing-strategy/SKILL.md) | 1 | 無；套件可單裝 | 7 | 0 | 5 |
| [`verification-before-completion`](../../../skills/verification-before-completion/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 1 |
| [`visual-regression-testing`](../../../skills/visual-regression-testing/SKILL.md) | 1 | 無；套件可單裝 | 1 | 1 | 4 |
| [`vue-debug-guides`](../../../skills/vue-debug-guides/SKILL.md) | 1 | 無；套件可單裝 | 1 | 1 | 1 |
| [`vue-testing`](../../../skills/vue-testing/SKILL.md) | 1 | 無；套件可單裝 | 2 | 2 | 0 |
| [`webapp-testing`](../../../skills/webapp-testing/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 2 |

</details>

<details>
<summary>security-governance — 7 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`agent-action-governance`](../../../skills/agent-action-governance/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`python-security-hardening`](../../../skills/python-security-hardening/SKILL.md) | 2 | [`python-development`](../../../skills/python-development/SKILL.md) | 3 | 0 | 2 |
| [`reverse-engineering`](../../../skills/reverse-engineering/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`security-code-review`](../../../skills/security-code-review/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 2 |
| [`security-scanning`](../../../skills/security-scanning/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`threat-modeling`](../../../skills/threat-modeling/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`vulnerability-variant-analysis`](../../../skills/vulnerability-variant-analysis/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 1 |

</details>

<details>
<summary>cloud-devops — 14 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`aws-operations`](../../../skills/aws-operations/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`cloudflare-development`](../../../skills/cloudflare-development/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`deployment-operations`](../../../skills/deployment-operations/SKILL.md) | 1 | 無；套件可單裝 | 4 | 1 | 0 |
| [`docker-development`](../../../skills/docker-development/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 0 |
| [`github-actions-ci`](../../../skills/github-actions-ci/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`github-operations`](../../../skills/github-operations/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 2 |
| [`incident-response-postmortems`](../../../skills/incident-response-postmortems/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`kubernetes-operations`](../../../skills/kubernetes-operations/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`observability-engineering`](../../../skills/observability-engineering/SKILL.md) | 1 | 無；套件可單裝 | 4 | 1 | 1 |
| [`repo-ready`](../../../skills/repo-ready/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`service-mesh-engineering`](../../../skills/service-mesh-engineering/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`terminal-ops`](../../../skills/terminal-ops/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 0 |
| [`terraform-infrastructure`](../../../skills/terraform-infrastructure/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 0 |
| [`vercel-deployment`](../../../skills/vercel-deployment/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |

</details>

<details>
<summary>agent-skill-tooling — 17 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`agent-creator-design`](../../../skills/agent-creator-design/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 2 |
| [`agent-instructions-authoring`](../../../skills/agent-instructions-authoring/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 5 |
| [`agent-introspection-debugging`](../../../skills/agent-introspection-debugging/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 0 |
| [`agents-sdk-development`](../../../skills/agents-sdk-development/SKILL.md) | 1 | 無；套件可單裝 | 4 | 1 | 1 |
| [`mcp-creator-design`](../../../skills/mcp-creator-design/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 3 |
| [`mcp-ops`](../../../skills/mcp-ops/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 4 |
| [`skill-audit`](../../../skills/skill-audit/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 2 |
| [`skill-creator-design`](../../../skills/skill-creator-design/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 2 |
| [`skill-executor`](../../../skills/skill-executor/SKILL.md) | 1 | 無；套件可單裝 | 8 | 1 | 0 |
| [`skill-explorer`](../../../skills/skill-explorer/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 9 |
| [`skill-gap-analyzer`](../../../skills/skill-gap-analyzer/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 2 |
| [`skill-lint`](../../../skills/skill-lint/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`skill-scan`](../../../skills/skill-scan/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`skill-security-review`](../../../skills/skill-security-review/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 1 |
| [`skillctl`](../../../skills/skillctl/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 3 |
| [`skillforge`](../../../skills/skillforge/SKILL.md) | 1 | 無；套件可單裝 | 6 | 1 | 0 |
| [`subagent-architecture`](../../../skills/subagent-architecture/SKILL.md) | 1 | 無；套件可單裝 | 5 | 1 | 1 |

</details>

<details>
<summary>browser-automation — 4 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`agent-reach-ops`](../../../skills/agent-reach-ops/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`browser-automation`](../../../skills/browser-automation/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 3 |
| [`playwright-automation`](../../../skills/playwright-automation/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 3 |
| [`python-web-scraping`](../../../skills/python-web-scraping/SKILL.md) | 2 | [`python-development`](../../../skills/python-development/SKILL.md) | 1 | 0 | 3 |

</details>

<details>
<summary>media-creative — 20 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`ai-image-prompt-design`](../../../skills/ai-image-prompt-design/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 0 |
| [`ai-image-prompts-skill`](../../../skills/ai-image-prompts-skill/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 2 |
| [`ai-video-generation`](../../../skills/ai-video-generation/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`ai-video-prompting`](../../../skills/ai-video-prompting/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`audio-generation`](../../../skills/audio-generation/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 1 |
| [`audio-transcription`](../../../skills/audio-transcription/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 0 |
| [`avatar-video-generation`](../../../skills/avatar-video-generation/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 1 |
| [`baoyu-image-gen`](../../../skills/baoyu-image-gen/SKILL.md) | 1 | 無；套件可單裝 | 1 | 2 | 0 |
| [`image-utils`](../../../skills/image-utils/SKILL.md) | 1 | 無；套件可單裝 | 1 | 1 | 2 |
| [`logo-design`](../../../skills/logo-design/SKILL.md) | 1 | 無；套件可單裝 | 1 | 0 | 3 |
| [`remotion-video-toolkit`](../../../skills/remotion-video-toolkit/SKILL.md) | 1 | 無；套件可單裝 | 3 | 1 | 1 |
| [`short-video-script`](../../../skills/short-video-script/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 2 |
| [`stable-diffusion-image-generation`](../../../skills/stable-diffusion-image-generation/SKILL.md) | 1 | 無；套件可單裝 | 1 | 1 | 1 |
| [`storyboard-creation`](../../../skills/storyboard-creation/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 2 |
| [`subtitle-captions`](../../../skills/subtitle-captions/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 1 |
| [`text-to-speech`](../../../skills/text-to-speech/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`ugc-video-ads`](../../../skills/ugc-video-ads/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`video-edit`](../../../skills/video-edit/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 3 |
| [`video-production-workflow`](../../../skills/video-production-workflow/SKILL.md) | 1 | 無；套件可單裝 | 13 | 0 | 0 |
| [`vlog-production`](../../../skills/vlog-production/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 1 |

</details>

<details>
<summary>writing-content — 12 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`answer-writing`](../../../skills/answer-writing/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 4 |
| [`api-doc-comments`](../../../skills/api-doc-comments/SKILL.md) | 1 | 無；套件可單裝 | 2 | 1 | 1 |
| [`article-writing`](../../../skills/article-writing/SKILL.md) | 1 | 無；套件可單裝 | 5 | 1 | 2 |
| [`brand-voice`](../../../skills/brand-voice/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 1 |
| [`content-repurposing`](../../../skills/content-repurposing/SKILL.md) | 1 | 無；套件可單裝 | 11 | 0 | 1 |
| [`git-readme-writer`](../../../skills/git-readme-writer/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 1 |
| [`humanizer`](../../../skills/humanizer/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 3 |
| [`markdown-writer`](../../../skills/markdown-writer/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 3 |
| [`product-pitch-writing`](../../../skills/product-pitch-writing/SKILL.md) | 1 | 無；套件可單裝 | 5 | 1 | 1 |
| [`specification-authoring`](../../../skills/specification-authoring/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 0 |
| [`summary-ops`](../../../skills/summary-ops/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 3 |
| [`ux-writing`](../../../skills/ux-writing/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 3 |

</details>

<details>
<summary>research-product — 7 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`autoresearch`](../../../skills/autoresearch/SKILL.md) | 1 | 無；套件可單裝 | 5 | 1 | 0 |
| [`design-intelligence-search`](../../../skills/design-intelligence-search/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`market-research`](../../../skills/market-research/SKILL.md) | 1 | 無；套件可單裝 | 6 | 0 | 0 |
| [`product-experimentation`](../../../skills/product-experimentation/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 2 |
| [`solution-discovery`](../../../skills/solution-discovery/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 4 |
| [`ux-research`](../../../skills/ux-research/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 0 |
| [`web-research-ops`](../../../skills/web-research-ops/SKILL.md) | 1 | 無；套件可單裝 | 5 | 0 | 1 |

</details>

<details>
<summary>documents-productivity — 11 Skills</summary>

| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |
|---|---:|---|---:|---:|---:|
| [`data-organization-system`](../../../skills/data-organization-system/SKILL.md) | 1 | 無；套件可單裝 | 9 | 0 | 0 |
| [`document-to-markdown`](../../../skills/document-to-markdown/SKILL.md) | 2 | [`markdown-writer`](../../../skills/markdown-writer/SKILL.md) | 3 | 0 | 1 |
| [`downloads-desktop-cleanup`](../../../skills/downloads-desktop-cleanup/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 3 |
| [`drawio-skill`](../../../skills/drawio-skill/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 0 |
| [`file-organizer`](../../../skills/file-organizer/SKILL.md) | 1 | 無；套件可單裝 | 4 | 0 | 3 |
| [`folder-structure-cleanup`](../../../skills/folder-structure-cleanup/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 2 |
| [`pdf-operations`](../../../skills/pdf-operations/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 1 |
| [`presentation-ops`](../../../skills/presentation-ops/SKILL.md) | 1 | 無；套件可單裝 | 3 | 0 | 0 |
| [`spreadsheet-ops`](../../../skills/spreadsheet-ops/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 0 |
| [`word-document-ops`](../../../skills/word-document-ops/SKILL.md) | 1 | 無；套件可單裝 | 2 | 0 | 1 |
| [`workspace-google-ops`](../../../skills/workspace-google-ops/SKILL.md) | 1 | 無；套件可單裝 | 0 | 0 | 3 |

</details>
