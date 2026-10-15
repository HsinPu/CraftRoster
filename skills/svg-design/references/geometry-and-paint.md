# Geometry and paint decisions

## Paths and transforms

`M` starts a subpath; `L/H/V` add straight segments; `C/S` and `Q/T` add cubic and quadratic curves; `A` adds an elliptical arc; `Z` closes a contour. Lowercase commands use relative coordinates. A reflected control point for `S` or `T` depends on the preceding command; replacing commands without that context changes geometry.

Arc parameters are `rx ry rotation large-arc sweep x y`. The two flags must be 0 or 1. Sweep direction is interpreted in the current coordinate system, including transforms; test the actual result rather than infer it after a flipped axis. Zero radii degenerate to a line; coincident endpoints do not describe a full ellipse. Use a circle/ellipse primitive or multiple arcs for a complete ellipse.

For holes, inspect subpath winding and `fill-rule` (`nonzero` versus `evenodd`). Closing, merging, reversing or simplifying paths can change the filled region. Retain a readable path for editable originals. A transform rewrite must preserve composition order, stroke behavior, gradient units, masks and animation targets.

## Definitions and bounds

- `objectBoundingBox` paint coordinates and `userSpaceOnUse` coordinates solve different scaling problems. Choose deliberately for gradients, clips, masks, and patterns.
- Repeated inline SVG copies share the document ID namespace. Prefix IDs and every reference consistently, including `url(#...)`, `href`, animation targets and `aria-labelledby`/`aria-describedby`.
- Mask alpha/luminance behavior differs from a clip's geometric region. Verify opacity and edges on transparent, white and dark backgrounds.
- Expanding the `viewBox` may fix clipping while shrinking the apparent icon inside its host. Check the display contract, stroke extent, filter region and intended padding before changing bounds.

## Host checks

Standalone XML needs `xmlns="http://www.w3.org/2000/svg"`. Inline HTML SVG receives the namespace through the HTML parser. React/JSX attribute spelling differs from XML; preserve the existing component convention rather than paste unmodified markup into another syntax.

For a sprite, define a `symbol` with its own viewBox and instantiate it through `use`. Verify same-origin/external use behavior in the actual browser; a symbol definition itself is not a visible preview. For informative external SVG images, put the accessible label on the embedding `img`; an internal title alone is not a substitute for the image's `alt`.

Official references: [SVG paths](https://www.w3.org/TR/SVG2/paths.html), [document structure](https://www.w3.org/TR/SVG2/struct.html), [coordinate systems](https://www.w3.org/TR/SVG2/coords.html).
