#!/usr/bin/env node
'use strict';

// Convert the source-reviewed Three.js notes into the same audit schema as the
// other review partitions. This does not generate or change installer rules.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const inventory = read('inventory.json');
const notes = read('threejs-review-notes.json');
const lines = (file) => fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
const evidence = (file, line) => ({ file, line, text: lines(file)[line - 1].trim() });
const mapFile = 'skills/threejs-development/references/capability-map.md';
const mapLines = lines(mapFile);
const routes = [];
for (let index = 0; index < mapLines.length; index++) {
  const match = mapLines[index].match(/^\| (.+) \| `(threejs-[a-z-]+)` \|$/);
  if (match) routes.push({ target: match[2], kind: 'conditional', usage: 'routing',
    when: '所選場景包含此能力：' + match[1],
    reasonZh: '入口依 capability map 選最小專項集合；並非整張表全部必装。',
    evidence: [evidence(mapFile, index + 1)] });
}

const skills = inventory.skills.filter((skill) => skill.name.startsWith('threejs-')).map((skill) => {
  const suffix = skill.name.slice('threejs-'.length);
  if (!notes.labels[suffix]) throw new Error('Missing reviewed label: ' + skill.name);
  const relationships = [];
  for (const dependency of skill.declaredDependencies) {
    const links = skill.resourceLinks.filter((link) => link.target === dependency.name);
    if (!links.length) throw new Error('Unexpected Three.js dependency without reviewed resource: ' + skill.name);
    relationships.push({ target: dependency.name, kind: dependency.kind, usage: 'resource',
      when: dependency.kind === 'required' ? '核心工作流程無條件要求讀取共用契約。' : dependency.when,
      reasonZh: '需安裝保存共用參考文件的套件；不等於啟用 threejs-development 的完整入口流程。',
      evidence: links.map((link) => evidence(link.file, link.line)) });
  }
  for (const [target, kind, when, line] of notes.relations[skill.name] || []) {
    relationships.push({ target, kind, usage: kind === 'alternative' ? 'routing' : 'workflow',
      when, reasonZh: kind === 'alternative' ? '主問題轉由其他專項負責，不能因此視為原 Skill 必装依賴。' : when,
      evidence: [evidence(skill.entry, line)] });
  }
  if (skill.name === 'threejs-development') relationships.push(...routes);
  if (skill.name === 'threejs-framework-integrations') relationships.push({
    target: 'threejs-scene-lifecycle', kind: 'conditional', usage: 'workflow',
    when: '框架承載 imperative Three.js island。',
    reasonZh: '已引用的共用框架契約在此分支要求搭配場景生命週期專項。',
    evidence: [evidence('skills/threejs-development/references/framework-integrations.md', 23)]
  });
  const externalPrerequisites = ['實作需確認目標專案的 Three.js／addons 版本；渲染驗證需對應瀏覽器、GPU 與裝置。'];
  if (skill.name === 'threejs-react-three-fiber') externalPrerequisites.push('React、@react-three/fiber 與需要的 Drei 等套件，依專案實際版本。');
  if (skill.name === 'threejs-framework-integrations') externalPrerequisites.push('Vue／Svelte／其他目標框架與選用的 TresJS／Threlte 等整合套件。');
  if (skill.name === 'threejs-webxr-accessibility') externalPrerequisites.push('WebXR 相容裝置、session 權限與 HTTPS 部署；非 XR fallback 仍需驗證。');
  if (skill.name === 'threejs-capture-recording') externalPrerequisites.push('所選錄影或 frame 編碼方式支援的 codec／瀏覽器 API／外部編碼器；不能假定所有方法都需安裝。');
  if (['threejs-physics-simulation', 'threejs-deformable-simulation'].includes(skill.name)) externalPrerequisites.push('依選定模擬路徑確認 solver／物理引擎與 Worker 支援；未固定為單一外部引擎。');
  const inspectedFiles = new Set(skill.sourceFiles.map((file) => file.file));
  for (const link of skill.resourceLinks) inspectedFiles.add('skills/' + link.target + '/' + link.targetResource);
  if (skill.name === 'threejs-development') for (const file of inventory.skills.find((item) => item.name === skill.name).sourceFiles) inspectedFiles.add(file.file);
  const standalone = relationships.some((relationship) => relationship.kind === 'required') ? 'no'
    : ['threejs-development', 'threejs-physics-audio'].includes(skill.name) ? 'base-only' : 'yes';
  return { name: skill.name, standalone, summaryZh: notes.labels[suffix], relationships,
    externalPrerequisites, ambiguities: notes.ambiguities[skill.name] || [],
    groupTags: Object.entries(notes.groups).filter(([, members]) => members.includes(suffix)).map(([name]) => name),
    inspectedFiles: [...inspectedFiles].sort() };
});
if (skills.length !== 62) throw new Error('Expected all 62 Three.js Skills');
const result = { schemaVersion: 1, categories: ['threejs-graphics'], skills,
  findings: [
    { title: '3D 共用資源與啟用流程應分開', detail: '14 個專項的 required 基座主要保存共用契約。分類安裝需補齊檔案；不可把基座 capability map 中所有專項再展開為無條件必装。' },
    { title: 'WebXR 非 XR 主責未宣告', detail: 'threejs-webxr-accessibility 明定 threejs-accessibility 主責非 XR fallback，現有 metadata 未列此工作流程關係。' },
    { title: '相容入口需補選擇條件', detail: 'threejs-physics-audio 應按純物理、純音效或合併事件音效解析，不能因名稱一次加裝兩個專項。' }
  ],
  limits: ['已閱讀全部 62 個入口，以及 threejs-development 的全部 13 個共用參考文件；不執行渲染、生成或模型任務。', '外部套件是否可用仍取決於實際目標專案；本研究不安裝外部套件。'] };
fs.writeFileSync(path.join(__dirname, 'review-threejs.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ skills: skills.length, semanticEdges: skills.reduce((sum, skill) => sum + skill.relationships.length, 0) }));
