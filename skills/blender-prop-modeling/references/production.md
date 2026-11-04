# Grounded props and reusable parts

## Tier selection and form

A chair seat near 0.45 m and a table near 0.75 m are useful human-scale checks, but reference/product dimensions take precedence. Define whether the object is a close interactable, standard scene prop, distant filler or reusable kitbash part. Example envelopes might be 2–8k triangles for a modest hero prop, 500–2k for a standard object, and 100–500 for distant clutter. A first-person hero can need much more; none of these figures establishes an engine limit.

Prioritize outline, negative spaces, grip/hinge dimensions and recognizable material thickness. A mundane stool should not acquire sci-fi panels simply because a hard-surface recipe is available. Separate pieces where construction, motion or material/export behavior requires it, rather than dividing every surface indiscriminately.

## Pivot and part decisions

Floor objects usually use a ground-contact pivot; handheld objects use a grip/socket; hinged doors use the hinge line; wall-mounted objects use an attachment plane. A drawer translates, so its motion root differs from a door's rotating root. Store attachment axes and coordinate conventions with reusable parts.

A kitbash library can organize handles, hinges, brackets, feet, switches and fasteners into category collections. Choose a relevant small grid, perhaps 0.05 or 0.1 m, and place the origin at the attachment face/axis. Preserve a master mesh and use linked instances for repetition. A category prefix and numbering convention improves lookup but is not a reason to rename an established project.

## Surface, wear and optimization

Use edge bevels where visible light response or silhouette needs them; a distant prop does not benefit from dozens of microscopic loops. Keep glass/emissive/opaque parts separate where transparency or shader pipelines demand it. Share an atlas or tiling materials across prop families, and preserve actual texture scale.

Wear follows use and environment: handled edges may polish, feet may abrade, upward surfaces may catch dust, and protected undersides may stay cleaner. Dirt, edge whitening and scratches are not universal. Use roughness/normal cues as well as base color, and keep narrative history consistent. Do not bake in lighting so strongly that the object fails under a different set light.

## Worked wooden chair

For a measured chair with a 0.45 m seat height, establish seat, back and four legs as simple masses. Confirm the leg angle, negative space beneath the seat and character clearance at the intended camera. Build joinery or braces that the reference actually shows. Add narrow visible bevels and preserve material grain direction with a UV plan. Put the delivery pivot at the intended floor-contact convention, and retain a separate edit master.

If the chair is distant set dressing, simplify underside joinery and share its material with the furniture kit. If interactive, retain grasp/contact areas and plan collider shapes around the open underside rather than filling it. Repeated chairs should share geometry, while a broken hero variant can use its own owned mesh.

## Review and correction

A prop that looks wrong in scale needs measured dimensions/contact landmarks checked before texture changes. A disconnected handle needs attachment geometry/pivot repair. A plastic-looking wooden edge may have excessive bevel radius or roughness mismatch; inspect under neutral lighting. Over-detailed filler should lose invisible loops/unique materials before its outline is changed.

Technical acceptance checks transforms, intended boundaries, normals, UV/shader dependencies and evaluated counts. Visual acceptance checks current silhouette at gameplay size, close contact edges for hero props, material scale and plausible construction. Test intended movement separately. Preserve source, edited revision and reusable attach-point data in the handoff.
