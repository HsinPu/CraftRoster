# Manifest-driven roundtrip without count-based false acceptance

Majid's exporter/roundtrip provide useful inventory ideas but the roundtrip script does **not** read its manifest. Exit zero only means its limited import/image/height/render checks found no errors. Follow the existing controlled-export playbook and use the tables below as a concrete semantic comparison contract. The existing delivery checker binds report/file hashes; it does not execute these comparisons.

## Freeze expected semantics before exporting

Record source/contract hashes, exact owned object set, intended descendants/deform associations, exporter/version and requested options. Reject empty scope or unexpected multi-linked helpers. Current visibility/selection and collection names alone are insufficient: a HIGH object linked into LOW can still leak; a hidden required collider/socket can still be omitted. Resolve explicit inclusion before export.

Capture expected inventory in a portable table, for example:

```json
{
  "asset":"Ranger",
  "units":{"metres_per_authoring_unit":1,"up":"Z","forward":"-Y"},
  "lods":[{"id":"LOD0","parts":["Body","Cape"],"expected_height_m":1.7}],
  "skeleton":{"root":"root","required_deform_bones":["pelvis","hand.R"],"rest_pose":"ranger-rest-r4"},
  "sockets":[{"id":"grip.R","parent_bone":"hand.R","axis_policy":"project-hand-v1"}],
  "clips":[{"id":"Attack_A","range":[10,40],"effective_fps":30,"duration_s":1.0,"root_policy":"in_place"}],
  "materials":[{"role":"cape","alpha":"opaque","normal":"OpenGL +Y","uv":"UVMap"}]
}
```

This is an illustrative **semantic table**, not a new executable schema or undocumented input to `check_delivery.py`. Add actual bounds, matrices/pose samples, texture packing and per-check tolerances from the asset. Store names as stable semantic IDs with source→export→imported mappings. An importer may split a mesh at material seams or add wrapper nodes; matching counts is neither necessary nor sufficient.

## Make actual outputs current and portable

Inspect available exporter RNA. Reject or explicitly revise an unavailable required option; do not silently filter it out. Require operator `FINISHED`, new output paths and current nonempty artifacts. Enumerate all generated files, including `.gltf` sidecar buffers/textures and animation metadata, with hashes. A previous file cannot satisfy this run.

Inventory only requested exported clips on their actual rig/action-slot/NLA path. All source actions with users may include unrelated rigs or fake-user data. An animation-disabled export must not claim those clips. Use `fps/fps_base` for timing and preserve repeated event records and range checks. A manifest's hardcoded axes/material conventions are expectations until decoded/imported measurements confirm them.

Follow connected shader outputs and node groups to identify used image resources. Record texture role/UV/color space/channel packing and resolve UDIM/sequence/library resources deliberately. An unconnected image node is not a delivered surface dependency. Absolute authoring paths are not a portable dependency list. Copy the package to a clean directory that cannot resolve source paths and load it again.

## Compare a clean import

Use a new background process with the intended input/output scope. Factory reset in a user live scene is destructive. Inspect actual import options; disable importer bone-display shapes when supported, or identify and exclude those generated shapes explicitly.

| Contract item | Actual collection and comparison | Failure that counts miss |
|---|---|---|
| Parts/LOD | Map named render parts at each LOD, evaluate geometry and record intended inclusion | Missing cape replaced by same-count helper; all LODs rendered on top of each other |
| Dimensions/pivot/axis | Apply scene unit factor, transform to common declared space, check known-length/direction/pivot markers | Correct height but mirrored/offset/front reversed; collider extends bounds |
| Finite geometry | Check each evaluated coordinate/matrix before min/max | NaN hidden by reduction, collapsed part within plausible scene bounds |
| Materials/resources | Per-used-polygon role/UV, supported shader values, moved-package textures | Correct material/image count with wrong assignment, normal convention or missing tile |
| Skeleton/bind | Hierarchy, rest transforms, actual mesh associations and sampled stress pose | Correct bone names but wrong rest/bind or controls exported instead of deformation |
| Clips/events | Intended clip set, effective duration, ordered events, interior samples, root displacement and loop wrap | Correct length with static/wrong motion; repeated event lost |
| Sockets/colliders | Mapped parent/local transform and real attachment/target physical behavior | Named empty at wrong transform; importer ignores collision naming |
| Morphs | Required target mapping and actual vertex deltas at selected weights | Named but empty expression or modifier-applied loss |

Separate render meshes from colliders, helper/bone shapes and alternative LODs before bounds or review. Check actual vertices, not only object bounding boxes when collapsed/invalid geometry is possible. Do not apply a universal “nothing below ground” test to assets whose pivot or intended geometry extends below it.

Require explicit expected/actual values, tolerances, mappings and named unexecuted checks. A JSON inventory without comparison remains inventory. Compare imported clay/material/game-camera and motion evidence to the appropriate source revision; a master beauty render cannot approve a changed export.

## State the consuming result

Blender reimport establishes only that importer path. Unity's actual glTF package, Unreal FBX/Interchange route, Godot/web extensions/decoders and collision/animation setup need their own real checks. Capture target version/settings, scale marker, appearance, required clips, LOD transitions and physical interactions when in scope. If unavailable, deliver the prepared package and scoped Blender comparison with engine status untested. Do not edit only a manifest to hide a failed contract; repair, export and repeat affected checks.
