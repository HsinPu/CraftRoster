# NPR construction and portability

This is an original implementation guide informed by the two mapped upstream entries and EL4's reviewed toon script. It does not bundle or run that script. Discover the installed Blender version, renderer and actual node/property availability before constructing a graph. Renderer-specific workflows must be tested separately.

## Preserve and scope the edit

Before replacing a material output, record the material, active output node, source socket identifier, assigned slots, node-tree sharing and object users. A material used by an unrelated object needs a private copy for a scoped change. Save a recoverable revision. Preserve scene view transform, exposure and world settings independently of the material graph.

Use a uniquely named node group with configurable base color, shadow colors, band thresholds, edge width, specular and rim. Give the group an ownership tag. Updating it should update the owned instance rather than duplicating a growing stack. Rebuilding a group interface can invalidate socket links; reconnect and verify all owned material instances after interface changes. Removing the look must restore the original surface link and remove only owned drivers, groups, slots, line objects and modifiers. If the user edited a captured connection afterwards, report the conflict instead of overwriting it blindly. Creating a key light is an explicit scoped scene edit; do not silently reuse the first sun from an unrelated collection.

## Choose the shading calculation

| Model | Construction | What it omits or depends on |
|---|---|---|
| EEVEE scene response | White Diffuse BSDF → Shader to RGB → luminance → remap → band colors → Emission | EEVEE-specific; thresholds depend on actual lighting. Render-pass and upstream effect limitations need diagnostics. |
| Explicit directional bands | Normalize shading normal and vector pointing toward the light; dot product; threshold and select band colors; output Emission | Does not automatically calculate cast-shadow visibility, multiple lights or indirect illumination. |
| Cycles Toon BSDF | Tune Size and Smooth on the diffuse/glossy components under actual lights | A distinct Cycles shading model, not a drop-in EEVEE Shader to RGB graph. |
| Painted/unlit | Authored local-value texture feeding a supported shadeless presentation | Fixed lighting may contradict dynamic light; export depends on recognized target material representation. |

The bundled manual consulted during package authoring labels Shader to RGB as EEVEE-only and Toon BSDF as Cycles-only. Recheck the installed version rather than extrapolating from node-type existence. Reference pages: [Shader to RGB](https://docs.blender.org/manual/en/latest/render/shader_nodes/color/shader_to_rgb.html) and [Toon BSDF](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/toon.html). These documentation checks are not native render tests.

For the directional model, define whether normal/light vectors are world or object space; mixing them causes rotation-dependent errors. For a sun, its local forward emission axis and the vector from surface toward source point in opposite directions. Validate a test sphere with the sun rotated by a known angle. Start a two-band experiment near a dot threshold of zero, then place the terminator to match the reference. A small smooth transition can reduce temporal aliasing; hard steps may suit a still but flicker in motion. A third band needs its own threshold and color. A gray shadow, saturated shadow or hue-shifted shadow is a design choice; no shadow color is forbidden universally.

Keep highlights separate from diffuse bands. A hard specular shape can derive from a normal/half-vector test, masked away from unlit regions if the style requires. A view-normal/Fresnel test creates a rim; it cannot replace light-direction diffuse shading. Face skin, hair and metal may need different highlight masks. Compare a hand-painted hair highlight against camera motion before assuming it acts like physical specular. Record view transform and exposure because flat colors can be remapped by display rendering; do not impose Standard on every existing project.

## Lines, normals and drawing

An outline hull is a separate outward shell with reversed faces and a material/culling arrangement that reveals the rear contour while hiding the front shell. Check the actual renderer's transparency and culling support. Apply or account for scale on an export copy before assigning a physical thickness. A 2–5 mm shell on a human-sized model is only a test range: perspective, scale and output resolution determine visible pixels. Mask width near eyes, mouth, fingers and thin tips. Hulls do not provide all intersection or inner-feature lines. Hard/split normals can create gaps; smoothing everything may destroy the intended underlying facets.

For render lines, use the installed version's supported Grease Pencil Line Art or Freestyle facilities with a known camera. Decide which contours, intersections and creases to include. Separate line layers/materials for different weights when necessary. Inspect close/far views and an animated test for popping. Authored Grease Pencil strokes can supply selected facial or impact marks. Grease Pencil data APIs changed across major versions; inspect current collection, layer, frame, drawing and stroke interfaces before writing code. Do not assume an old `gpencil`/v3 snippet is valid. A drawing is a render asset, not automatically a game-exportable line system.

For anime faces, preserve original normals and test a masked transfer from a smooth ellipsoid proxy. Compare several light angles and facial expressions; transfer must not accidentally flatten ears, lids or nose identity. An angle-driven face-shadow threshold texture is a different design: author and preview the grayscale map, document its coordinate convention and implement its light-angle sampling in the target shader. It is not a universal node export.

For an engine hull driven by smooth outline normals, calculate a separate extrusion-direction attribute rather than replacing the visible shading normals indiscriminately. Group coincident positions within a scale-appropriate tolerance, average compatible source directions and normalize. Avoid welding across nearby but distinct surfaces. Express each direction in the chosen tangent frame, including handedness, and pack components from signed range to a color/vector attribute. Document decoding, attribute domain, precision and export semantic. Tangent-space encoding requires a valid UV/tangent basis. Verify mirrored UVs, hard edges and seams in the target; a named color attribute alone does not prove the engine consumes it correctly.

## Delivery and rollback checks

Export base maps, silhouette meshes, optional hulls and normal attributes only as explicitly supported by the chosen format. Apply modifiers to a delivery copy, preserving editable source. Node graphs, drivers, Line Art and Freestyle are not generic portable engine materials. Rebuild the light-band, shadow, highlight and line behavior in the target or deliver baked/unlit art when that is the agreed contract.

For glTF unlit output, use a node arrangement recognized by the installed exporter and inspect the actual generated `KHR_materials_unlit` extension. An Emission node by itself may export as an emissive PBR material; its name does not establish unlit semantics. The [Blender glTF manual](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) documents supported shadeless arrangements involving camera-ray logic without Principled BSDF. Verify extension output and target appearance instead of relying on graph resemblance. Baking a directional look fixes the lighting and does not preserve dynamic shadows.

Test on a duplicate object with shared-material users, hard edges, mirrored UVs and a face region. Capture before, styled, changed-key and restored images, plus inspected material/slot/driver counts. Re-running should not accumulate owned stacks; removal should recover the original look and leave unrelated data intact. Technical recovery, visual quality and target-engine equivalence are separate acceptance results. No native NPR execution or engine parity is claimed by this written guide.
