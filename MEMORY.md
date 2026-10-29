# Project Memory

Record verified, durable project decisions and lessons here. Current catalog and package files remain authoritative for versions and counts.

## Catalog and installation

- User-facing purpose bundles are separate from Skill source categories. The former are maintained in `scripts/data/install-bundles.json`; the latter in `scripts/data/skill-catalog.json`. One component may belong to multiple purpose bundles and is deduplicated by destination.
- Skill `required` dependencies expand recursively. `conditional` / `optional` dependencies and `related` / `alternative` routes must not be treated as blanket installation requirements. Agent support additionally distinguishes `recommended` edges.
- Check actual Skill instructions before inferring coverage from names: `desktop-development` currently owns Electron, and `swiftui-development` currently targets native iOS. Neither proves complete Windows/macOS native UI support.
- Seven `svg-` packages are independently installable. Their source notices, local resources, conditional handoffs and purpose membership were validated in the SVG implementation and optimization work; see `docs/svg-skills.md`.

## Verification lessons

- SVG structural preflight is not a renderer, sanitizer, full CSS parser, or visual approval. Namespace handling, effective `href` selection, bounded CSS scanning, and strict viewBox grammar protect against previously reproduced false results.
- Changes to the source manifest can invalidate explicit local digests in evaluation fixtures. Recheck `tests/skill-three-provenance-fixtures.test.js` and the referenced policy fixture when `scripts/data/skill-reference-sources.json` changes.
- Use a supported Node runtime before interpreting test failures; sandbox child-process errors such as `EPERM` can prevent a test from executing at all. Distinguish environment failures, actual failures, unexecuted cases and successful checks.
- Some package and installation tests create temporary files while running. Wait for their processes and cleanup to finish before staging; inspect the staged diff to exclude test sentinels and Python caches.
- Purpose and category changes can leave stale counts or names in README CLI tables and command comments outside generated blocks. Check those separately, and give linked HTML `details` sections explicit anchors rather than relying on their visible `summary` text.

## Interface-quality implementation — 2026-10-29

- `frontend-design-review` already separates experience critique, production web audit and polish review. It is read-only unless fixes are separately authorized. `docs/visual-design-skill-sources.md` records prior Impeccable research; adding three duplicate web review Skills would miss the actual native-platform gap.
- Impeccable was inspected at `5e745ace7e151feb2a93d360d0281fe39448b857`. It has one Skill entry, command playbooks, an engine launcher, and explicit iOS/Android native references. Host binaries for Windows/macOS do not establish native Windows/macOS application design coverage.
- Version 1.2.0 adds independently installable `ui-improvement`, writer `ui-improvement-engineer`, and the `interface-quality` purpose. Native Windows/macOS/iOS/Android have separate framework rules; mobile web and native mobile remain distinct.
- Preserve original brands, platform conventions and established design systems. Apply critique/audit as diagnosis and polish as scoped implementation; do not turn a request to inspect into permission to redesign.
- Current usage and limits are in `docs/interface-quality.md`; the original planning requirements remain in `docs/interface-quality-skill-plan.md`. The full native runtime matrix is not complete merely because the rules and evaluation inputs exist.
- `frontend-design-review` and `visual-regression-testing` are now conditional on the shared visual reviewer and direct members of `web-interface`. Real plan regression preserves its prior 55 Skills/11 Agents as a subset. The common interface purpose defaults to 2 Skills/3 Agents without pulling in all frameworks.
- Installation membership is not a permission boundary. A shared Skill can contain diagnosis and implementation modes, but a read-only role cannot write product files or archive reports merely because a mode or bundle names polish.
- Native source fixtures are partial inputs. Explicit model samples produced source repairs; actual browser evidence covers web/renderer HTML only. Source assertions and an accessibility tree do not establish a native build, screen-reader journey or target-runtime pass. Results are recorded separately in `docs/audits/interface-quality-2026-10-29/`.
- UIKit `keyboardLayoutGuide` does not follow undocked keyboards by default. An affected iPad repair must deliberately address `followsUndockedKeyboard` and tracking constraints; a phone-only fixture does not prove floating-keyboard behavior.
- No upstream engines, hooks, browser extensions or native SDKs were imported for this feature. The repository's Node validators passed; the separate skill-creator Python quick validator was unavailable because its PyYAML dependency was absent.
