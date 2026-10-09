---
name: image-to-code-assets
description: Mandatory for design-image or UI-screenshot requests that ask to slice, cut out, extract, or export independent assets, transparent PNG or WebP, 2x, 3x, or 4x files, source bounding boxes, an asset manifest, or Figma layers. Pair with image-to-code for page implementation. Exclude ordinary screenshot-to-page reconstruction and simple single-image resize, crop, conversion, or optimization.
license: Apache-2.0
metadata:
  author: "HsinPu"
  source: "HsinPu/CraftRoster"
---

# Image To Code Assets

Extract reusable bitmap assets from approved visual evidence without turning the full interface into a flattened image.

## Ownership

Use `image-to-code` as the parent whenever the main outcome is a real webpage or application screen. That parent owns source authority, semantic UI, responsive behavior, implementation, and visual comparison. For an asset-only request, the user or named task owns the return; no page workflow is required.

This Skill owns only the independent asset branch:

- decide which visible regions should remain editable HTML, CSS, text, or project icons and which require bitmap extraction;
- define source bounding boxes, padding, density, output format, alpha behavior, CSS display size, and asset identity;
- produce and verify independent image files and an asset manifest;
- return stable asset paths and constraints to the parent implementation;
- optionally describe a later Figma layer handoff without claiming that raster evidence contains original vectors or hidden layers.

This Skill requires `image-utils` for deterministic crop, resize, format conversion, compositing, alpha inspection, and optimization. Do not regenerate an asset or upload private designs unless the user separately authorizes that action.

## Trigger Boundary

Select this Skill when the request explicitly needs at least one of:

- slice, extract, cut out, or export icons, illustrations, product images, avatars, textures, or decorative artwork from a UI design;
- transparent PNG or WebP assets, background removal, retained alpha, or edge cleanup;
- 2x, 3x, or 4x density assets with a fixed CSS display size;
- source bounding boxes, an asset inventory, a machine-readable asset manifest, or later Figma-layer import data.

Do not select it merely because image-to-code is implementing a screenshot. Ordinary responsive page reconstruction remains with image-to-code. A simple resize, crop, conversion, or optimization of one known image remains with image-utils.

## Inputs

Record:

- approved source image path or artifact ID, source hash, dimensions, color mode, and known license or ownership;
- return owner, output root, and whether production writes are authorized; include the parent workflow and target route only when page implementation is active;
- requested asset roles, target formats, density factors, background policy, and CSS display sizes;
- whether editable text, CSS shapes, repository icons, or existing assets must be preferred;
- privacy, network-egress, Figma, and generated-asset permissions.

If the source image is missing, ambiguous, too compressed, or too small for the requested density, stop and request a better source or an explicit approximation decision.

## Workflow

### 1. Classify Visible Regions

Keep headings, labels, controls, simple geometry, gradients, borders, and layout as editable frontend code whenever practical. Reuse authorized project assets or the existing icon system when they clearly match.

Extract bitmap assets only when the visual content is intrinsically raster, sufficiently detailed, or explicitly required as an independent file. Do not rasterize whole cards, navigation rows, forms, or page sections just to match one screenshot.

### 2. Define Extraction Geometry

For every candidate asset, record a stable ID, semantic role, source bounding box, intentional transparent padding, expected CSS display dimensions, density factor, output pixel dimensions, format, alpha policy, and destination.

Do not crop away shadows, antialiasing, glow, or intentional transparent margins. Do not invent pixels hidden behind other elements. Mark partial, occluded, or uncertain regions as blocked or approximate.

### 3. Export Deterministically

Preserve the source file. Write new files only under the authorized asset output root. Prefer PNG when lossless alpha or sharp UI edges matter, WebP when supported transparency and smaller delivery size are appropriate, and project-native formats when an existing pipeline already owns the decision.

Apply density to pixel dimensions while keeping CSS display dimensions explicit. Do not treat a 2x or 3x bitmap as a command to enlarge the rendered control.

### 4. Write the Manifest

Read references/asset-manifest.md when a machine-readable manifest or Figma handoff is requested. Record the source identity and one entry for every output, including geometry, density, dimensions, alpha, license, status, and verification.

The manifest describes extracted evidence. It does not grant rights, reconstruct original vectors, or become a second source of truth for page layout.

### 5. Verify Assets

Verify:

- output exists at the declared path and matches the declared format and pixel dimensions;
- alpha and color mode are correct;
- edges, shadows, transparent padding, and small details survive on checkerboard, dark, and light backgrounds;
- no neighboring text, controls, or unrelated artwork leaked into the crop;
- CSS display dimensions and density are consistent;
- file size and compression are appropriate for the target web pipeline;
- when page implementation is active, placement in the real page remains faithful at representative viewports; asset-only requests verify the agreed preview backgrounds, dimensions, and density without requiring a page implementation.

When the parent implementation is active, return results to image-to-code before final visual comparison.

## No-Op And Failure

- If the page can be reproduced with semantic code, existing icons, and authorized source assets, return a no-extraction result and do not manufacture files.
- If a requested background removal cannot be separated reliably from one flattened source, retain the background, request a better source, or mark the asset approximate.
- If required processing capability is unavailable, return the manifest candidates and exact blocked operations without claiming exported files.
- If licensing or ownership is unclear, do not export third-party branded assets for redistribution.

## Completion And Residue

Completion requires the approved output files, a verified manifest when requested, the QA results, known approximations, and a handoff to the return owner. Return asset-only results to the user or named task; return page-support results to the owning page workflow. Remove only task-created temporary crops, previews, masks, and processing directories under the authorized output root, unless the user names them as retained evidence.

## Handoff

- Use image-to-code for page implementation and its visual-evidence contract only when that deliverable is active; asset-only requests return directly to their return owner.
- Use image-utils for deterministic image operations.
- After the asset receipt returns, the owning page workflow uses visual-regression-testing for final page-level comparison. Asset-only completion does not require page comparison.
- Use figma-to-code only when structured Figma data is the primary authority; this Skill may provide a later raster layer manifest but does not replace structured Figma context.
