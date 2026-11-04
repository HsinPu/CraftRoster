# World and game-genre production contract

Use this with the selected world's or genre's specific playbook. The deliverable is a Blender asset set, layout or visual prototype. Playable rules, AI, physics, navigation, streaming and performance require the target engine and their own tests.

## Convert the brief into an asset problem

Identify the intended player view, scale reference, traversal/interaction requirements supplied by the game designer, required asset families and visual hierarchy. Record which aspects are established and which are provisional. A genre label does not authorize changing the game's rules or replacing its approved style.

Separate three sets of geometry: visible art, temporary gameplay test proxies, and exported collision/helper geometry. Use distinct collections and record export membership. A viewer should not mistake a collision hull or a diagnostic clearance box for finished art.

Create a compact asset schedule with dimensions or modular interfaces, pivot, material family, variation requirements, anticipated viewing distance and output format. Prioritize a representative slice that tests the difficult relationships before producing a large library. Examples include a corner/junction kit, a doorway with the largest character proxy, or an encounter space with foreground occluders at the actual camera.

## Build the representative slice

1. Establish units and a known scale object. Construct the traversable volume and major landmark masses before surface decoration. Keep modules on the declared grid; intentional organic offsets should not silently break connection points.
2. Place temporary view and clearance probes at relevant positions. Use the actual projection and framing contract. For a side-scroller, depth and silhouette overlap matter differently than for an orbiting third-person camera or an orthographic strategy view.
3. Evaluate the layout against its explicit visual requirements: clear destination, readable interactive props, distinguishable routes, useful framing and adequate view of critical actions. Record the tested camera samples rather than claiming every possible view was checked.
4. Develop the asset vocabulary: repeated structural proportions, material families, wear/age logic, environmental causes, signs of use and controlled exceptions. Repetition makes an environment coherent; meaningful variation prevents accidental cloning.
5. Add dressing in layers, preserving required paths and focal regions. Use bounded seeded variation, explicit exclusions and authored hero placements. Inspect realized geometry and export behavior when procedural instances are involved.
6. Capture a diagnostic overview and the required player views. Repair scale, tangencies, occlusion and inconsistent material hierarchy before adding atmosphere or fine detail.

## Geometry probes are bounded evidence

Use explicit proxy dimensions from the consuming project. Measure bottlenecks, module gaps, surface slopes and target sightlines where relevant. A Blender ray cast can establish an intersection for a sampled ray; it cannot prove an AI sees a character, a controller can climb a step, a vehicle handles a corner or a puzzle is solvable.

Keep inspection scope visible in the report: tested viewpoints, proxy shape, positions, distances and assumptions. If using sampled scatter checks, report the sample count and selection rule. Do not call a sampled check exhaustive. Nonuniform object transforms and local/world coordinate confusion can invalidate slope, distance and density measurements.

For interactive signifiers, distinguish appearance from implemented behavior. A differently colored door can be visually recognizable while having no interaction or collision logic. Include an engine handoff list for those unimplemented behaviors.

## Keep visual decisions tied to purpose

| Decision | Evidence to inspect |
|---|---|
| Landmark and route hierarchy | Intended player views with detail reduced; destination remains distinguishable |
| Interactive versus decorative props | Target-size views under relevant lighting; signifiers survive without explanatory labels |
| Scene density | Both focal and peripheral regions; clutter does not cover required action space |
| Character/world scale | Side-by-side scale reference, contact points, door and equipment clearances |
| Modular construction | Repeated straight sections, inside/outside corners and transitions; no accidental gaps or z-fighting |
| Environmental storytelling | Causes and consequences agree spatially; damage, repair and vegetation follow a plausible local history |
| Variants and biomes | Controlled changes to material/form/distribution; transitions remain coherent rather than random swaps |

Treat lighting as part of the visual contract, not proof of engine visibility or stealth. Treat a terrain's attractive distant silhouette as separate from its close-up traversal and collision requirements.

## Repair and handoff

Repair the strongest observed failure first: an unreadable route, scale conflict or broken modular junction usually matters more than another decorative prop. Keep matched before/after cameras and note intentional changes to framing. Recheck adjacent interfaces and alternative player views after the fix; a local improvement can create an obstruction elsewhere.

Deliver source collections, asset/module inventory, materials/textures, explicit pivots/units, placement or variation seeds, export membership and current images. Include the proxy assumptions and requested engine integration tests. Keep source assembly, visual acceptance and engine acceptance as separate outcomes. An independent reviewer can inspect the supplied images and measurements without taking scene-editing authority.
