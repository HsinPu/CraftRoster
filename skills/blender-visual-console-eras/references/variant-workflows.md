# Asset era and display/media workflows

These are reference-driven looks, not hardware emulators. Keep asset constraints, renderer approximations and media treatment as separate switches. Preserve clean geometry/textures and an untreated sequence. Numerical budgets below are study choices to be revised for the actual brief.

## PS1-inspired early polygonal work

Begin with a low-detail silhouette and deliberately sized texture sheet, for example a 128- or 256-pixel study atlas. Model enough polygons for the intended outline, assign UVs so important features have readable texels and test nearest filtering at the intended output resolution. Vertex-color/value groups can provide lighting structure without high-frequency normal maps. Use a stable clean baseline before optional vertex snapping or affine-like distortion.

Affine texture interpolation and hardware-specific depth/precision effects are not reproduced merely by low polycount or turning off mips. Label a shader/comp approximation and isolate it. Do not split vertices to create accidental cracks in delivery geometry. Review moving camera and textured slanted plane; if wobble creates holes or unreadable labels, reduce it or keep it only in presentation. Deliver clean/treated pairs, atlas/filter settings and the actual implemented approximation, not a hardware-accuracy claim.

## PS2-inspired transitional 3D

Choose specific reference materials, articulation and output rather than prescribing one console-wide shader. Increase silhouette/joint detail where the earlier variant visibly fails, retain controlled texture resolution and build selected baked or simple specular response. A character needs enough joint loops to bend; an environment needs stable module seams. Add bloom only when the reference uses it and keep source highlights legible.

Compare the same camera against the earlier-3D baseline, separating geometric improvement from texture filtering and post. If the result is only a PS1 mesh with blur, repair articulation/material differentiation. Deliver near/far texture and pose sheets, clean output and optional post stack. Emulator-like motion/precision is not implied by this art treatment.

## PS3-inspired material and lighting study

Pick actual reference cues such as particular specular maps, baked light/AO treatment or density; no single deferred-rendering rule describes every title. Create authored diffuse/specular/roughness interpretations as separate maps/groups and choose how to reproduce them in the current renderer. If baked lighting is part of the look, retain its source/UV and avoid confusing it with a portable PBR albedo.

Use a neutral light rotation to expose double occlusion and over-shiny materials. If dark cavities are baked into diffuse and multiplied again by AO, correct the layer logic rather than raising exposure globally. Deliver source-era interpretation and a current-renderer adaptation separately, with side-by-side reference observations and stated approximation limits.

## PS4-inspired PBR asset study

Use a coherent metal/rough workflow, material-specific surface scale, texture-density planning and LODs at actual camera distances. Preserve substrate/coating distinctions rather than setting every worn edge metallic. Build a hero and background variant with the same principal silhouette and attachment contracts. Pick lighting from the reference, not an automatic cinematic grade.

Inspect neutral/alternate illumination, mip-distance seams and matched LOD screen sizes. If the asset depends on a beauty highlight to hide normal defects, repair tangents/UVs before presentation. Deliver texture/color-space/packing manifest and actual view comparisons; a PBR graph does not establish any specific console's memory or frame-rate performance.

## PS5-inspired contemporary density and GI study

Start from the intended screen size and target capabilities, then decide whether extra geometry, texture detail or lighting actually improves the view. Preserve editable high source and make controlled delivery variants; do not equate scans or millions of triangles with a complete contemporary asset. Test small detail under the selected GI/rendering approach and provide a simpler alternative when the target lacks the assumed feature.

Compare dense and reduced geometry at matched camera/lighting and inspect silhouette, normal response and dependencies. If detail only adds noise or cannot survive mips, simplify. Deliver measured file/geometry/texture costs and actual renderer results. Engine GI/virtualized geometry support and console execution remain unverified until tested there.

## DOS palette and dither presentation

Choose a specific palette size/table and resolution from the reference; DOS output is not universally one palette or mode. Quantize a clean render to the declared palette and choose ordered or error-diffusion dithering deliberately. Keep readable value steps for focal objects and stable boundaries around interface/text masks. Dither is image-space treatment, not mesh noise.

Inspect a gray ramp, flat colors and moving edges. If temporal noise crawls, use a stable ordered pattern or controlled frame policy. If dark objects merge, revise palette allocation/source values before adding more speckles. Deliver palette table, quantizer/dither parameters and untreated/processed frames; exact video-mode emulation requires a separate implementation.

## Arcade stage and attract-mode composition

Clarify whether the deliverable is a cabinet/environment, game-stage artwork or an attract presentation. For a cabinet model build screen recess, bezel, control surface, body and access panel at a known user scale. For stage artwork reserve character/action lanes and separate foreground/background. Attract animation should present a few timed focal beats with clean start/end states, not continuous unrelated flashing.

Use strong broad contrast and readable shape groups; neon trim is optional. Inspect play versus attract states at target size, with screen glow disabled to check source form. If ornaments cover controls or stage actors, relocate geometry rather than shrinking the required areas. Deliver cabinet/service or stage-state sheets and animation timing; no scoring/input/gameplay claim.

## CRT display layer

Apply scanline/phosphor/curvature approximations after setting the intended output/sample scale. Keep them parameterized and separate from texture authoring. A mask that repeats every few pixels at one resolution changes when resized, so preview the actual delivery dimensions and downstream scaling. Curvature should not crop required safe areas; bloom must preserve edge/text legibility.

Inspect test bars, one-pixel lines, gray ramp and motion. Moire or erased details require reduced mask contrast/frequency or a revised sampling policy. Deliver clean/CRT pairs and resolution-specific parameters. A compositor imitation does not simulate electron optics, all CRT models or physical display calibration.

## VHS recording layer

Treat chroma softness/bleed, luma detail, tracking disturbance and time-varying dropout as separate controllable effects applied to an already rendered image. Keep the clean signal and limit disturbance around required text/subject. Use deterministic temporal seeds and an explicit frame-rate policy; a still overlay cannot prove a convincing moving recording.

Inspect saturated edges, skin/product hues and several consecutive frames. If blur destroys source form, reduce recording treatment rather than authoring blurry textures. If dropouts appear as geometry errors, separate and label them. Deliver untreated/processed sequence and parameter/seed manifest; no analog hardware accuracy claim.

## Film grain and gate movement

Choose grain scale relative to final image resolution and exposure, then add a bounded temporal pattern. Gate weave is a separate slight image translation/rotation with overscan/crop safety. Keep grain out of raw data passes and preserve uncluttered review frames for material judgment. Do not add the same fixed speckle texture to every frame and call it temporal film behavior.

Inspect dark/midtone/highlight crops and playback for crawling, frozen grain and edge gaps. Excessive weave needs reduced amplitude or overscan, not larger hidden borders over required content. Deliver clean/grain/weave controls and temporal samples, with the chosen artistic reference and limits. Film emulation cannot establish photographed provenance.
