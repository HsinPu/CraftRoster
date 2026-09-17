# Outline block movement

This is a synthetic, local CommonJS library with no dependencies.

The document is a valid preorder array of nodes with unique string ids, nonnegative integer depth, and arbitrary other fields. A section is a node at depth 0 plus all subsequent nodes before the next depth-0 node. Only whole depth-0 sections can be moved. No caller asks this helper to repair malformed outlines.

`moveSection(nodes, sectionId, beforeId)` in `src/move-section.cjs` returns a new array with the entire named section immediately before the named depth-0 section. A null beforeId appends the section to the end of the document. Moving a section before itself is a no-op that still returns a new array. The original array and every node object must remain unchanged; preserving node object identity is allowed. Preserve every node, its fields, and the relative order inside each section.

Unknown ids and ids that name non-root nodes raise RangeError. Do not change the export, broaden the accepted input model, add dependencies, or implement drag-and-drop UI. The source and supplied example data are the complete ownership surface for this task.

The available task tools can read and write local text files only. There is no shell, test runner, browser, network, or external system. Runnable Node tests can be authored for later execution, but source inspection and manual traces are not executed tests.
