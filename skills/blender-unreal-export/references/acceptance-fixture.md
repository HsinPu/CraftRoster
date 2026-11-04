# Unreal acceptance fixture

Use a disposable project folder and explicit static/skeletal import path. Include a meter-scale asymmetric static piece expected as 100 cm, offset pivot, doorway with convex pieces, socket attachment marker, material patches and requested LOD variants. A separate tiny skeleton has a bind pose, joint rotation, root translation and morph extreme where relevant.

Capture target bounds/basis and pivot behavior, render/collision/socket associations, material/UV slots and LOD transitions. Inspect the doorway opening in collision visualization and attach a visible marker to each required socket. For skeletal files list resulting Skeleton/mesh/sequence names and compare representative frames, duration, deformation and root motion. Report Physics Asset work separately if requested.

Exercise separate-per-asset export when the importer path has multi-mesh helper limitations. Preserve current importer settings and input hashes; do not test one combined file then ship unverified split derivatives. A successful import log or generated physics shape is not visual or behavioral approval. If Unreal is unavailable, deliver the prepared artifacts and fixture instructions with the target gate explicitly unexecuted.
