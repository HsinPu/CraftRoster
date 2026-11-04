# Shooter viewpoint and map-context branches

Use actual standing/crouch dimensions, eye/weapon offsets, cover classes, ballistic/collision intent and sight distances. Temporary rays and proxies are bounded geometric evidence, not combat or AI tests.

## First-person shooter (FPS)

Build a close-wall/door/window/cover slice using actual player-eye and weapon-view FOV contracts; these may be separate cameras. Match visible cover top and depth to the supplied proxy, including raised bases. Model near-facing backs/edges and avoid exaggerated bevels that imply sight holes through intended solid cover. Include standing/crouched eye samples and a corner approach.

Use broad surface groups and restrained normal frequency near camera. If weapon framing intersects a wall, identify whether the defect is world art or separate viewmodel behavior; repair only authorized art/clearance. If a decorative slot contradicts solid collision, reconcile intent rather than hide it in darkness. Deliver eye-height sections, near-wall/corner images and art/proxy differences; firing, collision and peeking need target tests.

## Third-person and cover shooter (TPS)

Place the complete actor and both shoulder-offset cameras behind cover. Build low/high cover and an overhead/column obstruction with the supplied camera sweep. Check crouch, lean/aim and full body exposure visually; a single eye ray cannot establish body concealment. Preserve camera and cover-proxy dimensions instead of moving the actor to make a screenshot work.

Keep actor/cover values separated and avoid foreground details that conceal hands/weapon. If one shoulder view crops action or intersects a column, revise local obstruction/approved camera clearance and retest both sides. Deliver paired shoulder images, body/cover sections and orbit samples. Cover snapping, aim occlusion and camera collision remain runtime behavior.

## Arena and bounded multiplayer space

Stage entrances, height changes and landmark identities from both sides using supplied sightline and cover rules. Build a representative junction with two approach directions, not a balance claim about an entire level. Modular breakables/doors need intact/open/broken states preserving their known bounds. Keep floor detail from resembling interaction/hazard cues.

Inspect reverse approach, high/low cameras and neutral silhouette maps. If two spaces are indistinguishable, change major geometry/material grouping before color grading. If a door's damaged state creates an unintended visible opening, reconcile with the game contract. Deliver state/arrival sheet and sampled geometric sightline diagram; symmetry or ray visibility does not prove fairness or map balance.

## Battle royale regional scale

Use region/POI, traversal vehicle and far-camera contracts. Build a bounded terrain/settlement slice with dominant landmark, subordinate loot/service clusters and contrasting approach elevations. Test aerial/distant orientation and ground-eye arrival separately; a tall sign visible from above may vanish on foot. Keep high/low loot visual language tied to actual supplied categories, not invented drop rates.

Use terrain/building silhouettes and controlled region material palettes before saturated beacons. If every POI looks identical, vary primary outline/height and approach framing. If distant canopy hides ground access, repair hierarchy without claiming streaming will solve it. Deliver distance-tier/approach views, chunk/LOD handoff and pickup states; circle behavior, large-map navigation and player density require engine evidence.

## Extraction shooter destinations and loot states

Build entry approach, search area, storage/pickup variants and an extraction destination according to actual state vocabulary. Containers need closed/open/depleted/locked states with stable pivots and non-color cues. Extraction marker needs a distinct physical frame/negative space and off/available/active treatment; ordinary lamps should not share its whole silhouette.

Inspect low-light approach and return view with effects off, then the supplied maximum state effects. If the destination reads only as another street light, change geometry/placement before more emission. If inaccessible storage looks lootable, separate its construction or approved state cue. Deliver destination/container state and approach sheet. A visible beacon or animated door does not prove extraction logic, loot economy or AI behavior.
