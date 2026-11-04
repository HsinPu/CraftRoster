# Godot delivery pipeline

## Declare the actual importer

Record exact Godot version, renderer, Blender/exporter build and editor-import versus runtime-import path. The [Godot 4.6 format guide](https://docs.godotengine.org/en/4.6/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html), checked 2026-11-04, recommends glTF 2.0. GLB is convenient for a single package; separate glTF is useful when binary/textures need independent review. Direct `.blend` import invokes Blender and therefore adds a tool dependency. A project's existing FBX pipeline may remain appropriate, but record its importer: older assets can retain earlier FBX2glTF settings while newer versions support ufbx. Do not silently switch the importer.

This is a target-specific resource built on the common export contract. Preserve master `.blend` and derive export state. An optimization pass is conditional on budget or defect; it is not an excuse to change approved art unnecessarily. Gather object set, pivot, hierarchy, external textures, material slots, bones, shape keys, clip names/ranges and requested collision/LOD behavior before exporting.

## Calibration before the production asset

Use a small calibration object in the same exporter/import settings: a measured 1 m edge, visibly asymmetric forward marker, noncentral pivot and parent/child marker. For a rig, include a short joint rotation and deliberate root translation. Record expected target transforms numerically. Exporter axis conversion must happen once; do not rotate the source and also rely on an undocumented importer correction. Godot uses Y-up, but exact forward/character conventions depend on consumer and asset contract. Inspect the imported marker rather than deciding success from an axis dropdown.

Measure imported dimensions against the calibration reference and test pivot rotation/placement. If a model is 100 times wrong, trace scene units, exported values and importer scale; do not compensate at an arbitrary ancestor and declare scale repaired. Keep armature bind/animation consistency when correcting transforms. Negative/nonuniform scales need explicit mirrored normals and deformation checks, not blanket apply-transform advice.

## Material and geometry transfer

Use glTF-compatible material structure or bake unsupported procedural appearance to textures. Inventory base color, metallic, roughness, normal, emission, transparency and culling; record texture color/data treatment and packed channels. Inspect an asymmetric normal-map feature so flipped tangent interpretation is visible. A missing normal map can look acceptable in a flat studio light, so include raking illumination.

Export only required geometry and deformation bones, plus declared attachment nodes. Verify modifiers on a derived copy, then check shape keys/skin still exist in the output. The versioned Godot guide specifically cautions about deform-bone export with blend shapes; inspect that option in the installed exporter rather than guessing its Python property name. Keep intentional double-sided material behavior explicit; default uncullable surfaces should not be treated as automatically correct.

## Rig and clip contract

Bake unsupported controls/constraints to the export skeleton with an explicit sample range/rate. List clip names, seconds, intended loop behavior, root-motion node/axis and shape-key channels. Exporter action/NLA behavior varies with Blender version, so verify the resulting file's clips instead of assuming every visible Action is included. Keep a bind pose and at least one elbow/knee/shoulder extreme for imported comparison.

Import as a scene or animation library according to project use. Inspect the AnimationPlayer/library tracks, play all required clips, compare start/end durations and observe root motion. A skeleton and clip count do not demonstrate correct playback. Save material overrides and added game nodes in a deliberate inherited/local wrapper workflow so reimport does not silently erase them; [import configuration](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/import_configuration.html) documents these separate customization paths.

## Collision and LOD ownership

Choose explicit engine-created primitives, imported proxy geometry or documented Godot name hints. `COL_` and Unreal `UCX_` are not universal Godot collision semantics. The [Godot suffix reference](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/node_type_customization.html) describes `-col`, `-convcol`, `-colonly` and `-convcolonly` and import options that can disable hints. Record enabled hint policy and expected node/shape types. Do not generalize a Collada-specific empty-shape shortcut to GLB. A convex hull spanning a doorway is technically convex but wrong for passage intent.

For LODs record whether the project uses importer-generated mesh LOD or explicit authored representations/visibility logic. Names alone do not prove either was configured. Keep levels/pivots/materials aligned and inspect actual target transitions or selected representations at the intended screen sizes. Do not promise performance from fewer triangles without measurement.

## Import, inspect and repair

Use a disposable target scene or approved project location. Preserve importer settings and exact input hash. Compare scale/pivot/forward, surface response, normal/cull/alpha behavior, hierarchy, collision wireframe and representative deformation. Run a small collision interaction only if requested and available; a wireframe is shape evidence, not controller behavior. Reimport a changed revision to test whether material overrides, wrapper nodes and clip settings survive.

After repairs regenerate exports and affected evidence. Deliver source, export, textures, settings/versions, hashes and inspected target images. Without Godot execution label the result prepared for import, with target acceptance unperformed. A Blender reimport is useful intermediate evidence, not Godot success.
