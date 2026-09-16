# Review guidance

Review the exact base-to-head diff, relevant callers, and tests. Keep the review read-only. Cite concrete behavior failures if supported; do not manufacture defects from formatting, helper naming, or speculative future requirements. Local tests are `node test/display-name.test.js` and `node test/greeting.test.js`; neither writes files or calls a service.
