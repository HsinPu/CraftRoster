# Projection and tile contract

## Distinguish projections

True isometric uses equal foreshortening on all three axes. For a Z-up scene, point an orthographic camera along a direction proportional to (1,-1,1); this is 35.264 degrees elevation above the ground and 45 degrees azimuth. In Blender Euler conventions a commonly corresponding camera X rotation is 54.736 degrees, but validate the view direction instead of copying Euler values blindly. A 2:1 diamond dimetric game view is a different projection. Match the existing kit exactly.

## Build a repeatable study

Set tile dimensions, height unit, pivot convention and orthographic scale first. Model a one-cell prop and a two-cell building on the same grid. Keep roofs and upper planes readable because the camera sees them prominently. Separate a diorama plinth from a production tile so its framing does not alter the kit footprint. Do not reduce unseen surfaces needed by reflections, alternate rotations or target use.

Use broad material color/value regions and lighting that distinguishes top and side planes. A soft key from one consistent screen direction plus limited contact shadow can keep neighboring tiles coherent. Avoid camera depth blur for functional tiles unless the actual presentation calls for it. For raster tiles render with a shared pixel scale and canvas origin; verify the projected diamond against neighboring images, not merely a single isolated beauty view.

## Repair and acceptance

Mismatched tile joins need shared camera/scale/pivot correction before mesh deformation. A tiny roof detail disappearing needs simplified top-plane landmarks. Perspective drift needs an orthographic camera and fixed orientation.

Require a grid-overlay view, multiple adjacent tiles, silhouette thumbnail and final camera view. Accept equal-axis projection for true iso or documented dimetric ratio, aligned footprints and pivots, and readable height hierarchy. Engine depth sorting and navigation are separate tests.
