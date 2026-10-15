---
name: svg-animation
description: "Animate SVG icons, illustrations, and characters with CSS, SMIL, or JavaScript; build state transitions, path morphs, and interruptible idle motion. Use when SVG motion is the requested output, rather than static vector editing or general video production."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "molauu/svg-character-animator"
  reference-license: "MIT"
  reference-revision: "5ee1e7845caefe2c9ab51c64a2aa6f386e72ef5b"
---

# SVG Animation

Animate the supplied artwork in its intended host. This Skill works independently; React, Figma, Swift, morph libraries, and other SVG Skills are conditional tools, not installation requirements.

## Choose the motion mechanism

- Use CSS for ordinary opacity, transform, and stroke reveals with a reduced-motion media query. Check the actual DOM and transform ownership before selecting elements.
- Use SMIL when a portable SVG timeline fits the receiving viewer. Verify that viewer supports the features used; an SVG displayed through an image element does not expose its internals to host-page scripts.
- Use JavaScript or the existing animation library for interaction, reversible timelines, interruption, and path interpolation. Retain the project's framework and dependency versions.
- For character states or shape morphs, read [state-transitions.md](references/state-transitions.md). Do not add a morph library when the requested motion can use transforms or compatible path coordinates.

## Implementation contract

1. Establish the target browser/viewer and embedding mode, canvas/viewBox, duration, trigger, loop behavior, and reduced-motion state from the request and existing project. Preserve the original asset and its semantic IDs.
2. Separate static placement, transition motion, and idle motion into owned layers. Nested groups can keep an authored placement transform independent of an animated transform. Give pivots an explicit coordinate space; test the actual silhouette rather than assuming the canvas center is the body's anchor.
3. Keep opacity and transform timelines separate when their timing differs. Inspect paint order, clip/mask regions, strokes, and filter bounds at intermediate frames. CSS transforms can override SVG transform attributes; do not let unrelated loops write the same property.
4. Provide cancellation for requestAnimationFrame loops, delayed callbacks, event handlers, observers, and framework subscriptions. A new transition starts from the current rendered state; cancelled callbacks cannot later restore an obsolete state.
5. Provide a meaningful still or instant state update under `prefers-reduced-motion`. Preserve interaction and accessible labels. Long-running nonessential motion needs an appropriate pause/stop behavior in its host.

## Verification and delivery

Render in the actual target browser or viewer. Inspect start, middle, end, loop boundary, rapid interrupted state changes, and reduced-motion mode. Check missing paint servers, disappearing strokes, clipping, focus behavior, and cleanup after unmount where applicable. Static rasterizers may omit CSS/SMIL/JavaScript motion; a static render is not animation verification.

Deliver the editable SVG and the CSS/JavaScript or component files actually used, with embedding instructions and tested browser/time points. Record any external dependency and network requirement; do not claim an offline player while loading code from a CDN.

Use `svg-design` only when source geometry needs editing, and `svg-visual-validation` when reproducible capture or comparison evidence is needed. Neither is mandatory for a small independent animation.

## Sources

Adapted from the reviewed state-animation architecture and SVG motion references in [upstream-notice.md](references/upstream-notice.md). No upstream example artwork, Studio HTML, executable engine, or export pipeline is bundled.
