# Explicit-mask silhouette diagnostics

`scripts/compare_reference_masks.py` runs in system Python. It reads **foreground masks**, never guesses a photographic background. It neither renders nor edits a scene. A writer prepares and verifies masks; a read-only reviewer must remain within its permission boundary. This helper diagnoses a saved projection and cannot supply visual approval, depth, target-engine acceptance or proof that declared calibration matches an actual Blender camera.

## Inputs and execution

The standard-library paths are JSON masks or ASCII PGM `P2`. JSON has exactly `width`, `height`, `rows`; rows are strings of `0` background and `1` foreground. Example: `{"width":4,"height":4,"rows":["0000","0110","0110","0000"]}`. PGM has a positive maximum and only zero/maximum samples; intermediate shaded values are rejected. PNG requires Pillow already available in the selected Python and must be binary grayscale mode `1` or `L`, samples 0/255. RGB/alpha artwork and antialiased gray masks must be deliberately converted and visually checked beforehand. Do not install dependencies as an incidental comparison step or write a custom PNG decoder.

Masks must be 2..4096 pixels on each axis, at most four million pixels and 32 MB encoded. Empty foreground, one-row/column extent and a full-frame mask without background are unusable here. Source `.blend` identity is hashed in chunks without loading the entire asset into memory. Hash records use real files, nonempty paths and lowercase SHA-256. Relative paths resolve beside the contract.

```json
{
  "schema_version": 1,
  "mode": "registered",
  "source": {"path":"ranger-r4.blend","sha256":"<64 lowercase hex>"},
  "reference": {"path":"ref/front-mask.pgm","sha256":"<64 lowercase hex>"},
  "candidate": {"path":"review/front-mask.pgm","sha256":"<64 lowercase hex>"},
  "calibration": {
    "reference": {"projection":"orthographic","view":"front","metres_per_pixel":[0.0025,0.0025],"axis_column":200,"ground_row":740,"pixel_aspect":[1,1]},
    "candidate": {"projection":"orthographic","view":"front","metres_per_pixel":[0.0025,0.0025],"axis_column":200,"ground_row":740,"pixel_aspect":[1,1]}
  }
}
```

```text
python <skills>/blender-reference-modeling/scripts/compare_reference_masks.py --contract comparison-r4.json --output review/comparison-r4.json
```

The output must be new and its directory must already exist. Invalid input exits nonzero and produces no report; an old report is never overwritten. A successful exit means the requested diagnostic was measured. The JSON says `status:measured`, contains source/contract/mask hashes, image sizes, foreground boxes, IoU and ten band-width differences, and lists unexamined properties. There is no universal pass threshold. Keep the contract and inputs beside the report so hashes can be checked again; editing a mask or source requires a new contract/report.

## Choose the metric deliberately

**Normalized mode:** set `mode:normalized` and omit calibration. Each mask is cropped to its own foreground box, resized to 256 pixels high with nearest sampling while preserving aspect, then centered horizontally. IoU diagnoses relative shape. Absolute translation and uniform size have deliberately disappeared. A half-size rectangle can score identically to its full-size reference. The ten width bands measure the outer envelope at band centers; holes, disconnected parts, off-band detail and material identity need separate inspection.

**Registered mode:** both masks must have identical dimensions and exactly matching calibration declarations. Only cardinal `front/back/left/right` orthographic windows are supported. Positive finite horizontal/vertical metres-per-pixel must agree with positive pixel-aspect ratio. Ground/axis coordinates are finite and may legitimately fall outside the image. No recentering, scaling, projection solving or resampling occurs. A shifted or undersized silhouette loses overlap. Mismatched window size, view, sampling or anchors is an error; resample to a documented common window beforehand and bind the new bytes.

Identical declarations do not prove they are true. Save the actual camera transform, orthographic extent, facing convention, render/pixel aspect and calibration-object image in the writer's evidence. A copied metadata field cannot prove physical scale. Perspective photos, arbitrary tilted views, depth changes and a camera looking at the wrong plane are outside the registered calculation. Use independent world dimensions and real rendered review even when IoU is high.

For example, compare a 16-pixel-tall reference to an 8-pixel-tall candidate in the same 32-pixel frame. The normalized diagnostic may report IoU 1; the registered score falls because the candidate occupies one quarter of the reference area. Record both results with their different scopes, then fix world geometry or camera calibration according to measured evidence. Never close an artistic finding solely because one number increased.
