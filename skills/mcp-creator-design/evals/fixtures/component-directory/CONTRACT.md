# Component directory MCP task

This is an authored, fictional development fixture. Implement the server; the
catalog is starting data, not a completed server. Use the pinned project SDK,
not an API guessed from the current upstream main branch. The historical SDK
pin is a compatibility test, not a recommendation for a production deployment.

## Deliverables and behavior

- Add `src/server.ts` exporting `createServer()` and `src/index.ts` for stdio.
  Importing `server.ts` must not start a transport. Server identity is
  `component-directory`, version `0.1.0`.
- Expose exactly one tool, `lookup_component`, with a useful description and
  `readOnlyHint: true`. Its required `id` is a string matching
  `^[a-z][a-z0-9-]{0,39}$`. Missing, non-string and malformed IDs must fail MCP
  input validation, without lookup or coercion.
- Look up the ID in `src/catalog.ts`. A match returns one text content block
  containing JSON for that catalog entry and no error flag set to true.
  A well-formed unknown ID returns `isError: true` and one text block containing
  `{"code":"NOT_FOUND","id":"<requested-id>"}`.
- Do not mutate the catalog, read arbitrary paths, call a network service,
  request credentials, expose extra tools, or start an HTTP listener. Stdio
  stdout carries protocol messages only; diagnostic output belongs on stderr.
- Add `test/server.test.mjs` exercising initialization, tool discovery, a known
  ID, an unknown ID and invalid arguments using the installed SDK client and a
  local transport. Verify the stdio entrypoint as well as the factory. Keep the
  existing catalog tests passing. Do not replace them with assertions about
  source wording. Report commands actually run and any remaining gaps.
- Add a short `IMPLEMENTATION.md` describing startup, checks and the versioned
  evidence used. Only these three new source/test files and this new note are deliverables;
  package metadata, lockfile, catalog and host evidence stay unchanged.

## Host preparation and documentation capability

Before a future model trial, the evaluator must copy this project into its
isolated workspace and provision its lockfile dependencies with scripts disabled.
`node_modules` is intentionally not shipped here. The evaluator must verify the
installed package version before claiming the prompt's installed-SDK premise.
These files alone do not establish an executable or isolated model host.

The host has no `WebFetch`. It supplies an offline official-document retrieval
replay: `node host/retrieve-docs.mjs sdk-quickstart` and
`node host/retrieve-docs.mjs server-validation`. Both return JSON with the source
URL, SDK version and an author paraphrase grounded in the official tagged source.
This is an authorized local equivalent for this case, not a live web fetch or a
verbatim upstream response. Unknown document IDs fail; the replay cannot fetch
arbitrary URLs. Installed SDK declarations/source remain available after setup.

Use `npm run build`, then `npm test` in the prepared workspace. The initial
project only builds the catalog and runs its two existing tests. Passing those
does not verify the missing server. Tests and dependency setup have no model or
external service requirement. No SDK upgrade, package install during the model
trial, production release or global MCP registration is part of this task.
