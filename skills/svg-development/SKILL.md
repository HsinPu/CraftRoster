---
name: svg-development
description: "Create, edit, debug, or integrate SVG assets and route multi-part SVG work to design, illustration, vectorization, animation, optimization, and visual validation. Use when the requested artifact or affected behavior is SVG; unrelated page edits do not activate this Skill."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "tryopendata/skills"
  reference-license: "MIT"
  reference-revision: "f97583ecb7eeb8a0c2a193fe9b80e55806d29823"
---

# SVG Development

Own the SVG deliverable and select only the specialist workflows that change the result. This package handles simple SVG creation and repairs independently; installing it does not require the other six packages.

## Establish the artifact contract

Inspect the source SVG or reference and its actual host: standalone XML, inline HTML, image element, sprite, framework component, print, or native export. Preserve the user's stack, source artwork, aspect ratio, IDs consumed by code, theme behavior, and requested edit scope. A standalone XML file needs the SVG namespace; HTML parsing supplies it for inline SVG.

For a simple task, author or repair semantic shapes and paths directly, use an appropriate `viewBox`, keep local definitions and references consistent, and inspect the result at its intended size. An informative asset needs a usable accessible name in its embedding context; decorative art should not duplicate an adjacent control's name.

Use [the capability map](references/capability-map.md) for mixed tasks. A specialist listed there is conditional task guidance, not a required install dependency. Check availability before claiming to follow it. When missing, handle the task directly if feasible, or state the specific missing capability; do not silently install packages or expand the brief.

## Keep the handoff coherent

- Retain one coordinate system, paint order, semantic ID convention, and source of truth across specialists. Repeated inline instances need unique definition and ARIA IDs.
- Distinguish vector geometry, a hybrid SVG containing bitmap content, and a raster preview. A `.svg` extension alone does not establish vector editability.
- Preserve the original before optimization or conversion. Animation targets, text, accessibility metadata, clips, masks, and gradients are part of the artifact's behavior.
- Validate the final revision in its actual host, including requested themes, sizes, and motion states. XML parsing and pixel metrics cannot establish visual correctness. If rendering or inspection is unavailable, report that gap explicitly.

Deliver editable SVG or the requested component, a preview when useful, and concise usage and verification notes. Brand strategy remains with `logo-design`; choosing an existing provider icon remains with `lobe-icons-usage`. A larger web interface can involve `frontend-design` without turning every SVG edit into a page redesign.

See [upstream attribution](references/upstream-notice.md) for the reviewed source and adaptation boundary.
