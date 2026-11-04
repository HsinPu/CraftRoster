# Pixel grid contract

## Separate two targets

Low-resolution textures on 3D models and pixel-art raster outputs are related but different. State texture dimensions/texels per unit separately from render dimensions. Choose a fixed or moving camera, output palette and integer enlargement factor. A low-res render alone does not guarantee intentional pixel clusters.

## Production recipe

Block identity in silhouette at the base render size. For a 32-pixel-high prop, allocate visible features at least a few pixels when possible; a 0.3-pixel wire will shimmer instead of reading as a deliberate line. Align UV edges to texel boundaries on broad planar surfaces and inspect a checker with nearest texture interpolation. Curved surfaces need deliberate density distribution rather than assuming perfect alignment everywhere.

Render a base image such as 128 by 128 and inspect it before integer nearest enlargement. Treat antialiasing, color quantization and palette mapping as explicit presentation choices. If sampling softens clusters, use a controlled quantization/cleanup stage or painterly pixel editing only if that matches the requested workflow. Do not promise a universal Blender anti-aliasing-off switch across renderers. Keep a limited chosen palette and test bright/dark backgrounds. A simple broad light can reveal form; unlit art may need authored value ramps instead.

## Repair and acceptance

Blurred texels need interpolation, UV density and resize method checked separately. Shimmering edges need pixel coverage/camera alignment corrected, not more geometry everywhere. A posterized photo needs cluster design and silhouette cleanup rather than another color limit.

Require base-size raster, nearest-enlarged preview, texture/UV crop and contrasting-background comparisons. For moving cameras view a short motion test. Accept intentional clusters, consistent texel density where required and no unintended fractional scaling. Engine point sampling, mip behavior and screen quantization require target tests.
