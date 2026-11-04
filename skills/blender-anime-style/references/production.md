# Color-cel character study

## Choose drawing language

Measure supplied model sheets before choosing ratios, eyes and hair grouping. Anime includes restrained adult anatomy. State palette, shadow count and outline intention. Block hair as overlapping locks with deliberate negative spaces; test cheek and nose shadow before fine costume detail. Separate skin, hair and accessories so highlights can differ.

## Shader and construction recipe

In EEVEE, send white Diffuse BSDF through Shader to RGB, derive lighting luminance, remap with Constant ColorRamp, multiply by base color and feed Emission. Start with two regions and one key; introduce a midtone only if form needs it. Tune the threshold under actual light energy. Shader to RGB is EEVEE-specific. For Cycles use Toon BSDF or explicit normal/light-direction dot product remapped to emission; the latter does not automatically include cast shadows. Fresnel creates a view-angle rim, not a sun-driven cel shadow.

For blotchy cheeks compare original normals against a duplicate with a simple ellipsoid normal-transfer proxy. Mask transfer to the face and preserve ears/hair. Test several key angles. For lines choose silhouette hull or render line pass. Judge width at delivery pixels; hulls can split at hard normals and cannot draw every internal crease. Keep original material links and custom normals recoverable.

## Repair and acceptance

Fix facial form/normals before adding shadow bands. Taper outlines that swallow lashes. Remove noisy microtexture competing with cel hierarchy. Require front/three-quarter views, silhouette, face crop and two key directions. Accept reference proportions, intentional shadow shapes, stable lines and retained palette. Export needs textures plus a tested target toon implementation; Blender nodes are not portable engine shaders.
