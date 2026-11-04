# Validation evidence

## Evidence layers

- Source inspection proves the inspected data and code state, not the exported representation.
- A technical report proves only executed checks over named objects and a named evaluated/base representation.
- Export parsing proves structural properties of that file, not successful reimport.
- Reimport proves the importer reconstructed the recorded representation; compare it to the contract before accepting it.
- A rendered image supports visual judgment of its recorded view/frame. A beauty render cannot prove an unseen UV map or unplayed animation.
- Target-engine checks require the actual supported engine, importer and relevant scene/runtime. Blender reimport does not substitute.

## Scope checks to the contract

Check triangulated/evaluated counts, finite geometry and transforms, required dimensions, orientation, UVs, material slots, textures, rig weights, bones, clips and deformation as applicable. Explain intentional exceptions. Missing data, unsupported checks, size cutoffs and absent tools need explicit outcomes, not a default success.

Record the source/export hash or equivalent immutable revision with every result. Source edits invalidate dependent technical and visual evidence; reimported geometry should carry its own export identity. Do not combine yesterday's render, today's mesh report and a different export into one accepted delivery.

For manifest comparison, document tolerances and any intentional importer renaming or split geometry. Require explicit equality/mapping for named bones and clips; counts alone do not identify missing or substituted content. Coordinate system conversion can legitimately change axis-aligned bounds, so compare in a declared common space.

A validation report must distinguish measured limits, observed defects, accepted exceptions and checks not run. The absence of reported errors is not proof of complete coverage or attractive art.
