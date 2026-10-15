---
name: svg-optimization
description: "Reduce SVG bytes, path complexity, or repeated icon markup while preserving rendering, responsiveness, accessibility, animation, and referenced IDs. Use for SVG cleanup, precision budgets, safe SVGO configuration, and sprite optimization; not raster-to-vector reconstruction."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "tryopendata/skills"
  reference-license: "MIT"
  reference-revision: "f97583ecb7eeb8a0c2a193fe9b80e55806d29823"
---

# SVG Optimization

Optimize for a stated budget while keeping an editable original. This Skill is independently usable; SVGO is an optional tool, and other SVG Skills are conditional companions.

## Workflow

1. Inspect the SVG and its consumers: standalone versus inline versus sprite, responsive sizing, ID references from CSS/JavaScript/HTML, accessibility names, paint servers, animations, and repeated instances. Establish the bytes/geometry/DOM budget and acceptable visual tolerance.
2. Save the source and capture a baseline with the intended renderer, viewport, background, fonts, and animation time/state. Write a distinct output file; do not silently replace the source during exploration.
3. Remove genuinely unused metadata or redundant declarations. Preserve license notices. Consolidate inherited styling only when computed rendering is unchanged; retain groups needed for transforms, targeting, accessibility, or future state visibility.
4. For automated work, read [safe-optimization.md](references/safe-optimization.md). Prefer the project's pinned local SVGO and reviewed configuration. Do not install a global tool, fetch an unpinned executable, or mutate package dependencies merely to optimize a file.
5. Compare original and output structurally and visually under the same conditions. Test references in the host document, small and large display sizes, theme/currentColor behavior, and relevant motion states. If a change exceeds the tolerance or breaks a consumer, revert that transformation or lower its aggressiveness.

## Precision and geometry

Choose precision against display scale and the viewBox rather than applying a universal two-decimal rule. Verify curves, thin strokes, corners, holes, and tightly fitted clips at the largest expected scale. Coordinate rounding, path simplification, shape conversion, and XML normalization are different operations; normalization alone does not reduce geometric complexity.

Keep viewBox and required dimensions/aspect behavior. Preserve externally used IDs, title/description and their ARIA links, accessible text, paint references, animated properties, CSS classes, and hidden elements that later become visible. An optimizer is not a sanitizer or a substitute for reviewing untrusted SVG.

## Sprites

Use sprites when measured reuse justifies their payload and host constraints. Namespace IDs across symbols and update every internal reference consistently. Test `<use>` at its actual origin and with theme inheritance, accessible naming, and the target browser; a sprite can download unused symbols and is not automatically faster than separate cached assets.

## Delivery

Report original/output bytes, relevant element/path or command counts, tool/version/configuration, preserved interfaces, precision/tolerance, preview captures, and measured regressions. File-size reduction alone is not acceptance. If rendering is unavailable, report structural checks and leave visual equivalence unverified.

Use `svg-design` for deliberate geometry redesign, `svg-animation` when motion behavior itself changes, or `svg-visual-validation` for repeatable capture comparisons. No companion is required for an ordinary standalone cleanup.

## Sources

The cleanup, SVGO, and sprite guidance adapts reviewed MIT material listed in [upstream-notice.md](references/upstream-notice.md), with project-local tools and preservation checks replacing its global-install and in-place defaults.
