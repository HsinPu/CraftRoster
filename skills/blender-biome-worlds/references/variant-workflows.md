# Biome construction workflows

Use the existing patch/grid recipe as a scale study, then choose the relevant branch below. Dimensions and shader ranges are starting proposals in meters, not universal ecology or engine settings. Retain an atmosphere-off camera for every branch.

## Underwater reef, open seabed and submerged structures

Establish water surface, seabed depth, camera depth and visibility distance separately. For a 24 m reef study, shape a sediment basin, a raised rock shelf and a navigable negative-space channel; leave an open seabed strip so distance attenuation can be judged. Build rock attachment points first, then coral/plant clusters using bounded instances with substrate and slope exclusions. Root plants into sediment and attach hard growth to surfaces; avoid uniformly scattering every organism over every substrate. Model buoyant fronds as curves with primary flow direction and a restrained animated sway, preserving their root attachment.

Use rough sediment, distinct rock response and restrained translucent growth. Water absorption/scattering should attenuate with path length; a cyan World tint alone cannot establish depth. Start a bounded volume with declared visibility (for instance 20–40 m for a stylized clear study), then tune against depth markers rather than copying density. Caustics may be a labeled animated light/shader approximation; their presence is not proof of physical caustic simulation. Test up-looking silhouette, side view and a near-to-far marker row under fixed exposure.

If the hero vanishes, shorten the optical path or increase local separation before reducing all fog to zero. If growth looks terrestrial, correct support/flow and distribution before adding bubbles. Deliver seabed/reef/growth collections, depth/visibility settings and clear-water/atmosphere images; inspect sediment seams and root attachment without effects.

## Desert dunes, rocky desert and oasis transitions

Choose wind direction and distinguish mobile sand from exposed bedrock. Create a dune cross-section with a broad windward ramp, crest and steeper lee face, then vary ridge continuity; do not repeat identical sine waves across the patch. Put rocks where erosion/exposure explains them and sand drifts against their sheltered sides. For an oasis, define water level, basin and damp-to-dry transition before vegetation. A salt flat, dune field and rocky desert need different surface geometry and roughness, not a sand-color swap.

Use broad low-frequency sand form, mid-scale ripples aligned to local wind and fine detail only at the intended pixel scale. Keep ripple normal amplitude below silhouette scale. A low warm sun can reveal crests; a separate high-sun diagnostic reveals overmodeled noise. Heat shimmer belongs to a reversible presentation layer, not deformed delivery geometry.

Diagnose toy-sized dunes with a human/vehicle proxy and grain/ripple size comparison. Floating rocks need sand contact repair; razor repeats need ridge variation. Inspect crest silhouette, sheltered dust placement, oasis water edge and a neutral roughness sheet. Deliver wind/height/material masks and a transition section; a still does not prove drifting sand or water behavior.

## Arctic snowfield, glacier and exposed ice

Separate terrain bed, old compacted snow, fresh accumulation, ice and liquid water. Model the terrain first, then accumulate on exposed upward surfaces with authored lee drifts and reduced coverage on steep faces; add roof/overhang exclusion instead of slope-only white paint. For a glacier study, place a directional flow mass, compressed ridges and crevasse openings with modeled depth rather than black decals. Keep hazardous openings visibly distinct from ordinary surface ripples if the game contract requires them.

Use rough diffuse snow with subtle subsurface response, smoother blue/clear ice where justified and dirty old snow near traffic. Avoid pure-white clipping that removes terrain form. Compare broad overcast light with low-angle light and preserve a neutral gray-card/height marker. Breath fog is an optional timed effect around the character, not ambient snow shader noise.

Snow on cave ceilings requires exposure-mask repair. Plastic ice needs thickness, roughness/reflection and transmission inspection before adding blue saturation. Check footprint/drift scale, sheltered accumulation, crevasse edge continuity and ice-water intersections. Deliver bed and accumulation separately, coverage/thickness masks and both light conditions; snow-motion and engine friction remain untested.

## Jungle canopy, understory and clearing

Build height strata explicitly: a few dominant trunks/crowns, secondary canopy, understory masses, ground cover and decomposing litter. Reserve the actual player/camera route and one light opening before scatter. A 24 m study can contain one canopy gap and one shaded corridor; distribute plants by gap light, moisture and slope. Trunks need root flare/contact, lianas need endpoints and gravity/attachment logic, and epiphytes attach to hosts rather than float in volume.

Group crown values into readable masses. Vary leaf roughness by species/wetness without making every leaf a bright mirror. Use canopy-filtered key plus restrained atmospheric shafts; maintain a fog-off leaf/backface diagnostic. Camera height and lens must reveal route clearance and foreground occlusion, not only an overhead attractive carpet.

If the image becomes glitter noise, reduce individual leaf contrast/normal strength and consolidate clusters. If the route disappears, change primary canopy/understory placement before merely brightening the floor. Inspect root contact, liana support, clearing silhouette and near/far card appearance. Deliver bounded seeds/masks, strata collections and route-exclusion volumes; target overdraw/performance requires an actual engine test.

## Cave, cavern and inhabited underground

Choose geology or declared fictional formation. Block entrance, main chamber, connecting passage and vertical section with thickness and roof support. Align major strata/fractures before secondary stones. Distinguish water-carved channels, collapse rubble and deposited formations; hanging and rising formations need surface roots. In inhabited caves add practical fixtures, cables, drainage and maintenance access at human scale.

Use rough dry rock and localized smoother wet flow, not global wetness. Place daylight only where openings allow it, then motivated lamps or authored bioluminescence. Render a brighter geometry diagnostic: black grading must not conceal missing roof backs, inaccessible passage or wall intersections. Use actual entrance-eye, chamber-eye and reverse cameras.

If the chamber looks like a thin tunnel shell, repair roof/side thickness and interlocking masses. If every wall reads as a light source, limit emission to biological/mineral patches. Deliver section, entrance-to-chamber route, dry/wet masks and practical layout. Measure passage gauges and inspect surfaces behind the camera; cave collision, climbing and visibility AI are separate.

## Floating islands and vertical archipelagos

Define the fiction supporting suspension and whether players see/fly below islands. Model the underside as a designed volume with taper, strata, roots and transitions to the top rim; an extruded flat disk with a noisy bottom is insufficient for close underside views. Stage three elevation bands with different silhouettes and preserve unobstructed negative space between them. Bridges, waterfalls and roots need supported origins and explicit endpoints; mark impossible water recirculation as authored fiction rather than geological proof.

Top soil/vegetation and underside rock need coherent material continuity. Light the underside enough to reveal construction in a diagnostic, while presentation mist can separate elevation bands. Use a low upward view and a traversal approach as well as the hero wide shot; orthographic and perspective layouts need different overlap checks.

If islands merge into one silhouette, alter spacing/height/mass before adding saturated rims. Waterfalls ending in nothing need a deliberate dissolve/out-of-frame boundary. Inspect underside normals, root grounding, bridge anchors and vertical-camera crop. Deliver top/underside modules and altitude/attachment sheet; flight routes and structural feasibility remain project/engine questions.
