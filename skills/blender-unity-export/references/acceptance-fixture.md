# Unity acceptance fixture

Create a disposable test scene with a 1 m reference, asymmetric pivot prop, two material patches, open doorway proxy and small rig with joint rotation/root translation. Select one stated import path; do not test FBX and then infer a GLB package works. Add a final prefab wrapper only when its ownership is authorized.

Record imported bounds/basis/pivot, material-to-shader/channel mapping, renderer/material slots, Avatar or Generic root, clip inventory/durations and first/middle/last poses. Inspect attachment transforms after hierarchy optimization if used. Inspect actual Collider components and the doorway opening; then test requested physical interaction separately. Record LOD Group renderer membership, bounds and transitions at declared screen-height thresholds.

Use actual target images and playback observations. A green Avatar indicator, populated Inspector or nonzero FBX is insufficient visual/motion evidence. Preserve importer settings and perform one controlled reimport to check external material and prefab ownership. Separate import correctness from runtime performance or game behavior. If the editor is missing, provide the fixture plan and mark its execution unperformed.
