# Collision decisions and contact tests

## Shape choice

A box usually serves a crate or flat wall better than its render mesh. Capsules are useful for rounded pillars or character locomotion, spheres for simple radial contacts, and several convex hulls for irregular rigid bodies. A concave chair cannot retain the under-seat opening as one convex hull: use a seat box and separate leg pieces when that opening matters. A stair ramp improves smooth traversal but differs from step-by-step physical contact; choose per player and gameplay requirements.

Do not blindly inset every proxy. A slight inset may reduce snagging on decorative edges, but floors, narrow platforms, cover and precision interaction need agreed contact tolerances. A vehicle might use several body hulls with separate wheel shapes. Engines impose limits on hull complexity and dynamic concavity; inspect the current target settings rather than importing a universal vertex limit.

## Organization and association

Keep proxies distinct from beauty meshes, LOD meshes and reference geometry. Use identical intended transforms or a documented common root so translation and export conversion cannot separate them. Check negative/nonuniform scale and preserve children when baking transforms. Linked mesh data needs a source-level decision before transform application.

For Unreal-style FBX, a typical convex association is UCX_SM_Crate_00 for render object SM_Crate; the exact base name and suffix scheme must match that importer. Box/sphere/capsule importer prefixes differ; the upstream mention of UHX is not a universal supported convention. Unity may use engine primitives or explicit MeshCollider references; a COL_ prefix alone does not create a collider. Godot can use importer suffix rules or scene collision nodes; select and verify the actual path. Names are association metadata, not physics evidence.

## Worked chair proxy

Assume an authorized static chair 0.5 m wide, 0.55 m deep with a seat at 0.45 m. Create one thin seat box, four leg boxes and a backrest box. Keep each piece convex. Position the origin with the render asset's floor contact convention. Overlay the proxies in wire display and inspect all four sides and the underneath gap. If the player must crawl under it, compare the remaining clearance to the actual player capsule, including tolerance. If the chair will be a dynamic rigid body, reconsider piece count, interpenetration and mass behavior using that engine's supported compound collider setup.

Name pieces according to the delivery importer and export the proxy/render pair together only when requested. In the target, check whether all pieces associate with the intended mesh, then perform sweep/contact tests at the seat edge, legs and backrest. Do not mark a path clear merely because a Blender bounding box fits.

## Repair table

| Failure | Correction |
|---|---|
| Invisible wall across doorway | Split the hull around the opening; retest player sweep. |
| Dynamic object uses concave mesh | Replace with a supported primitive/convex compound and test motion. |
| Proxy offset after import | Check shared root/pivot, unapplied scale and export axis conversion. |
| Player catches on stair risers | Compare ramp approximation with actual stepping requirements. |
| Collider association missing | Inspect importer names and mesh base name; reimport and verify nodes. |

Technical acceptance includes closure/convexity where required, no degenerate faces, correct piece count and source-to-target transform agreement. Visual overlay acceptance includes coverage, deliberate clearance and absence of protruding invisible blockers. Engine acceptance includes actual contact and traversal tests on the final imported revision; list engine/version/settings and test result. Blender intersection queries alone cannot establish runtime stability.
