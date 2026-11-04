# Rendering, passes and output verification

## Render contract and engine

Record scene/cameras, inclusive frames, FPS/base, resolution/percentage/pixel aspect, output color/alpha, passes, time/memory limits and approved view transform. Preserve source render/compositor/world settings or use an owned copy. Inventory external images, linked libraries, simulations and fonts before batch work.

Cycles is a path tracer for lighting/material accuracy and baking; EEVEE is a distinct real-time renderer requiring graphics support; Workbench is useful for shape/playblast and does not validate materials. Blender 5.2 IDs include CYCLES, BLENDER_EEVEE and BLENDER_WORKBENCH. Do not apply old EEVEE SSR/bloom/contact-shadow properties blindly. Check installed settings; a headless host may lack an EEVEE graphics context.

## Quality and device recipe

Use a small representative crop/frame first. Cycles preview can start at 64 samples/adaptive threshold 0.05, final at 256–512/0.01, with OIDN or a supported device denoiser. These are starting caps, not acceptance criteria. Inspect fine textures, hair, glass, volume and shadow convergence. Denoising can erase detail or flicker temporally; compare an undenoised crop and adjacent frames. Keep albedo/normal denoising guides when post-denoising.

Discover actual compute devices through Cycles preferences, enable intended devices and report chosen backend. A GPU enum assignment does not prove GPU use or faster execution. If unavailable use CPU with disclosure. Keep preference changes transient unless authorized to save them. More transmission bounces may be needed for nested glass; more diffuse bounces for interiors. Light tree, larger emitters, geometry/normals repair and selective indirect clamp often beat blindly raising samples. Clamp and blur-glossy alter appearance, so compare before/after.

Use region tests, visibility/view layers, subdivision/texture preview limits and persistent data deliberately. Persistent caches can increase memory. Texture-cache features are version-sensitive and produce dependencies; discover them rather than assuming every install has them. Measure actual elapsed render time and output dimensions, not just configured base resolution.

## Color and passes

Set display/view/look/exposure once for the project. AgX handles photographic highlights, Khronos PBR Neutral serves a different product/asset goal, Standard can serve graphics, and ACES needs actual pipeline agreement. A view transform does not guarantee engine parity or faithful raw albedo. EXR stores scene-linear values when configured correctly; review PNGs apply the intended display transform. Never apply display transforms twice or use review JPEG as the only archive.

Enable only needed passes: Combined, relevant diffuse/specular components, emission, volume, depth/mist, Cryptomatte and denoising guides. Verify pass availability/names in actual output. Z depth is non-antialiased and not interchangeable with normalized Mist. Cryptomatte needs metadata, not a flattened ID-colored JPEG. Pass recombination requires material-color multiplication and energy terms; adding direct/indirect passes blindly is not faithful beauty reconstruction. Use blender-compositing for the graph.

## Output and batch execution

Render image sequences first for expensive animations, then encode a separate review movie. Use per-camera directories and frame-numbered paths, avoid collisions and inspect overwrite/placeholder behavior on shared workers. Save the revision before dispatching. CLI example: `blender -b shot.blend -E CYCLES -o //renders/shot_#### -F PNG -s 1 -e 120 -a`; argument order matters because Blender executes flags as encountered. Keep Python args after `--`.

In Blender 5.2 set `image_settings.media_type` before compatible file_format. PNG RGB/RGBA and depth are explicit; multilayer EXR must retain layers/passes. For archive use an agreed lossless/appropriate codec; DWAA is lossy and unsuitable for some data passes. Transparent film plus RGBA is required; JPEG cannot preserve alpha. A movie extension or render operator return does not prove a usable file.

## Diagnose and prove

Black render: verify active camera, clipping/visibility, view layer, world/lights, materials and compositor output. Wrong dimensions: account for percentage, border crop and pixel aspect. Missing frames: enumerate expected versus actual, decode samples and inspect failed workers; no unconditional video success flag. Noise/fireflies: identify source/path, compare unbiased crop and avoid hiding it through heavy denoising. Flickering simulation needs durable caches and fresh-process tests.

Deliver editable settings/source revision, frame/pass manifest, actual file sizes/dimensions, chosen device/timings and inspected representative images/playback. Verify full frame count/number continuity, alpha/color/pass content and movie decode/duration/audio where present. Technical render completion and visual acceptance are reported separately; target-engine appearance requires its own run.
