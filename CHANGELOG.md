# Changelog

## 1.2.1 — 2026-10-30

Patch release: repair remote Agent reference verification when GitHub redirects a moved repository, preserving pinned source checks.

- Follow at most five HTTPS redirects within `api.github.com`; reject loops, invalid destinations and cross-origin credential forwarding.
- Continue verifying the original commit, tree, reference files and license after redirects; keep upstream source pins unchanged.
- Add offline request and provenance regression tests to the Node 22/24 CI matrix and package inventory.

## 1.2.0 — 2026-10-29

Minor release: add an independently installable cross-platform interface improvement workflow and implementation Agent, preserving existing installer commands and web capabilities.

- Add `ui-improvement` with critique/audit/source-fix modes and native WinUI/WPF, AppKit/macOS SwiftUI, iOS SwiftUI/UIKit, Compose/Views repair rules; distinguish web, Flutter/RN and Electron/Tauri ownership.
- Add `ui-improvement-engineer`, preserve read-only reviewers, and regenerate adapters for all five coding environments.
- Add the `interface-quality` purpose and integrate the core into web, mobile/desktop and testing bundles. Keep framework companions conditional and preserve the web bundle's previous final capabilities.
- Pin reviewed Impeccable source/license evidence, package attribution, and add 35 output plus 24 routing definitions with original partial-source fixtures.
- Add isolated real-install/update regressions and CI coverage. Runtime evidence remains target-specific; fixture definitions and installation checks do not certify native builds, accessibility or visuals.
- Synchronize catalog, guides and release baseline: 294 Skills, 238 Agents, 16 purposes, 16 Skill categories.

## 1.1.1 — 2026-10-15

Patch release: improve SVG inspection accuracy and repair a stale source-policy fixture while preserving the existing Skill names, independent installation, and purpose bundles.

- Replace regex-only CSS URL matching with a bounded token scanner that handles comments, strings, escapes and stylesheet imports, and reports unsupported URL syntax for host review.
- Respect SVG 2 `href` precedence, distinguish editor namespaces from active SVG content, and reject invalid viewBox number/separator syntax.
- Add focused inspector regressions and tested rotation-pivot and stroke-reveal examples, including final reduced-motion states.
- Refresh the provenance fixture's local manifest digest after the seven SVG source mappings were added; retain all existing pin, license and read-only evidence checks.

## 1.1.0 — 2026-10-15

Minor release: seven independently installable SVG Skills add capabilities without changing the existing installer interface or removing categories.

- Add `svg-development`, `svg-design`, `svg-illustration`, `svg-vectorization`, `svg-animation`, `svg-optimization`, and `svg-visual-validation`.
- Include all seven in `image-graphics`, and five web-focused Skills in `web-interface`; retain 15 purpose bundles and 16 Skill categories.
- Add conditional SVG guidance to relevant canonical Agents and regenerate all five platform adapters.
- Pin three reviewed upstream repositories, retain MIT notices, and exclude separately licensed noncommercial artwork and upstream executable engines.
- Add a bounded read-only SVG preflight, behavioral and routing case definitions, and real single/bundle install and update regression coverage.
- Update the GitHub catalog, source evidence, review registry, release baseline, and SVG usage guide. Catalog totals are now 293 Skills and 237 Agents.

Earlier work predates this changelog; see Git history for the 1.0.0 development baseline.
