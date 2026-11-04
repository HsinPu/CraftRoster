# Occupancy-grid design

## Grid contract

Set voxel edge length, integer origin and chunk/asset dimensions. For a miniature creature a 0.1 m cell may be a useful study, while a block landscape may use 1 m cells; match the project. Decide whether each visible cube is geometry, an instance or a surface extracted from occupancy. A smooth sculpt with flat normals is not automatically voxel art.

## Build and surface

Plan occupied cells for head/body/limbs or environmental mass. Test front, side and top silhouettes. Keep limbs at least one cell thick and add purposeful stepped diagonals rather than beveling them smooth. Snap occupancy to integer cell coordinates. Translate the whole asset through its origin rather than introducing fractional cell offsets between parts.

For a small model use cube instances while authoring, then create an export copy only if delivery needs realized mesh. Remove fully internal faces using an occupancy-aware surface method; merge-by-distance alone does not remove all shared coplanar interior faces or boolean topology. Preserve an editable occupancy/source representation. Use a small palette or atlas with consistent texel allocation, flat normals and broad light that distinguishes faces. Transparent/glowing cells require separate deliberate material treatment rather than smoothing all blocks.

## Repair and acceptance

Inconsistent block sizes need grid/origin correction before texture. Too-smooth curves need occupancy redesign. Huge mesh cost needs hidden-face elimination or instances, not arbitrary collapse that changes steps. Adjacent chunk seams need shared border occupancy and pivot checks.

Require four orthographic silhouettes, a cell-grid overlay, material view and evaluated geometry/count report. Accept consistent cell scale, intentional stepped identity, connected required limbs and matching chunk joins. Engine chunk streaming, collision and voxel editing are separate implementations. A raster that looks blocky does not prove an occupancy-grid asset.
