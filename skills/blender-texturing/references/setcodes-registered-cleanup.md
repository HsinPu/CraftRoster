# Repair an optimized atlas without changing the asset

Use only the confirmed optimized mesh/version. An assessment request ends with findings. An authorized texture repair preserves topology, evaluated outline, all UV loops, rig/rest matrices, weights, actions, material assignments and atlas dimensions. Inventory image roles and shared users; duplicate the intended material/image for a local revision. Hash source blend, images and exported UV triangles before work. Keep outputs at new paths, including the report: a new PNG does not authorize overwriting its existing sibling JSON.

## Diagnose the signal

Capture front/back, face/hands/seams and gameplay distance with fixed camera, light, display transform, exposure and filtering. Compare an unlit albedo diagnostic with neutral PBR and a second light direction. If a dark region disappears unlit, investigate light/roughness/normal response before altering color. A persistent painted shadow may be baked illumination; neither sharpening nor histogram equalization de-lights it. Preserve scars, wear and intentional gradients. Recovering intrinsic reflectance from one lit atlas is underdetermined: request a clean source, locally author a bounded masked candidate, or declare the remaining ambiguity. Do not infer height from every albedo dark edge.

Inspect normal and ORM as data. Decode tangent normals `n=2*rgb-1`, normalize nonzero vectors after any approved filter, reencode, and keep the receiving Y convention. Never run color sharpening on normal/ORM. R=AO, G=roughness, B=metallic is only the declared ORM contract; all are Non-Color. Albedo is sRGB; preserve alpha separately. Do not classify all dark armor as metal.

## Registered local pixel correction

Export loop triangles of the selected mesh's actual UV layer with `uv_origin=bottom-left`; reject missing UVs, nonfinite or non-pair coordinates, UDIM/tiled coordinates outside 0..1, and an empty mask. Rasterize `(u*W,(1-v)*H)` consistently, clamping exact boundary coordinates to valid pixels. Keep W and H separate throughout. Label UV islands from mesh UV connectivity, not only the union of covered pixels: touching/overlapping islands need separate masks or explicit exclusion. Four-texel erosion of a union does not protect an internal touching-island boundary.

For each owned island, freeze exterior padding and a four-pixel interior border. A 9x9 minimum mask erodes four pixels; clip it to the original island, then fade correction inward over approximately three pixels. With per-island interior distance `d`, one candidate weight is `smoothstep(0,3,max(d-4,0))`; multiply by the artist repair mask and alpha. Exclude overlaps/ambiguous boundaries from automatic processing. Preserve padding unless a separate seam-repair pass explicitly owns both sides. Under the conservative pass existing border defects remain unresolved.

For albedo, decode sRGB channel `c`: `c/12.92` below 0.04045, otherwise `((c+0.055)/1.055)^2.4`. Work in linear RGB. Start a 5x5 bilateral estimate with spatial sigma 1.1 pixels and a calibrated color sigma, for example 0.03 linear; use `w=exp(-r²/(2*s²))*exp(-mean((neighbor-center)²)/(2*c_sigma²))`. Sample only the same island and approved material region; do not wrap image edges. Blend 0.25–0.4 of the estimate as a preview. Optional luminance sharpening uses a 1.25-pixel blur and a small bounded correction (start 0.005 linear), applied only to selected readable edges. Avoid thresholding out all black pixels: black can be legitimate cloth. Encode back to sRGB, preserve source alpha byte-for-byte and retain color-profile policy explicitly. These parameters are candidates, not acceptance criteria.

Save and decode the new image; check dimensions/mode, alpha, frozen pixels, source hashes, per-channel maximum/mean deltas and changed-pixel count with explicit exceptions rather than Python assertions that disappear under `-O`. For large patch repair, use a deliberately painted candidate rather than repeatedly strengthening denoise. If the output is lossy JPEG, exact pixel preservation cannot hold: use PNG when frozen pixels are contractual. A dimension match alone does not prove UV registration.

## Map repair and packaging

For ORM packing require identical dimensions/bit-depth interpretation and documented missing-channel defaults; retain the separate input maps. Split ORM by exact channel extraction for FBX AO/roughness/metallic, without grayscale conversion or gamma transforms. Roundtrip each channel byte-for-byte for lossless 8-bit sources. Reject a missing source instead of silently substituting an artistically different material.

An underside normal-flatten or median-color fill belongs only to a confirmed unimportant rigid soffit/floor region. Never flatten character chins/arm undersides by orientation alone. Compute the sample median from a nonempty valid same-material mask; reject unrelated neighbor islands. Use per-island bounded padding rather than an unbounded eight-pixel polygon outline. Write new maps, not in-place source edits. Test mip/downsample seams and neighboring islands before accepting.

## Embedded GLB texture revision

For a standard embedded asset use `python <skill>/scripts/replace_glb_basecolor.py source.glb candidate.png candidate.glb --material-name Body` (or an explicit zero-based `--material-index`). The helper appends a new image and texture for that material; old shared users retain the original. Existing factors, sampler, texCoord and KHR_texture_transform remain unchanged. Original BIN bytes are a byte-exact prefix. It supports PNG/JPEG signatures, one embedded buffer, core resources and KHR_texture_transform; URI resources, sparse accessors, unknown chunks/extensions and ambiguous material names are rejected before output. It does not fetch resources, decode appearance, prove same UV registration or impose equal image dimensions. Confirm dimensions and registration separately before using it for a texture-only task. JSON bytes/layout and output size change; this is not a compression tool.

Compare the candidate on the same optimized mesh and in a decoded/reimported artifact. Check material role, gamma, alpha, filtering, gameplay view and close-ups. A GLB mutation cannot prove FBX readiness. Deliver source hashes, new maps, exact untouched-data results, current comparisons and unresolved defects. Register a shared catalog revision only when that action and candidate are accepted.

## Source

Independently adapted from pinned `setcodes/gamedev-skills` revision `096c224aa498a789fa99d476583029fcb9f538e1`: `skills/blender-game-assets/references/texture-cleanup.md`, `references/preview-and-fbx.md`, `scripts/texture_cleanup.py`, `scripts/maps_post.py`, `scripts/replace_glb_albedo.py`. Source MIT notice belongs in this package's upstream notice. The helper is independently implemented; source personal paths, clothing preferences and pixel-backend authority are not adopted.
