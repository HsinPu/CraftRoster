# PBR graphs, texture interpretation and portability

## Material contract and data ownership

Identify conductor/dielectric/coating/transmission roles, physical or stylized intent, unit scale and target shader. Inventory material slots, node graphs, image users, filenames, channels, color spaces and UV sets before editing. Duplicate shared materials/images only where independent interpretation is needed. File suffixes propose roles; duplicate competing maps must be resolved explicitly rather than taking the first alphabetical match.

Locate nodes by type (`BSDF_PRINCIPLED`, `OUTPUT_MATERIAL`) rather than localized names. New material defaults vary: ensure a node tree, create needed Principled/Output nodes and link BSDF to Surface without clearing unrelated graphs. Blender 5.2 exposes Base Color, Metallic, Roughness, IOR, Specular IOR Level, Transmission Weight, Coat, Sheen, Subsurface Scale and Thin Wall. Inspect socket names/version and migrate deliberately instead of using legacy Specular/Transmission names.

## Metal/roughness graph

Use base color without baked lighting for a PBR dielectric. Raw metal uses Metallic 1 and colored reflectance; paint/rust/dust over metal are dielectrics. Mixed values are appropriate for filtered boundaries or genuine mixtures, not a ban on all fractional metallic. Approximate starting roughness: polished metal 0.1–0.3, satin plastic 0.3–0.6, rubber/concrete 0.7–0.95; reference and finish decide. Uniform polished surfaces are legitimate. Socket colors are scene-linear; convert sampled sRGB values piecewise (`c/12.92` below 0.04045, otherwise `((c+0.055)/1.055)^2.4`). Do not convert again when an sRGB image node already handles decoding.

Image Color → Base Color/Emission uses its actual encoded color space, often sRGB. Roughness/metallic/AO/normal/height/masks use Non-Color. EXR color images may be scene-linear and must not be blindly labeled sRGB. Color space belongs to the Image datablock, so reusing one image for conflicting interpretations affects all users.

Normal texture → Normal Map (Tangent) → Principled Normal. Preserve the actual UV map, tangent basis and export triangulation. OpenGL Y+ is Blender/glTF convention; DirectX Y- needs a green inversion when the target expects Y+. Unity import can transform conventions and custom shaders differ; confirm rather than calling every Unity shader universally OpenGL. Height → Bump is shading-only; Displacement → Output requires renderer support and adequate geometry. Midlevel/scale follow the map encoding and world units, not bit depth alone.

## Specialized materials

Keep dielectric IOR/specular baseline unless measured appearance requires change. Glass uses Transmission Weight, IOR about 1.45–1.52 and appropriate thickness; water around 1.33. Thin Wall is an explicit thin-sheet approximation in Blender 5.2, not a general solution for all solids/engines. Coat models a top layer, sheen grazing cloth response, subsurface scale interacts with real dimensions. Hair BSDF and complex layered shaders need separate target adaptation.

Build procedural groups with named inputs and meaningful physical feature scale. Geometry Pointiness is a curvature cue under supported conditions; Fresnel is view angle, not actual geometric edge wear, and Bevel outputs a normal, not a scalar wear mask. Curvature/AO maps plus art direction are more portable. Bake unsupported runtime logic while retaining source graphs.

## Packing and alpha

glTF metallic-roughness uses G roughness/B metallic; occlusion is R when sharing ORM. Route AO through the exporter's documented occlusion pattern, not a nonexistent Principled AO socket. Do not multiply AO permanently into albedo for a physically based portable set. Unity URP commonly uses metallic R/smoothness A, HDRP Mask uses metallic R/AO G/detail B/smoothness A; custom shaders vary. Invert roughness only when smoothness is required. Packing is linear channel data; verify a known pixel in each channel.

Alpha link, EEVEE render method and glTF alphaMode are different decisions. DITHERED does not alone prove export MASK/CLIP or correct sorting. Specify OPAQUE/MASK cutoff/BLEND per actual exporter and receiver; inspect generated material. For cards, test edge halos, both sides and mip coverage. PNG/TGA preserve data better than lossy JPEG normals, but engine compression must be measured separately.

## Correct and accept

Washed normals/roughness: inspect color decoding before changing strength. Inverted dents: compare green convention and UV/tangents. Black metal: check reflectance, world/reflections and metallic regions; a dark artistic conductor is not automatically invalid from an average histogram. Displacement tears: inspect topology, UV seams, midpoint and applied scale.

Deliver editable graphs, map-role/channel/color-space manifest, target-specific packing, neutral/alternate-light renders and actual repairs. Check missing files, invalid paths/UVs, finite parameters and semantic channels. Supported exporter node patterns include some math/mix/extension paths; neither all Blender nodes nor only direct images export universally. Inspect clean reimport and actual engine appearance before declaring portability.
