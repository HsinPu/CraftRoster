# Graphic fills and contours

## Define the deliverable

Determine whether the user wants a raster illustration, 3D asset with flat shading or actual vector paths. This package authors the first two in Blender. If editable SVG is required, plan a separate vector-authoring/export workflow and verify paths; a clean-looking PNG is not vector data.

## Construction recipe

Sketch the intended outer contour and layer order. Build simple curves or meshes with broad surfaces and minimal bevels. Use orthographic projection for icon-like work unless the reference deliberately includes perspective. Position depth layers to avoid accidental overlap while keeping the intended flat composition. A handle or gap must remain several pixels wide at the smallest target size.

Assign flat local colors. Unlit/emission presentation can keep fills consistent in Blender; do not call generic emission an automatically supported unlit glTF material. If shadows are requested, construct a controlled shadow plate or simple directional cast shadow as a designed graphic region. Avoid noisy roughness, ambient occlusion dirt and gradients that contradict the approved fill language. Render with enough sampling to retain crisp edges, then inspect the actual small output; antialiasing should soften a pixel edge without inventing a large blurry border.

## Repair and acceptance

Plastic-looking highlights need material/shading simplification, not more saturation. Ragged edges need geometry/sampling and output-size checks. Disappearing gaps need contour redesign. A vector request delivered as PNG needs an honest deliverable correction rather than changing the filename extension.

Require a flat-color render, silhouette, smallest-size preview and any separate shadow plate. Accept stable contours, deliberate region boundaries, readable gaps and accurate output labeling. For real vector output inspect editable paths, stacking and scaling behavior separately; a Blender render cannot establish those properties.
