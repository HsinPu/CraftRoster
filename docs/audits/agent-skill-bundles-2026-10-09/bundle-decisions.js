// Audit record for the authored initial 15-use taxonomy. Production ownership
// remains scripts/data/install-bundles.json; this helper is migration evidence.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const agents = JSON.parse(fs.readFileSync(path.join(root,'agents.json'),'utf8')).agents;
const skills = JSON.parse(fs.readFileSync(path.join(root,'skills.json'),'utf8')).skills;
const words = text => text.trim().split(/\s+/).filter(Boolean);
const definitions = [
  ['image-graphics', '畫圖與圖像處理',
   'Still-image generation, image prompts, visual references, logos, and deterministic image processing.',
   `image-generator gallery-researcher`,
   `ai-image-prompt-design ai-image-prompts-skill baoyu-image-gen image-utils logo-design stable-diffusion-image-generation`],
  ['software-development', '程式開發',
   'General software implementation, language and backend engineering, architecture, refactoring, and version control.',
   `api-contract-architect architect architect-review backend-architect backend-developer bash-pro blockchain-developer c-pro cms-platform-engineer cpp-pro csharp-pro debugger dependency-manager developer-tooling-engineer django-pro dotnet-architect elixir-pro event-sourcing-architect fastapi-pro golang-pro graphql-architect haskell-pro implement internationalization-engineer java-pro javascript-pro julia-pro legacy-modernizer minecraft-bukkit-pro monorepo-architect payment-integration php-pro posix-shell-pro powershell-pro python-pro realtime-systems-engineer refactoring-specialist reverse-engineer ruby-pro rust-pro saas-platform-architect scala-pro temporal-python-pro team-implementer typescript-pro`,
   `code-change-workflow code-refactoring coding-standards domain-modeling git-advanced git-operations i18n-localization incremental-implementation java-architecture java-development javascript-development jquery-4-migration jquery-development jquery-version-migration jvm-build-tooling karpathy-guidelines logging-patterns project-architecture-review python-automation-scripting python-concurrency-patterns python-development python-packaging-release typescript-development api-contract-design auth-integration python-api-client-development python-backend-development jpa-hibernate-development mybatis-development spring-development spring-security spring-cloud-microservices spring-webflux temporal-workflow-engineering event-sourcing-cqrs stripe-payments wordpress-development throwaway-prototyping verified-software-delivery autoresearch`],
  ['web-interface', '網頁與介面設計',
   'Web UI implementation, design systems, interaction, accessibility, localization, and design-to-code workflows.',
   `accessibility-expert design-system-architect frontend-developer frontend-security-coder internationalization-engineer ui-designer ui-ux-designer ui-visual-validator ux-researcher ux-writer browser-runtime-debugger`,
   `animation-best-practices color-font-skill command-palette css-development dashboard-design design-consultation design-system design-system-patterns design-intelligence-search figma-to-code frontend-design frontend-stack-inference hotkey image-to-code image-to-code-assets interaction-patterns legacy-frontend-modernization lobe-icons-usage lobe-ui-development nextjs-development nuxt-development pinia-state-management react-ui-patterns responsive-design shadcn-ui tailwind-development tailwind-patterns taste-skill ui-styling vite vue-composition-api vue-development vue-router-patterns web-page-design-to-code website-redesign-to-code javascript-development typescript-development i18n-localization ux-writing accessibility-testing`],
  ['testing-review', '測試與程式審查',
   'Risk-based software testing, failure diagnosis, code review, visual regression, and evidence-based completion gates.',
   `accessibility-expert browser-runtime-debugger code-review-preshipment code-reviewer debugger performance-engineer playwright qa receipt-verifier review-feedback-resolver review-policy-author tdd-orchestrator team-debugger team-reviewer test-automator ui-visual-validator`,
   `accessibility-testing api-contract-testing browser-compatibility-testing chrome-devtools-debugging code-review e2e-testing-patterns frontend-code-review frontend-design-review frontend-testing github-code-review github-inline-review java-testing mobile-app-testing pipeline-review python-observability-debugging python-testing-engineering react-perf receiving-code-review swift-testing systematic-debugging test-driven-development testing-strategy verification-before-completion visual-regression-testing vue-debug-guides vue-testing webapp-testing autoresearch`],
  ['data-analysis', '資料庫與資料分析',
   'Database design and operations, governed data pipelines, analytics, geospatial processing, and model-data validation.',
   `analytics-engineer business-intelligence-analyst data-engineer data-governance-engineer data-scientist database-admin database-architect database-optimizer experimentation-methodologist gis-analyst quant-analyst revenue-operations-analyst search-relevance-engineer sql-pro vector-database-engineer`,
   `database-design database-migration-workflow data-pipeline-orchestration firebase-development mongodb-development postgres-operations prisma-drizzle python-data-engineering redis-upstash sql-best-practices supabase-development product-experimentation spreadsheet-ops`],
  ['ai-llm', 'AI與LLM',
   'LLM and ML application contracts, prompts, retrieval, model advice, safety evaluation, and reproducible evaluation.',
   `ai-engineer ai-safety-evaluator eval-judge eval-orchestrator llm-platform-engineer ml-engineer mlops-engineer model-advisor model-validation-specialist prompt-crafter prompt-engineer search-relevance-engineer vector-database-engineer`,
   `agents-sdk-development llm-application-delivery-workflow llm-evals openai-api-development prompt-engineering rag-vector-search autoresearch`],
  ['cloud-operations', '雲端部署與維運',
   'Cloud and host architecture, containers, infrastructure as code, delivery pipelines, observability, and reliability.',
   `aws-solutions-architect chaos-engineer cloud-architect database-admin deploy-with-verification deployment-engineer devops-troubleshooter dx-optimizer error-detective finops-engineer hybrid-cloud-architect incident-responder it-service-manager kubernetes-architect linux-systems-administrator llm-platform-engineer mlops-engineer network-engineer observability-engineer platform-engineer prod-logs-health-check service-mesh-expert sre-engineer terraform-specialist windows-infrastructure-admin`,
   `aws-operations cloudflare-development deployment-operations docker-development github-actions-ci github-operations incident-response-postmortems kubernetes-operations observability-engineering repo-ready service-mesh-engineering terminal-ops terraform-infrastructure vercel-deployment`],
  ['security-governance', '資安與治理',
   'Security engineering, authorized assessment, threat analysis, privacy, control readiness, and professional governance.',
   `application-security-engineer backend-security-coder cloud-security-engineer compliance-auditor firmware-analyst frontend-security-coder health-information-manager healthcare-compliance-specialist identity-access-engineer legal-advisor malware-analyst mobile-security-coder penetration-tester policy-enforcer privacy-engineer reverse-engineer review-policy-author risk-manager security-auditor software-license-compliance-engineer threat-detection-engineer threat-intelligence-analyst threat-modeling-expert`,
   `agent-action-governance python-security-hardening reverse-engineering security-code-review security-scanning threat-modeling vulnerability-variant-analysis skill-security-review`],
  ['video-audio', '影片與音訊製作',
   'Video production, shot planning, footage editing, sound, captions, localization, accessibility, and delivery mastering.',
   `audiovisual-localization-producer casting-director cinematographer colorist delivery-mastering-specialist first-assistant-director location-manager media-accessibility-producer media-ingest-manager media-library-researcher motion-graphics-designer music-supervisor production-designer production-sound-mixer screenwriter script-supervisor sound-designer storyboard-artist vfx-supervisor video-director video-editor video-producer visual-continuity-supervisor`,
   `ai-video-generation ai-video-prompting audio-generation audio-transcription avatar-video-generation remotion-video-toolkit short-video-script storyboard-creation subtitle-captions text-to-speech ugc-video-ads video-edit video-production-workflow vlog-production`],
  ['documents-office', '文件與辦公',
   'Editable documents, spreadsheets, presentations, PDFs, diagrams, technical references, and organized workspaces.',
   `api-documenter c4-code c4-component c4-container c4-context docs-architect mermaid-expert reference-builder technical-writer tutorial-engineer`,
   `data-organization-system document-to-markdown downloads-desktop-cleanup drawio-skill file-organizer folder-structure-cleanup pdf-operations presentation-ops spreadsheet-ops word-document-ops workspace-google-ops markdown-writer git-readme-writer api-doc-comments openapi-spec-generation summary-ops`],
  ['research-planning', '研究、需求與專案規劃',
   'Evidence-led research, user and domain discovery, specifications, product decisions, and accountable delivery planning.',
   `business-analyst business-strategy-consultant clinical-data-manager clinical-evidence-reviewer competitive-intelligence-analyst emergency-preparedness-coordinator experimentation-methodologist grant-strategist market-researcher model-advisor patient-safety-officer product-manager product-spec-orchestrator project-manager release-manager search-specialist startup-analyst technical-product-manager ux-researcher`,
   `ask-questions-if-underspecified context-governance design-intelligence-search domain-modeling market-research multi-session-planning product-experimentation requirements-deep-dive session-handoff solution-discovery spec-flow specification-authoring todo-first ux-research web-research-ops`],
  ['writing-business', '寫作與商務營運',
   'Editorial writing, brand and marketing, sales, finance, customer operations, and evidence-backed business decisions.',
   `accounting-controller article-writer brand-strategist business-strategy-consultant change-management-consultant content-editor content-marketer copywriter creative-director customer-success-manager customer-support developer-advocate ecommerce-operations-manager fpa-analyst hr-pro learning-development-specialist marketing-measurement-specialist operations-manager paid-media-auditor partnership-manager pricing-strategist procurement-specialist revenue-operations-analyst sales-automator sales-engineer seo-authority-builder seo-cannibalization-detector seo-content-auditor seo-content-planner seo-content-refresher seo-content-writer seo-keyword-strategist seo-meta-optimizer seo-snippet-hunter seo-structure-architect social-publishing-publisher technical-writer ux-writer`,
   `answer-writing article-writing brand-voice content-repurposing humanizer product-pitch-writing summary-ops ux-writing short-video-script ugc-video-ads market-research`],
  ['mobile-desktop-embedded', '行動桌面與嵌入式開發',
   'Native and cross-platform apps, Electron, Unity, embedded firmware, mobile testing, and platform release readiness.',
   `arm-cortex-expert c-pro cpp-pro csharp-pro electron-pro firmware-analyst flutter-expert ios-developer mobile-developer mobile-release-engineer mobile-security-coder rust-pro unity-developer`,
   `app-store-release desktop-development flutter-development ios-architecture react-native-expo swift-concurrency swiftui-development swift-testing mobile-app-testing`],
  ['threejs-graphics', '3D與互動圖形',
   'Three.js and WebGL or WebGPU scenes, assets, simulation, rendering, interaction, performance, and visual verification.',
   `frontend-developer performance-engineer realtime-systems-engineer ui-visual-validator`,
   `threejs-accessibility threejs-animation-system threejs-assets-gltf threejs-atmosphere-aerial-perspective threejs-bloom threejs-cad-bim threejs-camera-direction threejs-capture-recording threejs-csg-modeling threejs-data-visualization threejs-deformable-simulation threejs-development threejs-editor-authoring threejs-exposure-color-grading threejs-framework-integrations threejs-gameplay-systems threejs-geometry threejs-image-pipeline threejs-interaction-input threejs-large-worlds-geospatial threejs-materials-lighting threejs-math-transforms threejs-navigation-crowds threejs-networked-experiences threejs-offscreen-workers threejs-parallax-occlusion-mapping threejs-path-tracing threejs-performance-memory threejs-physics-audio threejs-physics-simulation threejs-point-clouds-splats threejs-postprocessing threejs-precipitation-surfaces threejs-procedural-animation threejs-procedural-architecture threejs-procedural-characters threejs-procedural-fields threejs-procedural-geometry threejs-procedural-materials threejs-procedural-planets threejs-procedural-vegetation threejs-procedural-vfx threejs-project-architecture threejs-raymarched-space-effects threejs-react-three-fiber threejs-rendering-platforms threejs-scene-lifecycle threejs-screen-space-ambient-occlusion threejs-security-deployment threejs-shaders threejs-shadow-systems threejs-spatial-audio threejs-spectral-ocean threejs-temporal-surfaces threejs-testing-debugging threejs-ui-overlays threejs-version-migration threejs-visual-validation threejs-volumetric-clouds threejs-water-optics threejs-webgpu-tsl threejs-webxr-accessibility`],
  ['agent-automation', 'Agent、Skill與自動化工具',
   'Canonical Agent and Skill design, harness integration, MCP, browser automation, delegated workflows, and traceable handoffs.',
   `agent-designer agent-harness-optimizer codebase-onboarding-engineer conductor-validator context-manager developer-tooling-engineer mcp-developer orchestrate sales-automator session-end session-start team-debugger team-implementer team-lead team-reviewer`,
   `agent-creator-design agent-instructions-authoring agent-introspection-debugging agents-sdk-development mcp-creator-design mcp-ops skill-audit skill-creator-design skill-executor skill-explorer skill-gap-analyzer skill-lint skill-scan skill-security-review skillctl skillforge subagent-architecture agent-reach-ops browser-automation playwright-automation python-web-scraping python-automation-scripting context-governance session-handoff self-improvement todo-first`],
];

const knownAgents = new Set(agents.map(a => a.name));
const knownSkills = new Set(skills.map(s => s.name));
const bundles = definitions.map(([id,title,description,roleText,skillText]) => ({id,title,description,agents:words(roleText),skills:words(skillText)}));
for (const b of bundles) {
  for (const field of ['agents','skills']) {
    if (!b[field].length || new Set(b[field]).size !== b[field].length) throw new Error('Empty or duplicate '+b.id+':'+field);
    const known = field==='agents' ? knownAgents : knownSkills;
    for (const name of b[field]) if (!known.has(name)) throw new Error('Unknown '+b.id+':'+field+':'+name);
  }
}
const coveredAgents = new Set(bundles.flatMap(b=>b.agents));
const coveredSkills = new Set(bundles.flatMap(b=>b.skills));
const missingAgents = [...knownAgents].filter(n=>!coveredAgents.has(n));
const missingSkills = [...knownSkills].filter(n=>!coveredSkills.has(n));
if (missingAgents.length || missingSkills.length) throw new Error(JSON.stringify({missingAgents,missingSkills}));
fs.writeFileSync(path.join(root,'scripts/data/install-bundles.json'),JSON.stringify({version:1,bundles},null,2)+'\n');
const membership = {
  version:1,
  agents:Object.fromEntries(agents.map(a=>[a.name,bundles.filter(b=>b.agents.includes(a.name)).map(b=>({bundle:b.id,reason:'The '+a.name+' contract contributes to '+b.description.charAt(0).toLowerCase()+b.description.slice(1)}))])),
  skills:Object.fromEntries(skills.map(s=>[s.name,{description:s.description,bundles:bundles.filter(b=>b.skills.includes(s.name)).map(b=>b.id)}])),
};
fs.writeFileSync(path.join(__dirname,'bundle-membership.json'),JSON.stringify(membership,null,2)+'\n');
console.log(JSON.stringify({bundles:bundles.length,coveredAgents:coveredAgents.size,coveredSkills:coveredSkills.size,membershipCounts:bundles.map(b=>({id:b.id,agents:b.agents.length,skills:b.skills.length}))},null,2));
