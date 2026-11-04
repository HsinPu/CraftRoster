# Camera layout, motion and focus

## Shot and perspective

Record subject/action/reveal, aspect and pixel aspect, resolution, safe margins, movement and reference uncertainty. Preserve gameplay, technical and beauty cameras separately when they serve different purposes. Build named camera/target objects in an owned collection.

Match position/orientation before detail. Perspective follows viewpoint and distance: a long lens does not compress space when viewpoint stays fixed. Moving back while increasing lens preserves framing and changes perspective. Horizontal FOV for a 36 mm sensor is `2*atan(sensor_width/(2*lens))`; sensor fit, portrait orientation and pixel aspect affect actual coverage. Starting lenses: 20–28 mm establishing, 35–50 mm contextual, 70–135 mm close product/portrait. They are choices, not distortion-free guarantees. Orthographic scale controls span without perspective; preserve orthographic art direction where established.

## Rig and frame

Create a Camera datablock and linked Object, assign `scene.camera`. Local -Z is forward and Y is up. For a static target, `(target-camera.location).to_track_quat('-Z','Y')` supplies orientation. Animated tracking can use Track To/Damped Track, but test roll and flips near vertical alignment. A moving parent and aim constraint need an explicit hierarchy; preserve world transforms during parenting.

Set sensor dimensions/fit, lens, shift, projection and clip range explicitly. For architectural verticals keep the camera level and use shift rather than tilt. Clip ranges must include scene geometry without extreme near/far ratios. Use `bpy_extras.object_utils.world_to_camera_view` for critical evaluated points: negative depth is behind camera, x/y outside 0–1 is cropped. Check moving/deforming subjects over the range, not rest bounds alone. Render aspect must be set before an automatic fit.

## Camera motion

Dolly translates; zoom changes FOV. Orbit uses a pivot and camera parent with separate target/focus. For a constant-speed 360-degree preview, key 0 at frame 1 and 2*pi at N+1 with LINEAR interpolation, render 1..N. Keep lights world-fixed to inspect changing reflections; a camera-relative rig is an intentional different diagnostic. Path constraints require checked duration, offset, up axis and speed; bake if the receiver lacks support.

Review start/quarter/middle/three-quarter/end plus continuous playback. Auto Bezier handles can add unwanted stops/reversals. Add handheld only after the base move works, with bounded amplitude, frequency and deterministic phase. Check final viewing size and horizon comfort. Repair framing before concealing crops with blur. A crane/reveal needs foreground parallax and occlusion staged deliberately.

## Focus and temporal treatment

Set `camera.data.dof.use_dof`, `focus_object` or `focus_distance`, and `aperture_fstop`. Put the focus empty at the intended eye/detail, not the object origin. Aperture, sensor, focus and real scale interact. Keep a sharp diagnostic image before intentional shallow focus. Animate rack focus deliberately and inspect intermediate frames for hunting. Small f-numbers are not automatically appropriate for labels or product readability.

Motion-blur shutter is a fraction of frame time: 0.5 at 24 FPS is about 1/48 s. Actual renderer temporal support matters; viewport blur settings are not final evidence. Preserve approved view transform/exposure instead of altering material colors to compensate for a new shot.

## Diagnosis and delivery

Overhead tracking flips need up-axis/hierarchy correction or quaternion continuity. Excess DOF needs scale/focus inspection before aperture changes. Portrait crops require sensor-fit/aspect-aware refit. A single reference image cannot uniquely determine lens and dimensions: compare landmark positions, silhouette and negative spaces, and state camera ambiguity.

Deliver camera hierarchy, projection/lens/sensor/shift/clipping, FPS/range, focus/shutter, contact sheet, motion preview and measured safe margins. Visually inspect tangents, headroom/lead room and depth separation. Camera export acceptance additionally tests receiving-app axes, FOV, timing and focus support.
