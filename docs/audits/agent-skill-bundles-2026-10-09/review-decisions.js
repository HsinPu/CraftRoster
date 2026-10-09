// Audit evidence: role-by-role decisions authored against canonical contracts.
// This is an audit migration helper, not a production metadata source or generator.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const previousPath = path.join(__dirname, 'relation-decisions.json');
const previous = fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath, 'utf8')) : null;
const agents = JSON.parse(read('agents.json')).agents.map(agent => ({
  ...agent,
  // Preserve original review positions after production catalog regeneration.
  skills: previous ? previous.relations.filter(r=>r.agent===agent.name && r.origin==='existing').map(r=>r.skill) : agent.skills,
}));
const skills = JSON.parse(read('skills.json')).skills;

// R = required; S = recommended; C = conditional; O = optional; X = removed.
// Positions explicitly cover every original relation in catalog order.
// No decision is inferred from a name, category, frequency, or default kind.
const matrix = `
accessibility-expert SCCO
accounting-controller SCX
agent-designer SCCC
agent-harness-optimizer COCC
ai-engineer CCCS
ai-safety-evaluator SSCC
analytics-engineer SCSC
api-contract-architect SCCC
api-documenter CCSS
application-security-engineer SSC SC
architect SCCC
architect-review SSCC
arm-cortex-expert XSCS
article-writer SCOC
audiovisual-localization-producer SOCCC
aws-solutions-architect SCCS
backend-architect SSCS
backend-developer SSCCS
backend-security-coder SCC C
bash-pro SXC
blockchain-developer SSCC
brand-strategist SCCC
browser-runtime-debugger SSCO
business-analyst CSCCC
business-intelligence-analyst SCCC
business-strategy-consultant SCXC
c-pro XSCS
c4-code SCO
c4-component SCC
c4-container SCO
c4-context SCX
casting-director SSCCO
change-management-consultant XCCO
chaos-engineer SSCC
cinematographer SSCCX
clinical-data-manager SCCX
clinical-evidence-reviewer SCCX
cloud-architect CCCS
cloud-security-engineer SCCC
cms-platform-engineer CCCCC
code-review-preshipment SS SC
code-reviewer SCCSC
codebase-onboarding-engineer OXSC
colorist SCCS
competitive-intelligence-analyst SCCC
compliance-auditor SXCC
conductor-validator SCOC
content-editor OCC C
content-marketer COSC
context-manager SSCO
copywriter CSCOCC
cpp-pro XSCS
creative-director CCSCC
csharp-pro XXSC
customer-success-manager CCOC
customer-support CXCC
data-engineer CCCS
data-governance-engineer SCCX
data-scientist CCCC
database-admin CCC C
database-architect SSCC
database-optimizer SCCS
debugger SCS
delivery-mastering-specialist SSC S
dependency-manager SSS C
deploy-with-verification SSCC
deployment-engineer SCCS
design-system-architect SSCC
developer-advocate SCCC
developer-tooling-engineer SSSC
devops-troubleshooter CCCS
django-pro S SCC
docs-architect SCC C
dotnet-architect CCXC
dx-optimizer SSCC
ecommerce-operations-manager SCCC
electron-pro SCSC S
elixir-pro XSCC
emergency-preparedness-coordinator XXXO
error-detective SS C
eval-judge SCO
eval-orchestrator SCSC
event-sourcing-architect CCC
experimentation-methodologist XCCX
fastapi-pro SCCC
finops-engineer CCCS
firmware-analyst CCS
first-assistant-director SCOCO
flutter-expert SS CX
fpa-analyst SCXC
frontend-developer SSCCS
frontend-security-coder CSCC
gallery-researcher CSCO
gis-analyst CCCS
golang-pro XSCC
grant-strategist SXCC
graphql-architect SCC
haskell-pro XSSC
health-information-manager SS CX
healthcare-compliance-specialist SXCX
hr-pro XOCC
hybrid-cloud-architect CCCS
identity-access-engineer SCCS
image-generator SS CX
implement SCSC S
incident-responder SS C
internationalization-engineer SCCC
ios-developer SCXC
it-service-manager SC CS
java-pro SSC C
javascript-pro SCCC
julia-pro XXSS
kubernetes-architect SCS C
learning-development-specialist XCCC
legacy-modernizer CSSS
legal-advisor SX CX
linux-systems-administrator SCCC
llm-platform-engineer CSSC
location-manager SSCCO
malware-analyst CCCS
market-researcher SCCC
marketing-measurement-specialist RSSCO
mcp-developer SCCS
media-accessibility-producer SSCCC
media-ingest-manager SSCS O
media-library-researcher SSCCO
mermaid-expert XSC
minecraft-bukkit-pro SSC C
ml-engineer CCCC
mlops-engineer SCSC
mobile-developer SCCC
mobile-release-engineer SSCC
mobile-security-coder SCCS
model-advisor SCCC
model-validation-specialist CCCC
monorepo-architect SCCS
motion-graphics-designer SCXXC
music-supervisor SCSOO
network-engineer CCSC
observability-engineer SSCC
operations-manager CCXO
orchestrate SSCS
paid-media-auditor SCCC
partnership-manager SCCX
patient-safety-officer SX CX
payment-integration CSCS
penetration-tester SCC
performance-engineer SCCS
php-pro XSCC
platform-engineer CSCC
playwright SS SC
policy-enforcer CCCO
posix-shell-pro SXC
powershell-pro SXCS
pricing-strategist CS CX
privacy-engineer SSCC
procurement-specialist SCCO
prod-logs-health-check SS C
product-manager CCSCC
product-spec-orchestrator CCRC SCCS
production-designer SXXCC
production-sound-mixer SCCSC
project-manager SRC SCC
prompt-crafter XCO
prompt-engineer SCXC
python-pro SSCC
qa SCCC
quant-analyst CCC
realtime-systems-engineer SCCS
receipt-verifier CCCS
refactoring-specialist SSS C
reference-builder SSC C
release-manager CCCS
revenue-operations-analyst SCCX
reverse-engineer CCSC
review-feedback-resolver CS SC
review-policy-author SC CC
risk-manager CCCX
ruby-pro XSCC
rust-pro XSCS
saas-platform-architect SSSC
sales-automator CCXC
sales-engineer CCCCS
scala-pro XCSC
screenwriter CCSOC
script-supervisor SSCCO
search-relevance-engineer CC CS
search-specialist SCO
security-auditor SCCC
seo-authority-builder SCXC
seo-cannibalization-detector SCCC
seo-content-auditor SCOC
seo-content-planner SCCC
seo-content-refresher SOC C
seo-content-writer SOSC
seo-keyword-strategist SCCC
seo-meta-optimizer CSCC
seo-snippet-hunter SCCC
seo-structure-architect CCS S
service-mesh-expert CSCC
session-end SOCO
session-start SC SO
social-publishing-publisher CCOX
software-license-compliance-engineer SCCX
sound-designer SCCCC
sql-pro SCCS
sre-engineer SCCC
startup-analyst SCCX
storyboard-artist SCXXX
tdd-orchestrator SCS S
team-debugger SCCC
team-implementer SC SC
team-lead SSSC
team-reviewer SSCC
technical-product-manager SSCS
technical-writer SCCS
temporal-python-pro SS SC
terraform-specialist SCCC
test-automator SCC
threat-detection-engineer SSCS
threat-intelligence-analyst SCCC
threat-modeling-expert CCCO
tutorial-engineer SC CO
typescript-pro SS SC
ui-designer CS SC
ui-ux-designer SC SC
ui-visual-validator SSCC
unity-developer XSXC
ux-researcher RCCCC
ux-writer SCCC
vector-database-engineer SSCC
vfx-supervisor SCCCC
video-director RSCCC
video-editor SSCCS
video-producer SCOCS
visual-continuity-supervisor SCCCC
windows-infrastructure-admin SCCC
`.trim().split('\n').map(line => {
  const [role, ...parts] = line.trim().split(/\s+/);
  return [role, parts.join('')];
});

// Purposes retain the owning Skill's actual boundary rather than a generic
// claim that any procedural text is mandatory for a capable independent role.
const purposes = {
  'answer-writing': 'a direct, clear, actionable customer-facing response with explicit next steps',
  'accessibility-testing': 'hands-on semantic, keyboard, screen-reader, and reflow validation',
  'agent-action-governance': 'explicit authority, tool-action policies, approval windows, and attributable receipts',
  'agent-creator-design': 'the canonical Agent metadata, four-part contract, and focused role templates',
  'agent-instructions-authoring': 'repository instruction authoring and scoped instruction-file ownership',
  'agent-introspection-debugging': 'trace-based diagnosis of routing, context, tool, and handoff failures',
  'agent-reach-ops': 'platform-specific source identity, timestamps, revisions, and transcript collection',
  'agents-sdk-development': 'OpenAI Agents SDK tools, handoffs, guardrails, and tracing',
  'ai-image-prompt-design': 'new image briefs expressed as composition, subject, lighting, and prompt variants',
  'ai-image-prompts-skill': 'adaptation of supplied image-prompt patterns and reusable variants',
  'ai-video-generation': 'model-aware clip generation, input contracts, parameters, and output evidence',
  'ai-video-prompting': 'shot intent, camera motion, temporal continuity, and generative-video prompts',
  'animation-best-practices': 'visible frontend interaction motion and reduced-motion behavior',
  'api-contract-design': 'versioned requests, responses, errors, pagination, and compatibility contracts',
  'api-contract-testing': 'provider-consumer compatibility and executable API contract checks',
  'api-doc-comments': 'verified code-level docstrings and exported API comments',
  'app-store-release': 'store-specific signing boundaries, submission metadata, and rollout readiness',
  'article-writing': 'an evidence-led long-form article with claim mapping and editorial structure',
  'ask-questions-if-underspecified': 'an explicitly requested question-first clarification workflow',
  'audio-generation': 'generation of non-speech music, sound effects, and ambience assets',
  'audio-transcription': 'speech extraction, speaker labeling, and source-linked transcript evidence',
  'auth-integration': 'session, OAuth or OIDC, callback, identity, and authorization boundaries',
  'aws-operations': 'AWS account, regional service, IAM, and workload-specific operational evidence',
  'baoyu-image-gen': 'provider-backed still-image creation with reference and output validation',
  'brand-voice': 'a source-derived tone, vocabulary, and messaging profile',
  'browser-automation': 'real-browser interaction, state inspection, and repeatable capture',
  'browser-compatibility-testing': 'a supported browser and viewport matrix with compatibility evidence',
  'chrome-devtools-debugging': 'console, network, DOM, storage, and runtime performance evidence',
  'code-change-workflow': 'pre-edit ownership, call-path, compatibility, and verification inspection',
  'code-refactoring': 'small structural changes that preserve characterized behavior',
  'code-review': 'risk-calibrated evidence, failure scenarios, severity, and an independent review verdict',
  'coding-standards': 'team-wide JavaScript, TypeScript, React, or Node conventions',
  'color-font-skill': 'web visual direction, typography, palette, and contrast choices',
  'context-governance': 'a compact authoritative context record with precedence and provenance',
  'dashboard-design': 'visible web dashboard hierarchy, states, comparisons, and drill-down design',
  'data-organization-system': 'a durable taxonomy, metadata, lifecycle, retention, and retrieval system',
  'data-pipeline-orchestration': 'idempotent data delivery, lineage, scheduling, quality gates, and recovery',
  'database-design': 'logical schemas, integrity constraints, access patterns, and migration design',
  'deployment-operations': 'mode-aware artifact, rollout, health, abort, and recovery evidence',
  'design-consultation': 'web interface visual direction before implementation',
  'design-system': 'durable visual tokens, observed style evidence, governance, and drift review',
  'design-system-patterns': 'token layers, frontend component variants, and theming architecture',
  'desktop-development': 'Electron main, preload, renderer, IPC, and window lifecycles',
  'docker-development': 'container build, image, Compose, healthcheck, and local runtime contracts',
  'domain-modeling': 'technology-neutral business language, identity, invariants, and ownership',
  'drawio-skill': 'editable draw.io diagrams and verified export artifacts',
  'e2e-testing-patterns': 'deterministic browser journeys, fixtures, selectors, and flakiness controls',
  'event-sourcing-cqrs': 'immutable event semantics, aggregate invariants, replay, and projections',
  'file-organizer': 'authorized, recoverable directory cleanup and duplicate handling',
  'flutter-development': 'Dart widgets, Flutter state, navigation, lifecycle, and platform validation',
  'frontend-code-review': 'frontend-specific state, browser, accessibility, and regression review',
  'frontend-design': 'the visible web implementation baseline and rendered user-state verification',
  'frontend-design-review': 'read-only interface usability, accessibility, and visual-quality evidence',
  'frontend-testing': 'React or TypeScript component and hook behavior tests',
  'git-operations': 'exact Git scope, current state, history, and safe repository operations',
  'git-readme-writer': 'repository-specific setup, usage, and README navigation',
  'github-actions-ci': 'GitHub Actions events, runners, permissions, artifacts, and quality gates',
  'github-code-review': 'GitHub PR baselines, checks, comments, and review-round evidence',
  'github-operations': 'authorized GitHub issues, PRs, checks, and release-state inspection',
  'humanizer': 'optional prose polishing that preserves the author and confirmed meaning',
  'i18n-localization': 'locale keys, plurals, Unicode, bidi, formatting, and fallback behavior',
  'image-utils': 'non-destructive deterministic crop, resize, conversion, and pixel inspection',
  'incident-response-postmortems': 'software-service incident evidence, recovery decisions, and corrective actions',
  'incremental-implementation': 'dependency-aware verified slices and reversible integration checkpoints',
  'interaction-patterns': 'web navigation, scrolling, focus, and transition interaction rules',
  'ios-architecture': 'native iOS module, lifecycle, state, persistence, and dependency boundaries',
  'java-development': 'the mandatory Java implementation owner and specialist-routing baseline',
  'java-testing': 'JUnit, Mockito, Testcontainers, and deterministic JVM regression evidence',
  'javascript-development': 'browser or Node JavaScript modules, async flow, cancellation, and errors',
  'jvm-build-tooling': 'Maven or Gradle wrappers, toolchains, dependency resolution, and builds',
  'kubernetes-operations': 'Kubernetes workload, namespace, rollout, RBAC, and health contracts',
  'legacy-frontend-modernization': 'incremental coexistence and migration of legacy web interfaces',
  'llm-evals': 'versioned LLM cases, rubrics, graders, baselines, and regression gates',
  'logging-patterns': 'stable event names, levels, structured fields, and secret-safe diagnostics',
  'logo-design': 'brand-mark briefs, simple concepts, and editable logo directions',
  'markdown-writer': 'clear GFM structure, source-preserving documentation, and links',
  'market-research': 'a dated market and audience evidence ledger leading to a decision memo',
  'mcp-creator-design': 'MCP capability boundaries, tools, resources, schemas, and integration tests',
  'mcp-ops': 'MCP discovery, configuration, authentication, and narrow tool calls',
  'mobile-app-testing': 'device, OS, lifecycle, permission, offline, and native accessibility checks',
  'mongodb-development': 'MongoDB document modeling, indexes, aggregation, and transaction behavior',
  'multi-session-planning': 'cross-session dependencies, ready work, decisions, and replanning triggers',
  'observability-engineering': 'service objectives, low-cardinality telemetry, diagnostics, and alert validation',
  'openai-api-development': 'OpenAI API input, output, tool, retry, streaming, and provider contracts',
  'openapi-spec-generation': 'a validated OpenAPI schema and implementation-contract drift checks',
  'pipeline-review': 'a serialized implementation-stage gate with an independently validated report',
  'playwright-automation': 'Playwright locators, isolated state, controlled waits, screenshots, and traces',
  'postgres-operations': 'PostgreSQL plans, locks, roles, backups, replication, and maintenance evidence',
  'presentation-ops': 'editable presentation decks with layout and render validation',
  'product-experimentation': 'predeclared hypotheses, assignment integrity, guardrails, and causal decision gates',
  'product-pitch-writing': 'an audience-specific pitch narrative grounded in verified product truth',
  'project-architecture-review': 'existing repository boundaries, dependency evidence, and incremental architecture decisions',
  'prompt-engineering': 'explicit prompt inputs, trust boundaries, reusable templates, and representative tests',
  'python-api-client-development': 'Python HTTP clients, auth, pagination, retries, and transport errors',
  'python-automation-scripting': 'Python CLI, filesystem, subprocess, batch, and idempotent automation',
  'python-backend-development': 'Python HTTP, framework, ORM, migration, and worker boundaries',
  'python-concurrency-patterns': 'Python task lifetimes, cancellation, bounded queues, and backpressure',
  'python-data-engineering': 'reproducible Python dataframe or dataset transformation with data checks',
  'python-development': 'the mandatory Python implementation owner and specialist-routing baseline',
  'python-observability-debugging': 'Python traceback, failure, hang, profiling, and root-cause evidence',
  'python-packaging-release': 'Python distribution metadata, artifacts, compatibility, and release evidence',
  'python-security-hardening': 'Python trust-boundary fixes for secrets, paths, subprocesses, and untrusted data',
  'python-testing-engineering': 'pytest or unittest tests, fixtures, regression plans, and deterministic evidence',
  'rag-vector-search': 'corpus lineage, chunking, retrieval, relevance, and access-aware evaluation',
  'react-native-expo': 'React Native or Expo state, navigation, native integration, and EAS contracts',
  'react-perf': 'React render, bundle, waterfall, and component-cost diagnosis',
  'react-ui-patterns': 'React loading, error, empty, optimistic, and concurrent UI states',
  'receiving-code-review': 'claim-by-claim review-feedback validation and scoped remediation evidence',
  'redis-upstash': 'Redis key, TTL, cache, pub/sub, queue, and rate-limit contracts',
  'remotion-video-toolkit': 'Remotion or React compositions, timing, captions, audio, and render validation',
  'repo-ready': 'stack-aware repository instructions, contribution commands, CI, and release hygiene',
  'requirements-deep-dive': 'a deliberate stakeholder decision interview for consequential unresolved choices',
  'responsive-design': 'complex web layout reflow, fluid sizing, breakpoints, and touch-target contracts',
  'reverse-engineering': 'authorized artifact provenance, static structure, and controlled analysis evidence',
  'security-code-review': 'exploit-path, trust-boundary, vulnerability-confidence, and remediation evidence',
  'security-scanning': 'authorized scanner configuration, baselines, result triage, and security quality gates',
  'service-mesh-engineering': 'mesh identity, traffic, mTLS, failure, telemetry, and adoption boundaries',
  'session-handoff': 'a compact evidence-linked continuation and current-state resumption check',
  'short-video-script': 'short social-video hooks, pacing, speech, captions, and calls to action',
  'skill-audit': 'package-level invocation, workflow, evidence, provenance, and safety review',
  'skill-lint': 'deterministic Skill identity, package, reference, and contract validation',
  'skillctl': 'platform-aware Skill discovery, installation, and CLI operation routing',
  'solution-discovery': 'proportionate alternatives, tradeoffs, and an explicit direction decision',
  'spec-flow': 'approved requirements converted into acceptance and dependency-aware implementation work',
  'specification-authoring': 'a formal technical Spec with the explicitly requested fixed document structure',
  'spreadsheet-ops': 'workbook or tabular input, formulas, units, calculation, and output validation',
  'spring-cloud-microservices': 'Spring-specific distributed configuration, messaging, resilience, and service boundaries',
  'sql-best-practices': 'SQL grain, null, join, parameterization, and query-plan correctness',
  'storyboard-creation': 'approved scene intent converted into shot IDs, timing, camera, audio, and continuity',
  'stripe-payments': 'Stripe Checkout, PaymentIntents, subscriptions, webhook, and idempotency contracts',
  'subagent-architecture': 'focused delegation, exclusive ownership, dependency gates, and verified fan-in',
  'subtitle-captions': 'same-language caption authoring, timing, conversion, and caption QC',
  'summary-ops': 'faithful condensation of supplied source text with preserved uncertainty and attribution',
  'swift-concurrency': 'Swift task ownership, actor isolation, cancellation, and Sendable boundaries',
  'swiftui-development': 'native SwiftUI states, view identity, navigation, and platform behavior',
  'systematic-debugging': 'a reproduced failure, competing hypotheses, and the smallest proven cause',
  'temporal-workflow-engineering': 'deterministic durable workflows, activities, retries, replay, and versioning',
  'terminal-ops': 'exact commands, repository state, scoped execution, and reproducible verification',
  'terraform-infrastructure': 'Terraform or OpenTofu modules, provider state, plans, and safe infrastructure review',
  'test-driven-development': 'the RED-GREEN-REFACTOR cycle required by the TDD role contract',
  'testing-strategy': 'risk-based test levels, fixtures, boundaries, and meaningful coverage',
  'text-to-speech': 'authorized synthetic speech, voice selection, timing, and voiceover evidence',
  'threat-modeling': 'assets, actors, data flows, abuse cases, mitigations, and residual-risk ownership',
  'todo-first': 'a live runtime-neutral dependency plan and evidence-linked progress tracking',
  'typescript-development': 'TypeScript source, compiler configuration, strict contracts, and typed APIs',
  'ux-research': 'ethical research protocols, recruitment safeguards, observation, and traceable synthesis',
  'ux-writing': 'clear interface labels, instructions, error states, and truthful user guidance',
  'verification-before-completion': 'acceptance-to-evidence coverage and fresh verification before a completion claim',
  'video-edit': 'existing-footage inspection, local editing, controlled transcodes, and media verification',
  'video-production-workflow': 'the canonical production artifacts, stage gates, accepted lineage, and sequential fallback',
  'visual-regression-testing': 'reproducible screenshot comparisons, baselines, matrices, and fidelity evidence',
  'vulnerability-variant-analysis': 'authorized known-vulnerability seeds, family predicates, variant coverage, and regressions',
  'web-research-ops': 'current primary sources, dates, contradictions, and attributable evidence',
  'webapp-testing': 'local web-app journey verification with browser logs and capture evidence',
  'word-document-ops': 'DOCX formatting, tracked changes, tables, and validated editable output',
  'wordpress-development': 'WordPress hooks, extensions, content, migrations, backup, and staged-release safeguards',
  'workspace-google-ops': 'explicitly authorized Google Workspace CLI inputs and account-scoped operations',
};

const conditions = {
  'accessibility-testing': 'The requested evidence includes implemented web or mobile accessibility behavior.',
  'agent-action-governance': 'The scope includes AI tool-action policy, approval windows, signed receipts, or execution handoffs.',
  'agent-creator-design': 'The work changes an Agent contract rather than only discovery or installation behavior.',
  'agent-instructions-authoring': 'The work includes repository-level instruction files or shared agent guidance.',
  'agent-introspection-debugging': 'Runtime traces show routing, context, tool, or handoff divergence.',
  'agent-reach-ops': 'Evidence must be collected from platform-specific social, transcript, code-hosting, or RSS surfaces.',
  'agents-sdk-development': 'The application uses the OpenAI Agents SDK.',
  'ai-image-prompt-design': 'The approved work requires new prompts for generated still assets or storyboard panels.',
  'ai-image-prompts-skill': 'The user supplies or chooses an image-prompt pattern to adapt.',
  'ai-video-generation': 'An authorized production stage generates or reviews new AI video clips.',
  'ai-video-prompting': 'The selected production path needs generative-video prompts or prompt review.',
  'api-contract-design': 'The work defines or changes consumer-visible API, event, or webhook contracts.',
  'api-contract-testing': 'Provider-consumer API compatibility needs executable checks.',
  'api-doc-comments': 'The requested artifact includes code-level API comments or docstrings.',
  'app-store-release': 'The task includes mobile store submission, staged rollout, or release-readiness requirements.',
  'ask-questions-if-underspecified': 'The user explicitly requests clarification before substantive work.',
  'audio-generation': 'The approved sound or music plan calls for generated non-speech assets.',
  'audio-transcription': 'Raw audio or video speech needs extraction and no accepted matching transcript exists.',
  'auth-integration': 'Authentication, session, identity federation, or authorization integration is in scope.',
  'aws-operations': 'The selected provider or affected workload is AWS.',
  'brand-voice': 'A specific organization or creator voice must be derived from supplied evidence or applied.',
  'browser-automation': 'The evidence requires an authorized real-browser interaction or capture.',
  'browser-compatibility-testing': 'Supported browser differences or a cross-browser release matrix are in scope.',
  'code-review': 'The verification target includes software source or a code change.',
  'coding-standards': 'The task defines or audits team-wide JavaScript, TypeScript, React, or Node conventions.',
  'color-font-skill': 'The approved visual work concerns a web interface palette or typography.',
  'context-governance': 'Durable context, shared decisions, or context-budget behavior needs governance.',
  'dashboard-design': 'The requested deliverable includes a visible web dashboard rather than only an analytical report.',
  'data-organization-system': 'The scope designs a reusable taxonomy, metadata, retention, or retrieval system beyond one report.',
  'data-pipeline-orchestration': 'Governed transformations, scheduling, lineage, or repeatable data delivery are in scope.',
  'database-design': 'Schema, persistent data integrity, storage ownership, or migration design is in scope.',
  'deployment-operations': 'An environment promotion, artifact rollout, or recovery plan is part of the authorized mode.',
  'design-consultation': 'The requested design direction or research handoff concerns a web interface.',
  'design-system-patterns': 'The system includes frontend tokens, component variants, or theming infrastructure.',
  'desktop-development': 'The affected desktop application is Electron.',
  'docker-development': 'The chosen build or runtime path uses Docker or Compose.',
  'domain-modeling': 'Ambiguous terminology, invariants, ownership, or lifecycle would change the decision or contract.',
  'drawio-skill': 'The requested diagram deliverable must be editable in draw.io or exported from draw.io.',
  'e2e-testing-patterns': 'The task covers browser end-to-end user journeys.',
  'event-sourcing-cqrs': 'The approved design uses immutable events, replay, or CQRS read models.',
  'file-organizer': 'A separately authorized cleanup or reorganization is needed beyond non-destructive ingest.',
  'flutter-development': 'The affected application uses Flutter and Dart.',
  'frontend-code-review': 'The reviewed diff contains frontend code or browser-facing state contracts.',
  'frontend-design': 'The task defines an implementation handoff for visible web UI; a write-capable owner executes changes.',
  'frontend-design-review': 'An implemented web surface needs independent UX, accessibility, or visual evidence.',
  'frontend-testing': 'The task covers React or TypeScript component or hook tests.',
  'git-operations': 'The work uses Git history, a repository diff, or an explicitly authorized Git operation.',
  'git-readme-writer': 'The requested documentation is a repository README.',
  'github-actions-ci': 'The affected delivery or enforcement platform is GitHub Actions.',
  'github-code-review': 'The review baseline or feedback is a GitHub pull request.',
  'github-operations': 'GitHub issue, PR, check, or release-state evidence is part of the requested scope.',
  'i18n-localization': 'The task includes locale resources, translated text, plurals, bidi, or locale-aware formatting.',
  'image-utils': 'The authorized work needs deterministic still-image operations or pixel-level inspection.',
  'incident-response-postmortems': 'The scope includes a software-service incident, operational recovery, or postmortem.',
  'incremental-implementation': 'The change spans risky boundaries or needs independently verified reversible slices.',
  'interaction-patterns': 'The task designs or evaluates web navigation, scroll, focus, or transition behavior.',
  'ios-architecture': 'Native iOS architecture or lifecycle ownership needs design or review.',
  'java-testing': 'The affected JVM work includes Java test design, implementation, or JUnit evidence.',
  'javascript-development': 'The affected code or diagnostic evidence uses browser or Node JavaScript.',
  'jvm-build-tooling': 'The project uses Maven or Gradle and build or dependency behavior is in scope.',
  'kubernetes-operations': 'The selected platform or affected workload uses Kubernetes.',
  'legacy-frontend-modernization': 'The legacy system includes a web frontend with coexistence or framework-migration concerns.',
  'llm-evals': 'The model under evaluation is an LLM or an LLM-backed application.',
  'logging-patterns': 'The work writes, reviews, or correlates structured application logs.',
  'logo-design': 'The user requests a logo or brand-mark asset.',
  'markdown-writer': 'The requested artifact is Markdown or GFM documentation.',
  'market-research': 'A market, audience, competitor, positioning, or launch decision needs a dated research memo.',
  'mcp-ops': 'The task includes MCP server discovery, configuration, authentication, or authorized tool calls.',
  'mobile-app-testing': 'The supported product target includes Android or iOS device behavior.',
  'mongodb-development': 'The selected or affected database is MongoDB.',
  'multi-session-planning': 'The delivery dependencies and decisions extend beyond one verified session.',
  'observability-engineering': 'Service objectives, telemetry, operational diagnostics, or monitoring design are in scope.',
  'openai-api-development': 'The selected model provider or affected integration is OpenAI.',
  'openapi-spec-generation': 'The API uses OpenAPI or the requested handoff includes a formal OpenAPI specification.',
  'pipeline-review': 'The review is an explicit implementation-stage or release gate with a persisted report.',
  'postgres-operations': 'The selected or affected database is PostgreSQL.',
  'presentation-ops': 'The requested input or deliverable is an editable slide deck.',
  'product-experimentation': 'The decision needs a controlled product experiment or its assignment and telemetry evidence.',
  'product-pitch-writing': 'The requested asset is a timed product pitch, demo narrative, or presentation script.',
  'project-architecture-review': 'Existing repository architecture, module boundaries, or a migration decision is in scope.',
  'python-api-client-development': 'The affected Python code consumes an external HTTP API or SDK.',
  'python-automation-scripting': 'The affected implementation is Python CLI, filesystem, subprocess, or batch automation.',
  'python-backend-development': 'The affected Python code owns server-side request, framework, ORM, or worker behavior.',
  'python-concurrency-patterns': 'The affected Python design owns task lifetime, cancellation, queues, or backpressure.',
  'python-data-engineering': 'The analysis or pipeline implements dataset transformations in Python.',
  'python-development': 'The affected code, runtime contract, or diagnostic evidence is Python.',
  'python-observability-debugging': 'The performance or failure evidence is a Python traceback, hang, profile, or memory issue.',
  'python-packaging-release': 'The task changes Python packaging or validates distribution and release artifacts.',
  'python-security-hardening': 'The implementation changes a security-sensitive Python trust boundary.',
  'python-testing-engineering': 'The requested evidence includes Python tests, fixtures, regressions, or a Python test plan.',
  'rag-vector-search': 'The selected design uses retrieval, embeddings, RAG, or a vector index.',
  'react-native-expo': 'The affected mobile application uses React Native or Expo.',
  'react-perf': 'The affected slow surface is React and render, bundle, or waterfall evidence is available.',
  'react-ui-patterns': 'The affected web interface uses React and its component-state contracts.',
  'redis-upstash': 'The approved transport, cache, queue, or rate-limit path uses Redis or Upstash.',
  'remotion-video-toolkit': 'The selected composition or render path is Remotion or React video.',
  'repo-ready': 'Repository-wide contributor, quality, or release hygiene is included in the approved scope.',
  'requirements-deep-dive': 'Several consequential unresolved choices require an explicit stakeholder decision interview.',
  'responsive-design': 'The web deliverable needs complex responsive layout or reflow guidance.',
  'security-code-review': 'The scope includes a code-level trust boundary, exploitable path, or security review.',
  'security-scanning': 'Authorized automated scanner configuration, existing scan evidence, or quality-gate triage is needed.',
  'session-handoff': 'Ownership or work must continue across an Agent, tool, or session boundary.',
  'short-video-script': 'The requested narrative is a short social-video script.',
  'skill-audit': 'A Skill package needs semantic, provenance, workflow, or safety assessment.',
  'skill-lint': 'The installation or discovery issue involves deterministic Skill metadata, package, or reference validation.',
  'solution-discovery': 'The intended outcome is known but viable approaches or direction remain undecided.',
  'spec-flow': 'The accountable owner has approved a direction and needs dependency-aware implementation work.',
  'specification-authoring': 'The user explicitly requests a formal technical Spec with the prescribed document structure.',
  'spreadsheet-ops': 'The primary source or requested output is a workbook or tabular calculation artifact.',
  'spring-cloud-microservices': 'The affected event or distributed-service architecture uses Spring Cloud or Spring Boot.',
  'sql-best-practices': 'The requested evidence or implementation includes SQL queries and their data semantics.',
  'stripe-payments': 'The payment integration uses Stripe.',
  'storyboard-creation': 'An approved audiovisual concept needs shot planning, timing, or storyboard handoff.',
  'subagent-architecture': 'The proposed Agent participates in a delegated team with ownership, dependencies, or handoff contracts.',
  'subtitle-captions': 'The approved deliverable needs caption authoring, timing, conversion, or caption QC.',
  'summary-ops': 'Supplied text, records, or an accepted transcript needs faithful condensation before analysis or writing.',
  'swift-concurrency': 'The native iOS task changes Swift concurrency, isolation, cancellation, or task ownership.',
  'swiftui-development': 'The affected native iOS interface uses SwiftUI.',
  'terminal-ops': 'The task needs exact command output, current repository state, or executable verification.',
  'terraform-infrastructure': 'The chosen infrastructure contract uses Terraform or OpenTofu.',
  'testing-strategy': 'The deliverable includes software test design, coverage analysis, or regression proof.',
  'text-to-speech': 'The approved production needs generated speech or voiceover with appropriate consent.',
  'threat-modeling': 'The scope maps architecture or intelligence evidence into actionable threat and mitigation models.',
  'typescript-development': 'The affected source or compiler contract is TypeScript.',
  'ux-writing': 'The requested copy is interface microcopy or an explicitly identified product state.',
  'video-edit': 'Existing media needs local inspection, frame extraction, editing, transcoding, or delivery QC.',
  'vulnerability-variant-analysis': 'A credible authorized vulnerability seed calls for related-instance or fix-family analysis.',
  'web-research-ops': 'Current external facts, primary requirements, or source contradictions need verification.',
  'webapp-testing': 'The investigated behavior belongs to a local web application with a reproducible journey.',
  'word-document-ops': 'The requested input or output is a formatted DOCX document.',
  'wordpress-development': 'The affected CMS is WordPress and its code, content, migration, or runtime surface is in scope.',
  'workspace-google-ops': 'The approved scope explicitly uses Google Workspace CLI automation and authorized account data.',
};

// New owner links correct omissions found in the contracts and Skill inventory.
const additions = {
  'accessibility-expert': [['accessibility-testing', 'S']],
  'agent-harness-optimizer': [['skillctl', 'S'], ['skill-lint', 'C'], ['agent-introspection-debugging', 'C']],
  'article-writer': [['article-writing', 'S'], ['brand-voice', 'C']],
  'backend-developer': [['testing-strategy', 'S'], ['api-contract-testing', 'C']],
  'browser-runtime-debugger': [['systematic-debugging', 'S']],
  'brand-strategist': [['brand-voice', 'S'], ['market-research', 'S']],
  'business-strategy-consultant': [['market-research', 'S']],
  'c-pro': [['code-change-workflow', 'S']],
  'cpp-pro': [['code-change-workflow', 'S']],
  'csharp-pro': [['code-change-workflow', 'S']],
  'competitive-intelligence-analyst': [['market-research', 'S']],
  'cms-platform-engineer': [['code-change-workflow', 'S']],
  'creative-director': [['brand-voice', 'S']],
  'customer-support': [['answer-writing', 'S']],
  'data-engineer': [['data-pipeline-orchestration', 'S']],
  'data-scientist': [['product-experimentation', 'C'], ['testing-strategy', 'S']],
  'debugger': [['systematic-debugging', 'S']],
  'django-pro': [['python-development', 'S']],
  'dotnet-architect': [['project-architecture-review', 'S']],
  'elixir-pro': [['code-change-workflow', 'S']],
  'emergency-preparedness-coordinator': [['web-research-ops', 'S']],
  'event-sourcing-architect': [['event-sourcing-cqrs', 'S'], ['domain-modeling', 'S']],
  'experimentation-methodologist': [['product-experimentation', 'S']],
  'fastapi-pro': [['python-development', 'S'], ['python-testing-engineering', 'S']],
  'firmware-analyst': [['reverse-engineering', 'S']],
  'golang-pro': [['code-change-workflow', 'S']],
  'haskell-pro': [['code-change-workflow', 'S']],
  'hr-pro': [['word-document-ops', 'C']],
  'image-generator': [['logo-design', 'C']],
  'ios-developer': [['ios-architecture', 'S'], ['swift-concurrency', 'C'], ['swiftui-development', 'C']],
  'julia-pro': [['code-change-workflow', 'S']],
  'legal-advisor': [['word-document-ops', 'C']],
  'malware-analyst': [['reverse-engineering', 'S']],
  'market-researcher': [['market-research', 'S']],
  'ml-engineer': [['testing-strategy', 'S']],
  'model-validation-specialist': [['product-experimentation', 'C']],
  'php-pro': [['code-change-workflow', 'S']],
  'product-manager': [['solution-discovery', 'S'], ['market-research', 'C']],
  'prompt-crafter': [['prompt-engineering', 'S']],
  'prompt-engineer': [['prompt-engineering', 'S']],
  'receipt-verifier': [['verification-before-completion', 'S']],
  'review-feedback-resolver': [['receiving-code-review', 'S']],
  'reverse-engineer': [['reverse-engineering', 'S']],
  'ruby-pro': [['code-change-workflow', 'S']],
  'rust-pro': [['code-change-workflow', 'S']],
  'scala-pro': [['code-change-workflow', 'S']],
  'service-mesh-expert': [['service-mesh-engineering', 'S']],
  'session-end': [['session-handoff', 'S']],
  'session-start': [['session-handoff', 'S']],
  'social-publishing-publisher': [['brand-voice', 'S']],
  'startup-analyst': [['market-research', 'S'], ['product-experimentation', 'C']],
  'storyboard-artist': [['ai-image-prompt-design', 'C']],
  'tdd-orchestrator': [['test-driven-development', 'S']],
  'temporal-python-pro': [['temporal-workflow-engineering', 'S']],
  'threat-modeling-expert': [['threat-modeling', 'S']],
  'unity-developer': [['code-change-workflow', 'S']],
};

const overrides = {
  'api-contract-architect:openapi-spec-generation': 'An OpenAPI document is requested; the read-only role proposes and validates contracts without generating clients.',
  'api-documenter:api-contract-design': 'The documentation audit finds an ambiguous contract that needs a separately approved design decision.',
  'backend-security-coder:python-security-hardening': 'The confirmed vulnerable implementation is Python.',
  'code-reviewer:security-code-review': 'The review risk profile identifies a concrete security-sensitive path needing specialist exploitability assessment.',
  'frontend-security-coder:auth-integration': 'The confirmed browser risk involves authentication, session, callback, or client identity integration.',
  'frontend-security-coder:frontend-code-review': 'The repaired frontend diff needs a separate browser-state and regression review.',
  'gallery-researcher:design-consultation': 'The visual-reference brief specifically concerns web interface visual direction.',
  'health-information-manager:agent-action-governance': 'The reviewed release or retention workflow uses AI tool-action controls or attributable approval receipts.',
  'mcp-developer:mcp-ops': 'A host integration needs discovery, authentication, configuration, or an explicitly authorized MCP call.',
  'media-accessibility-producer:accessibility-testing': 'The plan includes verification of the implemented player or interface; media alternatives alone do not activate UI testing.',
  'model-validation-specialist:python-testing-engineering': 'The supplied validation evidence includes Python tests or a requested Python test plan; independent review remains read-only.',
  'performance-engineer:react-perf': 'The measured bottleneck is in an affected React application.',
  'product-spec-orchestrator:ask-questions-if-underspecified': 'The user explicitly requests a question-first intake before product discovery.',
  'product-spec-orchestrator:requirements-deep-dive': 'Several consequential product choices require a deliberate stakeholder decision interview.',
  'review-feedback-resolver:github-code-review': 'The feedback being resolved belongs to a GitHub pull request.',
  'security-auditor:security-scanning': 'Authorized scan results or a permitted scanner are needed as evidence; findings remain independently validated.',
  'seo-content-planner:specification-authoring': 'The commissioned deliverable explicitly includes a formal technical Spec; ordinary editorial briefs do not qualify.',
  'seo-structure-architect:project-architecture-review': 'The site architecture decision affects repository module, route, dependency, or migration boundaries.',
  'ui-designer:frontend-design': 'A visible web implementation handoff is requested; a separate write-capable owner performs the implementation.',
  'ui-ux-designer:frontend-design': 'The read-only design produces acceptance guidance for a visible web implementation owner.',
};

const requiredReasons = {
  'marketing-measurement-specialist:product-experimentation': 'Task 1 explicitly calls product-experimentation to define assignment, exposure, metric, and acceptance contracts; its measurement evidence must preserve that shared contract.',
  'product-spec-orchestrator:solution-discovery': 'Task 4 explicitly runs solution discovery to frame alternatives and record the direction decision before specification or implementation handoff.',
  'project-manager:spec-flow': 'Task 2 explicitly uses spec flow to decompose the approved initiative into acceptance-backed work and dependency gates.',
  'ux-researcher:ux-research': 'Task 1 explicitly uses ux-research to define the ethical protocol, research questions, participant criteria, and evidence thresholds.',
  'video-director:video-production-workflow': 'The Constraints and Output explicitly require the canonical video-production-workflow artifact contracts and sequential fallback when subagents are unavailable.',
};

function removedReason(agent, skill) {
  if (skill === 'coding-standards') return 'This Skill owns team-wide JS, TS, React, and Node conventions, not the role\'s primary language or platform.';
  if (skill === 'specification-authoring') return 'The role produces domain evidence or ordinary documents, not the fixed-format formal technical Spec owned by this Skill.';
  if (skill === 'desktop-development') return 'This Skill is Electron-specific; native .NET architecture or C# implementation does not imply Electron.';
  if (skill === 'python-automation-scripting') return 'Shell implementation is not Python automation; a Python port would be a different explicitly selected task.';
  if (['animation-best-practices','responsive-design','design-consultation','color-font-skill'].includes(skill)) return 'This Skill owns visible web UI behavior or direction rather than the role\'s cinematic, native, or production-world contract.';
  if (agent === 'codebase-onboarding-engineer') return 'The onboarding contract explicitly excludes editing and unsolicited change plans.';
  if (agent === 'julia-pro') return 'Julia numerical work does not activate the Python dataset-transformation owner.';
  if (agent === 'unity-developer') return 'Service telemetry design is not the Unity scene, frame, allocation, and player-profile contract.';
  if (agent === 'mermaid-expert') return 'The role produces Mermaid source; draw.io authoring is a separate diagram format and owner.';
  if (skill === 'testing-strategy') return 'Software test levels and fixtures do not own clinical preparedness exercises or statistical experiment validity.';
  if (skill === 'incident-response-postmortems') return 'Software-service incident response does not own patient-safety or all-hazards clinical preparedness review.';
  if (skill === 'dashboard-design') return 'The read-only analyst reports CRM evidence; this Skill implements visible web dashboard UI.';
  if (skill === 'ux-writing') return 'Interface microcopy does not own customer-support replies, sales outreach, or social publishing text.';
  if (skill === 'security-code-review') return 'The role reviews professional obligations and evidence, not source-code exploitability.';
  if (skill === 'git-readme-writer') return 'Repository README authoring does not own public-web SEO authority strategy.';
  throw new Error('A removal needs an authored reason: '+agent+':'+skill);
}

const kindNames = { R: 'required', S: 'recommended', C: 'conditional', O: 'optional' };
const byRole = new Map(matrix);
if (byRole.size !== agents.length || matrix.length !== agents.length) throw new Error('Decision matrix must uniquely cover all roles.');
const evidence = [];
const agentContracts = [];
const plannedChanges = [];
const skillHashes = Object.fromEntries(skills.map(s => [s.name, hash(read('skills/'+s.name+'/SKILL.md'))]));
for (const agent of agents) {
  const decisions = byRole.get(agent.name);
  if (!decisions || decisions.length !== agent.skills.length || /[^RSCOX]/.test(decisions)) throw new Error('Incomplete decisions for '+agent.name+': '+decisions+' / '+agent.skills.length);
  const source = read(agent.path);
  const contract = source.split(/^---\s*$/m).slice(2).join('---');
  const dependencies = [];
  const reviewed = agent.skills.map((name, index) => [name, decisions[index], 'existing']);
  reviewed.push(...(additions[agent.name] || []).map(([name, decision]) => [name, decision, 'added']));
  const seen = new Set();
  for (const [name, decision, origin] of reviewed) {
    if (seen.has(name)) throw new Error('Duplicate relation '+agent.name+':'+name);
    seen.add(name);
    if (!skillHashes[name]) throw new Error('Unknown Skill '+name);
    const removed = decision === 'X';
    if (!removed && !purposes[name]) throw new Error('Missing authored purpose '+name);
    const kind = removed ? 'removed' : kindNames[decision];
    if (decision === 'R' && !requiredReasons[agent.name+':'+name]) throw new Error('A hard dependency needs a contract-level reason: '+agent.name+':'+name);
    const reason = removed ? removedReason(agent.name, name) : decision === 'R' ? requiredReasons[agent.name+':'+name] : (decision === 'O' ? 'An opt-in extension of '+agent.name+' provides ' : 'Supports '+agent.name+' with ')+purposes[name]+'.';
    const when = decision === 'C' ? overrides[agent.name+':'+name] || conditions[name] : undefined;
    if (decision === 'C' && !when) throw new Error('Missing condition '+agent.name+':'+name);
    const item = { name, kind, reason };
    if (when) item.when = when;
    if (!removed) dependencies.push(item);
    evidence.push({ agent: agent.name, skill: name, origin, decision: kind, reason, ...(when ? {when} : {}), agentPath: agent.path, skillPath: 'skills/'+name+'/SKILL.md', agentContractSha256: hash(contract), skillSha256: skillHashes[name] });
  }
  const block = 'skill-dependencies:'+ (dependencies.length ? '\n'+dependencies.map(d => '  - name: '+d.name+'\n    kind: '+d.kind+'\n    reason: '+JSON.stringify(d.reason)+(d.when ? '\n    when: '+JSON.stringify(d.when) : '')).join('\n') : ' []');
  const next = source.replace(/^skills:\r?\n(?:  - [^\r\n]*\r?\n)+/m, block+'\n').replace(/^skill-dependencies:\r?\n(?:[ \t]+[^\r\n]*\r?\n)+/m, block+'\n');
  if (!/^skill-dependencies:/m.test(next) || /^skills:/m.test(next)) throw new Error('Migration failed '+agent.name);
  if (hash(next.split(/^---\s*$/m).slice(2).join('---')) !== hash(contract)) throw new Error('Body changed '+agent.name);
  agentContracts.push({agent: agent.name, path: agent.path, permission: agent.permission, sectionsReviewed: ['Role','Task','Constraints','Output'], contractSha256: hash(contract), originalRelations: agent.skills.length, retainedRelations: dependencies.length, required: dependencies.filter(d=>d.kind==='required').length, decisionStatus: 'reviewed'});
  plannedChanges.push([path.join(root,agent.path), next]);
}
for (const [destination, content] of plannedChanges) fs.writeFileSync(destination, content, 'utf8');
fs.writeFileSync(path.join(__dirname,'relation-decisions.json'), JSON.stringify({version:1, baseline:'26d01851f1a000ad71f3c003bbe36f71e0397cfe', method:'Explicit per-role decision matrix checked against canonical Role, Task, Constraints, Output and repository Skill owner boundaries; full-text follow-up for ambiguous ownership.', agents:agentContracts, relations:evidence}, null, 2)+'\n');
const counts = Object.fromEntries(['required','recommended','conditional','optional','removed'].map(k => [k,evidence.filter(d=>d.decision===k).length]));
console.log(JSON.stringify({reviewedAgents: agentContracts.length, reviewedExistingRelations:evidence.filter(d=>d.origin==='existing').length, additions:evidence.filter(d=>d.origin==='added').length, counts, independentWithoutRequired:agentContracts.filter(a=>!a.required).length},null,2));
