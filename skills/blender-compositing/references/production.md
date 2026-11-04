# Scene-linear compositing and delivery

## Inputs and color contract

Record source revision/frame range, image dimensions, scene-linear working space, premultiplied/straight alpha, view transform and output requirements. Inspect actual EXR layers/channels and Cryptomatte metadata. Preserve raw renders and the existing compositor. A PNG/JPEG beauty cannot recover missing lighting passes or unclipped HDR data.

Grade and combine in scene-linear space, then apply the display transform for review output. Do not bake AgX into an EXR and apply it again later. Neutral product work may need only exposure/white balance; creative cool/warm/neon/horror looks follow the approved brief rather than fixed presets. Exposure is multiplicative stops; fix global balance before crushing curves or clipping highlights.

## Blender 5 compositor graph

Use an owned `bpy.data.node_groups.new('ShotComp','CompositorNodeTree')` and `scene.compositing_node_group`. Add an output interface Color socket, Render Layers node and NodeGroupOutput, then link the image to the group output. Preserve the original group reference for rollback. Older Composite-node/use_nodes recipes need version migration. Enable render compositing and check the rendered scene/group actually used.

In Blender 5.2 many controls are input sockets: inspect Glare Type/Quality/Threshold/Strength/Size, not legacy glare_type assumptions. Example basic chain: Render Layers Image → Exposure → Color Balance → optional Glare → group output. Socket existence and menu choices come from the installed node; output/file-node interfaces can change. A Viewer preview is not a written deliverable. File Output requires an explicit directory/name/item/format mapping and collision-safe per-frame paths.

## Pass-aware operations

For beauty start from Combined, do reversible exposure/balance, then restrained optical effects. Emission isolation can control glow, but adding emission twice to Combined doubles energy. AO multiplied into a beauty already containing physical occlusion is an art-directed modification, not a physically neutral default. Keep its strength explicit. Diffuse direct/indirect require diffuse color weighting in faithful reconstruction; specular/transmission/volume terms also matter. Compare reconstruction against Combined before relighting.

Use Cryptomatte for object/material selection with preserved metadata and correct source; a flat ID texture is different. Mist is a normalized distance cue, while Depth/Z can be non-antialiased/infinite and needs explicit range treatment. Compositor fog cannot reproduce light shafts or proper multiple scattering. Defocus requires correct depth/scale and edge handling; retain a sharp diagnostic.

Alpha operations must respect premultiplication. Unpremultiply for suitable color edits, then premultiply again where required; test saturated edges over black and white backgrounds. Glare/vignette/lens dispersion can produce halos, clipped borders and unwanted alpha. Decide whether glow extends alpha or is an additive separate layer. Do not hide a lighting or geometry defect by grading it black.

## Temporal and correction loop

Review a contact sheet plus playback around cuts/highlights; a still grade can flicker on animation. Noise-based effects need stable seeds/time and controlled amplitude. Compare scopes/histograms and known gray/color samples along with actual images. A histogram cannot establish art quality. Strong neon highlights may need lowered source exposure/glare threshold balance rather than flattening all contrast.

Black output: inspect group output connection, source layer, muted nodes and render use_compositing. Washed color: check linear/display interpretation and double transforms. Dark fringes: inspect premultiplication/color bleed. Missing Cryptomatte selection: verify metadata/source format. Broken pass math: compare each component against the original beauty before creative changes.

Deliver editable graph with bypassable creative nodes, raw/multilayer archive, graded review images/movie and output/color manifest. Enumerate actual output frames/files and decode samples, including alpha and data channels. Compare ungraded/graded matched views and list remaining gaps. A connected graph or populated output path is not render or visual proof.
