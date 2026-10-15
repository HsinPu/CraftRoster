---
name: svg-vectorization
description: "Reconstruct a supplied raster logo, icon, sketch, or illustration as editable SVG geometry. Use for image-to-SVG conversion and tracing; exclude bitmap wrapping, new art merely inspired by an image, and screenshot-to-webpage implementation."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "syi0808/svg-skills"
  reference-license: "MIT"
  reference-revision: "c5937c2bed48aff98c12cda43ccba2ed6f2880f0"
---

# SVG Vectorization

Use the actual source image as the visual contract. Preserve its identity and composition while producing genuine vector geometry. Conversion does not authorize a redesign or require generating a replacement image.

## Inspect and choose a method

View the supplied raster and establish its dimensions, aspect ratio, orientation, visible subject, margins, and transparency. Preserve the original as read-only and save derived outputs separately. Keep background and canvas proportions unless a different crop or transparency treatment was requested. If the source cannot be viewed, request an accessible source rather than inventing a reconstruction.

Read [conversion-decisions.md](references/conversion-decisions.md) for source-specific decisions. Rebuild flat artwork with semantic primitives and purposeful paths. Use an available local tracer when automatic tracing is requested or its contours fit the brief; identify the actual method and inspect the output. Dense photographic sources need an explicit fidelity/editability tradeoff, not a promise of lossless vector recovery. Do not install a tracing stack or upload images to a service by default.

If input is already SVG, edit its vectors directly. Use `svg-design` for difficult source mechanics if available; rasterizing and retracing an existing editable asset ordinarily loses useful structure.

## Reconstruct editable parts

Use an SVG namespace and positive finite `viewBox` matching source proportions. Recover major silhouettes, characteristic holes, landmark positions, and overlaps before tiny texture. Use stable IDs and useful groups for independently editable objects; automated contours do not prove recovery of original layers or semantic structure.

Retain intentional asymmetry, line endings, letter counters, and negative space. Distinguish editable text with font requirements from outlined glyph geometry. Do not guess illegible words or replace distinctive lettering while claiming fidelity.

The promised vector output consists of meaningful contours and shapes. Inspect it for bitmap payloads (including data URIs and linked images), scripts, externally fetched content, and `foreignObject` wrappers; these do not satisfy this conversion contract. Per-pixel tiles also fail the editability requirement. Requested hybrid compositions are a different deliverable and must be described accordingly. Read [fidelity-review.md](references/fidelity-review.md) for structure and source comparisons.

## Verify and deliver

Check XML, namespace, viewBox, IDs, resource references, and absence of raster content. Render and actually view the final SVG beside the source using matched crop, aspect ratio, dimensions, and background. Compare silhouette and landmarks before palette, line weight, or fine detail. Inspect transparent edges on light and dark surfaces. Rerender after path cleanup.

Keep the best candidate and apply focused corrections to visible mismatches. If progress stalls, retain that candidate and disclose the unresolved approximation. A successful parse, tracer run, render, or pixel score does not establish fidelity. State unavailable rendering or viewing checks explicitly.

This Skill is independently usable with an editor and target renderer; it requires no other Skill, model API, GPU, or Python runtime. `svg-visual-validation` can provide controlled comparison support, and `svg-optimization` can assist cleanup after fidelity is established. Without them, inspect structure and compare target-renderer previews directly. `svg-animation` applies only if motion is also requested. Preserve the conversion contract when handing off to another Skill.

Return the editable SVG, final preview when available, method used, text/font treatment, intentional simplifications, and remaining fidelity limits. Keep original images out of public deliverables unless requested. See [upstream-notice.md](references/upstream-notice.md) for the reviewed reference and retained license notice.
