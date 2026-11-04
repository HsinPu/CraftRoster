# Architectural production decisions

## Measurement and shell construction

Choose a reference dimension with reliable units: a dimensioned grid span, survey distance or explicit ceiling height. A CAD import may carry millimeters while the Blender file uses meters; verify at least two independent spans before converting. Keep the imported model in a reference collection, and record its conversion matrix. Do not normalize scene units by changing scale labels alone. Wall thickness, reveal depth and glazing thickness affect contact shadows and the impression of weight.

Build shell, frames and glazing separately so material edits and visibility changes remain local. Give visible edges physical bevels: choose width from the actual material and shot distance, rather than an asset-wide percentage. A distant facade can use reusable modules; a close architectural detail needs real joints and depth. Simplify hidden construction only after checking reflections and planned camera movement.

## Camera and lighting

For a typical interior test, start near an eye height of 1.6 m with a 28 mm lens on a documented sensor; these are staging choices, not architectural requirements. Translate the camera and change lens together until the approved field of view is plausible. A very wide lens can make an undersized room look large. Keep exterior verticals parallel by leveling the camera and using lens shift where necessary; do not lean the camera upward and silently stretch the image afterward.

Inspect window light without furnishing clutter. Establish world/HDRI orientation and exposure, then add practical lamps where fixtures exist. Emissive surfaces may need actual light objects for an efficient preview; preserve their apparent size and direction. Upstream mentions window portals, but do not assume a particular renderer/version supports that workflow. Check the installed render engine and light options.

Use physically sensible glass thickness and transmission/IOR, then compare grazing and straight-on views. Missing environment content often explains black glazing better than arbitrary color changes. Read texture scale from measured boards, tiles or grout width. Keep white balance and exposure documented so material revisions are comparable.

## Worked interior plate

For an authorized 6 by 4 m room with a 2.7 m ceiling: create the room shell and a measured 0.9 by 2.1 m opening; place a scale mannequin in the greybox. Stage CAM_Interior at the approved viewpoint, test a 28–35 mm lens, and keep the camera level. Render a clay plate to inspect opening proportions and camera distortion. Add floor material with a measured repeat size, separate window panes from the frames, and use the window direction as the first lighting anchor. Render a low-sample crop around the window and a full frame before increasing output resolution.

If the room feels too large, compare the known span and lens first. If the window clips, adjust light balance/exposure and inspect a high-dynamic-range pass; do not darken every material to conceal it. Retain linear scene data in EXR when compositing revisions are expected, alongside a display-ready image.

## Review and corrections

| Symptom | Investigation and repair |
|---|---|
| Leaning facade | Check camera rotation; level it and use shift before altering geometry. |
| Toy-like shell | Measure thickness, bevel radius and texture repeat against real units. |
| Flat white interior | Separate lighting contrast from material albedo; inspect contact and indirect light. |
| Floating furniture | Inspect floor contact and transforms; correct placement before painting fake shadows. |
| Walkthrough intersects walls | Evaluate camera position along the full path and near clipping plane. |

Acceptance needs measured spans plus actual images of the final revision. Inspect verticals, reflections, edge highlights, texture repeats and intended focal point at full output size. For animation, inspect representative motion and troublesome corners, not just the first still. An EXR or completed render job is a deliverable artifact, not a judgment of realism.
