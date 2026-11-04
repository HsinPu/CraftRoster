# Physics selection, persistent bakes and correction

## Solver contract

Specify effect, real dimensions, effective FPS, trigger/shot/pre-roll range, allowed compute, delivery representation and destination. Preserve construction geometry and settings separately from caches/export copies. Rigid bodies, soft bodies, Cloth, Mantaflow and GN simulation zones solve different problems. Blender physics does not become live engine physics through ordinary mesh export.

## Rigid bodies and destruction

Prepare applied-scale collision duplicates with valid geometry and nonpenetrating starts. ACTIVE objects move; PASSIVE objects form the environment. Prefer primitive or CONVEX_HULL active shapes and compound convex parts for concavity. MESH passive collision suits concave floors; dynamic mesh collision can be expensive/unstable and needs specific evidence. Set mass from a valid closed world-space volume times density when known; open/non-manifold volume is not reliable. Example wood density 500–700 kg/m3, steel about 7850, but hollow props need actual mass, not bounding-box volume.

Create/link the rigid body world and explicit body/constraint collections; synchronize scene and world point-cache ranges. Start modest friction/restitution (0.5/0.1), margin appropriate to object size (perhaps 1 mm for small human-scale props) and around 10 substeps/iterations for a preview. Increase after measured tunneling/stack drift rather than indiscriminately. Hinge/fixed/motor constraints need correct pivots/axes and break threshold. Mechanical joints must not start in impossible configurations.

For destruction pre-fracture into owned pieces, preserve the intact source and define activation frame. Cell Fracture is an optional extension, not guaranteed installed. GN Voronoi labels alone do not produce valid closed shards. Release animated/kinematic pieces or break constraints deliberately; mass, collision margin and shard count affect the result. Art-direct at low piece count, then review fragments/contact before refinement.

## Soft body and cloth boundaries

Soft Body suits simple deforming props: configure goal weights/restoring springs and collision, distinguish pinned goal regions from free points, and test oscillation/damping on a small sample. Dense sculpts are poor simulation inputs. Cloth has separate stretch/bend/pin/collision controls; use blender-cloth-simulation for garments and cache mechanics. Experimental Blender 5.2 node Cloth/Hair Dynamics assets require inspected interface, explicit rest/surface inputs and version-specific collision limits. Do not claim self-collision or forces not actually supported.

GN simulation zones need stable IDs/state initialization, time step and deterministic dependencies. Read installed assets/interfaces instead of building from unverified XPBD socket names. Sequential frame evaluation is useful for previews but cannot prove disk bake. Bound generated points, geometry growth and iteration memory before long runs.

## Mantaflow fluid/gas

Use a closed domain with FLUID modifier, `fluid_type='DOMAIN'`, LIQUID/GAS settings, flow sources (`FLOW`, INFLOW/GEOMETRY) and effectors. Domain bounds should contain action plus margin without huge empty space. Start resolution 32–64 to approve motion, then increase only as needed; memory/time grow strongly with resolution. Check scale, closed colliders and fast source movement. Set explicit cache directory/type/frame range and bake data/mesh/noise as required by selected cache mode. `fluid.bake_all` needs the domain active in a valid context; an operator FINISHED is not sufficient without files/reopen proof.

## Bake and export

Record cache settings, bake state, file inventory and source/settings revision. Invalidate/rebake after changing topology, FPS, timing, forces, collision or modifiers. Open the saved file in a fresh process and compare nonsequential sample frames to the approved sequential preview. A populated memory cache disappears or changes on another worker.

For rigid export, sample evaluated world matrices at every required frame before removing physics on a duplicate; convert to parent-local transforms and continuous quaternions, insert keys and compare trajectories before/after. Preserve constraints/physics on source. Vertex deformation needs an agreed cache, morphs, bones or flipbook; test receiving support, units and FPS rather than exporting raw modifiers.

## Acceptance and diagnosis

Tunneling: inspect thin colliders, speed/substeps and margins. Explosion: starting overlap, invalid geometry or conflicting constraints. Hovering: oversized margin. Wrong mass: invalid volume/scale. Fresh-process differences: missing cache/dependencies. Finite coordinates, sampled minimum ground distance and final bounds are technical measures; min_z alone misses side penetration and earlier tunneling. Inspect full motion/playback and critical contacts.

Deliver source, collider/solver inventory, trigger/ranges/FPS, cache manifest, motion preview, measured failures/repairs and export/reimport samples. Distinguish evaluated preview, persistent bake, visual acceptance and actual engine playback.
