# Paint that carries the asset

## Choose the lighting contract

Decide whether painted shading is intended as a fixed illustrative look or a restrained base-color treatment that must relight. Painted edge highlights and shadows can look excellent from a fixed view but may contradict dynamic lighting. Record that choice rather than mixing approaches accidentally.

## Production recipe

Block geometry with silhouette-supporting bevels. Unwrap with enough area for focal surfaces; align brush direction to wood grain, stone planes or fabric flow. Begin with a grayscale value study on the texture, then large local-color regions and directional brush groups. Put small wear accents last and tie them to use. A 512-pixel prop atlas is a useful first experiment when the prop occupies roughly a few hundred screen pixels; increase only when camera coverage demonstrates a need.

For a fixed painted look use restrained or unlit presentation while preserving geometry depth through authored value grouping. For relightable work reduce directional painted highlights, keep cavity darkening subtle and test under several light angles. Start broad roughness regions around 0.6–0.8 for matte stone/wood, then introduce a controlled metal or wet accent only if the brief calls for it. Avoid photographic noise overwhelming brush organization. Inspect seams with a neutral broad light and sufficient UV padding for the requested mip range.

## Repairs and acceptance

Double-lit ridges need painted illumination or scene lighting reduced according to the chosen contract. Muddy paint needs larger value blocks before more strokes. Seams need UV/paint continuity and padding, not hidden camera angles.

Require albedo-only image, neutral lit view, final view and seam crop; relightable delivery also needs a second light direction. Accept visible deliberate brush grouping, coherent value/material identity and no unintended lighting contradiction. Retain layered source textures when available; a flattened image alone cannot prove editable paint layers.
