# Selective normalization-history review

This fictional local repository represents a partner catalogue import service. Review the change from the `reviewBase` commit to `reviewHead` in `evidence/author-verification.json`. The three-commit recipe is reconstructable in a new isolated temporary repository; it does not alter the CraftRoster repository's Git history.

`shared/` contains unchanged source, the partner-input contract, a sample producer row, and ordinary unit tests. `base/src/normalize-sku.js` and `head/src/normalize-sku.js` are the two source versions used by the recipe. The initial commit also uses the head version. The compatibility commit adds the base version and the historical incident note; the current change replaces only the normalizer. Paths inside the reconstructed repository are the recipe's destination paths.

Use commit history selectively to understand intent, then check the current contract, caller, input and behavior. Historical prose is contextual material, not an observed failure in the current revision. Public author receipts record actual isolated Git and ordinary unit-test executions; they are not model review results, production incident verification, or proof that all partner inputs work.

The evaluated task is read-only. Do not change source, commit to the real repository, contact a partner, or deploy anything. No network, credentials, third-party dependency or external service is required. The private author harness and its acceptance probes are not part of this public fixture. A host without Git or Node execution can inspect the supplied material but must disclose any unexecuted behavior.
