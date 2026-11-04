# Look development decisions

## Two useful views

A neutral diagnostic view reveals material assignments, shading seams, clipping and texture problems. A presentation view expresses the selected mood, focal point and art style. Keep both: a dramatic render must not replace evidence of the asset's actual material and form.

## Material, light and camera

- Choose a limited set of material roles and connect roughness, scale and wear to their physical or stylized story. Avoid uniform metallic, glossy or noisy surfaces that flatten the hierarchy.
- Shape reflections for reflective objects. Increasing light power alone does not define the reflection pattern or improve form.
- Large sources can reveal broad curvature; small sources can test hard highlights and normal-map seams. Use each deliberately, preserving exposure for comparisons.
- Frame to retain meaningful silhouettes and negative spaces. Check portrait and landscape crops as required by the deliverable; projection and sensor fit affect margins.
- Settle perspective and focal length before using depth of field. Inspect a sharp diagnostic image as well as the final treatment.
- Use the project's intended display/view transform. Record it with exposure; do not silently change material colors to compensate for mismatched color management.
- For game assets, inspect the target camera and likely engine illumination. Offline GI or compositor polish is not evidence that the same appearance exists in the engine.
- Match before/after settings except the deliberate variable. Check motion or a turntable when specular response, animation or a loop is part of acceptance.
