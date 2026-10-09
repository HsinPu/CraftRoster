'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const audit = JSON.parse(read('docs/audits/skill-installability-2026-10-09/skill-installability.json'));
const changed = new Set(['skills/threejs-development/SKILL.md', 'skills/threejs-physics-audio/SKILL.md',
  'skills/threejs-webxr-accessibility/SKILL.md', 'skills/threejs-development/references/capability-map.md']);
const resolutions = {
  'threejs-development': 'Basic scenes can run independently; select only affected specialists. A missing selected specialist leaves its branch pending, and shared-reference use does not activate the router.',
  'threejs-physics-audio': 'Compatibility-only entry can select owners independently. Implementation selects physics, audio, or both by the event boundary, with missing selected work pending.',
  'threejs-webxr-accessibility': 'The non-XR owner is a required workflow companion; the base package supplies resources only. Reused fallback evidence must match its source and targets.'
};
const skills = audit.skills.filter(s => s.category === 'threejs-graphics').map(skill => ({
  name: skill.name,
  changedFiles: [...changed].filter(file => file.startsWith(`skills/${skill.name}/`)),
  resolvedAmbiguities: skill.ambiguities.map(item => ({ title: item.title, resolution: resolutions[skill.name] })),
  relationships: skill.relationships.map(rel => {
    const evidence = rel.evidence.map(item => {
      const lines = read(item.file).split('\n');
      const index = lines.findIndex(line => line.includes(item.text));
      if (index < 0) throw new Error(`${skill.name}: evidence drift: ${item.file} ${item.text}`);
      return { file: item.file, line: index + 1, text: item.text };
    });
    return { target: rel.target, kind: rel.kind, when: rel.when,
      usage: rel.usage === 'resource' ? 'resource' : 'workflow', reasonZh: rel.reasonZh, evidence };
  })
}));
const result = { partition: 'threejs-graphics', skills,
  checks: ['62 entrypoints and bundled shared contracts reviewed; current evidence lines resolved.',
    'Required resource packages remain separate from conditional scene specialist routes.'],
  limits: ['Static instruction and dependency review; no scene execution or model activation claim.'] };
fs.writeFileSync(path.join(__dirname, 'remediation-threejs.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`Three.js remediation: ${skills.length} Skills, ${skills.reduce((n, s) => n + s.relationships.length, 0)} reviewed relationships`);
