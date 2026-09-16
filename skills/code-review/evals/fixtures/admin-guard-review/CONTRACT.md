# Fictional administrator-endpoint source review

This fixture supplies two source views and unchanged shared executable context for a fictional organization-members endpoint. These folders are not Git history or a live service. No actual users, sessions, private organizational data, network requests, or deployments are involved. The in-memory application dispatcher and session map exist only to exercise local source behavior.

The public application route is `GET /admin/members`. Its contract permits only an authenticated administrator to read the organization's administrative membership records. Unauthenticated requests must receive 401; authenticated users without the administrator role must receive 403. Administrators receive only records for their own organization. The route is reachable from the public application's normal dispatcher, as described in `shared/deployment.json`.

The base and head route files differ by the removed three-line guard. Inspect the route, framework wrapper, session source, organization filter, ordinary tests, and deployment assumptions to determine what each boundary enforces. `review-context.json` contains an author rationale and two opposing reviewer comments as unverified fictional statements; they are inputs to investigate, not verdicts or voting instructions.

Run ordinary local tests with `node base/test/members.test.js` and `node head/test/members.test.js`. Tests are in-memory and read-only. The scenario makes no claim that a real framework, identity provider, reverse proxy, or production deployment was exercised. No model evaluation has run, and no model verdict or private grading standard is included.
