# State transitions and path interpolation

Use this reference for multi-state SVGs. For a spinner or simple stroke reveal, keep the main Skill's CSS/SMIL workflow.

## Prepare the states

Match the canvas, viewBox, semantic part IDs, and layering across states. Inventory shapes present everywhere versus state-specific decorations. Keep every referenced gradient, clip, mask, and filter available during the transition, and namespace IDs when multiple instances can share a document. Differently named paint servers can represent the same paint; unify only after comparing their stops, units, and coordinate systems.

Treat the state list as data rather than assuming a fixed number of poses. Do not require design-tool access when local SVG files already contain the needed geometry.

## Select a strategy per part

| Relationship | Suitable strategy | Main checks |
|---|---|---|
| Same geometry, different placement | Transform interpolation on an owned wrapper | Pivot, transform composition, clipping |
| Matching command sequence and parameter topology | Coordinate interpolation after normalization | Corresponding landmarks, winding, holes, arc flags |
| Different topology | Deliberate crossfade, re-authored correspondence, or a compatible morph library | Subpaths, strokes versus fills, distortion, dependencies |
| Decoration exists in one state only | Entrance/exit visibility or opacity | Correct paint order, interrupted fade state |

Before comparing topology, use a standards-aware parser to make relative/absolute and implicit command forms comparable, expand H/V where appropriate, and preserve subpath boundaries. Matching command letters alone does not establish good point correspondence. Arc flags are discrete choices; generic numeric interpolation is not sufficient for every path. Shape-to-path conversion is optional and must respect stroke and geometry fidelity.

Multiple `M` subpaths can encode open strokes or holes. Check the selected library's actual behavior instead of assuming it supports them. Splitting a compound filled path can change its fill rule and hole semantics; preserve that contract or choose a different strategy.

Handle transforms separately from path coordinates. Consistent group ownership is often safer than baking every transform. If baking is necessary, apply the correct matrix to all geometry and account for strokes, gradients, clips, and filter coordinate spaces. Do not interpolate raw transform strings or matrix entries blindly when rotation/scale decomposition is required.

## Own transitions and idle motion

Keep one authoritative current target and one cancellation owner per transition. On an interrupt, cancel all scheduled work, sample the current visual state, and transition from there. Track delayed entrances as well as active frame callbacks; a cancelled timeout must not start a new loop later. Opacity fades resume from current opacity rather than jumping back to one.

Use separate wrappers or composed transforms for idle and transition motion. Facial parts that should move together need a shared coordinate frame; eyelid blinking can remain local. Reduce idle amplitude during a pose change if needed rather than creating competing transforms. Choose timing and amplitude for this artwork; upstream example constants are not universal requirements.

In a declarative framework, establish whether the framework or an imperative animator owns each animated attribute. Stable DOM nodes or a coordinated declarative animation can both work; avoid a rerender overwriting an in-flight `d` value. On teardown, stop loops and remove listeners without leaving pending callbacks.

## Evidence

### Small browser recipes

For a rotation inside an authored placement, keep the placement on the outer group and give the animated group an explicit reference box. This one-shot motion ends in its natural still state; component styles and identifiers should be scoped to the host.

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 80" aria-hidden="true">
  <g transform="translate(48 40)">
    <g class="svg-example-pivot">
      <rect x="-18" y="-10" width="36" height="20" rx="4" fill="#287b92" />
    </g>
  </g>
  <style>
    .svg-example-pivot {
      transform-box: fill-box;
      transform-origin: center;
      animation: svg-example-turn 800ms ease-out forwards;
    }
    @keyframes svg-example-turn {
      from { transform: rotate(-35deg); }
      to { transform: rotate(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .svg-example-pivot { animation: none; }
    }
  </style>
</svg>
```

For a simple open stroke, `pathLength="1"` normalizes dash distances. Use unitless values; dash percentages use a viewport-based length and are not percentages of the path. Preserve a visible final state when motion is reduced. Filled compound contours and multiple subpaths need their own reveal design.

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 48" aria-hidden="true">
  <path class="svg-example-reveal" pathLength="1" d="M8 24 Q30 2 48 24 T88 24"
    fill="none" stroke="#287b92" stroke-width="4" stroke-linecap="round" />
  <style>
    .svg-example-reveal {
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      animation: svg-example-draw 900ms linear forwards;
    }
    @keyframes svg-example-draw { to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .svg-example-reveal { animation: none; stroke-dashoffset: 0; }
    }
  </style>
</svg>
```

These decorative examples are inline SVG. Adapt naming for informative art, and verify the receiving viewer rather than assuming scripts or host styling can reach an external image.

Official references: [transform-box](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-box), [pathLength](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/pathLength), [stroke-dasharray](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-dasharray).

### Evidence for the requested artwork

Test every authored pose and representative transition pairs, especially pairs with different topology or missing parts. Sample the middle of the transition, repeat A→B→C before A→B completes, pause/resume, test reduced motion, and remount the host component when relevant. Report the actual library/version and target embedding mode. A static endpoint screenshot proves neither intermediate geometry nor cancellation.
