# Realism through measured causes

## Establish references

Record a known dimension, material identity, use history and intended camera coverage. Neutral photographs or measured swatches are preferable to deriving base color from an unknown graded image. Do not prescribe a universal skin color or assume a door/car has one fixed size. Inspect the actual reference subject.

## Asset recipe

Build primary dimensions and curvature before damage. For scans keep an untouched source, remove isolated fragments on a duplicate and repair holes according to the visible surface. A universal remesh voxel size can destroy thin geometry; choose resolution relative to the smallest required feature and compare against the scan. Retopo/bake only when delivery constraints warrant it, preserving the high-detail source.

Use metallic for exposed conductive surfaces, dielectric response for paint/plastic and masks at transitions. Corrosion and dirt are not automatically metal. Load color textures with the appropriate color transform and numeric roughness/normal maps as non-color data. Compare roughness under broad reflected sources; a value around 0.2 versus 0.6 is a useful contrast test, not a material standard. Preserve glass thickness and scale-dependent subsurface behavior where relevant.

Place a neutral gray reference or known material in diagnostic lighting. Use broad and grazing light to reveal bevels, normal seams and roughness. Add microdetail only when projected size makes it visible. A hero close-up may justify geometry where a distant asset only needs shading.

## Repair and acceptance

Plastic metal needs substrate/coating and reflection checks. Scan albedo with baked shadows needs de-lighting or corrected capture; rebaking the same shadowed texture under flat light does not remove its shadows. Over-sharp bump needs frequency/amplitude correction.

Require dimension evidence, neutral/grazing images, final view and material/texture crop. Accept measured proportions and plausible response matching references. Cinematic realism does not prove LODs, collision, budgets or engine import; those remain explicit delivery tasks.
