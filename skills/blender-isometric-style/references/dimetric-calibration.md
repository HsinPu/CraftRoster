# Calibrating a 2:1 dimetric diamond

Read this only for a kit that actually specifies a 2:1 diamond. The main production recipe already defines true isometric projection; replacing one with the other changes a shared asset camera contract.

For a square ground grid with equal X/Y scale, orthographic projection and a diagonal azimuth of 45 degrees, projected ground-edge slope magnitude equals the sine of camera elevation. A diamond twice as wide as tall therefore uses a 30-degree elevation above the ground. The equivalent camera Euler X angle is often 60 degrees in a simple unparented Z-up arrangement, but camera targeting/parent rotations can change those component values. Validate the view direction and projected grid rather than copying Euler fields.

Create a square tile with visible corner markers and a vertical axis gauge. Fix the camera target, orthographic span, output aspect and pixel aspect. Render the four ground corners and measure diamond width versus height at delivery resolution; compare with the 2:1 contract and allow only the declared raster tolerance. Use the same camera/scale/canvas origin for neighboring tiles. An off-axis target or non-square pixel aspect can break the measured ratio even when the nominal elevation is correct.

For sprite/tile outputs inspect adjacent ground tiles and a tall building. Shared base corners must align while height remains readable; do not distort one mesh to compensate for a wrong camera. If a supplied kit uses another dimetric angle, preserve and measure its actual ratio instead of imposing 2:1. Depth sorting, engine tile coordinates and navigation remain separate implementation checks.
