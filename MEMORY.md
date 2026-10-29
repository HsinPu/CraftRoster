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

## Interface-quality research — 2026-10-29

- `frontend-design-review` already separates experience critique, production web audit and polish review. It is read-only unless fixes are separately authorized. `docs/visual-design-skill-sources.md` records prior Impeccable research; adding three duplicate web review Skills would miss the actual native-platform gap.
- Impeccable was inspected at `5e745ace7e151feb2a93d360d0281fe39448b857`. It has one Skill entry, command playbooks, an engine launcher, and explicit iOS/Android native references. Host binaries for Windows/macOS do not establish native Windows/macOS application design coverage.
- The current recommendation is a future shared `interface-quality` purpose bundle with a platform-aware `ui-improvement` entry. This is a proposal, not an installed bundle or Skill. Windows/macOS native rules and verification need their own branches; mobile web and native mobile must remain distinct.
- Preserve original brands, platform conventions and established design systems. Apply critique/audit as diagnosis and polish as scoped implementation; do not turn a request to inspect into permission to redesign.
- Research evidence and the detailed rules→source-modification→verification plan are in `docs/interface-quality-skill-plan.md`. The proposed first version adds one umbrella Skill and one UI implementation Agent, with separate Windows/macOS/iOS/Android references; it is still not implemented.
- Agent recommended-dependency changes require final-plan regression checks. Both `frontend-design-review` and `visual-regression-testing` currently reach the web purpose through `ui-visual-validator`; if made conditional, add both directly to `web-interface` to preserve its default capabilities.
- Installation membership is not a permission boundary. A shared Skill can contain diagnosis and implementation modes, but a read-only role cannot write product files or archive reports merely because a mode or bundle names polish.
- No upstream engines, hooks, browser extensions, new Skills or UI runtime examples were installed or executed in the research/planning tasks.
