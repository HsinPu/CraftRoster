# Safe optimization with and without SVGO

## Start with the consumer contract

Record selectors and references outside the SVG before renaming or removing anything. `url(#...)`, `href`, ARIA IDREFs, SMIL timing such as `part.end`, CSS selectors, and JavaScript lookup are consumers. Inspect the host because the SVG alone cannot reveal every external reference. Retain the unoptimized source, including authoring metadata needed for continued editing; produce a separate delivery derivative when appropriate.

Choose one narrow pass first. Removing indentation may reduce raw bytes but not geometry or DOM work. Simplifying paths can change shape. Converting primitives to paths can remove animation attributes. Merging paths can change fill-rule, stroke joins, paint order, selection, or accessibility. Collapsing groups can break the motion hierarchy. Do not treat these as interchangeable cleanup.

## Optional local SVGO

Check the repository's declared version, lockfile, local binary, and any existing SVGR/bundler optimizer settings. The optimizer embedded in a framework may have a different pipeline from the standalone CLI. If no local tool is available, perform bounded manual cleanup or explain the missing optional tool; installing it changes the project and must remain within the requested scope.

For an already installed project-local CLI, use its explicit local executable with an output path, for example:

```text
# POSIX shell
./node_modules/.bin/svgo --config svgo.config.mjs --input source.svg --output source.optimized.svg

# PowerShell
& .\node_modules\.bin\svgo.cmd --config svgo.config.mjs --input source.svg --output source.optimized.svg
```

Check actual options against that version. Do not use `npx` as an implicit download fallback. A minimal allowlist is easier to reason about for externally controlled IDs or animated art than a broad preset. This conservative example changes attribute serialization, not geometry:

```js
// svgo.config.mjs — review against the project's installed SVGO version.
export default {
  multipass: false,
  plugins: ['sortAttrs'],
};
```

Expand deliberately after measuring results. If using `preset-default`, inspect that version's plugin list and configure overrides only for plugins actually present in the preset. For example, preserving `cleanupIds` alone does not protect hidden motion layers from `removeHiddenElems`, descriptions from `removeDesc`, or selector structure from `collapseGroups` and `mergePaths`. Do not enable `removeViewBox`, or strip the standalone SVG namespace. Do not copy an override for a plugin that the installed preset no longer contains.

## Comparison and acceptance

Use the same renderer/version, viewport, DPR, fonts, background, and time/state for before and after captures. Compare transparent art against both light and dark surfaces. For motion, exercise actual playback and intermediate states; many static rasterizers cannot evaluate the same animation or CSS as the browser.

Report raw and compressed size only if actually measured; record path/element counts only from the actual files. A pixel metric is diagnostic: matching low-error averages can hide a missing thin stroke or inaccessible label. Inspect semantic contracts and meaningful details visually. Retain the prior accepted baseline until the output passes the agreed tolerance; do not redefine that tolerance solely to accept a smaller file.

Official version-specific reference: [SVGO default preset](https://svgo.dev/docs/preset-default/). Check current documentation when choosing plugins rather than assuming upstream example configuration matches the installed release.
