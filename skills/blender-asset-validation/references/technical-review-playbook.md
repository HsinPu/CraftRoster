# Technical asset review and defect isolation

Use the packaged inspector for the subset in its helper contract. The procedures below cover additional review work; they are not extra undocumented flags. Record each check as executed, intentionally excepted or not checked, with its input representation and scope.

## Establish the inspection set

Resolve explicit asset objects and any associated deform skeleton, materials, images and export helpers. Separate render meshes, intentional open cards, collision proxies, internal mechanics and detached effects. Capture the saved source hash, contract and current frame. Inspect evaluated output where modifiers affect delivery; use original topology/weights where their index correspondence matters, and state that difference.

Reject missing scope and nonfinite transforms/coordinates before measuring bounds. World measurements include the scene's unit scale. A min/max reduction can conceal a NaN, so check individual coordinates first. Treat zero-size or collapsed geometry according to its intended role; a flat card is not equivalent to an empty mesh.

## Geometry and topology

| Check | Method and interpretation | Correction and recheck |
|---|---|---|
| Degenerate faces/edges | Measure triangle area and edge length in the declared space using a tolerance suited to asset scale | Repair the local cause on a copy; compare UVs, normals and neighboring faces afterward |
| Nonmanifold boundaries | Count edge face-users, loose elements and boundary loops | Distinguish required closed shells from foliage/cards; fix only unintended defects |
| Inconsistent winding | Compare directed shared edges; for closed islands evaluate signed volume with transform handedness considered | Reorient the affected island and inspect backface/culling and export normals |
| Near-duplicate vertices | Spatial lookup with an explicit distance and correspondence rule | Do not merge intentional splits indiscriminately; check material/UV seams and skinning after a weld |
| Intersections or coplanar overlap | Spatial candidate search, local geometry examination and grazing-angle renders | Remove/offset only unintended surfaces; tolerances and sample coverage belong in the report |
| Detached/enclosed islands | Connected-component analysis plus contact/containment evidence | A separate eye, suspended lamp or VFX piece may be valid; inspect its intended connection and role |
| Topology for motion | Joint loops, poles, density transitions and actual deformation | Fix the bending region and repeat representative poses rather than approving a quad percentage |

BVH candidate overlap is not a full semantic intersection proof. A few rays or vertices can miss thin contacts or nested surfaces. If resource limits require sampling, state which objects/triangles were skipped or sampled; do not return an exhaustive pass. Closed-volume orientation tests do not establish normals for an open sheet.

## UVs, textures and materials

Identify each UV channel's purpose before checking overlap or bounds. Unique bake/lightmap channels, mirrored tiling surfaces and UDIM layouts have different acceptance rules. Inspect zero-area faces, distortion, orientation and padding at the smallest required mip. A coarse raster occupancy estimate can miss small overlaps; use targeted inspection of suspect islands and actual bake output.

Measure texel density against corresponding world-space surface area and texture dimensions, including transformed scale. Check material assignments on the delivered evaluated mesh, not only original slots. Verify external textures with their resource type: a single FILE path check does not cover a complete UDIM, sequence or linked library.

Follow connected shader paths rather than assuming every image node is used. Data-map/color interpretation depends on the actual consumer and project encoding. Do not automatically retag a shared image datablock used differently by another material. Inspect a neutral material view and the saved maps, then inspect the imported target representation if claimed.

## Skeleton, weights and animation

For each skinned mesh identify the actual armature modifier and deform bones. Check missing or unexpected bindings, unweighted vertices, normalization and the consuming target's influence limit. Reject a purported rig review that skips a mesh solely because it has no vertex groups. Preserve required nondeform controls, sockets and morph targets in source; export membership follows the delivery contract.

Inspect rest/bind transforms and representative stressed poses. Compare source and reimported skeleton mapping, clip names, duration, sampled poses and root displacement. A matching list of bones/actions does not prove playback. For loops inspect position and orientation continuity plus relevant linear/angular velocities, contact phases and constraints; an angular-speed magnitude alone can miss a reversal or translational hitch.

Shape-key names and slider ranges are inventory, not completed facial expressions. Inspect the actual changed geometry, left/right naming and combinations, and check exported morphs. Simulation frame stepping is not proof of a durable baked cache; reopen a clean process and verify the required range/resources.

## Export and visual evidence

Compare the declared semantic contract after fresh-process import: dimensions/orientation/pivot, visible mesh/material roles, resource completeness, skeleton/clips/morphs and helpers. Vertex splitting and container names can legitimately change, so use explicit mappings rather than an unconditional raw-count equality rule.

Inspect current form/material/game-camera images and relevant motion frames. A technical pass cannot replace this. Produce new review captures only when authorized to write/render; a read-only caller requests the needed evidence from the maker. If an export conversion changes appearance, review that converted output rather than borrowing approval of the source render.

## Findings and decision

Each finding needs location/object, method, observed value or visible evidence, expected contract, severity, proposed owner and recheck. Reserve blocker/major for material delivery defects; minor naming cleanup or taste preferences should not become arbitrary universal blockers. Preserve explicit accepted exceptions with their rationale and limits.

Re-run the affected check on the repaired saved revision, and check dependent assets such as bakes, clips or exports. Validate process exit and the report's result separately: a JSON wrapper can exit successfully while its embedded QA result is failing. Keep required unsupported checks unverified, and report source, visual and engine outcomes independently.
