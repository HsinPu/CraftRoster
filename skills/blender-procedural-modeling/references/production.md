# Procedural asset families

## Parameters and invariants

Separate identity controls from random variation. A building's floor height, footprint and door connectors are structural; balcony selection or wear may vary by seed. A rock's broad mass and base contact belong to its intended family; high-frequency roughness should not erase them. Define valid minimums, maximums and relationships, such as width exceeding twice a frame thickness. Clamp or reject invalid combinations explicitly, rather than returning broken geometry.

A fixed seed is reproducible only with the same generator version, topology, source assets and parameter values. Store those dependencies. Test a zero/minimum case and maximum-density case as well as several arbitrary seeds, for example 0, 42 and 9999. Boundary combinations reveal failure modes that individual sliders do not.

## Systems and construction

Rock families: start with a coarse silhouette primitive, shape large-scale displacement, add smaller breakup and only then choose simplification or subdivision. Randomize broad aspect ratios within a controlled family; inspect bottom contact and cavities. The upstream noise -> decimate -> subdivide chain is a possible experiment, not a universal recipe. Use a shading method appropriate to rocky planes versus smooth forms.

Buildings: derive walls/floors from a footprint, repeat at floor-height offsets, place connector/window modules with a stable index/ID plan, choose balcony and roof variants, and assign material IDs. Output modular subparts where reuse matters. Randomly deleting faces does not make a usable window unless reveal, thickness and closure are built too. Cap floor count and preserve entrance requirements.

Roads: use a centerline curve with explicit width/profile, controlled resampling and distance-based UVs. Curves need bank/orientation handling, terrain alignment and actual junction geometry. Sweeping independent strips into each other produces overlapping intersections, not a solved road network.

Cables/pipes: choose intentional connection points, then route curves with radius/clearance/bend limits. A minimum spanning tree can reduce total connection length but may cross walls or choose unwanted hierarchy; it is an optional planning algorithm. Sweep a profile and inspect corners/caps. Do not call a noise curve collision-free without checking.

Panels: establish a grid and structural frame, then vary inset/extrusion depth within bounds, selected bevels and material regions. Fine panels can become a trim/bake source. Preserve access openings and do not let random extrusion create self-intersections.

## Worked rock family

For a ten-variant background rock set, define length 1–3 m, height 0.5–1.5 m, a stable ground-contact footprint and a maximum delivered triangle budget. Build one generator with seed, mass elongation and two physical noise scales. Test smallest/roughest and largest/densest variants plus saved seeds. Store variant parameters before making mesh copies.

Inspect actual front/side/three-quarter outputs for silhouette variety, repeated noise bands and floating bases. Measure each evaluated result after modifiers. Bake a variant only when the deliverable needs static geometry; an instance-capable target may preserve source reuse. Keep the generator version and source mesh intact.

## Repair and acceptance

Exploding polygon counts usually come from unbounded repeat/subdivide/realization; cap them upstream. Collapsed doors need parameter constraints or interface construction repaired. Stretched UVs need distance/area-aware mapping in the generator; random material color will not conceal them. Identical variants may indicate noise coordinates or random IDs are not connected to the intended field.

Deliver the tested range rather than claiming unlimited variation. Technical acceptance checks all tested variants for finite geometry, intended closure, budgets and consistent connectors. Visual acceptance uses actual images of representative and worst cases, with defects corrected and rechecked. Engine export needs its own geometry/instance/material verification; shipping a .blend is not proof of engine procedural support.
