# Precipitation, surface weather and storm timing

## Weather layers and ownership

Record scale, FPS/range, camera path, weather intensity, target renderer/runtime and output budget. Separate atmosphere (blender-time-of-day), precipitation in space, ground impacts, wet/snow material response and transient lightning. Preserve source world/material links, light animation and construction meshes. Shared materials/groups affect every user; duplicate or scope before weathering one object. Names/prefixes alone are not safe deletion ownership.

## Analytic precipitation

Build a world-fixed volume covering the actual camera frustum across the full move with near-camera clearance. Use camera.view_frame/evaluated transforms and actual aspect/sensor fit, not a square frustum assumed from focal length. Sampling only a few frames can miss a fast camera excursion; bound the motion or sample sufficiently. Count equals volume times artistic visible density and must be capped with disclosure. Base mesh vertex count may be zero for GN instances; inspect evaluated/render geometry.

For a seamless analytic loop, particle phase is fractional time plus seeded offset; life index must wrap to a finite integer number of lifetimes per loop, reusing the same per-life randomness. Position follows start + velocity*time, with deliberate sway. Frame start+N should reproduce start when period is N; render start..start+N-1. This is arbitrary-frame analytic evaluation, not a simulation cache. Inspect velocity/visibility at respawn to avoid popping even with matched endpoint states.

Rain speeds around 4–9 m/s, snow about 0.5–1.5 and ash slower can guide scale; visible density is an art-directed subset, not meteorological rain rate. Streak length is speed times exposure (7 m/s at 1/48 s is about 0.146 m). If geometric streaks already encode shutter length, enabling motion blur adds further smear and must be intentional. Back/side light and background contrast make rain visible; adding counts cannot fix front-lit invisibility.

Raycast against explicit roof/ground geometry in a consistent coordinate space. Stop particles at first intersection and align impact splashes to hit normals. Sway can move particles away from a straight ray path; account for actual trajectory or report approximation. Splash crown duration around 50–100 ms is a starting scale; test its sampled frames at the chosen FPS. Avoid rain under roofs and giant near-camera drops. Viewport fraction is not final render density; background depsgraph checks may still use viewport behavior.

## Wetness, puddles and snow

Wet porous surfaces may darken while a water film lowers roughness/adds coat; nonporous paint/metal need less darkening. Preserve original base normal, roughness, coat and links in a reversible owned group. Puddles favor low/up-facing regions with masks, not arbitrary noise on vertical walls. Flatten underlying high-frequency normal inside standing water and add bounded ripple normals to water/coat. Ripples require actual puddle coverage and time in seconds, so changing FPS invalidates frame-based assumptions.

World-space masks align static tiles but slide on moving props. Object-space masks stick but need scale-aware coordinates. Vertex weather masks require declared channel meanings and linear values; a CPU noise implementation is not automatically identical to a shader noise mask. Test known samples and visually compare. glTF active color export and target shader interpretation need explicit checks; vertex colors are not literally free on a mesh that gains a new stream.

Snow coverage combines up-facing slope, accumulation/exposure and artist masks; slope alone places snow under roofs. Geometry thickness needs actual shell/offset and edge blending without coplanar underside artifacts. Inspect extrusion topology, intersections, grounding and LOD cost. A shader white layer cannot change silhouette. Keep source surface and separate snow delivery geometry.

## Lightning

Define strike frames, return strokes, bolt direction and decay. Around 40–60 ms spacing is a physical cue, but at 24 FPS it quantizes coarsely; choose readable timing. Use Constant/Linear keys intentionally and ensure energy returns to baseline before/after each event. Build owned branching curves with tapered radius/emission and synchronize light/sky flashes. Do not key a shared user world strength without preserving its existing animation. Fixed 300 m placement is not universally in frame or physically located; inspect actual camera/ground/cloud composition.

## Repair and acceptance

Rain missing: inspect lighting, camera volume and render fraction. Rain through roof: ray coordinates/trajectory/collider inclusion. Puddle sliding: coordinate space. Snow indoors: missing exposure mask. Surface change leaking: shared material/group ownership. Lightning persistent bright frame: interpolation/baseline keys. Recheck affected layers after correction.

Deliver source graphs, deterministic seeds, bounds/count caps, speeds/lifetimes, surface masks/meshes, lightning schedule and final-resolution motion preview. Measure loop endpoint/critical frame geometry and inspect full playback for density, roof leaks, reflections and flicker. For games export masks/snow/flipbooks and recreate runtime particles/material controls; generic GLB rain instances do not establish Niagara, VFX Graph, Godot or Roblox support/performance.
