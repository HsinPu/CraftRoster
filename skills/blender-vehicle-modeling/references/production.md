# Vehicle proportions, systems and distance

## Class-specific blockout

For cars/trucks, record overall length/width/height, wheelbase, track width, wheel diameter, front/rear overhang, cabin/hood relationship and ground clearance. Orthographic images may be scaled inconsistently or distorted; align using known dimensions and reconcile disagreements before modeling details.

Aircraft emphasize fuselage-to-span ratio, wing root/tip form, canopy, landing-gear stance and control surfaces. Boats/ships emphasize length, beam, draft/waterline and superstructure weight distribution. Mechs emphasize hip/shoulder height, limb segment ratios, cockpit mass and supporting foot footprint. An art-plausible stance is not aerodynamic, buoyancy or balance simulation.

Establish centerline and symmetry before secondary forms. Preserve approved asymmetry, damage or offsets in separate planned stages. Use silhouette and negative spaces from the intended camera, not only beauty views.

## Systems and bodywork

Separate wheels when they spin/steer, place their origins on actual axle centers and document axes. A wheel parent may carry steering while a child carries spin; preserve transform relationships. Separate glass where transparency/shader sorting requires it, lights where emission is controlled, and interiors where visibility/LOD differs. Calipers, wipers, doors, suspension and landing gear need their own pivots if animated.

Body panel flow follows assembly or the approved stylization: doors, hoods, access panels and intakes should have depth and mechanical clearance. Keep cutter collections owned and editable. Smooth highlight flow matters on bodywork; avoid concentrating high-valence poles or thin boolean slivers on curvature peaks. Use a supported subdivision or mid-poly normal workflow deliberately rather than combining both blindly.

Model the interior only to the degree that camera views through glazing require it. Dark glass does not automatically justify deleting cabin structure; reflections and close viewpoints can reveal it. Preserve the complete master and remove hidden components only in delivery variants.

## LOD and collision strategy

A close LOD may retain panels, cabin and mirrors; a middle level can remove seals/bolts and simplify frames; a distant level can reduce to body, wheels, glass and key lights; an extreme far silhouette may use a coarse hull or impostor. Record material/attribute changes and common pivot/bounds. Keep enough wheel roundness at each transition.

Physics normally uses simplified convex body regions and separate wheel shapes in a target-specific setup. The number/type of hulls and dynamic behavior depend on the engine. A proxy overlay is a source check; actual steering, contact and suspension need engine validation.

## Worked compact delivery van

For an approved 4.5 by 1.8 by 2 m van with a 2.8 m wheelbase, position axle guides and wheel centers first. Block cabin/cargo proportions and overhangs, then inspect side and three-quarter silhouettes before any door seam. Keep four wheel objects with documented centers/axes, separate windshield and light groups, and an interior shell only where visible.

Build the main body surfaces and panel breaks with an editable stack. Test full steering angle and door-open clearance against bodywork using the requested motion range. Make a mid-distance copy that removes cabin micro-detail and simplifies trims while preserving the profile. Compare actual projected views before declaring the reduction acceptable.

If wheels intersect fenders, check stance, radius, steering pivot and range before enlarging everything. If body highlights wobble, repair curvature topology rather than covering it in greebles. If lower LOD wheels jump, align origins and transforms. If glass turns opaque after export, inspect material/transparency support, not just base color.

Acceptance needs measured major ratios, finite evaluated geometry and costs, current outline/highlight images and motion-clearance evidence. Preserve body/wheel/glass/interior sources and describe what was actually imported or simulated. An exported vehicle is not proof of drivability, flight or seaworthiness.
