# Release Checklist

這份清單是 CraftRoster 的發布閘門。任何必要命令失敗、generated artifact 有 drift、來源證據無法驗證，或 installer smoke 未通過，都應停止發布並保留失敗輸出。

## 1. 環境與範圍

- Node.js 22 或更新版本。
- Git CLI；Agent 原創性稽核會用它取得固定 revision，最後狀態檢查也需要 Git。
- Windows smoke 需要 Windows PowerShell／PowerShell。
- Bash smoke 需要 Bash、`mktemp`、`cksum`、`od`，以及 `sha256sum` 或 `shasum`；只有 installer 的遠端下載路徑另需 `curl`、`tar` 與網路連線。
- 遠端來源與原創性檢查需要 GitHub 網路存取；其餘本機 gates 應可離線執行。
- 先執行 `git status --short`，辨識並保留不屬於本次發布的使用者變更。

## 2. 重建 Generated Artifacts

```bash
npm run generate:agents
npm run generate:skills
npm run generate:release-baseline
```

- `agents/<role>.md` 是 canonical Agent source；`adapters/` 與 `agents.json` 是 generated artifacts。
- `skills/<name>/SKILL.md` 與 `scripts/data/skill-catalog.json` 是 canonical Skill inputs；`skills.json` 是 generated artifact。
- 外部 Skill provenance 有核准變更時才執行 `npm run update:skill-reference-lock`；manifest、lock 與 verifier 都受 CODEOWNERS 覆核。
- 重新執行 generator 後不應持續產生新 drift。

## 3. 本機必要 Gates

```bash
npm run validate
node scripts/generate-legacy-skill-digests.js --check
npm run test:cli
npm run test:catalog
npm run test:skill-catalog
npm run test:skill-evals
npm run test:skill-routing
npm run test:skill-dependencies
npm run test:release-baseline
npm run test:skill-review
npm run test:skill-originality
npm run test:skill-sources
npm run test:skill-contracts
npm run test:package
```

歷史 Skill digest 重建需要完整 Git 歷史；若 checkout 是 shallow clone，先取得完整歷史再執行。CI 會以 `fetch-depth: 0` 執行這項 gate。manifest、generator、validator 與歷史 fixture 都受 CODEOWNERS 覆核。

確認輸出至少符合目前 release baseline；若 catalog 有經核准的新增或刪除，先更新 baseline 與相關 manifest：

<!-- CRAFTROSTER_RELEASE_BASELINE_START -->
| Evidence | Current baseline |
|---|---:|
| Skills | 286 |
| Agents | 237 |
| Skill categories | 16 |
| Agent coverage categories | 31／31 |
| Required eval packages | 116 |
| Output case definitions／assertions | 284／1209 |
| Routing case definitions | 80 |
| Referenced Skills／repositories／paths | 62／18／131 |
| Provenance lock mappings | 62 Skills／18 repositories／115 path entries |
<!-- CRAFTROSTER_RELEASE_BASELINE_END -->

這個區塊由 `npm run generate:release-baseline` 從 catalog、來源與評估案例定義產生，`npm run validate` 檢查一致性。案例數量不是實際模型任務成功數；routing self-report、實際 Skill activation 與 task outcome 必須另附執行證據。改動 Skills 或 evals 後請重新產生此區塊，不要更新歷史審查報告。

數量相同不代表驗證完成；mutation tests、exact manifest membership 與 generated parity 仍必須通過。

## 4. Installer Smoke

Windows：

```powershell
npm run smoke:install:powershell
# 也驗證 PowerShell 7 子程序，保留相同隔離 fixtures：
pwsh -NoProfile -File scripts/smoke-install.ps1 -PowerShellExecutable pwsh
```

Linux／macOS 或 Git Bash：

```bash
npm run smoke:install:bash
```

macOS 或本機快速診斷可先執行：

```bash
npm run smoke:install:bash:quick
```

正式發布至少要有 Windows PowerShell 與 Ubuntu Bash 的完整 smoke；macOS quick 由 CI 補充。Smoke 必須涵蓋 ownership、content digest、atomic commit、race recheck、rollback、unknown newcomer preservation、special-entry rejection 與跨平台固定 digest vector。

## 5. 遠端來源與原創性

```bash
npm run verify:agent-references:remote
npm run verify:skill-sources:remote
npm run audit:agent-originality
npm run audit:skill-originality
```

- Agent gate 核對 pinned commit、tree、paths 與 license。
- Skill gate 核對 commit → tree、逐 Skill path/blob，並驗證 license evidence 固定內容與宣告授權相符。
- Agent originality gate 檢查 canonical Agent prompts 與 pinned references 的長行及 12-word verbatim overlap。
- Skill originality gate 對每個 referenced Skill package 與 manifest 固定的 upstream paths 執行相同門檻，並保留本地與上游證據。
- 若 pull request 變更 Skill provenance manifest、lock、verifier 或 originality audit，必須取得 CODEOWNERS 指派的 HsinPu 明確核准；未核准不可發布。
- Pull request、main push、手動 workflow 與每週排程都會以有界重試執行 remote gates；若 GitHub 暫時不可用，保留輸出並重跑失敗的 workflow，不可在未驗證來源的狀態合併。

## 6. Package 與最後狀態

```bash
npm run test:package
npm pack --dry-run
git diff --check
git status --short
```

確認實際 package 包含 CLI、所有 `package.json` runtime/test entrypoints、7 份 `scripts/data` manifests、canonical catalogs、Agents、Skills、adapters、docs 與 license。`test:package` 會在重建的 packed tree 中執行 CLI、`npm run validate` 與 Skill catalog／eval／originality／source tests。

## Release Receipt

在 pull request 或 release note 記錄：

```text
Revision:
Node versions:
Generated artifacts rebuilt:
Local validation:
Installer smoke (PowerShell/Bash/macOS quick):
Remote Agent references:
Remote Skill sources:
Agent originality:
Skill originality:
Package inventory:
git diff --check:
Remaining risks or intentionally skipped gates:
```

只有所有必要 gate 通過、跳過項目已明確說明且得到 release owner 接受後，才進行 commit、push 或發布。
