# Shooter Space and Cover Assets: production playbook

## Brief, scale and evidence

Obtain standing/crouching dimensions, eye/weapon offsets, cover classes and sight distances. Distinguish FPS/TPS and arena/BR/extraction context. Rays and renders do not prove ballistics, balance or working extraction.

## Asset kit and construction

Low/high cover, door/window frames, elevation transition, pickup states, landmark and requested extraction marker; separate render, sightline and proxy geometry.

Match visible cover depth/top to supplied world-space height. Avoid false sight holes in intended solid cover. Keep FPS near geometry and TPS shoulder clearance diagnostics distinct. Pickups need shape/open-state cues, not emission alone.

## Bounded layout recipe

These dimensions are a starting study, not established game rules.

1. Assemble a configurable 18 by 24 m study with two cover types and elevated edge; place supplied standing/crouched cameras.
2. FPS: inspect close-wall and weapon frame. TPS: inspect both shoulder offsets and actor visibility behind cover.
3. Place a regional landmark and approach to requested destination marker; keep outline readable from selected arrival views.
4. Render sightline overlays separately, then detail surfaces without altering top/opening silhouettes; inspect pickup states with post effects off.

## Subtype construction and correction

### Subtype workflows

Read only the requested branch in [subtype workflows](variant-workflows.md):

- [First-person shooter (FPS)](variant-workflows.md#first-person-shooter-fps)
- [Third-person and cover shooter (TPS)](variant-workflows.md#third-person-and-cover-shooter-tps)
- [Arena and bounded multiplayer space](variant-workflows.md#arena-and-bounded-multiplayer-space)
- [Battle royale regional scale](variant-workflows.md#battle-royale-regional-scale)
- [Extraction shooter destinations and loot states](variant-workflows.md#extraction-shooter-destinations-and-loot-states)

## Diagnostic images and acceptance

Standing/crouched sections, FPS near-wall image, both TPS shoulders, roofless sightline map and marker approaches. Label rays geometric-only; hit response needs engine tests.

## Specific failures and repairs

Camera intersects column: revise obstruction/clearance. Cover raised base changes height: correct full world bounds. Decorative hole conflicts with solid proxy: reconcile intent. Extraction resembles lamps: change mounting silhouette and negative space.

## Handoff
