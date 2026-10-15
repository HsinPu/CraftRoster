# Source fidelity and editability checks

Keep the original raster intact. Record its file identity, dimensions, crop, and alpha treatment along with the SVG candidate. If the user selected a particular generated reference earlier, compare against that selected image rather than generating or choosing a new target.

Use a coordinate system proportional to the source. For example, a 1200 by 800 source can use `viewBox="0 0 1200 800"`; another equivalent scale is valid, but changing it must not stretch the subject. Keep deliberate margins unless the user requests a crop.

Before detailed drawing, identify the few landmarks most responsible for recognition: eye positions, stem attachment, emblem corners, letter counters, or negative-space boundaries. Compare their relative positions and the outline's extrema before adding interior decoration.

For complex work, optional scene notes can track intended parts before authoring and actual element IDs, tags, parents, and paint order afterward. Label these states as intent and bound structure. Do not assert a bound mapping until the SVG has those elements. Preserve an existing scene format when supplied; no additional planner or schema is required for this Skill.

Inspect the finished source for actual paths/primitives and editable object boundaries. Count or search for `image`, linked resources, data URLs, and `foreignObject` rather than assuming a `.svg` extension proves vectorization. Review external stylesheet and script references before rendering untrusted tracer output. Structural checks do not prove complete conformance or act as a security sandbox.

Render at the source or target display dimensions using a documented renderer and inspect side by side. Align backgrounds and crop first. Then compare silhouette, holes, attachment points, occlusion, lettering, palette, and stroke weight. Zoom in for broken joins and inspect actual small-size recognition. Check alpha boundaries over light and dark surfaces.

An optional image difference is diagnostic only: antialiasing, fonts, and renderer variations can dominate scores even when geometry is similar. A low difference cannot establish semantic editability. State the actual method, remaining approximations, and which comparisons were performed on the final exported candidate.
