# UV and surface delivery

## Density and seams
Measure texel density using UV coverage and corresponding world-space surface size; texture resolution alone is insufficient. Compare adjacent modular pieces and surfaces seen at similar distances. Set padding in pixels for the smallest supported mip, not a fixed UV-unit margin. Check mirrored tangent orientation and bake overlap separately from intentional shared UVs. A lightmap channel may require unique packing even when the color channel tiles.

## PBR and stylized work
Color textures are usually interpreted as color; normal, metallic, roughness and masks as data. Verify each target instead of applying one rule to all sockets. Preserve alpha mode, cutout edges, normal-map orientation and channel packing. A material-slot count is a cost indicator, not an engine draw-call measurement. Nonphysical values and hand-painted shading may be intentional in an approved style.

## Baking
Use explicit high/low object sets and inspect ray misses, projection leaks and hard edges before a long bake. Calibrate cage distance with a small sample. Check metallic surfaces when baking color: a lit diffuse response is not necessarily the source base color. Verify external image files exist and sample the actual saved maps, including packed channels. Bake or rebuild nodes the selected export format cannot represent.

## Evidence
Save neutral-light and intended-light views with camera, color management and exposure held consistent across a comparison. Zoom into seams and sensitive regions without changing the comparison to hide defects. After a UV change, invalidate baked maps whose correspondence changed; after a shader-only fix, preserve geometry and rig.
