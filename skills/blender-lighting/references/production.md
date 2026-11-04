# Light rigs, environments and illumination correction

## Lighting contract

Record intended mood, subject hierarchy, target renderer, units, camera and view transform/exposure. Preserve existing world, light collections, animation and compositor. Create owned rigs or isolated scenes and share data only deliberately. Start with key direction, then shadows/fill, reflections and accents. A visible motivated source is useful where scene realism requires it, but studio/product art direction can use off-camera shaping lights.

## Studio and reflective surfaces

For a one-meter object, start with a large area key roughly 30–45 degrees to a side and 30–40 degrees above, then an opposite fill around one-quarter to one-third key contribution. Place rim behind only when separation needs it. Measure contribution in the rendered image; equal light powers at different distances/sizes are not equal brightness. For point-like emitters, illumination falls with distance squared. Move a light twice as far and around four times power can preserve contribution, but extended-area geometry changes that approximation.

Area light size controls angular softness and reflected shape. Reflective metal/glass needs broad softboxes/strips and controlled black/white environment shapes. Increasing power cannot repair an absent reflection. Use grey/chrome test objects when comparing rigs, then remove them from delivery unless requested. Set light orientation local -Z toward the subject and confirm object linking/visibility. Light linking is version/engine-specific: test receiver/blocker collections rather than claiming universal parity.

## HDRI, exterior and interior

Build Environment Texture → Background → World Output Surface. Load the actual HDRI, record license/path and rotate with Texture Coordinate/Mapping. Align the bright source to intended shadows; do not add an independent Sun from the opposite direction by accident. Strength is scene-dependent. Preserve dynamic range rather than clipping every hotspot to fix noise.

For exterior use a Sun plus sky/HDRI with matching direction. Sun angle controls apparent source softness (about 0.5 degrees for a sharp solar disk; larger is stylization/overcast approximation). Blender 5.2 sky types include SINGLE_SCATTERING and MULTIPLE_SCATTERING; inspect installed enums instead of using legacy NISHITA blindly. Avoid duplicate direct sun from both a sky disc and Sun lamp. Time-of-day and atmospheric density belong to blender-time-of-day.

For interiors start from real openings and practicals, then inspect light-path convergence. Area lights in windows can be actual fill sources; portal support varies by Cycles version and must be checked, not assumed a magic brightness source. Set sufficient diffuse/transmission bounces for the architecture/glass and compare a crop. Electrical bulb wattage is not equal emitted radiant power; Blender watts and photographic exposure need a calibrated scene, not a literal 60 W household-bulb rule.

## Atmosphere and special moods

Horror can use one narrow practical pool with lower fill, a readable exit and dark negative space. Neon can use emissive geometry plus deliberate spill lights; avoid making every fixture equally bright. Temperature numbers need adaptation to camera white balance: moonlight is not inherently an 8000 K blue lamp. Flicker requires bounded keyed energy and independent timing; preserve shared light data or duplicate it before per-fixture animation.

Fog uses an actual volume bounded to the shot, with scale-aware extinction; arbitrary density 0.1 across a huge scene is usually opaque. God rays need light direction, occluder, scattering and renderer volume shadows, not density alone. Use blender-time-of-day for visibility-based setup and review final-resolution renders.

## Diagnose and deliver

Flat form: change direction/reflection structure before contrast grade. Floating look: inspect actual contact and shadow/caster settings. Fireflies: locate small bright sources, glossy paths, normals and sample convergence before aggressive clamp; indirect clamping changes energy. EEVEE reflection/probe/raytracing and Cycles GI differ; test the renderer actually used. Legacy EEVEE bloom/SSR/contact-shadow recipes are not current universal properties.

Deliver light/world inventory, transforms, sizes/powers/colors, exposure/view settings, neutral and intended renders plus actual corrections. Compare matched cameras, grayscale hierarchy and alternate light direction for fragile shading. A beauty image does not validate target-engine lightmaps/dynamic shadow performance; perform those separately.
