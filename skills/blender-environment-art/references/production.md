# Environment structure, terrain and composition

## Scale and minimum kit

Pick the project's unit convention and snap lattice before making modules. A 0.5 m subgrid with 2 or 4 m spans is one useful starting point, but preserve an existing kit. Document origin, outward direction, connector locations and rotation increments. Real building heuristics such as 2.1 m doors and 2.4–3.5 m ceilings are references, not accessibility or gameplay approval. Derive clearance from the actual player capsule, camera and encounter design.

Create straight walls, left/right turns or symmetric corners, doorway, window, floor and ceiling pieces before bespoke landmarks. Test a closed room, corridor bend and T-intersection from the same parts. Footprints must tile; seams need aligned position and shading. A trim strip can conceal an intentional join but should not cover an unresolved scale mismatch. Maintain consistent texture density on adjacent modules.

Use shared trims/atlases for repeat surfaces. Vary vertex tints, decal history and selected material parameters instead of making a unique mesh/material for every wall. Check negative scale on mirrored modules and define whether the exporter supports collection instances.

## Terrain and foliage

Hero rock and cliff silhouettes may use sculpted or cleaned scanned forms; background coverage can use reused rock families. Ground displacement needs enough resolution at path edges without allocating the same density to the horizon. Roads, waterways and cliff lines should support composition and navigation, with enough slope/step clearance for the intended actor.

Plant tiers depend on occupancy. A tree with 10k triangles instanced 500 times is a different proposition from one hero tree. Cards reduce geometry but may increase transparent overdraw. Scatter large masses before undergrowth; exclude paths and important sightlines through masks, slope/height bands and explicit authored placement. Keep the actual seed and permitted parameter ranges in the source.

## Composition and storytelling

Place a recognizable objective or hero element, then examine the intended path as a sequence of views. Roads, walls and changes in elevation can point toward it; not every vista needs a rule-of-thirds layout. Use broad value groups to separate foreground framing, midground activity and low-detail background silhouette. The brightest area attracts attention only within the full value/color arrangement; test the actual image rather than assuming it.

Story cues need causality: neglected paint belongs with exposed material and age; barricades imply a direction of threat; personal objects imply occupation and use. Keep interaction surfaces legible and traversable. Negative space is a deliberate density decision, especially in sparse or tense environments.

## Worked compact outpost

For a 24 by 24 m playable courtyard, greybox entry, objective, cover and exit first. Use 4 m architectural spans on a 0.5 m snap lattice; prove the corner/door/floor relationships in a separate kit test. Build one reused trim material, a landmark tower silhouette and three families of ground clutter. Place rocks and shrubs outside the route, with a saved seed and density cap. Inspect at the actual player eye height near entry, turn and objective, plus a wide vista.

If the objective disappears behind foliage, adjust the density mask or composition rather than adding another bright effect. If the courtyard feels repetitive, change module grouping and narrative clusters before authoring dozens of new pieces. If performance becomes heavy, measure transparent fill, instances and material changes before decimating every mesh.

Acceptance requires snapping and clearance measurements, current path/vista images, visible population costs and preserved kit masters. A viewport walkthrough is Blender evidence; target collision, streaming and frame performance remain separate engine checks.
