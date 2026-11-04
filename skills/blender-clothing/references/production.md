# Garment construction and deformation fit

## Construction choice

Record silhouette, real thickness/ease, removable outfit rules, body variants, motion range and destination. Extract body regions for fitted shells; use tailored patterns/modeling and draping for loose garments. A copied body patch does not automatically provide tailoring, openings or folds. Keep the complete body and construction sources.

Copy selected whole faces and UVs into an owned garment; verify nonempty face selection and remove isolated vertices. Offset in world units with inverse-transpose normals under nonuniform scale, or use prepared applied-scale copies. Human-scale fitted ease might start at 5–10 mm, with more for jackets; armor follows construction. Keep open collars/cuffs and loops around bend zones. Solidify thickness/offset must be deliberate; inspect concave corners, rims and self-intersections. Reunwrap stretched areas rather than assuming inherited body UVs suffice.

Model or drape major folds, retopologize to the intended render/game resolution and bake smaller folds. Keep cloth simulation grids independent from dense final surfaces. For a fitted preview 2–4 mm thickness is a starting visual choice, not a universal fabric standard.

## Weight and layer mechanics

Transfer from the correctly posed/rest body using DATA_TRANSFER `VGROUP_WEIGHTS`, `POLYINTERP_NEAREST` and names. Clean/limit/normalize deform weights independently of pins/masks. Identical source weights do not guarantee matching offset surfaces; correct shoulder, armpit, hip and long hem behavior in motion. Loose hems may need extra bones or runtime cloth.

Use one intended Armature deformation, preserve world matrix during parenting and avoid inherited double transforms. Shape keys evaluate before modifiers; Armature then subdivision/thickness is common, but simulation may require another explicit stack. Do not reorder the user's whole stack blindly.

Hide covered body through reversible outfit masks, shrinking hidden faces inside cuff/collar borders. Inspect grazing views. Export a body duplicate with approved hidden faces removed when masks are unsupported. Preserve the full body for swapping. Hiding skin cannot repair exposed boundary intersections. Give outer layers sufficient ease, transfer from the intended body rig and measure layer-to-layer contact; common weights alone are no guarantee.

## Drape and body morphs

Use a low-resolution simulation garment, actual support pins and simplified collision. Settle before action, persist source/cache and transfer/retopologize folds. Read blender-cloth-simulation for bake mechanics.

To transfer body variants, preserve all values/pose, zero body keys and bind Surface Deform at neutral rest. Evaluate one body shape at a time, capture garment coordinates in garment-local space and reset each captured key to zero. Remove temporary deformation after capture and restore original body state. Leaving Surface Deform plus Armature can apply motion twice. Test combined body shapes with animation; add garment-specific correctives for large changes rather than copying names alone.

## Poke-through repair

Inspect evaluated surfaces, not base vertices alone. Normal-direction rays estimate clearance/coverage but miss tangential folds, uncovered regions and sparse topology. Signed distance is meaningful only with a suitable valid closed surface. Report sampling, ignored regions, tolerance and world scale, then inspect actual rendered close-ups/silhouettes. Zero sampled hits is partial evidence.

Repair wrong transforms/stack first, then weights/morphs, insufficient ease, local topology and finally approved body hiding. Raising the entire garment can make it float. Retest arms overhead, crouch, stride and combined morphs after consequential changes.

Deliver garment/body masks, UV/material set, bone/morph mapping, influence report, stress images, clearance findings and export duplicate. Target layered-clothing cages require exact platform templates/topology; generic inner/outer shells do not establish Roblox compatibility.
