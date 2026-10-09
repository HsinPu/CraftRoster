'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const status = read(path.join(__dirname, 'remediation-status.json'));
const verification = read(path.join(__dirname, 'remediation-verification.json'));
const catalog = read(path.join(root, 'skills.json'));
const byName = new Map(status.packages.map(skill => [skill.name, skill]));
const link = name => '[`' + name + '`](../../../skills/' + name + '/SKILL.md)';
const wording = status.resolutions.filter(item => item.type === 'wording').length;
const metadata = status.resolutions.length - wording;
const lines = [
  '# Skill 安裝配套與修訂清單', '',
  '[回到專案 README](../../../README.md) · [分類安裝命令](../../../README.md#依分類安裝) · [逐個 Skill 配套](#逐個-skill-配套)', '',
  '此頁保留 2026-10-09 修訂後的安裝規則快照，可直接在 GitHub 閱讀。涵蓋全部 286 個 Skills；目前目錄以 [`skills.json`](../../../skills.json) 與 `node craftroster-cli.js info <skill-name>` 為準。', '',
  '## 如何選擇安裝範圍', '',
  '| 需求 | 使用方式 | 會安裝什麼 |',
  '|---|---|---|',
  '| 一個 Skill | `-Name <skill>`／`--name <skill>` | 指定 Skill 與遞迴必要配套 |',
  '| 一個分類 | `-Category <category>`／`--category <category>` | 分類中的 Skills 與遞迴必要配套，可能跨分類 |',
  '| 全部 Skills | `-Type skill`／`--type skill`，同時省略名稱與分類 | 全部 286 個 Skills |', '',
  '上表為 `install.ps1`／`install.sh` 的參數介面，每次可選一個名稱或一個分類，兩者互斥。新版 `setup.ps1`／`setup.sh` 提供單一指令啟動的互動選單，可一次選取多個分類、預檢後再確認安裝；詳見[互動式安裝指南](../../interactive-installation.md)。`-DryRun`／`--dry-run` 可只預覽實際套件計畫。', '',
  '## 依賴種類', '',
  '| 種類 | 是否自動安裝 | 使用時機 |',
  '|---|---|---|',
  '| `required` 必要配套 | 是，遞迴補齊並去重 | 入口流程的核心交付或共用文件依賴 |',
  '| `conditional` 條件依賴 | 否 | 實際任務符合 `when` 條件時，再明確安裝與使用 |',
  '| `optional` 可選配套 | 否 | 選用的增強能力 |',
  '| `routes.alternative` 替代入口 | 否 | 改由另一個 Skill 負責成果 |',
  '| `routes.related` 相關能力 | 否 | 提示可參考的鄰近能力 |', '',
  '`usage: "resource"` 表示套件提供共用文件，可以用於必要或條件依賴。安裝與讀取共用文件不會啟用提供套件的整個入口流程；例如安裝 `threejs-capture-recording` 只會自動補上 `threejs-development`，不會一次裝入其 61 個條件專項。', '',
  '「套件可單裝」只表示沒有其他自動安裝的必要套件。若任務選中了某個條件分支，仍須補齊該分支的主責 Skill。外部工具、帳號、API 與執行環境也應按各 Skill 指引準備。', '',
  '## 分類安裝數量', '',
  '以下為每個分類單獨選取時的去重結果。數量是不同 Skill 套件數；`project` target 會寫入兩個 Skill profile，實際資料夾副本數會不同。', '',
  '| 分類 | 分類本身 | 跨分類必要配套 | 去重後總數 | 額外套件 |',
  '|---|---:|---:|---:|---|'
];
for (const category of catalog.categories) {
  const seeds = status.packages.filter(skill => skill.category === category.id);
  const names = new Set(seeds.map(skill => skill.name));
  const closure = [...new Set(seeds.flatMap(skill => skill.after))].sort();
  const extra = closure.filter(name => !names.has(name));
  lines.push('| `' + category.id + '` | ' + seeds.length + ' | ' + extra.length + ' | ' + closure.length + ' | ' + (extra.map(link).join(', ') || '無') + ' |');
}
lines.push('', '## 常見最小安裝範例', '', '| 選取 Skill | 自動補齊的必要配套 | 套件數 |', '|---|---|---:|');
for (const name of ['frontend-code-review', 'security-code-review', 'python-packaging-release', 'document-to-markdown', 'image-to-code-assets', 'threejs-capture-recording', 'threejs-webxr-accessibility', 'web-page-design-to-code', 'website-redesign-to-code']) {
  const skill = byName.get(name);
  lines.push(`| ${link(name)} | ${skill.after.filter(dep => dep !== name).map(link).join(', ') || '無'} | ${skill.after.length} |`);
}
lines.push('', '## 本輪修正與驗證', '',
  `原清單共 ${status.resolutions.length} 項，包含 ${wording} 項指引歧義與 ${metadata} 項 metadata 處置，已逐項對齊。修訂釐清必要配套、條件觸發、共用文件、替代主責，以及既有成果可重用的條件。`, '',
  `修後共有 ${status.stats.required} 條必要依賴、${status.stats.conditional} 條條件依賴、${status.stats.optional} 條可選依賴與 ${status.stats.routes} 條替代／相關入口關係，其中 ${status.stats.resourceDependencies} 條依賴標示為共用資源。這些數量是關係數，不是 Skill 套件數。`, '',
  '修訂時已通過 `npm run validate`、' + verification.unitTestCount + ' 項本機回歸測試、PowerShell／Git Bash 隔離依賴安裝測試，以及 ' + verification.installPlanCases + ' 組目前目錄的安裝預覽。這些檢查驗證文件、目錄、規劃與安裝行為；未執行模型任務或外部生成 API。', '',
  '| 證據 | 內容 |', '|---|---|',
  '| [原始修正清單](clarification-backlog.json) | 研究階段的逐項問題 |',
  '| [逐項處置與最小套件](remediation-status.json) | 每個問題的處置、依賴與來源雜湊 |',
  '| [驗證紀錄](remediation-verification.json) | 執行命令、輸出、來源身份與檢查結果 |',
  '| [52 組安裝預覽](remediation-install-plans.json) | 預期／實際套件、去重與零目的地寫入 |',
  '| [報告操作驗證](remediation-browser-check.json) | 搜尋、分類與共用資源顯示 |',
  '| [互動式 HTML 報告](remediation-report.html) | 下載後用瀏覽器開啟，可搜尋分類與逐項修正 |', '',
  '## 逐個 Skill 配套', '',
  '下表列出完整 286 個 Skills 的最小安裝配套。必要配套包含遞迴展開；條件數與可選數是該 Skill 的直接宣告。點選名稱閱讀入口指引；觸發條件、共用資源與替代入口詳情可用 CLI 或 [`skills.json`](../../../skills.json) 查看。'
);
for (const category of catalog.categories) {
  lines.push('', `<details>`, `<summary>${category.id} — ${status.packages.filter(skill => skill.category === category.id).length} Skills</summary>`, '',
    '| Skill | 最小套件數 | 必要配套（含遞迴） | 條件數 | 可選數 | 替代／相關數 |',
    '|---|---:|---|---:|---:|---:|');
  for (const skill of status.packages.filter(skill => skill.category === category.id).sort((a, b) => a.name.localeCompare(b.name))) {
    const required = skill.after.filter(name => name !== skill.name);
    lines.push(`| ${link(skill.name)} | ${skill.after.length} | ${required.map(link).join(', ') || '無；套件可單裝'} | ${skill.dependencies.filter(dep => dep.kind === 'conditional').length} | ${skill.dependencies.filter(dep => dep.kind === 'optional').length} | ${skill.routes.length} |`);
  }
  lines.push('', '</details>');
}
fs.writeFileSync(path.join(__dirname, 'README.md'), lines.join('\n') + '\n');
console.log(`Generated GitHub Markdown: ${status.packages.length} Skills, ${catalog.categories.length} categories`);
