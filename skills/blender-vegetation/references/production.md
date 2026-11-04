# Plant structure, cards and wind

## Select the representation

A close hero tree can justify a modeled trunk and branching structure with textured leaf clusters. A dense distant forest needs reused plant families, strong LOD/culling decisions and possibly impostors. Grass may use a few intersecting cards or modeled blades where silhouette and hardware justify them. Cinematic strand/geometry wind is a separate renderer path; it does not automatically become a game shader.

Observe the species' branch order, leaf arrangement, crown shape and growth direction. Model large branch taper first and retain recognizable gaps in the canopy. Repeated identical forks and spherical leaf balls make species identity weak even with detailed textures. Ivy attaches along surfaces and needs actual contact/clearance, not merely a free scatter.

## Atlas and card construction

Pack leaf/cluster variants into shared textures with consistent material response, meaningful opacity and adequate color dilation around alpha edges. Put a card's local attachment pivot at the stem/base, and the whole plant root at the ground contact. Align atlas UVs and leaf orientation so repeated instances can bend plausibly.

Keep trunk material opaque and choose a target-supported masked/dithered/two-sided foliage method for cards. Transparency sorting and overdraw can dominate cost even with few triangles. Cut cards reasonably close to leaf clusters while balancing extra vertices; large empty transparent rectangles are expensive. Inspect alpha thresholds and mip behavior, not just the 4k source texture. Normals and backface lighting need the chosen shader tested; forcing every leaf normal upward can create unnatural response.

## Wind and LOD

A named color attribute such as VC_Wind can store motion weights, but its channel meaning, point/corner domain, numeric range and target importer mapping must be explicit. One simple scheme fixes the trunk near zero and ramps toward branch tips. Separate branch stiffness, phase and leaf flutter channels only when the target shader consumes them. Attribute existence does not animate anything. Inspect base anchoring and maximum gust displacement in the actual shader or compatible Blender preview, and distinguish those environments.

LOD0 retains major branches and detailed leaf clusters. LOD1 removes twigs/cards while preserving crown coverage; LOD2 uses coarser crown clusters; a far level may use a billboard/impostor with approved viewing and lighting assumptions. Ratios alone can make the tree thin or bald. Inspect canopy silhouette and alpha area from several directions, including transition frames. An impostor is optional when the actual target's supported system gives a better result.

## Worked meadow tree family

For a 6 m tree family, build one trunk/branch master and three canopy variants with a shared atlas. Keep the base root at ground level. Create leaf clusters with stem pivots, instance them along branch hierarchy and reserve larger gaps that define the species. Author a documented tip-weight gradient only if requested by the wind shader.

Preview a single tree in neutral lighting, then a grove at intended density. Measure evaluated geometry and visible cards; inspect opaque and alpha costs in target when possible. Build one reduced canopy variant and compare from front, side and elevated gameplay views before making an impostor.

If trees float after scatter, fix source base/pivot or surface-space transforms. If crowns thin at LOD switch, preserve coverage with cluster changes rather than only delaying the threshold. If wind moves the roots, correct attribute weights/mapping and test maximum gust. If edges shimmer, inspect alpha coverage, mipmaps, threshold and texture padding.

Acceptance includes technical atlas/attribute/pivot/LOD data and current plant/grove images. Engine performance, shader wind and impostor transitions require actual target checks; a static Blender render cannot prove them.
