# Turning an art direction into a Blender asset

Use this procedure with the selected style's own production playbook. It coordinates implementation and comparison; it does not replace that playbook with a universal look. Read only the style the user requested, and keep the existing project's art decisions when improving an asset.

## Define a testable visual contract

Record the asset, intended camera, approximate screen coverage, lighting context and output. Separate references by purpose: silhouette, proportions, material response, palette, motion and presentation. Two references can disagree because they illustrate different properties. Resolve those roles before averaging them into a new style. A named genre or era alone does not specify every color, proportion or technical limitation.

Translate the direction into observable relationships: which mass dominates, which value region attracts attention, which edges stay crisp, how many material families are visually distinct, and which details survive the smallest required view. Treat exact numbers as the current experiment's parameters, not global laws. Preserve the reference and a neutral baseline alongside the styled image.

## Choose where the appearance is produced

| Mechanism | Suitable work | Verification boundary |
|---|---|---|
| Geometry and normals | Angular silhouettes, carved forms, deliberate facets, graphic outline shells | Inspect grazing angles, negative scale, intersections and the exported surface |
| UVs and texture data | Painted light, constrained texel grids, ink masks, brushwork or material accents | Inspect saved maps, color spaces, filtering and mip behavior at the target size |
| Material graph | Surface response, controlled value bands, stylized specular highlights | Confirm the active renderer supports the nodes; a Blender effect may need an engine shader or bake |
| Lights and world | Form readability, contrast hierarchy, palette interaction | Hold exposure/view transform constant in comparisons; distinguish light color from base color |
| Camera and sampling | Isometric composition, pixel output, graphic perspective, depth hierarchy | Record position, projection, resolution and sampling; lens changes alone do not reproduce viewpoint changes |
| Compositing | Print texture, halftone, restrained glow, limited palette or display treatment | Keep a pre-effect diagnostic image; a post-process image does not describe the exported mesh/material |

Do not assume a renderer-specific toon graph survives glTF. For portable delivery choose a supported material representation or provide the separately implemented engine effect. An emission-based graphic material also changes how light and shadows contribute; judge that intentionally rather than calling every flat shader equivalent.

## Produce a controlled style study

1. Use an owned scene or new file. Assemble the minimum representative geometry: curved and flat regions, a silhouette feature, relevant material transitions, and the actual background value. A sphere alone cannot test character identity or architectural composition.
2. Establish the camera and a small diagnostic lighting setup. Save the baseline with the current source revision and settings. Keep enough neutral illumination to expose shape errors.
3. Implement the dominant style mechanism first. For example, test a value-band material on the actual forms before adding ink outlines, paper texture and bloom. Change one consequential family at a time so improvements have an identifiable cause.
4. Inspect the saved image at target display size and a useful close-up. Check silhouette, local tangencies, edge stability, value grouping, accent placement and texture frequency. For moving output, inspect a short sequence; temporal shimmer cannot be approved from one still.
5. Transfer the accepted configuration to the production asset using explicit material ownership. Avoid changing a shared datablock when only one prop should change. Preserve the original version or keep the experiment on an export/working copy.
6. Capture the final art view and diagnostic views, then check the actual export if delivery includes one. Correct the highest-impact supported defect and repeat the affected views.

## Diagnose the cause before adding effects

| Visible failure | Investigate first | Useful correction and recheck |
|---|---|---|
| Important forms merge | Camera silhouette, background value, local material grouping | Separate shapes or value roles; compare the same small game view |
| Graphic shadows become muddy | Renderer/node support, light size, ambient contribution, tone mapping | Simplify the light/graph and inspect a ramp test plus the real asset |
| Painted colors appear washed out | Image color space, exposure, view transform, double lighting | Correct interpretation or shading intent; compare saved textures and final render |
| Pixel/line detail flickers | Projection movement, subpixel geometry, filtering, sampling, outline width | Stabilize the intended representation; inspect consecutive frames at output resolution |
| Surface noise overwhelms identity | Texture scale, roughness frequency, accent coverage | Reduce secondary detail in the relevant region; preserve designed focal features |
| Beautiful source, different export | Unsupported shader nodes, missing maps, alpha/tangent handling | Rebuild/bake supported data or implement the target shader, then review imported output |

Do not hide a modeling defect with darkness, fog, cropping or depth of field. Conversely, judge an intentionally graphic material in its declared visual context rather than rejecting it solely for lacking physical realism.

## Handoff

Return editable source, textures or other required resources, the chosen representation, camera/render/color-management settings and current review images. State which visible properties were examined, which optional refinements remain, and whether the engine representation was actually tested. The visual reviewer returns findings; an authorized writer creates renders, performs repairs and persists that review accurately.
