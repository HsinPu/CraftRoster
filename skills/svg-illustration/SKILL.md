---
name: svg-illustration
description: "Create or edit editable SVG illustrations, characters, and composed scenes. Use for vector artwork and local illustration changes; faithful conversion of an existing raster belongs to svg-vectorization, and page layout alone does not activate this skill."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "syi0808/svg-skills"
  reference-license: "MIT"
  reference-revision: "c5937c2bed48aff98c12cda43ccba2ed6f2880f0"
---

# SVG Illustration

Produce artwork whose meaningful parts remain editable. Work directly in vector geometry; a raster preview supports inspection and does not replace the SVG deliverable.

## Choose the work

- For a new scene, use the supplied brief, references, intended display size, and established style. Make only consequential missing decisions explicit. A simple drawing needs only a short plan.
- For a local edit, inspect the source and its current rendering. Keep existing dimensions, IDs, grouping, and unaffected artwork; change only the requested parts.
- For planning alone, return the requested direction or composition notes and stop before authoring.
- When fidelity to a supplied raster is the objective, use `svg-vectorization` if available. Otherwise reconstruct from the actual source using the same preservation and review principles; do not substitute a redesign.

Read [scene-and-editing.md](references/scene-and-editing.md) for multi-part scenes, semantic IDs, paint order, and coordinated revisions. Planning notes are optional and do not require another Skill, schema, or runtime.

## Build the artwork

Use a positive finite `viewBox` and the SVG namespace. Keep recognizable objects and their editable details in semantic groups. Choose primitives for geometric forms and paths for contours that require them. Preserve deliberate asymmetry, holes, and negative space. Define resource IDs consistently and keep references local unless the requested integration specifically needs external assets.

Choose accessible naming for meaningful standalone artwork; use the embedding application's decorative treatment when appropriate. Keep text editable when requested, record font dependencies, and do not silently outline or rasterize it. Use actual vector geometry for the promised illustration; disclose any requested hybrid asset as hybrid.

Read [render-review.md](references/render-review.md) when judging composition or revising a candidate. Use the intended renderer for CSS, text, masks, filters, or effects; a conservative static validator may reject otherwise valid SVG features. Do not delete requested features just to satisfy a limited tool.

## Verify the current result

Check XML, dimensions, IDs, resource targets, and clipping. Render the final candidate at its intended display size and a useful inspection scale, then actually view those outputs. For transparent artwork, inspect light and dark surroundings. Prioritize missing objects, silhouette, attachment points, and occlusion before small decorative refinements.

Keep the best prior candidate. Correct specific visible defects and repeat checks on the changed result; stop an unproductive revision loop and describe the remaining issue. Rendering success, source inspection, or numerical image similarity alone does not establish visual approval. If rendering or viewing is unavailable, identify the check that remains unperformed.

## Optional companions and delivery

This Skill works independently and has no required Skill or toolchain dependency. Use `svg-design` for difficult SVG mechanics, `svg-visual-validation` for repeatable visual comparisons, `svg-animation` for requested motion, and `svg-optimization` for requested or materially useful cleanup. Without them, use the target editor or renderer, preserve structure, and report verification limits. Do not install companions automatically.

Return the editable SVG, its current preview when available, and concise notes about the requested changes, font assumptions, and unresolved defects. Include scene notes only when they help subsequent edits. Attribute the adapted upstream workflow through [upstream-notice.md](references/upstream-notice.md).
