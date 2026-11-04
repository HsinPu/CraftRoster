# Sequencer editing and camera tracking

## Editorial contract and media inventory

Record clip order, source in/out points, effective source/output FPS, resolution/aspect, audio tracks, transition timing, titles, color pipeline and delivery codec. Preserve original media and existing edit scenes. Create a uniquely owned edit scene; a scene named Edit is not permission to remove all existing strips. Verify files, sequence number continuity, duration and audio before assembling.

## Video Sequencer mechanics

Blender 5.2 uses `scene.sequence_editor_create().strips`; movie, sound, image and effect creation APIs differ from older sequences examples. Inspect supported arguments and strip timing (`left_handle`, `right_handle`, `duration`) for the installed release. Track inclusive render range versus exclusive strip end: a strip [1,25) contains 24 frames. Set FPS/fps_base before placement.

Alternate visual clips on channels 1/2 for crossfade overlap, put CROSS on a clear higher channel, titles above and sound/music on dedicated channels. Overlap length must be shorter than both available clips; total edit duration is sum of visible durations minus overlaps, not sum plus transitions. Shift paired sound with its video, trim it to editorial handles and define audio fades separately. A visual crossfade does not automatically crossfade clip audio. Avoid three-way overlap/channel collisions on very short adjacent clips.

Create still holds with explicit duration. For image sequences parse numeric frame IDs, reject gaps/duplicates and verify every element uses the intended directory; lexicographic order alone can sort 1,10,2 incorrectly. EXR sequence color interpretation differs from encoded video. Mixed FPS needs intentional resampling/retiming and audio time alignment; setting scene FPS alone does not solve drift. Use proxies for heavy media where supported and retain original paths; proxy generation does not prove source decode at final resolution.

Choose an editorial color pipeline deliberately. Standard can preserve display-referred footage more naturally than applying AgX again, but color-space/video range conversions still matter. Scene-linear EXR and already graded sRGB/video cannot be blindly interpreted identically. Test a known color/chart and neutral frame. Titles need actual font availability, safe margins, legibility and alpha compositing.

## Encode and verify

Set render.use_sequencer and render the edit scene explicitly, not an unrelated 3D scene. In 5.2 set image_settings.media_type before FFMPEG/file_format. Select container/codec/audio configuration intentionally; H.264/AAC MP4 is a common review output, image sequence plus audio is a recoverable master. Extension and FINISHED return do not prove a playable file. Decode and verify frame count, dimensions, FPS/duration, audio channel/sample rate and lip-sync near start/end; listen for clipping/cut clicks and inspect transitions/title frames.

## Matchmoving workflow

Camera solving is a distinct live-UI path: Clip Editor operators require window/area/region context; a background script cannot claim it solved via those UI operators. Preserve/restore the borrowed editor. Load the clip, set sensor before focal length when known, then detect/track static textured features across depth and frame range. Exclude moving people, reflections and blur. Track from both ends if features enter late; remove short/poor tracks with an explicit threshold and retain a recoverable copy.

Solve with parallax for translation; use a tripod/nodal model for rotation-only footage. Refine unknown intrinsics only when evidence supports it; low error with unconstrained distortion can overfit. Report reconstruction validity, track count/distribution and average plus worst reprojection errors. Subpixel error is useful but does not prove correct scale or no sliding. Orient with floor tracks, origin and two points at a known distance; otherwise world scale/up remain arbitrary. Test CG markers over the plate across the whole shot. Planar signs/screens use plane tracking, stabilization uses its own selected tracks, and neither is a full 3D solve.

## Repair and delivery

Black sequence frames need continuity/path/decode checks. Audio drift needs rate/retime repair. Changed colors need transfer/range interpretation. Tracking slides need static features/parallax/intrinsic review, not simply deleting every high-error observation. Deliver edit/source media manifest, timing/FPS/color/codec settings, output decode evidence and preview. For tracking also deliver calibration assumptions, orientation/scale references and overlaid test renders. Clearly distinguish edit assembly, encoded output, valid solve and reviewed matchmove.
