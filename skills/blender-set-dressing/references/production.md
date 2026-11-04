# Story clusters, density and placement

## Story before scatter

Choose an observable beat: an interrupted meal, a hurried escape, a recently used workshop or an abandoned checkpoint. Identify what each prop contributes and which direction/event links them. Three to seven objects plus one or two wear cues is a useful small-cluster exercise, not a required count. A single displaced object can be more legible than a pile of generic clutter.

Plan density by use. An interaction zone needs high intent with low visual noise; midground clusters support the beat; distant props usually need silhouette rather than fine surfaces. Maintain the player's and camera's actual swept clearance. Keep doors, drawers, windows and escape lines functionally correct unless the story explicitly blocks them and level design permits it.

Uniform random scatter reads as distribution rather than history. Use gravity, reach, access, water flow, wind or deliberate placement to explain positions. Dust and decals should agree with contact and age. A tipped chair without a plausible support/contact looks like an error unless the image intentionally depicts motion.

## Source and variation choices

Reuse prop/kitbash libraries through linked mesh or collection instances. Place ground pivots against actual surfaces, then inspect feet, rims and contact shadows. Random yaw and small scale variation can break repetition in loose objects, but identical manufactured chairs usually should not change size. Keep materials shared unless a meaningful local variant requires an independent datablock.

Separate architectural layout from owned dressing so revisions do not move approved walls or linked assets. Optional unique props belong to blender-prop-modeling; this workflow can complete placement without generating new meshes. Sparse/horror art may benefit from more empty space and fewer stronger cues, but preserve the confirmed style.

## Worked hurried workshop exit

Use a locked workbench near the scene focal point. Place an open toolkit, one unfinished assembly and a displaced stool to imply interrupted work. Add a dropped glove along the exit direction and a small fresh scrape near the stool. Keep the actual route to the door clear and keep the work surface readable from the approved camera. Instance repeated containers in the midground; avoid filling every shelf identically.

Inspect a hero frame, the entry path and the exit reverse view under intended lighting. If the glove becomes indistinguishable from floor texture, adjust its location/value relationship or remove it; do not add unrelated bright props. If the route is visually noisy, simplify background clusters before shrinking the player clearance. If the stool floats, correct contact rather than relying on a stronger fake shadow.

## Review and correction

Assess each cluster for story, contact, scale and silhouette. Tangencies can make separate props read as a single incoherent mass; move them in depth or remove a filler. Repeated wear at identical UV locations can reveal instancing; vary allowed decal/material parameters without duplicating all geometry. Decals need small controlled offsets or compatible target workflows to avoid z-fighting.

Technical acceptance covers explicit source/instance dependencies, owned transforms, actual minimum route clearance and measured population/material costs. Visual acceptance uses current images of important route positions and the hero frame. Viewport clearance is not target collision/navmesh proof; perform that engine check separately when requested.

Deliver a compact placement map explaining the narrative focus and intentional empty regions. If only reviewing supplied images, return findings and suggested moves without creating a report file or changing the scene.
