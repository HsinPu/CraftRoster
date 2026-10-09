#!/usr/bin/env node
'use strict';

// Research output only. Never write Skills, generated catalogs or installer rules.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { validateDependencies } = require('../../../scripts/lib/skill-dependencies');
const root = path.resolve(__dirname, '../../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const inventory = read('inventory.json');
const verificationRecord = read('verification-record.json');
if (verificationRecord.checks.some((check) => check.exitCode !== 0)) throw new Error('Recorded research checks did not pass');
const partitions = ['review-core-engineering.json', 'review-tooling-content.json', 'review-frontend-backend.json', 'review-threejs.json'];
const reviews = partitions.map((file) => ({ file, ...read(file) }));
const originals = new Map(inventory.skills.map((skill) => [skill.name, skill]));
const sourceLines = new Map();
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function source(file) {
  const resolved = path.resolve(root, file);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Audit evidence escapes repository: ' + file);
  if (!fs.statSync(resolved).isFile()) throw new Error('Audit source is not a regular file: ' + file);
  return resolved;
}
function checkEvidence(item, context) {
  if (!item || typeof item.file !== 'string' || !Number.isInteger(item.line) || item.line < 1) throw new Error('Invalid evidence: ' + context);
  if (!sourceLines.has(item.file)) sourceLines.set(item.file, fs.readFileSync(source(item.file), 'utf8').split(/\r?\n/));
  const line = sourceLines.get(item.file)[item.line - 1];
  if (line === undefined || !line.trim()) throw new Error('Evidence line absent or blank: ' + context + ' ' + item.file + ':' + item.line);
  if (item.text && !line.includes(item.text.trim())) throw new Error('Evidence text does not match source: ' + context + ' ' + item.file + ':' + item.line);
}
let checkedSourceFiles = 0;
for (const file of [...inventory.sourceManifests, ...inventory.skills.flatMap((skill) => skill.sourceFiles)]) {
  if (sha256(fs.readFileSync(source(file.file))) !== file.sha256) throw new Error('Source changed since inventory: ' + file.file);
  checkedSourceFiles++;
}
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/skill-catalog.json'), 'utf8'));
validateDependencies(taxonomy.skills);
const reviewed = new Map();
const kinds = new Set(['required', 'conditional', 'optional', 'alternative', 'related', 'ambiguous']);
const statuses = new Set(['yes', 'base-only', 'no', 'unclear']);
for (const partition of reviews) {
  for (const skill of partition.skills) {
    if (!originals.has(skill.name) || reviewed.has(skill.name)) throw new Error('Unknown or duplicate reviewed Skill: ' + skill.name);
    if (!statuses.has(skill.standalone)) throw new Error('Invalid standalone classification: ' + skill.name);
    const original = originals.get(skill.name);
    if (!skill.inspectedFiles.includes(original.entry)) throw new Error('Entrypoint not included in inspection: ' + skill.name);
    for (const file of skill.inspectedFiles) source(file);
    for (const relation of skill.relationships) {
      if (!originals.has(relation.target) || relation.target === skill.name || !kinds.has(relation.kind)) throw new Error('Invalid semantic relationship: ' + skill.name + ' -> ' + relation.target);
      if (!relation.evidence.length) throw new Error('Relationship without source evidence: ' + skill.name + ' -> ' + relation.target);
      for (const item of relation.evidence) checkEvidence(item, skill.name + ' -> ' + relation.target);
    }
    for (const ambiguity of skill.ambiguities) checkEvidence(ambiguity, skill.name + ' ambiguity');
    for (const item of skill.standaloneEvidence || skill.evidence || []) checkEvidence(item, skill.name + ' classification');
    reviewed.set(skill.name, { ...skill, reviewPartition: partition.file });
  }
  for (const finding of partition.findings) for (const item of finding.evidence || []) checkEvidence(item, partition.file + ' finding');
}
if (reviewed.size !== originals.size) throw new Error('Unreviewed Skills: ' + [...originals.keys()].filter((name) => !reviewed.has(name)).join(', '));

function closure(seed, edges) {
  const seen = new Set(), visiting = [], cycles = [];
  function visit(name) {
    if (visiting.includes(name)) { cycles.push([...visiting.slice(visiting.indexOf(name)), name]); return; }
    if (seen.has(name)) return;
    visiting.push(name);
    for (const target of edges(name)) visit(target);
    visiting.pop(); seen.add(name);
  }
  for (const name of seed) visit(name);
  return { packages: [...seen].sort(), cycles };
}
const currentEdges = (name) => originals.get(name).declaredDependencies.filter((dependency) => dependency.kind === 'required').map((dependency) => dependency.name);
const reviewedEdges = (name) => reviewed.get(name).relationships.filter((relationship) => relationship.kind === 'required').map((relationship) => relationship.target);
const mismatchKinds = {
  'missing-required': '正文必需，清單未宣告', 'missing-conditional': '正文有條件，清單未宣告',
  'kind-mismatch': '清單與正文類型不同', 'unclear-declaration': '已宣告但正文關係待釐清'
};
const skills = inventory.skills.map((original) => {
  const review = reviewed.get(original.name);
  const relationships = review.relationships.map((relation) => {
    const resourceEvidence = relation.evidence.every((item) => original.resourceLinks.some((link) => link.target === relation.target && link.file === item.file && link.line === item.line && link.targetResource !== 'SKILL.md'));
    const usage = relation.usage || (resourceEvidence ? 'resource' : ['alternative', 'related'].includes(relation.kind) ? 'routing' : relation.kind === 'ambiguous' ? 'unclear' : 'workflow');
    return { ...relation, usage, declaredKind: original.declaredDependencies.find((dependency) => dependency.name === relation.target)?.kind || null };
  });
  const mismatches = [];
  for (const relation of relationships) {
    if (relation.declaredKind || !['required', 'conditional'].includes(relation.kind)) continue;
    mismatches.push({ kind: relation.kind === 'required' ? 'missing-required' : 'missing-conditional', target: relation.target, evidence: relation.evidence });
  }
  for (const declared of original.declaredDependencies) {
    const semantic = relationships.filter((relation) => relation.target === declared.name);
    if (!semantic.length || semantic.every((relation) => ['ambiguous', 'related', 'optional'].includes(relation.kind))) {
      mismatches.push({ kind: 'unclear-declaration', target: declared.name, declaredKind: declared.kind, evidence: semantic.flatMap((relation) => relation.evidence) });
    } else if (!semantic.some((relation) => relation.kind === declared.kind)) {
      mismatches.push({ kind: 'kind-mismatch', target: declared.name, declaredKind: declared.kind, reviewedKinds: [...new Set(semantic.map((relation) => relation.kind))], evidence: semantic.flatMap((relation) => relation.evidence) });
    }
  }
  const current = closure([original.name], currentEdges);
  const proposed = closure([original.name], reviewedEdges);
  const requiredResources = relationships.filter((relation) => relation.kind === 'required' && relation.usage === 'resource').map((relation) => relation.target);
  const requiredWorkflows = relationships.filter((relation) => relation.kind === 'required' && relation.usage !== 'resource').map((relation) => relation.target);
  return { name: original.name, category: original.category, description: original.description, summaryZh: review.summaryZh,
    standalone: review.standalone, entry: original.entry,
    currentInstallerStandalone: current.packages.length === 1,
    currentMinimumPackages: current.packages, reviewedMinimumPackages: proposed.packages, reviewedRequiredCycles: proposed.cycles,
    declaredDependencies: original.declaredDependencies, relationships, requiredResources, requiredWorkflows,
    externalPrerequisites: review.externalPrerequisites,
    ambiguities: review.ambiguities.map((item) => ({ ...item, text: sourceLines.get(item.file)[item.line - 1].trim() })), mismatches,
    groupTags: review.groupTags, inspectedFiles: review.inspectedFiles, reviewPartition: review.reviewPartition,
    resourceLinks: original.resourceLinks, otherMentionCandidates: original.mentionedTargets.filter((target) => !relationships.some((relation) => relation.target === target)),
    sourceFiles: original.sourceFiles };
});
const byName = new Map(skills.map((skill) => [skill.name, skill]));
const activeWorkflowEdges = (name) => byName.get(name).relationships.filter((relation) => relation.kind === 'required' && relation.usage !== 'resource').map((relation) => relation.target);
for (const skill of skills) skill.reviewedActiveWorkflows = closure([skill.name], activeWorkflowEdges).packages;
const groups = new Map();
for (const skill of skills) for (const tag of skill.groupTags) {
  if (!groups.has(tag)) groups.set(tag, []);
  groups.get(tag).push(skill.name);
}
const profileDefinitions = [
  ['software-delivery', '完整軟體交付', ['verified-software-delivery'], '以交付入口為核心；只增加實際階段需要的專項。'],
  ['frontend-ui', '可見網頁介面', ['frontend-design'], '基準搭配實際框架、樣式或驗證需求；各框架是選擇分支。'],
  ['image-ui', '圖片轉網頁', ['image-to-code'], '圖片實作為主；切圖與多密度輸出只有選中該交付才加入。'],
  ['python-core', 'Python 開發', ['python-development'], '先裝基座，再按 API、資料、測試、打包等任務挑專項。'],
  ['java-core', 'Java／Spring', ['java-development'], '先裝語言基座，再按框架、持久化、測試任務加專項。'],
  ['code-review', '程式審查', ['code-review'], '總體審查為入口；前端、資安或 GitHub 流程按審查範圍加入。'],
  ['skill-authoring', 'Skill 設計與交付', ['skillforge'], '先釐清安全掃描／lint 與沿用報告的條件，再固化作者工作包。'],
  ['web-research', '網路資料研究', ['web-research-ops'], '來源蒐集與研究分析分工；市場分析需先釐清回交界線。'],
  ['document-conversion', '文件轉 Markdown', ['document-to-markdown'], '轉換與寫作規範分工；外部轉換工具按輸入格式確認。'],
  ['3d-basic', 'Three.js 基礎與分流', ['threejs-development'], '入口按能力選專項；不能把全部 3D 專項当作入口必需。'],
  ['3d-capture', 'Three.js 擷取與錄影', ['threejs-capture-recording'], '擷取專項加共用契約套件；codec 與渲染效果按交付選擇。'],
  ['3d-xr', 'WebXR 與無障礙', ['threejs-webxr-accessibility'], 'XR、非 XR fallback 與共用契約一起確認；正文依賴尚未全部宣告。']
];
const proposedProfiles = profileDefinitions.map(([id, titleZh, seeds, ruleZh]) => {
  for (const name of seeds) if (!byName.has(name)) throw new Error('Unknown profile seed: ' + name);
  const current = closure(seeds, currentEdges), proposed = closure(seeds, reviewedEdges);
  const activeWorkflows = closure(seeds, activeWorkflowEdges).packages;
  return { id, titleZh, seeds, ruleZh, currentMinimumPackages: current.packages, reviewedMinimumPackages: proposed.packages,
    activeWorkflows,
    branchChoices: activeWorkflows.flatMap((name) => byName.get(name).relationships.filter((relation) => ['conditional', 'optional', 'alternative', 'ambiguous'].includes(relation.kind)).map((relation) => ({ source: name, ...relation }))),
    pendingClarificationSkills: activeWorkflows.filter((name) => byName.get(name).ambiguities.length || byName.get(name).mismatches.some((item) => item.kind !== 'missing-conditional')) };
});
const backlog = [];
for (const skill of skills) {
  for (const ambiguity of skill.ambiguities) backlog.push({ source: skill.name, category: skill.category, type: 'wording', ...ambiguity });
  for (const mismatch of skill.mismatches) backlog.push({ source: skill.name, category: skill.category, type: 'metadata', title: mismatchKinds[mismatch.kind], ...mismatch,
    proposedRule: mismatch.kind.startsWith('missing') ? '核對正文條件、用途與替代證據後，再由 canonical metadata 生成 installer 索引。' : '先對齊正文與 canonical metadata，再生成 installer 索引；不要只修改產生出的 TSV。' });
}
const statusCounts = Object.fromEntries([...statuses].map((status) => [status, skills.filter((skill) => skill.standalone === status).length]));
const edgeCounts = Object.fromEntries([...kinds].map((kind) => [kind, skills.reduce((sum, skill) => sum + skill.relationships.filter((relation) => relation.kind === kind).length, 0)]));
const categories = [...new Set(skills.map((skill) => skill.category))].sort();
const coreDifferences = skills.flatMap((skill) => skill.mismatches.filter((item) => item.kind !== 'missing-conditional').map((item) => ({ source: skill.name, ...item })));
const output = {
  schemaVersion: 1, auditDate: inventory.auditDate, generatedAtUtc: new Date().toISOString(), revision: inventory.revision,
  scope: { entrypointsReviewed: skills.length, categories: categories.length, textualFilesInventoried: inventory.statistics.textualFilesScanned,
    filesHumanInspected: new Set(skills.flatMap((skill) => skill.inspectedFiles)).size, excluded: ['evals and test fixtures', 'binary assets', 'dependency trees', 'runtime/provider/model execution'] },
  definitions: {
    standalone: { yes: '正文所述核心可獨立使用；條件擴展與外部工具另看。', 'base-only': '可獨立做基礎／分析／分流；具體實作分支需選中專項。', no: '正文核心無條件需要兄弟 Skill 的流程或共用資源。', unclear: '正文不足以确定核心的最小依賴；需先釐清。' },
    relationshipKinds: { required: '核心無條件需要', conditional: '觸發具體條件才需要', optional: '可選增強', alternative: '改由其他主責入口', related: '相關指引，未構成必需', ambiguous: '關係或條件未寫清楚' },
    usage: { resource: '取得參考文件；不等於啟用對方全套流程', workflow: '搭配對方工作流程', routing: '分流或替代主責', unclear: '用途待釐清' }
  },
  statistics: { ...inventory.statistics, statusCounts, semanticEdgeCounts: edgeCounts, skillsWithAmbiguities: skills.filter((skill) => skill.ambiguities.length).length,
    ambiguityItems: skills.reduce((sum, skill) => sum + skill.ambiguities.length, 0), skillsWithMetadataDifferences: skills.filter((skill) => skill.mismatches.length).length,
    metadataDifferences: skills.reduce((sum, skill) => sum + skill.mismatches.length, 0), requiredCycleSkills: skills.filter((skill) => skill.reviewedRequiredCycles.length).map((skill) => skill.name) },
  installationPolicyProposal: [
    '安裝一個入口，再補 required 的遞迴最小集合。',
    'resource 依賴補齊檔案，不因此啟用其全部路由。',
    'conditional 先匹配使用者選定分支；optional 明確選擇；alternative 選主責而非強制同裝。',
    '缺少已選中專項時，列出缺項與受影響交付；未授權時不自行加裝。',
    '沿用既有報告或契約能否替代 producer 必須寫清版本、範圍、有效期與驗證方式。',
    '分類是導覽；配套是經驗證的最小入口與條件分支，不是分類內所有項目的聯集。'
  ],
  currentRequiredFamilies: inventory.currentRequiredFamilies, proposedProfiles,
  compositionGroups: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([id, members]) => ({ id, members: members.sort(), policy: 'Related task family; not an all-required bundle.' })),
  findings: reviews.flatMap((review) => review.findings.map((finding) => ({ reviewPartition: review.file, ...finding }))),
  limits: [...inventory.limits, '286 個入口已逐項閱讀。非入口文字資源先盤點，再依關係相關性閱讀；不是每份資源均人工全文审查。', 'reviewedMinimumPackages 是正文研究建議，不是現行安裝器的新行為；遇到 ambiguity 或 cycle 需先修訂契約。', ...reviews.flatMap((review) => review.limits || [])],
  verification: { sourceFilesHashMatched: checkedSourceFiles, allEntrypointsCovered: true, allRelationshipTargetsKnown: true, evidenceLineAndTextChecked: true,
    declaredDependencyGraphValidated: true, recordedChecks: verificationRecord, runtimeModelTasksExecuted: false },
  sourceManifests: inventory.sourceManifests, skills
};
output.statistics.coreMetadataDifferenceItems = coreDifferences.length;
output.statistics.skillsWithCoreMetadataDifferences = new Set(coreDifferences.map((item) => item.source)).size;
output.statistics.unlistedConditionalBranches = skills.reduce((sum, skill) => sum + skill.mismatches.filter((item) => item.kind === 'missing-conditional').length, 0);
fs.writeFileSync(path.join(__dirname, 'skill-installability.json'), JSON.stringify(output, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'clarification-backlog.json'), JSON.stringify({ schemaVersion: 1, auditDate: inventory.auditDate, revision: inventory.revision, items: backlog }, null, 2) + '\n');
const template = fs.readFileSync(path.join(__dirname, 'report-template.html'), 'utf8');
if (!template.includes('__AUDIT_DATA__')) throw new Error('Report template has no data slot');
const html = template.replace('__AUDIT_DATA__', JSON.stringify(output).replace(/</g, '\\u003c'));
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for (const script of scripts) new vm.Script(script[1], { filename: 'skill-installability-report.html' });
fs.writeFileSync(path.join(__dirname, 'skill-installability-report.html'), html);
console.log(JSON.stringify({ coverage: output.scope, statistics: output.statistics, backlogItems: backlog.length, checkedSourceFiles, htmlBytes: Buffer.byteLength(html) }, null, 2));
