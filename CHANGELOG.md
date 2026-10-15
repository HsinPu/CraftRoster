# Changelog

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
