# UV and surface delivery

## Density and seams
Measure texel density using UV coverage and corresponding world-space surface size; texture resolution alone is insufficient. Compare adjacent modular pieces and surfaces seen at similar distances. Set padding in pixels for the smallest supported mip, not a fixed UV-unit margin. Check mirrored tangent orientation and bake overlap separately from intentional shared UVs. A lightmap channel may require unique packing even when the color channel tiles.

## PBR and stylized work
Color textures are usually interpreted as color; normal, metallic, roughness and masks as data. Verify each target instead of applying one rule to all sockets. Preserve alpha mode, cutout edges, normal-map orientation and channel packing. A material-slot count is a cost indicator, not an engine draw-call measurement. Nonphysical values and hand-painted shading may be intentional in an approved style.

## Baking
Use explicit high/low object sets and inspect ray misses, projection leaks and hard edges before a long bake. Calibrate cage distance with a small sample. Check metallic surfaces when baking color: a lit diffuse response is not necessarily the source base color. Verify external image files exist and sample the actual saved maps, including packed channels. Bake or rebuild nodes the selected export format cannot represent.

## Evidence
Save neutral-light and intended-light views with camera, color management and exposure held consistent across a comparison. Zoom into seams and sensitive regions without changing the comparison to hide defects. After a UV change, invalidate baked maps whose correspondence changed; after a shader-only fix, preserve geometry and rig.

## Small-asset production sequence

Use this sequence directly for a bounded prop. Larger surface jobs can hand the corresponding stage to the focused UV, material, texturing or baking package without changing the acceptance contract.

1. **Partition by surface role.** Inspect evaluated geometry and identify seams that follow construction or remain unobtrusive from the intended view. Record whether each surface needs unique projected detail, repeated material, a trim segment or a separate lightmap. Keep an editable master before making topology changes.
2. **Establish UVs.** Create an explicitly named channel, unwrap selected faces, and display a checker with numbered/asymmetric marks. Inspect size, stretch and orientation on the mesh, not only a packed UV view. An area-based density estimate for a square map is `resolution * sqrt(UV_area / world_area)`; use corresponding surface regions and square world units. For rectangular maps account for horizontal/vertical pixel dimensions. This average does not expose local directional stretch, so inspect the checker as well.
3. **Pack for the delivery.** Set island padding from the intended map size and smallest supported mip. Reserve intentional mirrored/stacked islands and document them. A normal or unique AO bake can require temporarily separating overlapping targets; reassemble only after checking the intended shading. Do not force a tiling or UDIM material into a unique 0–1 layout merely to satisfy a generic validator.
4. **Prototype the surface.** Build a simple material with identifiable roles and inspect it under a broad neutral key. Distinguish dielectric paint from exposed conductive metal, roughness from base-color variation, and opacity from transmission. For a stylized brief, establish large painted values before fine noise. Recheck neutral and intended light before multiplying texture resolution.
5. **Prepare the image target.** Give each target material an explicit image node selected as the bake destination. Create the image at the agreed resolution and encoding, save to a new owned path, and verify the UV channel used for sampling/baking. Changing active object does not guarantee the intended material's image node is active.
6. **Bake a small diagnostic.** For high-to-low projection, establish exact source and active target selection, an appropriate cage or ray range, and a known test region. For unlit base-color transfer, choose a path that excludes illumination rather than assuming a diffuse beauty bake is albedo. Check the runtime's bake engine/options. If projecting separate parts, isolate or explode bake groups consistently so nearby geometry does not contaminate another part.
7. **Save and reload the actual map.** Inspect ray misses, opposite-side leaks, seam dilation, flipped normal detail and unintended illumination. Save image buffers explicitly; saving a `.blend` alone does not prove external images are current. Reopen or reload the saved texture and compare it to the intended material at neutral and gameplay views.
8. **Connect the delivery material.** Use the target's supported shader arrangement and channel packing. Preserve original authoring materials separately. Compare the baked/export material against the authoring look, then inspect the exported/reimported version when that is requested.

## Diagnose before repainting

| Symptom | Check first | Repair and recheck |
|---|---|---|
| Checker squares change scale across modules | World transforms, surface area and UV scale | Normalize density for the declared role, preserving intentional hero emphasis |
| Black patches or rays crossing thin parts | Active target, source selection, cage and normals | Isolate projection groups or tune the cage locally; rebake the affected map |
| Bright halos at island boundaries | Dilation, mip filtering and neighboring islands | Increase usable margin/repack and inspect downsampled output |
| Normal detail appears recessed | Tangent convention, green channel, triangulation and normal space | Correct the actual mismatch rather than flipping channels without evidence |
| One repair changes other props | Shared material/image datablock users | Make a local variant if intended, then inspect every affected shared user |
| Saved output is stale or blank | Image dirty state, path and actual pixels on reload | Save the intended buffer to its owned path and reopen it |
| Target import looks different | Shader support, color management and texture interpretation | Repair the delivery shader/maps and compare again under controlled light |

Hand off the mesh revision, UV purposes, image table, role/channel/encoding choices, bake source/cage settings, saved outputs and comparison evidence. Preserve the source procedural graph when a baked representation is needed for delivery. State which steps were actually run and which remain a specification.
