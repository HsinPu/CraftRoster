# Agent Coverage Matrix

這份矩陣定義 CraftRoster 角色目錄目前承諾涵蓋的核心工作，不以現實世界職稱數量作為完成標準。機器可驗證的 canonical 資料位於 [`scripts/data/agent-coverage-matrix.json`](../scripts/data/agent-coverage-matrix.json)；`npm run validate:agent-coverage` 會確認分類完整、代表角色存在且分類一致、handoff 與權限邊界都有定義。

## Coverage Criteria

每一類要標記為 `covered`，必須同時具備：

1. 明確的核心工作範圍。
2. 至少兩個該分類中實際存在的代表 Agent。
3. 明確的下游 handoff。
4. 防止把「有角色」誤解為「有無限決策權」的邊界。

## Category Matrix

| Category | Declared core chain | Representative owners |
|---|---|---|
| `analysis` | 問題定義 → 證據分析 → 假設檢驗 → 建議 handoff | `business-analyst`, `experimentation-methodologist`, `quant-analyst` |
| `architecture` | 邊界與品質屬性 → 介面／資料設計 → tradeoff → implementation handoff | `architect`, `api-contract-architect`, `database-architect`, `legacy-modernizer` |
| `artificial-intelligence` | AI 能力設計 → prompt／agent 整合 → evaluation → safety gate | `ai-engineer`, `prompt-engineer`, `eval-orchestrator`, `ai-safety-evaluator` |
| `business-operations` | 營運需求 → 流程／變革／採購規劃 → accountable-owner handoff | `operations-manager`, `change-management-consultant`, `procurement-specialist`, `learning-development-specialist` |
| `cloud-infrastructure` | 基礎設施設計 → IaC／平台 → 安全與成本檢查 → 維運 handoff | `cloud-architect`, `terraform-specialist`, `kubernetes-architect`, `network-engineer` |
| `commerce` | 商店與訂單流程 → checkout／payment integration → 營運與財務 handoff | `ecommerce-operations-manager`, `payment-integration` |
| `creative` | 創意方向 → 可追溯參考 → 受治理資產概念／生成 → rights handoff | `creative-director`, `gallery-researcher`, `image-generator`, `blender-artist` |
| `customer-operations` | 案件 triage → 回覆／採用風險 → support 或 success follow-up | `customer-support`, `customer-success-manager` |
| `data` | 建模 → ingest／transform → governance／administration → trusted-data handoff | `data-engineer`, `analytics-engineer`, `data-governance-engineer`, `database-admin` |
| `developer-experience` | onboarding → tooling／platform workflow → feedback → maintainer handoff | `codebase-onboarding-engineer`, `developer-tooling-engineer`, `platform-engineer`, `dx-optimizer` |
| `development` | 實作 → debug／refactor → verification evidence → review handoff | `frontend-developer`, `backend-developer`, `mobile-developer`, `debugger`, `refactoring-specialist` |
| `documentation` | 資訊架構 → API／reference／tutorial／diagram → maintainer handoff | `docs-architect`, `api-documenter`, `reference-builder`, `tutorial-engineer` |
| `embedded-systems` | firmware／MCU 分析 → timing／memory／interface 約束 → hardware validation handoff | `arm-cortex-expert`, `firmware-analyst` |
| `finance` | close／control evidence → forecast／budget／variance → qualified finance handoff | `accounting-controller`, `fpa-analyst` |
| `governance` | obligation／risk identification → control evidence → exception／legal handoff | `compliance-auditor`, `risk-manager`, `policy-enforcer`, `software-license-compliance-engineer` |
| `healthcare` | clinical evidence／data → safety／compliance review → qualified-human escalation | `clinical-evidence-reviewer`, `clinical-data-manager`, `patient-safety-officer`, `healthcare-compliance-specialist` |
| `machine-learning` | model development → deployment／monitoring → independent validation → production handoff | `ml-engineer`, `mlops-engineer`, `model-validation-specialist` |
| `marketing` | content／SEO／paid／social planning → production → measurement／audit → publication gate | `content-marketer`, `marketing-measurement-specialist`, `seo-content-planner`, `social-publishing-publisher` |
| `media-production` | research／brief → preproduction → capture／ingest → edit／finish → locale／accessibility → master | `video-producer`, `video-director`, `first-assistant-director`, `video-editor`, `media-accessibility-producer`, `delivery-mastering-specialist` |
| `operations` | deploy → observe → incident response／recovery → verified service handoff | `deployment-engineer`, `observability-engineer`, `incident-responder`, `sre-engineer` |
| `orchestration` | task decomposition → bounded delegation → context／receipt validation → consolidation | `orchestrate`, `team-lead`, `context-manager`, `conductor-validator`, `team-implementer` |
| `performance` | benchmark → bottleneck analysis → optimization → regression evidence | `performance-engineer`, `database-optimizer` |
| `product-management` | discovery → outcome／requirements → priority／spec → delivery handoff | `product-manager`, `product-spec-orchestrator`, `technical-product-manager` |
| `project-management` | delivery plan → dependency／risk tracking → release coordination → closeout | `project-manager`, `release-manager` |
| `quality-assurance` | test／review design → execution → finding resolution → gate recommendation | `qa`, `test-automator`, `code-reviewer`, `ui-visual-validator`, `receipt-verifier`, `blender-asset-reviewer` |
| `research` | authoritative search → provenance／comparison → uncertainty → specialist handoff | `market-researcher`, `search-specialist` |
| `sales` | discovery → technical evidence／automation → revenue analysis → authorized follow-up | `sales-engineer`, `sales-automator`, `revenue-operations-analyst` |
| `security` | threat model → hardening／testing → detection／audit → mitigation handoff | `threat-modeling-expert`, `application-security-engineer`, `security-auditor`, `threat-detection-engineer`, `privacy-engineer` |
| `strategy` | evidence → options／tradeoffs → recommendation → executive decision gate | `business-strategy-consultant`, `brand-strategist`, `grant-strategist` |
| `user-experience` | user research → interaction／system design → accessibility／quality review → implementation handoff | `ux-researcher`, `ui-ux-designer`, `design-system-architect`, `accessibility-expert` |
| `writing` | source／intent → draft → edit／structure → subject-matter or publication approval | `article-writer`, `content-editor`, `technical-writer`, `copywriter`, `ux-writer` |

## Interpretation and Expansion Rule

`31/31 covered` 表示上述宣告範圍都有可路由的核心責任 owner、handoff 與權限邊界，不表示每個產業職稱、provider 或特殊法規情境都已建立獨立 Agent。只有真實工作同時具備獨立 routing trigger、不同決策權、durable artifact，且不能由現有 Agent 搭配 Skill 安全完成時，才應新增角色。

目前保留為需求驅動擴充的例子包括特定雲端供應商深度、FPGA／PCB、稅務／資金管理、大型詐欺與 fulfillment、企業 contact center、正式配音導演／re-recording mixer、機構級媒體典藏，以及必須組織獨立的 QC。這些不是目前宣告 scope 的未解 blocker。
