# CraftRoster

[![Validate](https://github.com/HsinPu/CraftRoster/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/HsinPu/CraftRoster/actions/workflows/validate.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
![Skills](https://img.shields.io/badge/Skills-286-7c3aed)
![Agents](https://img.shields.io/badge/Agents-237-2563eb)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=nodedotjs&logoColor=white)

**可跨工具安裝、查詢與驗證的 AI Agent／Skill catalog。**

CraftRoster 收錄 237 個專業 Agents 與 286 個可重用 Skills，可安裝到 Codex、Claude Code、Cursor、VS Code／GitHub Copilot 與 OpenCode。專案同時提供免 Node.js 安裝器、五平台 Agent adapters、ownership-aware 更新機制，以及離線 catalog CLI。

CraftRoster 是 catalog 與 distribution layer，**不是**另一套 Agent runtime 或 orchestration framework；它讓現有 coding agent 直接取得可攜、可追溯、可驗證的角色與工作流程。

[快速開始](#快速開始) · [支援平台](#支援平台與安裝位置) · [Catalog CLI](#catalog-cli) · [Agents](#agents) · [Skills](#skills) · [開發與驗證](#開發與驗證) · [Issues](https://github.com/HsinPu/CraftRoster/issues)

## 專案內容

| 類型 | 數量 | 用途 | Source of truth |
|---|---:|---|---|
| Skills | **286 Skills**／16 類 | 可重用的工作流程、規範、工具指引與領域知識 | [`skills/<name>/SKILL.md`](skills/) |
| Agents | 237／31 類 | 可委派的專業角色，包含權限、限制與輸出契約 | [`agents/<role>.md`](agents/) |
| Codex adapters | 237 | Codex custom Agent TOML | [`adapters/codex/`](adapters/codex/) |
| Claude adapters | 237 | Claude Code subagent Markdown | [`adapters/claude/`](adapters/claude/) |
| Cursor adapters | 237 | Cursor subagent Markdown | [`adapters/cursor/`](adapters/cursor/) |
| Copilot adapters | 237 | VS Code／GitHub Copilot `.agent.md` | [`adapters/copilot/`](adapters/copilot/) |
| OpenCode adapters | 237 | OpenCode subagent Markdown | [`adapters/opencode/`](adapters/opencode/) |
| All pinned Agent references | 329 paths／24 repositories | 固定 commit、tree、路徑與授權證據 | [`agent-reference-sources.json`](scripts/data/agent-reference-sources.json) |
| Additional Agent references | 131 paths／23 repositories | 非 `wshobson/agents` 的逐角色 reference metadata | [`agents/`](agents/) |

| | Agent | Skill |
|---|---|---|
| 核心概念 | 可被委派任務的專業角色 | 套用到任務的操作知識或工作流程 |
| 典型例子 | [`code-reviewer`](agents/code-reviewer.md)、[`debugger`](agents/debugger.md)、[`ios-developer`](agents/ios-developer.md) | [`code-review`](skills/code-review/)、[`python-development`](skills/python-development/)、[`ios-architecture`](skills/ios-architecture/) |
| 安裝單位 | 平台專用 adapter 與 ownership sidecar | 含 `SKILL.md` 及選用 references、scripts、assets 的資料夾 |
| 權限 | 明確標示 `read-only` 或 `workspace-write` | 由使用它的主 Agent／runtime 決定 |

> [!NOTE]
> Agents 與 Skills 可以獨立使用。Agent 可引用多個相關 Skills；主 Agent 也能直接套用 Skill，不必先建立 subagent。

## 快速開始

以下範例以 **Codex 使用者層級全域安裝**為預設，不需要管理員／`sudo`，一般安裝也不需要 Node.js。

### 一次安裝全部 Skills、Agents 與主動委派

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; $installer = [scriptblock]::Create($s); & $installer -Target codex -Type skill; & $installer -Target codex -Type agent -EnableAutoDelegation'
```

Linux／macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target codex --type skill && curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target codex --type agent --enable-auto-delegation
```

這會安裝全部 286 個 Skills、237 個 Agents，並為 Codex 啟用全域主動委派。安裝完成後請開啟新的 Codex 工作階段，讓 runtime 重新載入內容。

> [!NOTE]
> Codex 的初始 Skill metadata 清單最多使用 context window 的 2%，context 大小未知時上限為 8,000 字元；大量全域 Skills 可能先被縮短描述，再有部分項目被省略。檔案仍會保留在安裝目錄，但若需要保證載入，請明確使用 `$skill-name`。例如 Three.js 網頁工作可輸入 `$threejs-development 請用 Three.js 建立單檔 HTML`。CraftRoster 的 frontend、CSS 與 JavaScript 入口會在任務確實涉及 3D 場景或整合邊界時路由至 Three.js；repo 其他位置有 `three` 本身不足以觸發。部分安裝下請先確認條件依賴可用。詳見 [OpenAI Build skills](https://learn.chatgpt.com/docs/build-skills.md)。

> [!TIP]
> 上述 one-liner 會取用 `main` 當下的 script 與 archive，不是固定且簽章的 release artifact。若需要先審核或固定版本，請 clone 指定 commit、檢查 [`install.ps1`](scripts/install.ps1) 或 [`install.sh`](scripts/install.sh)，再使用[本機 checkout](#從本機-checkout-安裝)。

### 只安裝單一元件

Windows PowerShell：

```powershell
# Skill
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; & ([scriptblock]::Create($s)) -Target codex -Type skill -Name python-development'

# Agent
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; & ([scriptblock]::Create($s)) -Target codex -Type agent -Name code-reviewer'
```

Linux／macOS：

```bash
# Skill
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target codex --type skill --name python-development

# Agent
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target codex --type agent --name code-reviewer
```

省略 `Name`／`--name` 會安裝該 Type 的全部元件。全量 Agent 安裝會一起安裝 `subagent-architecture`；普通的單一 Agent 安裝不會。

### 依分類安裝

如果不需要完整 catalog，可以使用 Skill 或 Agent 現有的分類。Skill 分類安裝會選取該分類元件，再補齊必要依賴（可能跨分類）；條件依賴不自動安裝。分類 Agent 安裝不會自動加入 `subagent-architecture`，除非同時指定主動委派。

Windows PowerShell：

```powershell
# 安裝 Frontend & Design Skills
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; & ([scriptblock]::Create($s)) -Target codex -Type skill -Category frontend-design'

# 安裝 Quality Assurance Agents，並先預覽
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; & ([scriptblock]::Create($s)) -Target codex -Type agent -Category quality-assurance -DryRun'
```

Linux／macOS：

```bash
# 安裝 Frontend & Design Skills
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target codex --type skill --category frontend-design

# 安裝 Quality Assurance Agents，並先預覽
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target codex --type agent --category quality-assurance --dry-run
```

確認預演內容後，移除 `-DryRun`／`--dry-run` 即可正式安裝。也可先使用 catalog CLI 查看內容，例如 `node craftroster-cli.js list --type agent --category quality-assurance`。可用分類請見 [Agents](#agents) 與 [Skills](#skills)；分類安裝仍會下載完整 repository archive，但只會把所選分類寫入安裝目錄，因此能減少全域檔案數與 runtime 載入內容。

### 安裝到目前專案

先切換到專案／workspace root。`project` target 直接使用目前工作目錄，不會自行尋找 Git root。

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -Command '$s = irm https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.ps1; $installer = [scriptblock]::Create($s); & $installer -Target project -Type skill; & $installer -Target project -Type agent'
```

Linux／macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target project --type skill && curl -fsSL https://raw.githubusercontent.com/HsinPu/CraftRoster/main/scripts/install.sh | bash -s -- --target project --type agent
```

<details>
<summary><strong>從本機 checkout 安裝</strong></summary>

```bash
git clone https://github.com/HsinPu/CraftRoster.git
cd CraftRoster
```

Windows PowerShell：

```powershell
.\scripts\install.ps1 -Target codex -Type skill -SourceDir .
.\scripts\install.ps1 -Target codex -Type agent -SourceDir . -EnableAutoDelegation
```

Linux／macOS：

```bash
bash scripts/install.sh --target codex --type skill --source-dir .
bash scripts/install.sh --target codex --type agent --source-dir . --enable-auto-delegation
```

</details>

## 支援平台與安裝位置

安裝器接受 `codex`、`claude`、`cursor`、`vscode`、`copilot`、`opencode` 與 `project`。除了 `project` 之外，預設都是使用者層級安裝。

| Target | Skill 預設位置 | Agent 預設位置 | Agent 格式 |
|---|---|---|---|
| `codex` | `$CODEX_HOME/skills/`，預設 `~/.codex/skills/` | `$CODEX_HOME/agents/`，預設 `~/.codex/agents/` | `<role>.toml` |
| `claude` | `~/.claude/skills/` | `~/.claude/agents/` | `<role>.md` |
| `cursor` | `~/.cursor/skills/` | `~/.cursor/agents/` | `<role>.md` |
| `vscode` | `~/.copilot/skills/` | `~/.copilot/agents/` | `<role>.agent.md` |
| `copilot` | `~/.copilot/skills/` | `~/.copilot/agents/` | `<role>.agent.md` |
| `opencode` | `<OpenCode config>/skills/` | `<OpenCode config>/agents/` | `<role>.md` |
| `project` | `.agents/skills/` + `.claude/skills/` | 五個平台各自的 project 目錄 | 依平台產生 |

`vscode` 是 `copilot` alias，兩者共用路徑與 ownership identity。OpenCode 依序使用 `OPENCODE_CONFIG_DIR`、`XDG_CONFIG_HOME/opencode` 或 `~/.config/opencode`。

`project` target 會建立：

```text
<project-root>/
├─ .agents/skills/       # Codex、Cursor、VS Code/Copilot、OpenCode
├─ .claude/skills/       # Claude Code compatibility mirror
├─ .codex/agents/        # Codex TOML
├─ .claude/agents/       # Claude Markdown
├─ .cursor/agents/       # Cursor Markdown
├─ .github/agents/       # VS Code/Copilot .agent.md
└─ .opencode/agents/     # OpenCode Markdown
```

### 安裝器選項

| 用途 | PowerShell | Bash | 說明 |
|---|---|---|---|
| 目標 | `-Target` | `--target` | 必填 |
| 類型 | `-Type skill\|agent` | `--type skill\|agent` | 預設 `skill` |
| 單一元件 | `-Name` | `--name` | 與分類互斥 |
| 分類 | `-Category` | `--category` | 與單一元件互斥；只安裝指定分類 |
| 遠端 branch | `-Branch` | `--branch` | 預設 `main` |
| Ownership repository | `-Repo` | `--repo` | 預設 `HsinPu/CraftRoster` |
| 自訂位置 | `-InstallDir` | `--dir` | 一般 target 是直接目的地；`project` 是 project root |
| 本機來源 | `-SourceDir` | `--source-dir` | 從 checkout 安裝，不下載 archive |
| 主動委派 | `-EnableAutoDelegation` | `--enable-auto-delegation` | 僅全域 Codex／OpenCode Agent target |
| 預演 | `-DryRun` | `--dry-run` | 只顯示計畫，不寫入 |
| 強制接管 | `-Force` | `--force` | 略過 ownership／digest 保護 |

PowerShell 也接受 `-Agent`＝`-Target`、`-Skill`＝`-Name`；Bash 另接受 `--agent`、`--skill` 與 `--agent-profile` aliases。

`SourceDir`／`--source-dir` 會直接使用指定 checkout 的內容，不會切換或驗證 `Branch`。`Repo` 仍會寫入 ownership metadata，並影響舊版 migration identity。

### 執行需求

| 功能 | 需求 |
|---|---|
| PowerShell installer | Windows PowerShell／PowerShell；只有遠端安裝需要網路 |
| Bash installer | Bash、`mktemp`、`cksum`、`od`、`sha256sum` 或 `shasum`；遠端安裝另需 `curl` 與 `tar` |
| OpenCode 既有 JSON 合併 | Python 3 或 Node.js 擇一；新建最小 config 不需要 |
| Catalog CLI、產生器與驗證 | Node.js 22 或更新版本 |
| Installer smoke tests | Node.js 22 或更新版本及對應 shell |

## 安全更新與舊版升級

重新執行相同命令就是更新，不需要先刪除舊版本。安裝器會先檢查 ownership，再逐元件以 staged／atomic 寫入方式更新。

| 既有狀態 | 行為 |
|---|---|
| 目標不存在 | `install` |
| Repository、component、name、target 與 metadata 相符 | `update` |
| 可精確驗證的官方舊 metadata、digest、target 或 sidecar | `migrate-update` |
| Agent 檔缺失，但 sidecar identity 完整吻合 | `repair` |
| 同名內容沒有 metadata、來源不同或已被修改 | 拒絕覆蓋 |
| 明確使用 Force | `force-replace` |

Ownership metadata：

- Skill：`<skill>/.skill-meta.json`，並保存 canonical `contentSha256`。
- Agent：`<agent-file>.craftroster.json`，另外核對 `id + adapter`。
- 全量安裝會先預檢所有目的地；每個元件再個別 atomic commit。它不是整批 rollback transaction。

> [!WARNING]
> `-Force`／`--force` 會略過同名內容的 ownership／digest 保護。它不會繞過 symbolic link、非一般檔案、競爭變更或 auto-delegation config 合併保護。請先備份並確認目標確實可由 CraftRoster 接管。

### 舊品牌安裝的過渡升級

若電腦已安裝舊版，直接重新執行本 README 的 CraftRoster 命令。只有在使用預設 repository，且安裝器能精確證明既有內容屬於官方舊 `HsinPu/Autoverse-Ai-Agent-Skills` 安裝時，才會接受舊 metadata、digest、target、`.autoverse.json` sidecar、Codex alternate root 或舊 auto-delegation marker。

內容被修改、identity 模糊、digest 不符或出現多份同名副本時會停止，不會自動接管。成功後只保留新的 `HsinPu/CraftRoster` ownership 與目前 digest namespace；經驗證的舊 sidecar／marker 會移除，不保留雙份遷移狀態。

請使用 README 的預設命令並省略 `Repo`／`--repo`；顯式指定 repository 會停用舊 repository alias migration。

### 全域主動委派

`-EnableAutoDelegation`／`--enable-auto-delegation` 只適用於全域 `codex` 或 `opencode` Agent target。安裝器只管理自己的 marker／instruction entry；若偵測到使用者自行管理且衝突的設定，會停止並要求手動合併，即使使用 Force 也不會覆蓋。修改既有 config 前會建立備份。

## Catalog CLI

CLI 可離線搜尋 catalog、查看相近 Skill routing，並核對帶有有效 CraftRoster ownership sidecar 的已安裝元件。CLI 需要 Node.js 22+；目前公開 npm registry 尚未發布此 package，請從 repository checkout 執行。

```bash
git clone https://github.com/HsinPu/CraftRoster.git
cd CraftRoster

node craftroster-cli.js list
node craftroster-cli.js search "python development"
node craftroster-cli.js info ios-architecture
node craftroster-cli.js list --type agent --category quality-assurance
node craftroster-cli.js list --installed --type agent --target codex
```

若要從 checkout 建立本機全域 command：

```bash
npm install -g .
craftroster list
```

| Command | Alias | 用途 |
|---|---|---|
| `list` | `ls` | 依分類列出 Skills 或 Agents |
| `search <query>` | `s` | 搜尋名稱、描述與 tags |
| `info <name>` | — | 顯示 metadata、授權、routing 與安裝命令 |

| Option | 用途 |
|---|---|
| `--type skill\|agent` | 選擇 catalog，預設 Skill |
| `--category <category>` | 篩選一般 `list` |
| `--installed` | 只搭配 `list`，核對已安裝元件 |
| `--target <target>` | 搭配 `list --installed`，預設 `codex` |
| `--all` | 搭配 `list --installed`，掃描所有 canonical targets |

Catalog 來源是 [`skills.json`](skills.json) 與 [`agents.json`](agents.json)。CLI exit code：成功為 `0`、查無項目為 `1`、參數或用法錯誤為 `2`。

## Agents

每個 Agent 都有唯一 role、明確使用時機、權限模式、相關 Skills，以及一致的 `Role → Task → Constraints → Output` 結構。

<!-- AGENT_COUNT_START -->
目前共收錄 **237** 個不重複 Agents。
<!-- AGENT_COUNT_END -->

角色目錄依 [Agent Coverage Matrix](docs/agent-coverage-matrix.md) 在本專案宣告的 scope 內完成 31／31 類核心責任鏈覆蓋。這表示常見工作都有責任 owner、handoff 與 authority boundary，不表示收錄現實世界的每個職稱。

另外 105 個 Agents 來自其餘 23 個 reference repositories；所有正式 prompt 都以 CraftRoster 的角色、權限與輸出契約重新設計。

<details>
<summary><strong>展開 31 類、237 個 Agents 的完整索引</strong></summary>

<!-- AGENT_SUMMARY_START -->
| Category | Count | Agents |
|---|---:|---|
| `analysis` | 7 | [`business-analyst`](agents/business-analyst.md), [`business-intelligence-analyst`](agents/business-intelligence-analyst.md), [`competitive-intelligence-analyst`](agents/competitive-intelligence-analyst.md), [`experimentation-methodologist`](agents/experimentation-methodologist.md), [`quant-analyst`](agents/quant-analyst.md), [`reverse-engineer`](agents/reverse-engineer.md), [`startup-analyst`](agents/startup-analyst.md) |
| `architecture` | 12 | [`api-contract-architect`](agents/api-contract-architect.md), [`architect`](agents/architect.md), [`architect-review`](agents/architect-review.md), [`backend-architect`](agents/backend-architect.md), [`database-architect`](agents/database-architect.md), [`dotnet-architect`](agents/dotnet-architect.md), [`event-sourcing-architect`](agents/event-sourcing-architect.md), [`graphql-architect`](agents/graphql-architect.md), [`legacy-modernizer`](agents/legacy-modernizer.md), [`monorepo-architect`](agents/monorepo-architect.md), [`saas-platform-architect`](agents/saas-platform-architect.md), [`seo-structure-architect`](agents/seo-structure-architect.md) |
| `artificial-intelligence` | 9 | [`ai-engineer`](agents/ai-engineer.md), [`ai-safety-evaluator`](agents/ai-safety-evaluator.md), [`eval-judge`](agents/eval-judge.md), [`eval-orchestrator`](agents/eval-orchestrator.md), [`llm-platform-engineer`](agents/llm-platform-engineer.md), [`mcp-developer`](agents/mcp-developer.md), [`model-advisor`](agents/model-advisor.md), [`prompt-crafter`](agents/prompt-crafter.md), [`prompt-engineer`](agents/prompt-engineer.md) |
| `business-operations` | 7 | [`change-management-consultant`](agents/change-management-consultant.md), [`hr-pro`](agents/hr-pro.md), [`learning-development-specialist`](agents/learning-development-specialist.md), [`operations-manager`](agents/operations-manager.md), [`partnership-manager`](agents/partnership-manager.md), [`pricing-strategist`](agents/pricing-strategist.md), [`procurement-specialist`](agents/procurement-specialist.md) |
| `cloud-infrastructure` | 10 | [`aws-solutions-architect`](agents/aws-solutions-architect.md), [`cloud-architect`](agents/cloud-architect.md), [`finops-engineer`](agents/finops-engineer.md), [`hybrid-cloud-architect`](agents/hybrid-cloud-architect.md), [`kubernetes-architect`](agents/kubernetes-architect.md), [`linux-systems-administrator`](agents/linux-systems-administrator.md), [`network-engineer`](agents/network-engineer.md), [`service-mesh-expert`](agents/service-mesh-expert.md), [`terraform-specialist`](agents/terraform-specialist.md), [`windows-infrastructure-admin`](agents/windows-infrastructure-admin.md) |
| `commerce` | 2 | [`ecommerce-operations-manager`](agents/ecommerce-operations-manager.md), [`payment-integration`](agents/payment-integration.md) |
| `creative` | 3 | [`creative-director`](agents/creative-director.md), [`gallery-researcher`](agents/gallery-researcher.md), [`image-generator`](agents/image-generator.md) |
| `customer-operations` | 2 | [`customer-success-manager`](agents/customer-success-manager.md), [`customer-support`](agents/customer-support.md) |
| `data` | 9 | [`analytics-engineer`](agents/analytics-engineer.md), [`data-engineer`](agents/data-engineer.md), [`data-governance-engineer`](agents/data-governance-engineer.md), [`data-scientist`](agents/data-scientist.md), [`database-admin`](agents/database-admin.md), [`gis-analyst`](agents/gis-analyst.md), [`search-relevance-engineer`](agents/search-relevance-engineer.md), [`sql-pro`](agents/sql-pro.md), [`vector-database-engineer`](agents/vector-database-engineer.md) |
| `developer-experience` | 8 | [`agent-designer`](agents/agent-designer.md), [`agent-harness-optimizer`](agents/agent-harness-optimizer.md), [`codebase-onboarding-engineer`](agents/codebase-onboarding-engineer.md), [`dependency-manager`](agents/dependency-manager.md), [`developer-advocate`](agents/developer-advocate.md), [`developer-tooling-engineer`](agents/developer-tooling-engineer.md), [`dx-optimizer`](agents/dx-optimizer.md), [`platform-engineer`](agents/platform-engineer.md) |
| `development` | 35 | [`backend-developer`](agents/backend-developer.md), [`bash-pro`](agents/bash-pro.md), [`blockchain-developer`](agents/blockchain-developer.md), [`c-pro`](agents/c-pro.md), [`cms-platform-engineer`](agents/cms-platform-engineer.md), [`cpp-pro`](agents/cpp-pro.md), [`csharp-pro`](agents/csharp-pro.md), [`debugger`](agents/debugger.md), [`django-pro`](agents/django-pro.md), [`electron-pro`](agents/electron-pro.md), [`elixir-pro`](agents/elixir-pro.md), [`fastapi-pro`](agents/fastapi-pro.md), [`flutter-expert`](agents/flutter-expert.md), [`frontend-developer`](agents/frontend-developer.md), [`golang-pro`](agents/golang-pro.md), [`haskell-pro`](agents/haskell-pro.md), [`internationalization-engineer`](agents/internationalization-engineer.md), [`ios-developer`](agents/ios-developer.md), [`java-pro`](agents/java-pro.md), [`javascript-pro`](agents/javascript-pro.md), [`julia-pro`](agents/julia-pro.md), [`minecraft-bukkit-pro`](agents/minecraft-bukkit-pro.md), [`mobile-developer`](agents/mobile-developer.md), [`php-pro`](agents/php-pro.md), [`posix-shell-pro`](agents/posix-shell-pro.md), [`powershell-pro`](agents/powershell-pro.md), [`python-pro`](agents/python-pro.md), [`realtime-systems-engineer`](agents/realtime-systems-engineer.md), [`refactoring-specialist`](agents/refactoring-specialist.md), [`ruby-pro`](agents/ruby-pro.md), [`rust-pro`](agents/rust-pro.md), [`scala-pro`](agents/scala-pro.md), [`temporal-python-pro`](agents/temporal-python-pro.md), [`typescript-pro`](agents/typescript-pro.md), [`unity-developer`](agents/unity-developer.md) |
| `documentation` | 9 | [`api-documenter`](agents/api-documenter.md), [`c4-code`](agents/c4-code.md), [`c4-component`](agents/c4-component.md), [`c4-container`](agents/c4-container.md), [`c4-context`](agents/c4-context.md), [`docs-architect`](agents/docs-architect.md), [`mermaid-expert`](agents/mermaid-expert.md), [`reference-builder`](agents/reference-builder.md), [`tutorial-engineer`](agents/tutorial-engineer.md) |
| `embedded-systems` | 2 | [`arm-cortex-expert`](agents/arm-cortex-expert.md), [`firmware-analyst`](agents/firmware-analyst.md) |
| `finance` | 2 | [`accounting-controller`](agents/accounting-controller.md), [`fpa-analyst`](agents/fpa-analyst.md) |
| `governance` | 6 | [`compliance-auditor`](agents/compliance-auditor.md), [`legal-advisor`](agents/legal-advisor.md), [`policy-enforcer`](agents/policy-enforcer.md), [`review-policy-author`](agents/review-policy-author.md), [`risk-manager`](agents/risk-manager.md), [`software-license-compliance-engineer`](agents/software-license-compliance-engineer.md) |
| `healthcare` | 6 | [`clinical-data-manager`](agents/clinical-data-manager.md), [`clinical-evidence-reviewer`](agents/clinical-evidence-reviewer.md), [`emergency-preparedness-coordinator`](agents/emergency-preparedness-coordinator.md), [`health-information-manager`](agents/health-information-manager.md), [`healthcare-compliance-specialist`](agents/healthcare-compliance-specialist.md), [`patient-safety-officer`](agents/patient-safety-officer.md) |
| `machine-learning` | 3 | [`ml-engineer`](agents/ml-engineer.md), [`mlops-engineer`](agents/mlops-engineer.md), [`model-validation-specialist`](agents/model-validation-specialist.md) |
| `marketing` | 13 | [`content-marketer`](agents/content-marketer.md), [`marketing-measurement-specialist`](agents/marketing-measurement-specialist.md), [`paid-media-auditor`](agents/paid-media-auditor.md), [`seo-authority-builder`](agents/seo-authority-builder.md), [`seo-cannibalization-detector`](agents/seo-cannibalization-detector.md), [`seo-content-auditor`](agents/seo-content-auditor.md), [`seo-content-planner`](agents/seo-content-planner.md), [`seo-content-refresher`](agents/seo-content-refresher.md), [`seo-content-writer`](agents/seo-content-writer.md), [`seo-keyword-strategist`](agents/seo-keyword-strategist.md), [`seo-meta-optimizer`](agents/seo-meta-optimizer.md), [`seo-snippet-hunter`](agents/seo-snippet-hunter.md), [`social-publishing-publisher`](agents/social-publishing-publisher.md) |
| `media-production` | 23 | [`audiovisual-localization-producer`](agents/audiovisual-localization-producer.md), [`casting-director`](agents/casting-director.md), [`cinematographer`](agents/cinematographer.md), [`colorist`](agents/colorist.md), [`delivery-mastering-specialist`](agents/delivery-mastering-specialist.md), [`first-assistant-director`](agents/first-assistant-director.md), [`location-manager`](agents/location-manager.md), [`media-accessibility-producer`](agents/media-accessibility-producer.md), [`media-ingest-manager`](agents/media-ingest-manager.md), [`media-library-researcher`](agents/media-library-researcher.md), [`motion-graphics-designer`](agents/motion-graphics-designer.md), [`music-supervisor`](agents/music-supervisor.md), [`production-designer`](agents/production-designer.md), [`production-sound-mixer`](agents/production-sound-mixer.md), [`screenwriter`](agents/screenwriter.md), [`script-supervisor`](agents/script-supervisor.md), [`sound-designer`](agents/sound-designer.md), [`storyboard-artist`](agents/storyboard-artist.md), [`vfx-supervisor`](agents/vfx-supervisor.md), [`video-director`](agents/video-director.md), [`video-editor`](agents/video-editor.md), [`video-producer`](agents/video-producer.md), [`visual-continuity-supervisor`](agents/visual-continuity-supervisor.md) |
| `operations` | 11 | [`chaos-engineer`](agents/chaos-engineer.md), [`deploy-with-verification`](agents/deploy-with-verification.md), [`deployment-engineer`](agents/deployment-engineer.md), [`devops-troubleshooter`](agents/devops-troubleshooter.md), [`error-detective`](agents/error-detective.md), [`incident-responder`](agents/incident-responder.md), [`it-service-manager`](agents/it-service-manager.md), [`mobile-release-engineer`](agents/mobile-release-engineer.md), [`observability-engineer`](agents/observability-engineer.md), [`prod-logs-health-check`](agents/prod-logs-health-check.md), [`sre-engineer`](agents/sre-engineer.md) |
| `orchestration` | 9 | [`conductor-validator`](agents/conductor-validator.md), [`context-manager`](agents/context-manager.md), [`implement`](agents/implement.md), [`orchestrate`](agents/orchestrate.md), [`session-end`](agents/session-end.md), [`session-start`](agents/session-start.md), [`team-debugger`](agents/team-debugger.md), [`team-implementer`](agents/team-implementer.md), [`team-lead`](agents/team-lead.md) |
| `performance` | 2 | [`database-optimizer`](agents/database-optimizer.md), [`performance-engineer`](agents/performance-engineer.md) |
| `product-management` | 3 | [`product-manager`](agents/product-manager.md), [`product-spec-orchestrator`](agents/product-spec-orchestrator.md), [`technical-product-manager`](agents/technical-product-manager.md) |
| `project-management` | 2 | [`project-manager`](agents/project-manager.md), [`release-manager`](agents/release-manager.md) |
| `quality-assurance` | 11 | [`browser-runtime-debugger`](agents/browser-runtime-debugger.md), [`code-review-preshipment`](agents/code-review-preshipment.md), [`code-reviewer`](agents/code-reviewer.md), [`playwright`](agents/playwright.md), [`qa`](agents/qa.md), [`receipt-verifier`](agents/receipt-verifier.md), [`review-feedback-resolver`](agents/review-feedback-resolver.md), [`tdd-orchestrator`](agents/tdd-orchestrator.md), [`team-reviewer`](agents/team-reviewer.md), [`test-automator`](agents/test-automator.md), [`ui-visual-validator`](agents/ui-visual-validator.md) |
| `research` | 2 | [`market-researcher`](agents/market-researcher.md), [`search-specialist`](agents/search-specialist.md) |
| `sales` | 3 | [`revenue-operations-analyst`](agents/revenue-operations-analyst.md), [`sales-automator`](agents/sales-automator.md), [`sales-engineer`](agents/sales-engineer.md) |
| `security` | 13 | [`application-security-engineer`](agents/application-security-engineer.md), [`backend-security-coder`](agents/backend-security-coder.md), [`cloud-security-engineer`](agents/cloud-security-engineer.md), [`frontend-security-coder`](agents/frontend-security-coder.md), [`identity-access-engineer`](agents/identity-access-engineer.md), [`malware-analyst`](agents/malware-analyst.md), [`mobile-security-coder`](agents/mobile-security-coder.md), [`penetration-tester`](agents/penetration-tester.md), [`privacy-engineer`](agents/privacy-engineer.md), [`security-auditor`](agents/security-auditor.md), [`threat-detection-engineer`](agents/threat-detection-engineer.md), [`threat-intelligence-analyst`](agents/threat-intelligence-analyst.md), [`threat-modeling-expert`](agents/threat-modeling-expert.md) |
| `strategy` | 3 | [`brand-strategist`](agents/brand-strategist.md), [`business-strategy-consultant`](agents/business-strategy-consultant.md), [`grant-strategist`](agents/grant-strategist.md) |
| `user-experience` | 5 | [`accessibility-expert`](agents/accessibility-expert.md), [`design-system-architect`](agents/design-system-architect.md), [`ui-designer`](agents/ui-designer.md), [`ui-ux-designer`](agents/ui-ux-designer.md), [`ux-researcher`](agents/ux-researcher.md) |
| `writing` | 5 | [`article-writer`](agents/article-writer.md), [`content-editor`](agents/content-editor.md), [`copywriter`](agents/copywriter.md), [`technical-writer`](agents/technical-writer.md), [`ux-writer`](agents/ux-writer.md) |
<!-- AGENT_SUMMARY_END -->

</details>

完整 metadata 以 [`agents.json`](agents.json) 為準。

## Skills

286 個 Skills 分成 16 類。完整 package 位於 [`skills/`](skills/)，generated metadata 與 routing groups 位於 [`skills.json`](skills.json)。

| Category | Count | 範圍 |
|---|---:|---|
| `workflow-planning` | 12 | 需求、規劃、分段實作、handoff 與交付 |
| `software-engineering` | 21 | 程式設計、架構、語言、重構與版本控制 |
| `frontend-design` | 34 | Frontend、design system、互動、responsive 與 design-to-code |
| `threejs-graphics` | 62 | Three.js 架構、渲染、模擬、程序化圖形、效能、驗證與部署 |
| `backend-data` | 26 | 後端、API、資料庫、資料工程與 migration |
| `ai-llm` | 5 | LLM 應用、OpenAI API、prompt engineering、RAG、eval 與 AI delivery |
| `mobile-desktop` | 7 | iOS、跨平台、桌面應用與 app store release |
| `testing-quality` | 27 | 測試、review、debug、無障礙、相容性與完成證據 |
| `security-governance` | 7 | 安全分析、hardening、scan、threat modeling 與治理 |
| `cloud-devops` | 14 | 部署、CI、cloud、containers、observability 與 incident |
| `agent-skill-tooling` | 17 | Agent、Skill、MCP、執行、治理與發布 |
| `browser-automation` | 4 | Web 擷取、browser control 與 Playwright |
| `media-creative` | 20 | 圖像、音訊、影片、動畫、prompt 與製作流程 |
| `writing-content` | 12 | 回覆、文件、品牌語氣、長文、演講稿、編輯與內容再利用 |
| `research-product` | 7 | 證據蒐集、市場研究、solution discovery 與實驗 |
| `documents-productivity` | 11 | 檔案、Office、試算表、簡報、PDF 與圖表 |

常用入口：

| 需求 | 建議入口 |
|---|---|
| 完整軟體交付 | [`verified-software-delivery`](skills/verified-software-delivery/) |
| Python 開發 | [`python-development`](skills/python-development/) |
| iOS 架構 | [`ios-architecture`](skills/ios-architecture/) |
| 產品／系統賣點演講稿 | [`product-pitch-writing`](skills/product-pitch-writing/) |
| Three.js 全流程 | [`threejs-development`](skills/threejs-development/)；路由至 61 個 specialists |
| 多 Agent 協作 | [`subagent-architecture`](skills/subagent-architecture/) |
| 影片製作 | [`video-production-workflow`](skills/video-production-workflow/) |

使用 `node craftroster-cli.js info <skill-name>` 可查看相近能力的選擇原則、必要依賴與條件依賴。單顆和分類安裝會先補齊必要依賴；條件依賴只提供選用條件，不自動安裝。依賴定義維護於 `scripts/data/skill-catalog.json`，由 `npm run generate:skills` 同步 catalog 與免 Node 安裝 index。

安裝器在任何寫入前檢查完整依賴計畫及 ownership。必要依賴若分散於不同安裝根目錄，會指出衝突並停止，請先整理既有安裝；不會暗中搬移或覆寫本機修改。`Force` 同時適用於展開後的依賴。交易保護以個別 package 為單位，並非整批回滾；新安裝器與 source checkout 必須使用同一版本，不能省略 dependency index。詳見[安裝依賴與評估方法](docs/skill-quality-workflow.md)。

## 專案架構

```text
Canonical Agent: agents/<role>.md
        └─ generate:agents
           ├─ adapters/{codex,claude,cursor,copilot,opencode}/
           ├─ agents.json
           └─ scripts/data/install-category-index.tsv

Canonical Skill: skills/<name>/SKILL.md
Taxonomy:        scripts/data/skill-catalog.json
        └─ generate:skills
           ├─ skills.json
           └─ scripts/data/install-category-index.tsv
```

```text
CraftRoster/
├─ agents/                    # Canonical Agent definitions
├─ skills/                    # Canonical Skill packages
├─ adapters/                  # Generated platform adapters
├─ agents.json                # Generated Agent catalog
├─ skills.json                # Generated Skill catalog
├─ craftroster-cli.js         # Offline query CLI
├─ scripts/
│  ├─ install.ps1             # Windows installer
│  ├─ install.sh              # Linux／macOS installer
│  ├─ generate-*.js           # Catalog／adapter generators
│  ├─ validate-*.js           # Local validation gates
│  ├─ verify-*.js             # Provenance verification
│  └─ data/                   # Taxonomy、coverage、source manifests、locks
├─ tests/                     # CLI、catalog、contract、eval、source tests
├─ docs/                      # Coverage、source notes、release guidance
└─ .github/workflows/         # CI
```

> [!IMPORTANT]
> `agents/<role>.md` 是 Agent 的唯一人工維護來源，不要直接修改 `adapters/` 或 `agents.json`。Skill 本文在 `skills/<name>/SKILL.md`；分類、tags 與 routing 維護於 `scripts/data/skill-catalog.json`。`skills.json` 與 `scripts/data/install-category-index.tsv` 都是 generated artifacts，不要直接修改。

## 開發與驗證

需要 Node.js 22+。Repository 沒有外部 npm dependencies，也沒有 aggregate `npm test` script。

```bash
# 重建 generated artifacts
npm run generate:agents
npm run generate:skills

# Catalog、contracts、evals、來源、coverage 與 legacy gates
npm run validate

# Regression tests
npm run test:cli
npm run test:catalog
npm run test:skill-catalog
npm run test:install-categories
npm run test:skill-contracts
npm run test:skill-evals
npm run test:skill-routing
npm run test:skill-originality
npm run test:skill-sources
npm run test:package

# Installer smoke tests
npm run smoke:install:powershell
npm run smoke:install:bash
npm run smoke:install:bash:quick
```

需要 GitHub 網路的完整 provenance／originality gates：

```bash
npm run verify:agent-references:remote
npm run verify:skill-sources:remote
npm run audit:agent-originality
npm run audit:skill-originality
```

Skill routing corpus 可以先離線驗證；使用目前 Codex 登入與模型額度時，可執行選用回報實驗：

```bash
npm run eval:skill-routing -- --skill solution-discovery --validate-only
npm run eval:skill-routing -- --skill solution-discovery --max-cases 3 --output routing-run.json
```

此實驗為 **routing self-report**，不是實際 Skill activation 或任務成功測試。每個案例啟動暫時性、唯讀 Codex 執行，嚴格解析完整名稱或 `none`；錯誤、未執行與有效失敗分開計算。`--output` 僅建立新 JSON，保存版本、來源雜湊、可見回覆、耗時及可取得的 usage；主機實際載入的 Skills 與有效模型設定仍需另外控制。`--max-cases` 依種類抽樣，數量不足以涵蓋現有種類時拒絕執行。CI 只跑結構與決定性測試，不消耗模型額度。

[`Validate`](.github/workflows/validate.yml) workflow 在 main push、pull request、手動觸發與每週排程執行。CI 涵蓋 Node 22／24 相容性子集、完整 catalog validation、歷史 digest、remote integrity、Windows PowerShell 5.1／7 smoke、Ubuntu Bash smoke、macOS quick smoke，以及 main branch 的隔離 macOS Codex 遠端全量安裝。

## 來源、品質與授權

所有正式 Agent／Skill metadata 與 installer ownership 都以 `HsinPu/CraftRoster` 為 canonical source。外部專案只作為固定 revision 的研究與 coverage reference，不是整個複製進來的 prompt 集合。

- Agent references 固定 commit、tree、paths 與 license evidence；Skill references 另外固定逐檔 blob 與 review-controlled lock。
- `npm run audit:agent-originality` 會針對 237 個 canonical Agent prompt 與 pinned upstream references 檢查長行及逐字片段重疊。
- Skill originality audit 會逐一比對有 reference 的 canonical packages 與固定 upstream files。
- Eval gate 目前具名保護 99／286 個 Skill packages、200 個 output evals、909 個 assertions 與 10 個 routing cases；不宣稱所有 Skills 都有 eval。
- Workflow contract gate 目前涵蓋 7 組跨 Skill contracts；Agent responsibility coverage 由 [31 類 matrix](docs/agent-coverage-matrix.md) 驗證。

詳細來源與改寫紀錄：

- [Three.js Skill sources](docs/threejs-skill-sources.md)
- [Visual design Skill sources](docs/visual-design-skill-sources.md)
- [Matt Pocock Skill adaptations](docs/matt-pocock-skill-adaptations.md)
- [Agent reference manifest](scripts/data/agent-reference-sources.json)
- [Skill reference manifest](scripts/data/skill-reference-sources.json)

Repository 與全部 237 個 Agents 採 Apache-2.0。Skills 以個別 package metadata 宣告為準；目前 285 個為 Apache-2.0，[`karpathy-guidelines`](skills/karpathy-guidelines/) 保留 MIT。

## 疑難排解

<details>
<summary><strong>出現 Target is required</strong></summary>

安裝器不猜測平台。請明確提供 `-Target codex` 或 `--target codex`；其他可用值請見[支援平台](#支援平台與安裝位置)。

</details>

<details>
<summary><strong>安裝後看不到新的 Agent／Skill</strong></summary>

先開啟新的工作階段或重新啟動對應工具，再使用：

```bash
node craftroster-cli.js list --installed --type agent --target codex
node craftroster-cli.js list --installed --type skill --target codex
```

CLI 只確認檔案與 CraftRoster ownership，不代表已開啟的 runtime 已重新載入。

</details>

<details>
<summary><strong>同名內容被拒絕覆蓋</strong></summary>

先使用 `-DryRun`／`--dry-run` 查看計畫，確認既有內容與 sidecar。未知來源、人工修改或 identity 不符的內容預設不會被接管。只有完成備份並確認可取代時才使用 Force。

</details>

<details>
<summary><strong>舊版是否可以直接升級</strong></summary>

可以，請直接重跑目前的 CraftRoster 命令。安裝器只會遷移可精確驗證的官方舊安裝；不明或已修改內容會停止，成功後只留下新的 CraftRoster ownership。

</details>

## 參與貢獻

1. Fork repository 並建立 feature branch。
2. Agent 只修改 `agents/<role>.md`，再執行 `npm run generate:agents`。
3. Skill 修改 `skills/<name>/SKILL.md`；分類與 routing 同步修改 `scripts/data/skill-catalog.json`，再執行 `npm run generate:skills`。
4. 執行 `npm run validate`、相關 tests、`git diff --check`。
5. 建立 [Pull Request](https://github.com/HsinPu/CraftRoster/pulls)，說明需求、來源、權限邊界與驗證證據。

發現問題或缺少能力時，請先建立 [Issue](https://github.com/HsinPu/CraftRoster/issues)。

## License

[Apache License 2.0](LICENSE) © HsinPu。個別 Skill 若宣告其他相容授權，以該 Skill 的 `SKILL.md` 與 [`skills.json`](skills.json) 為準。
