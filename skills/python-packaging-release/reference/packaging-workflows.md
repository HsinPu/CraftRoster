# Python 打包與發佈 — 參考資料

Use this reference when packaging a Python project for installation or distribution.

## 目錄（Table of Contents）

- [觸發時機](#觸發時機)
- [邊界與分工](#邊界與分工)
- [Build Shape](#build-shape)
- [Metadata](#metadata)
- [Dependencies](#dependencies)
- [Entry Points](#entry-points)
- [Artifacts](#artifacts)
- [Versioning](#versioning)
- [Publishing](#publishing)
- [Verification](#verification)
- [Checklist](#checklist)

---

## 觸發時機

- 建立或修正 Python package
- 決定 build backend、versioning 或 publish 流程
- 設定 console scripts / entry points
- 驗證 wheel / sdist 內容
- 準備 PyPI 或內部 artifact 發佈

---

## 邊界與分工

- 用 `python-development` 處理通用 Python 架構、typing、style。
- 用 `python-automation-scripting` 處理本機腳本或批次自動化。
- 用 `repo-ready` 處理更廣義的 repo setup / release automation。
- 這份參考只處理包裝、發佈與 distribution 形狀。

---

## Build Shape

- Use `pyproject.toml` as the source of packaging truth.
- Choose a single build backend and keep it explicit.
- Keep package layout consistent with the import path.
- Decide whether the project is a library, CLI, or both.

---

## Metadata

- Keep project name, version, description, authors, license, and classifiers accurate.
- Make the install name and import name understandable.
- Include URLs only when they are maintained.
- Avoid stale metadata fields that no longer describe the shipped artifact.

---

## Dependencies

- Separate runtime, optional, and dev dependencies.
- Pin only what needs pinning.
- Keep extras names stable and meaningful.
- Do not leak build-time helpers into runtime dependencies.

---

## Entry Points

- Define console scripts or module entry points explicitly.
- Verify that the installed command invokes the expected module path.
- Keep CLI entry points thin and delegate to application code.

```toml
[project.scripts]
mytool = "mytool.cli:main"
```

---

## Artifacts

- Inspect wheel and sdist contents before publishing.
- Make sure only the intended package data ships.
- Verify importability from the built artifact, not only from source checkout.
- Confirm that generated files or tests are excluded unless intentionally shipped.

---

## Versioning

- Bump versions deliberately and consistently.
- Keep version policy simple enough for the team to follow.
- Align tags, release notes, and published artifact versions.
- Avoid manual drift between package version and release metadata.

---

## Publishing

- Enter this phase only for an authorized publication request; preparation and review finish with artifact evidence instead of an upload.
- Build locally first.
- Inspect the artifact before upload.
- Publish with the documented path, not ad hoc commands.
- Validate the package version, built artifact, target index, and existing publication authority before release. Do not request the same unchanged authorization again or infer upload permission from a build-only request.

---

## Verification

- Install the built artifact into a clean environment.
- Import the package and run the exposed CLI.
- Confirm the version string and entry points.
- Verify the release works without editable-source assumptions.

---

## Checklist

- [ ] `pyproject.toml` is authoritative
- [ ] Build backend and package layout are explicit
- [ ] Entry points are verified after install
- [ ] Wheel / sdist contents are inspected
- [ ] Versioning policy is clear
- [ ] Publish path and target are documented
- [ ] Installed artifact works outside the source tree
