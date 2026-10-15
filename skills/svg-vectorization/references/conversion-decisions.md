# Choose reconstruction or tracing

| Source | Useful first method | What must survive |
| --- | --- | --- |
| Flat emblem or icon | Geometric primitives and a small number of paths | Silhouette, internal holes, spacing, color relationships |
| Uniform line sketch | Editable centerlines with appropriate caps and joins | Open ends, junctions, stroke rhythm |
| Brush lettering | Filled contour reconstruction | Variable width, counters, distinctive terminals |
| Layered illustration | Back-to-front semantic groups | Occlusion and individually editable objects |
| Photograph | Agreed simplified reconstruction or dense trace | The specifically chosen recognition and detail priorities |

Do not chase every antialiased source pixel with an anchor. Infer a regular circle when the intended form is regular; preserve an irregular contour when its irregularity carries identity. Sample broad flat interiors rather than introducing mixed edge colors as extra palette entries. Inspect halos and compression artifacts before treating them as deliberate outlines.

A visible checkerboard can be baked into image pixels. It is not proof of an alpha channel. Likewise, transparent pixels can store colors that are invisible in the composited image. Match the requested visible background rather than sampling invisible RGB values as artwork.

For a local tracer, inspect available version and help before choosing commands. Keep preprocessing, thresholding, denoising, and palette reduction in separate copies. Disclose transformations that alter appearance. Tracing creates contours; their order, holes, islands, and color seams still require inspection. A tool's output is neither automatically safe to render nor semantically organized.

For lettering, use the supplied high-quality source where possible. Editable SVG text depends on fonts and layout support. Outlines provide editable shapes but no longer editable words. Follow the requested treatment and record font substitution as a fidelity limitation. Do not invent unreadable labels.

For photos, describe the output honestly: a simplified vector illustration or a dense geometric approximation. The raster does not contain recoverable original vector layers. If the user's fidelity and editability goals cannot both be met, expose the tradeoff before committing to an unsuitable result.
