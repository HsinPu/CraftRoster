# Facial morph authoring and combinations

## Schema and preserved topology

Choose bones, morphs or hybrid by desired expression and receiver. Morphs are valid in games too. Define exact ARKit coefficients, project visemes, VRM expressions or destination-specific FACS mapping. A 52-name scaffold is not a functioning face or Roblox dynamic head. Preserve Basis/order, keys, values, drivers and active key. Complete topology changes first; retopology needs deliberate shape transfer. Include eyes, teeth and tongue in jaw/blink testing.

Add Basis with `ob.shape_key_add(name='Basis',from_mix=False)` when needed, then relative keys. Set `.value=0` explicitly after capture and record `relative_key`. `from_mix=False` avoids accidental expression mixtures; `from_mix=True` intentionally captures one. Key-value animation lives on the Key datablock, separate from object/bone actions.

## Sculpt and mirror mechanics

Sculpt meaningful semantic motion: blink follows eyeball and seals lids, smile preserves cheek/lip volume, jaw follows a pivot and cavity, pucker/funnel retain lip thickness. Do not move the skull inside expressions. Work at base resolution before subdivision and inspect the final evaluated result. Nonzero maximum displacement proves only that something moved; document omitted/unneeded coefficients instead of nudging arbitrary vertices to pass a test.

For L/R splitting compute shape minus its relative basis, multiply by smooth masks in declared face coordinates. `clamp(0.5+x/(2*w),0,1)` and its complement sum to the original delta. Left is not universally +X; width is mesh-local unless transformed. Follow actual naming schema and avoid double side suffixes.

Mirror against established symmetric Basis correspondence, reflect deltas and transfer paired vertices. Report unmatched/ambiguous indices and centerline behavior. Spatial proximity can cross adjacent lips/lids, so it is not topology-independent proof. Preserve existing target key/driver/animation before replacement; make a candidate and compare.

## Controllers and correctives

Controller custom properties can drive values through SINGLE_PROP/AVERAGE variables. Do not reset existing authored controls globally. For a pair corrective, define the residual delta beyond the expected A+B deformation and drive by `a*b` or calibrated response. Capturing A+B and adding the whole captured delta again doubles motion. Bone correctives need declared local transform space, rest offset and activation range; inspect transition and combined extremes.

Use simple expressions without enabling arbitrary script autorun. Widgets/drivers do not automatically export as engine logic. Bake value animation or implement the approved mapping downstream. Test relative key support in the actual exporter; an absolute evaluation-time setup may need conversion.

## Combination and sync review

Capture neutral and required keys at 0/0.5/1, then risky pairs: jaw+smile, blink+squint, cheek+pucker, asymmetric brow and eye rotations. Inspect silhouette, lid/lip seal, volume and teeth/tongue penetration. Lip sync follows actual audio and coarticulation, with clear bilabial closures and transitions; named visemes alone are preparation. Use a timed facial action when that is the deliverable, not an arbitrary separate action per shape.

Deliver schema/map, semantic coverage/unsculpted omissions, driver graph, neutral/combination images, sync preview and clean reimport evidence. Check constant vertex count/order, finite deltas, displacement bounds and target morph inventory. Receiver normals, runtime weight mapping and animation playback remain separate acceptance gates.
