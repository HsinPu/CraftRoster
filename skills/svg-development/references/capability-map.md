# SVG capability map

| Requested work | Specialist | Shared handoff |
|---|---|---|
| Shapes, paths, icons, gradients, masks, sprites, SVG integration | `svg-design` | Coordinate system, IDs, host sizing and accessible name |
| New editable scene or character illustration | `svg-illustration` | Semantic layers, art direction, paint order and background |
| Reconstruct supplied raster artwork as vectors | `svg-vectorization` | Immutable source, fidelity target, real geometry and simplifications |
| Motion, state transitions, path morphing | `svg-animation` | Stable part IDs, topology, transform ownership and reduced motion |
| Reduce bytes or complexity without unintended visual changes | `svg-optimization` | Preserved behavior, baseline, precision and renderer settings |
| Inspect rendering, compare a reference or certify a revision | `svg-visual-validation` | Exact SVG revision, host/backend, viewport, theme, fonts and time |

Choose the primary outcome first. A repaired icon does not automatically need illustration planning, a state machine, or optimization. A vectorization request may need an illustration reconstruction method, but does not require an image-generation service or a separate planning Skill.

All seven packages include their own instructions and necessary local resources. None requires another SVG package simply to load. Conditional edges in the catalog document workflows for the affected task; `routes` describe alternative outcome owners. Neither installs a companion automatically. Purpose bundles directly include the appropriate group regardless of conditional edges.

Examples:

- A clipped icon: inspect `viewBox`, stroke extent, filter region, CSS and host sizing; repair and render. `svg-design` is sufficient.
- An animated character from a photo: reconstruct meaningful parts through `svg-vectorization`, retain the part map, then use `svg-animation` for the requested state transitions and `svg-visual-validation` for the actual output states.
- A smaller animated web asset: `svg-optimization` must retain CSS/JS target IDs, viewBox, paint servers and motion. Compare both appearance and behavior rather than treating the file as static geometry.
