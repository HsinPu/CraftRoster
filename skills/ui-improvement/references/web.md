# Existing web interfaces

Use for HTML/CSS and browser components, including mobile web and the web portion of Electron/Tauri. Native shells have separate OS and framework rules.

For review, use `frontend-design-review` when available; its polish lens is a review, not permission to edit. For authorized edits, use `frontend-design` and only the relevant language/style/framework companions when available. The following baseline also works without those packages.

## Diagnose → modify → verify

| Failure | Source repair | Verification |
|---|---|---|
| Narrow window or long localized text clips an action | Inspect flex/grid intrinsic sizing, fixed dimensions, wrapping and overflow; use the existing spacing tokens and a bounded scroll/reflow owner | Render the actual route at narrow/intermediate/wide widths and zoom; operate every affected control |
| Form or modal loses keyboard focus | Use semantic form controls, associated labels and the existing dialog abstraction; preserve dismissal and return focus to the trigger | Tab/Shift+Tab, keyboard activate, Escape and re-open; inspect accessible name and actual focus |
| Theme breaks contrast or disabled/error states | Correct semantic tokens at the owner rather than inverting a screenshot or replacing the palette | Actual light/dark/high-contrast modes supported by the product, all touched state variants |
| Loading or failure causes duplicate submission/lost input | Repair component/request state and cancellation ownership; keep recovery and draft content | Slow response, failure/retry, rapid activation, route change and successful completion |
| Decorative drift | Match incumbent type/spacing/alignment and component variants without changing factual copy or identity | Inspect the final render and adjacent affected components |

Do not force additional motion, color, cards or custom typography to make the edit look substantial. Native system fonts and existing visual choices are valid when appropriate to the product.

Inspect console/runtime errors and the relevant keyboard/accessibility behavior. Automated accessibility tools supplement manual work; screenshot comparisons require matching build/data/fonts/viewport and an approved baseline. Missing browser access means source-only verification, not visual approval. For performance work reproduce and measure under comparable conditions before claiming improvement.
