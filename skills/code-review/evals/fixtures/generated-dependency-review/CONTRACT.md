# Generated dependency review

Review `base/package.fixture.json` against `head/package.fixture.json` and their regenerated `dependency-graph.jsonl` files. The unchanged offline registry, dependency sources, generator, application consumer and ordinary package tests are included. This is a fictional package format and resolver, not npm, a standard lockfile, a real upstream release, or a supply-chain provenance claim.

Each artifact describes one adapter package and 9,999 independently addressable synthetic depot-data packages. Its 20,000 JSONL records are one header, one adapter package, 9,999 data packages and 9,999 dependency edges. The consumer uses all data packages and validates all edges; these are not filler lines. Fully qualified package IDs include the adapter version, so a root version change regenerates all identifiers. The compact depot seed is an explicit synthetic dataset definition, not production data.

The manifest is the package selection source. `registry/index.json` pins the available versions, their local source and SHA-256. `registry/depot-seed.json` defines the fixed data package series. `tools/generate-artifact.cjs` resolves only these local inputs and emits deterministic LF-terminated records. The generated artifact can be checked against its canonical inputs without reading every record manually. `contracts/package-api.md` defines the application-facing boundary.

Run `node tools/generate-artifact.cjs --check` to check reproducibility and `node shared/test/package.test.cjs base` / `node shared/test/package.test.cjs head` for ordinary package checks from an isolated copy. `--write` regenerates only the two fixture artifacts and is an authoring command, not part of the read-only review. No dependency installation, network, Git mutation or deployment is needed.

Keep the evaluation read-only. Passing package tests are evidence for their executed inputs only. No private expected finding, verdict, model result or private author test is included in the public materials. Report missing execution capabilities honestly.
