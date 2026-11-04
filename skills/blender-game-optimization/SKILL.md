---
name: blender-game-optimization
description: "Reduce Blender game-asset geometry, texture, material and skeletal costs while preserving required appearance and motion. Use for measured asset budgets, LODs, collision proxies and scan or generated-mesh cleanup; engine FPS claims require engine profiling."
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
  reference-source: "setcodes/gamedev-skills"
  reference-license: "MIT"
  reference-revision: "096c224aa498a789fa99d476583029fcb9f538e1"
---

# Blender Game Optimization

Spend the asset budget where it improves the player's view, with an inspectable quality trade-off.

Read the shared [asset contract](../blender-development/references/asset-contract.md) and [execution and ownership](../blender-development/references/execution-and-ownership.md). Keep the imported or high-detail original intact; operate on a delivery copy.

## Budget and correction loop
1. Identify asset role, intended camera distance, screen size, simultaneous instance count, target hardware and current measured costs. Use the project's limits; if missing, state provisional budgets and their rationale rather than importing another project's numbers.
2. Capture baseline counts and matched views, including close-ups where the requested presentation needs them. Record evaluated triangles, material slots, textures, bones/influences and modifiers; distinguish proxies from engine draw calls or frame cost.
3. Select reductions with [cost and appearance decisions](references/cost-and-appearance.md): remove unnecessary work, simplify geometry, reuse materials, bake surface detail, create LODs or simplify collision as the target requires.
4. Compare the changed delivery copy at gameplay size and sensitive close-ups. Protect silhouette, deformation regions, recognizable features, UV correspondence and shading. Re-bake affected maps instead of masking projection defects with darker lighting.
5. Validate LOD transitions, collision coverage and all affected clips. Change one major cost class at a time so a quality regression has an attributable cause.
6. Re-run the shared [quality loop](../blender-development/references/quality-loop.md). Retain the better revision when further reduction breaks the agreed appearance; report the unresolved budget or propose an evidence-based trade-off.

Use `blender-materials-uv` or `blender-rigging-animation` when installed and the correction requires their work. External generation or auto-rig services are optional input paths, not prerequisites.

## Deliver
Return before/after costs, the source and delivery assets, LOD/collision decisions, current comparison evidence and accepted trade-offs. Declare target-engine performance unmeasured until profiled in a representative scene. Neither a small file nor a low triangle count establishes visual quality.

See [source attribution](references/upstream-notice.md).
