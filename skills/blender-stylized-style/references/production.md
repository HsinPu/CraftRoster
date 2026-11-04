# An explicit NPR system

## Style contract

Choose reference-driven proportions, palette roles, detail density, lighting response and outline policy. Stylized does not always mean large eyes, hand-painted albedo, mandatory rims or physically inaccurate materials. Keep the project grammar consistent and identify intentional hybrids. Read [NPR implementation decisions](npr-implementation.md) when constructing cel bands, outline geometry, transferred normals or export data.

## Production recipe

Block primary masses and silhouette before texture. Select a feature to exaggerate and preserve a mundane size/function cue when needed. Test black silhouettes and large color regions at the intended camera. Palette roles can include dominant local color, supporting neutral and focal accent; do not force a fixed 70/20/10 split on an approved design. Decide whether shading is painted, scene-lit, explicit light-direction bands or unlit graphic color.

Make a small look-development scene with the actual materials and one test object. Compare broad soft lighting against the selected NPR model before committing the full asset. For cel tests start with two bands, a tunable transition and one key; add a third region only if it improves form. Preserve the original material output links and duplicate shared data before replacing shading. Treat render view transform as a scene-level artistic choice: compare intended palette under the chosen transform, recording it rather than silently changing the whole project.

Construct line hierarchy at final pixel scale. A silhouette hull, camera line pass and authored drawing solve different edges. A face may need masked normal transfer rather than global smoothing. Keep texture strokes and normal detail below the primary shape hierarchy. For engine delivery provide base textures, band thresholds, shadow colors, normal conventions and line data; rebuild/test the shader in the actual target.

## Repair and acceptance

Random exaggeration needs a consistent mass rule. Muddy NPR needs fewer competing shadow/highlight systems. A final beauty hiding cheek artifacts needs diagnostic light rotation. Require silhouette, palette/value study, intended view, line-only view if used and multiple key angles. Accept consistent grammar, readable form and no unsupported engine-equivalence claim. A read-only review returns findings; only the writer saves repairs and images.
