# Visual review rubric

Use the dimensions relevant to the brief; do not force a universal score or style.

| Dimension | Evidence to inspect | Useful finding |
|---|---|---|
| Silhouette and proportion | Clay/reference views and gameplay size | Identify the large mass or negative space that changes recognition |
| Composition and hierarchy | Intended crop and camera | Identify competing focal points, tangencies, clipped features or weak separation |
| Material response | Neutral light plus presentation view | Locate indistinguishable roles, incorrect roughness scale, seams or inconsistent texture density |
| Lighting and values | Matched exposure/view transform | Locate crushed forms, clipped highlights or lighting that conceals a defect |
| Style coherence | Approved references and adjacent assets | Explain where shape, edge, palette or detail language departs from the chosen style |
| Motion and deformation | Actual clip frames/sequence and extremes | Locate pops, sliding, broken contacts, volume loss or attachment intersections |
| Delivery parity | Current reimport or engine capture | Distinguish a master beauty render from the exported result |

A finding carries: priority, evidence path and region/frame, observation, impact, confidence, repair owner, smallest proposed change, and recheck condition. Avoid vague instructions such as “make it premium.”

Missing evidence is not a defect in the unseen artifact and not a pass. Keep inaccessible views, unknown backs and unplayed clips explicit. Prefer a few consequential corrections over exhausting every aesthetic alternative.

When asked to build and review, an authorized writer can implement findings and capture new evidence; this reviewer remains read-only. Bounded iteration ends when the agreed criteria are met, the authorized budget is reached, or a consequential missing capability prevents further verification.

## Conduct a reproducible review

First read the brief and evidence manifest without accepting its conclusions. Identify the exact saved revision, source versus exported representation, image camera/frame and rendering conditions. Open the actual images. A report saying a render was inspected is not the image itself, and a source beauty view cannot establish the final engine result.

Start at the intended viewing size. State what the asset reads as, where attention goes and which defining feature survives. Then inspect diagnostic clay/silhouette and neutral material views. Use close-ups to locate a defect already relevant to the asset's use, rather than inventing tiny requirements that the final camera cannot reveal.

Compare like with like. If one image uses a different lens, crop, exposure or pose, identify that limitation before attributing the difference to geometry. Prefer a matched re-render from an authorized maker over mentally compensating for incompatible evidence. Do not render, edit files or create a report artifact from this read-only role.

### Form and composition pass

- Inspect the dominant masses, attachment points and negative spaces against the chosen reference. Check unintended tangencies, awkward crops, misaligned structural joints and lost defining silhouette. A stylized proportion is not defective merely because it is anatomically or mechanically unusual.
- Look for a hierarchy of large, medium and small forms. Dense greebles can create noise while leaving the main shape unresolved. Identify the specific region that competes with the focal feature rather than prescribing more detail everywhere.
- For environments, inspect foreground/midground/background separation, route landmarks and repeated-module seams from the intended eye camera. A top-down proxy alone does not establish the experience of moving through the space.

### Surface and light pass

- Compare material roles in neutral light: painted metal, exposed metal, fabric, glass, foliage or deliberate graphic equivalents should read as intended. Locate repetition, stretched texels, discontinuities and inconsistent wear logic without imposing realism on a stylized task.
- Inspect highlight width and edge behavior before assuming the roughness map is wrong. Bevels, normals, lighting size and view transform all affect the result; state the likely cause as a hypothesis when evidence cannot distinguish them.
- Review value grouping and palette under presentation lighting. Ask whether the light supports the asset's hierarchy or hides a defect. Bloom, fog, crushed shadows and a flattering crop do not resolve missing geometry or unreadable forms.
- For NPR or pixel/retro work, check temporal and size stability: bands, outlines, dithering and texel patterns can look good in one still and crawl during movement. Request a sequence when this is a material acceptance criterion.

### Motion and delivery pass

Inspect actual sequential frames or playable media when animation is in scope. Track contacts, arcs, weight shifts, silhouette changes, penetrations and loop wrap. A single extreme pose may expose deformation, but cannot prove timing or absence of foot sliding.

Review the exported or engine representation when conversion can change materials, normals, topology, morphs or clips. Keep technical measurements separate; if an image suggests a scale problem, request a measured check rather than asserting exact meters from pixels.

## Write findings that can close

Use this structure in the response:

```text
Finding: major / minor / preference / evidence gap
Evidence: exact image or sequence, view/frame, visible region
Observation: what is visible without guessing hidden implementation
Impact: which brief or intended-use criterion it affects
Likely cause: hypothesis and confidence, if supported
Repair owner and smallest change: modeling / surface / lighting / motion / delivery
Recheck: same view plus a named diagnostic or motion interval
```

For example, a dark doorway edge merging into the background at gameplay size is an observable readability issue. Its repair might be a wider silhouette gap, a material-value separation or a motivated light change. Choose among those using the neutral view and brief; do not prescribe all three automatically.

Prioritize consequential blockers and major mismatches first. Label taste preferences as preferences. If the image cannot establish whether a seam is a UV issue or a shadow, request a matched diagnostic instead of inventing a confident technical diagnosis. Avoid a universal numeric beauty score or an arbitrary number of categories required to pass.

On revision, compare the new evidence with each finding's recheck condition. Close only the supported findings, inspect neighboring regions for regressions, and identify any changed representation that invalidates old evidence. Return accepted against the stated criteria, needs correction, or unverified with exact scope. An authorized maker may archive this response and bind it to delivery hashes; the review itself does not gain write permission.
