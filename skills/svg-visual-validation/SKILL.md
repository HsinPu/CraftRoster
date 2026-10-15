---
name: svg-visual-validation
description: "Render and inspect SVG assets, diagnose clipping or reference failures, and compare revisions or raster references under reproducible viewport, theme, font, and motion conditions. Use for actual SVG visual evidence; XML checks alone do not establish a visual pass."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "syi0808/svg-skills"
  reference-license: "MIT"
  reference-revision: "c5937c2bed48aff98c12cda43ccba2ed6f2880f0"
---

# SVG Visual Validation

Tie the verdict to the SVG revision actually rendered. Work directly from the artifact and requested reference; this package does not require an authoring Skill.

## Structural preflight

Inspect XML, namespace, dimensions/viewBox, duplicate IDs, local references, external resources, and host-specific CSS. The bundled [inspection helper](scripts/inspect_svg.py) uses Python 3.10+ standard library, reads local UTF-8 SVG, emits JSON, and never changes the source or installs dependencies:

```text
python <skill-directory>/scripts/inspect_svg.py artwork.svg --profile static
python <skill-directory>/scripts/inspect_svg.py animated.svg --profile web
```

`static` reports CSS, animation, bitmap images, scripting, foreign content, and external references as unsupported by its narrow authoring profile. `web` inventories these for browser inspection; it does not certify them safe or visually correct. Neither profile sanitizes, executes, or renders SVG. See [inspection limits](references/inspection.md). Unsupported features should be investigated in the right renderer, never silently stripped to obtain a pass.

## Render, inspect, compare

1. Choose the actual target host/backend. A browser is necessary for browser CSS, scripting and animation behavior; a static converter's output is not evidence those ran. Use existing local tools first. CairoSVG/librsvg and pixel-comparison tools are optional and may need native libraries; report unavailable tooling without a fake preview or automatic global install.
2. Fix artifact hash, renderer/browser and version, dimensions, DPR, background/theme, fonts, embedding mode, and animation state/time. Compare like with like; do not resize one result silently or switch backends after a failure.
3. Open and inspect the rendered output. Check the requested size, a larger view, edges, transparency, text, gradients, masks and meaningful parts. Compare the approved reference for silhouette, arrangement and paint order before fine detail.
4. For animation, inspect initial, intermediate, final, interrupted/reversed transitions and reduced-motion output as relevant. Freeze or control time for comparison rather than compare arbitrary frames.
5. Use pixel differences as diagnostics under stated tolerances. Composite transparent results on both light and dark backgrounds; raw invisible RGB or one background can conceal alpha changes. Metrics do not judge aesthetic quality or establish reconstruction fidelity by themselves.

Record the revision/hash, commands, rendering conditions, preview paths, observations and verdict. A changed SVG invalidates earlier preview evidence. Distinguish a structural pass, actual render success, human/model visual inspection, and comparison to an approved baseline; if one is missing, identify it. Do not replace an approved baseline solely to silence a difference.

Use `svg-design`, `svg-vectorization`, `svg-animation`, or `svg-optimization` only when a discovered issue requires that workflow; they are available task routes, not required installation dependencies. See [source attribution](references/upstream-notice.md).
