# Severe palette as a design constraint

## Choose the constraints explicitly

Specify an inspiration system or a project-defined limit, base sprite dimensions and color roles. Four colors per object can be a useful art exercise, but is not a universal description of every 8-bit console. Exact hardware compliance requires its actual palette, tile, sprite and scanline rules. This package can author the look without claiming an emulator.

## Sprite recipe

Block a prop or character at a small base size, for example 16 by 24 pixels. Begin with a one-color silhouette that distinguishes front/back and key accessories. Allocate chosen colors to outline/shadow, body midtone and focal highlight. Share a background color where the stated constraint allows it. Use broad flat material regions or an authored palette remap rather than uncontrolled physical highlights.

Render from a locked camera with consistent framing across the set. Inspect base pixels first; use integer nearest enlargement for preview. A light gradient must be replaced by deliberate color regions or sparse intentional dither, not blurred into extra colors. Thin details should be redesigned as readable clusters. Test light and dark backgrounds; one shared outline choice may fail on either. Keep sprite texture sampling separate from render resizing.

## Repair and acceptance

Too many colors need tracing to lighting, antialiasing and resizing before arbitrary posterization. A black silhouette lacking identity needs larger distinguishing features. Muddy diagonal edges need deliberate stepped clusters and pixel alignment.

Require base raster, exact-palette report when a count was specified, enlarged preview and two background comparisons. Accept subject identity within the agreed limits and intentional clusters. Distinguish authored target colors from display/compression colors, and do not claim exact hardware legality from a color count alone.
