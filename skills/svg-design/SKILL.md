---
name: svg-design
description: "Author and repair SVG paths, icons, shapes, gradients, masks, clips, symbols, and sprites, including responsive and accessible embedding. Use for editable vector asset work; brand strategy, raster reconstruction, and motion have separate workflows."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "tryopendata/skills"
  reference-license: "MIT"
  reference-revision: "f97583ecb7eeb8a0c2a193fe9b80e55806d29823"
---

# SVG Design

Create useful vector assets in the existing document's coordinate and styling system. For focused edits, identify the affected element and its definitions, inherited styles, references, and consumers before changing geometry.

## Authoring decisions

1. Set the intended display size and coordinate bounds. Use a valid `viewBox` for scalable assets; retain explicit dimensions or a CSS aspect ratio where the host needs them. Account for strokes, markers, filters, and masks at edges.
2. Use readable primitives for simple geometry and paths for compound contours. Keep semantic groups and stable IDs where editing or animation needs them. Read [geometry and paint](references/geometry-and-paint.md) for path, arc, hole, gradient, mask, and transform pitfalls.
3. Choose inherited color intentionally: `currentColor` is useful for inline monochrome icons; multi-color artwork needs controlled fills. A separate SVG loaded with `<img>` does not inherit the parent page's `color` as an inline icon does.
4. For sprites and repeated components, isolate definition IDs, symbol IDs, and ARIA references per instance or sprite namespace. Preserve public IDs used by CSS, JS, URLs, and tests.
5. Give informative images a contextual name (`alt` on an image, or an appropriate inline title/ARIA relationship). Hide decorative SVG from the accessibility tree when the enclosing control already supplies its name. Keep keyboard interaction on a semantic control rather than making an unlabeled path clickable.

Keep editable text when required. For a portable outlined copy, preserve a text source and confirm font/outline expectations rather than automatically destroying editability. Do not flatten every transform, remove every group, or apply fixed decimal precision regardless of scale.

## Check and deliver

Render in the requested host at the intended small size and an enlarged inspection size. Check light/dark backgrounds where used, clipping, stroke weight, holes, text, gradients, duplicate IDs, and repeated instances. Deliver the SVG or component and any required variant; only claim checks actually performed.

This Skill works independently. Use `svg-illustration` for a composed illustration, `svg-vectorization` for supplied raster reconstruction, `svg-animation` for motion, `svg-optimization` for measured reduction, or `svg-visual-validation` for a reproducible comparison when that task is requested. `logo-design` handles a new brand concept; `lobe-icons-usage` handles selecting existing provider icons.

Sources and preserved notice: [upstream attribution](references/upstream-notice.md). Official reference: [SVG document structure](https://www.w3.org/TR/SVG2/struct.html).
