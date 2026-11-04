# Daylight, night and atmosphere production

## Environment contract

Record renderer, scene scale, camera/range, location/time realism versus art-directed mood, existing world/practicals and color pipeline. Save original world/compositor references and create owned environment objects. Never clear every ENV-prefixed object: names alone do not prove ownership. Time presets are starting art direction, not verified astronomical simulation without location/date/orientation.

## Sun and sky

Define a direction-to-sun from elevation e and heading h, for example `(sin(h)*cos(e),cos(h)*cos(e),sin(e))` with documented heading zero +Y. A Sun's local -Z points along emitted rays, opposite that vector. Match sky texture elevation/rotation and Sun shadow direction. Blender 5.2 supports MULTIPLE_SCATTERING/SINGLE_SCATTERING as well as legacy sky models; discover the installed enum and avoid assuming sun_direction applies to every model. Disable duplicate direct sky disk contribution when a separate Sun supplies it.

Starting elevations: midday 45–70 degrees, morning 15–30, golden 2–8, sunset around zero, twilight below horizon. They do not define a unique clock time. Lower solar elevation warms direct light and lengthens shadows, while sky fill changes; use actual sky/model or matched HDRI rather than only tinting a white Sun. Overcast reduces direct contrast and broadens sky illumination. Do not enlarge sun angle alone and claim a physically measured cloud model.

Balance sky/Sun and practicals under fixed exposure. Alternatively use photographic exposure and scale practicals consistently. Upstream measured lookup tables are tied to model, version, atmosphere and calibration; do not present their numeric Sun powers as universal irradiance. Blender light watts are not household electrical bulb watts. Keep actual chosen values and gray-card render evidence, especially if migrating between sky models/view transforms.

## Twilight and night

Blue hour can use sky-only light and emerging warm practicals; actual shadows depend on moon/artificial sources. Night needs a readable hierarchy and silhouettes, not uniform dark blue. Use a moon directional source only when intended, practical pools at streets/windows/signs and restrained ambient. Moonlight color is affected by observation/white balance; a blue 8000 K light is an artistic choice, not a universal physical value. Procedural stars should contribute to camera appearance deliberately without accidental scene illumination; a visible moon disk needs separate geometry/HDRI, not just a Sun light.

For cyberpunk use scoped emissive signs/spill and reflected wet surfaces; for horror preserve important navigation/focal cues amid darkness. Underwater needs absorption/scattering and depth-dependent color, not only teal fog. Desert haze and heat distortion are separate effects. Retain a neutral view to diagnose excessive grade.

## Visibility-based fog

For homogeneous neutral extinction, meteorological 2% visibility V gives approximate sigma `3.912/V` per meter. V=500 m gives 0.007824; V=40 m gives 0.0978. This relation assumes a contrast threshold and homogeneous medium; colored Principled Volume and artistic scattering are not exact measured visibility. Put a bounded volume around shot/camera path and set physical units. A world volume can unintentionally extend infinitely or behave differently by engine.

Height fog can use `sigma0*exp(-max(z-z0,0)/H)` with a defined ground and height H. Anisotropy around 0.5–0.8 can reveal forward shafts; needs strong directional/spot source, gaps/occluders and supported volume shadows. Dense heterogeneous fog increases noise. Inspect installed Cycles volume controls rather than assuming old step settings remain active. EEVEE froxel range/tile/samples need the actual depth span and graphics device; reduce range or increase quality when banding. Mist-pass color blending is cheaper but cannot reproduce light shafts or true volume interactions.

## Correction and output

Fog too dark: inspect extinction, volume extent and light paths before automatic exposure compensation, which can blow out practicals. Flat night: separate key/practical pools and background values. Double shadows: inspect duplicate sky disk/Sun. Black horizon: check sky ground behavior and actual terrain extent. Glare thresholds act on scene-linear values, so exposure/comp ordering must be declared. Preserve an existing user compositor; add an owned reversible group only within scope.

Deliver world/light/fog graph, directions/colors/powers, scale, visibility assumptions, camera/render/color settings and matched day/night/neutral diagnostic renders. Inspect full camera path for volume boundaries, clipping, star flicker and readability. State art-directed versus calibrated values and keep engine fog/lighting validation separate.
