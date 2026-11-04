# Surface authoring, trims, decals and texture paint

## Surface story and layer ownership

Record material substrate/coatings, use history, reference scale, target camera and output shader. Begin from correct base material and UVs. Preserve graph links/defaults and image sources before adding layers; shared material users may need scoped copies. Layer base → wear → rust → grime → dust deliberately, not uniform noise on everything. New painted products can legitimately have constant roughness.

Wear follows exposed/contact regions with irregularity, rust affects suitable metals where coating fails, grime accumulates in protected cavities and dust favors exposed up-facing surfaces. Use artist masks to contradict overly generic procedural rules. Metallic must follow exposed conductor versus dielectric paint/rust. Grayscale masks are Non-Color; colors from sampled sRGB need correct socket conversion.

## Procedural layers

Create reusable groups with named layer amount/scale inputs and snapshot original links/values for rollback. Use owned identifiers instead of deleting every node with a common prefix. Rebuilding a shared group can affect unrelated objects and sever socket links; update narrowly or version/duplicate the group. Removing a layer must restore original graph behavior, not just delete its visible node.

Curvature from local neighbor geometry depends on sampling, support topology, scale and evaluated normals; sparse low-poly corners smear wear. A stored point attribute becomes stale after remesh/topology changes. For game lows use baked curvature/AO and validate them visually; tangent-normal divergence is an approximate mask, not ground truth curvature. Fresnel measures view angle, not physical edge wear. Pointiness/Bevel/AO shader behavior is renderer-dependent.

Choose object/world coordinates intentionally. Object-space noise sticks to moving assets but feature size changes under object scale; world-space dust aligns across static pieces but slides on moving assets. For fine breakup vary roughness with limited amplitude; avoid obscuring major material roles. Bake unsupported runtime layers to textures while preserving procedural sources.

## Decals

Place a subdivided plane at an evaluated surface point, orient its local normal using correctly transformed target normals and preserve image aspect. Shrinkwrap projection needs constrained direction/distance to avoid jumping through the target. Use a small scale-relative offset above the surface, not coplanarity. A 1–2 mm offset can start a human-scale test; inspect floating edges and depth precision at the actual camera.

Refine mesh only where curvature demands it; a blanket dense grid can waste triangles. Sample triangle interiors and inspect grazing-angle renders because vertices can sit correctly while flat triangles cut a convex surface. Unsigned closest-distance samples cannot distinguish penetration reliably on their own. Parent with preserved world transforms, set intended shadow/backface behavior and test alpha/mips. For game targets choose baked decals, shared mesh atlas or actual engine projector; each has different draw-call/overdraw support.

## Trims, tiling and paint

Build trim strips with documented V ranges, gutters and texel density. Scale U along the strip to tile, keep V within the band and retain end/corner variants. Mapping `v` by a normalized range must guard zero span. Atlas regions that all share one material may reduce state changes but do not automatically merge draw calls or guarantee lower memory. Inspect seam/mip bleed and repetition at gameplay distance.

For tiling blends use a declared color attribute channel or texture mask. Height blend can use `clamp((hB-hA+(mask*2-1))*contrast+0.5)` with calibrated heights; export the mask and rebuild target shader. UV/UDIM and vertex color support depend on target, not Blender alone.

Texture paint needs active image/material slot, correct UV, canvas and brush asset. Discover available Essentials brushes; live strokes need a valid View3D/region and are not reliable headless commands. Headless mask pixels can be written as explicit RGBA arrays with bottom-up row convention, followed by update/save. Preserve external image versions and save images explicitly before closing the file.

## Correction and delivery

Wear smeared across whole faces: switch from sparse vertex curvature to appropriate bake/mask. Decal flicker: inspect gap/triangles/depth/alpha, not just larger offset. Paint missing after reload: save/relink image and verify file hash. Atlas seams: inspect padding/UV scale/mips. Deliver editable layer graphs, masks/paint images, trim region/channel manifest, baked set and actual neutral/beauty/gameplay renders. Inspect reversible removal and downstream material interpretation before declaring the surface complete.
