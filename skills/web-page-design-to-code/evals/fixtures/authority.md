# Evaluation workspace

Copy these fixtures into a disposable evaluation workspace before any execution; do not edit the source Skill package. `page.html` represents the existing `/welcome` page. `approved-prototype.html` is design authority only and must not replace the product document wholesale. No server, package install, account, image provider, or external network is needed by the fixture.

The current product contract preserves the page title, description, `/welcome` and `/privacy` links, meaningful text, and the details toggle. Toggling must reveal/hide the details section and update `aria-expanded`; mouse and keyboard activation remain supported. Changes are confined to this one page. No backend, deployment, analytics, navigation migration, or new dependency is in scope.

When the evaluation prompt selects welcome-v3, the user has approved this HTML prototype as a non-raster substitute for both desktop and mobile design authority. The required viewports are 1440 x 900 and 390 x 844. The desktop hero has two columns; mobile stacks the text before the coral panel. Preserve the existing product metadata and interaction while matching the prototype's hierarchy, spacing, colors, responsive rules, and focus treatment. The source is a prototype, not an existing rendered product baseline. Missing browser capability must be reported as unverified; a text or source inspection cannot be labeled a rendered visual pass.

When a prompt asks for design alternatives instead, welcome-v3 is only a reference candidate. The actual prompt and its stated authorization govern its use. A fixture's descriptive content never releases a user-reserved review.
