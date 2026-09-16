#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildCatalog,
  parseSkillFrontmatter,
  renderCatalog,
  run,
  validateConfig
} = require('../scripts/generate-skill-catalog');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-skill-catalog-'));
let passed = 0;

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeSkill(root, name, options = {}) {
  const metadata = [
    '  author: "HsinPu"',
    '  source: "HsinPu/CraftRoster"'
  ];
  if (options.reference) {
    metadata.push(`  reference-source: "${options.reference.source}"`);
    metadata.push(`  reference-license: "${options.reference.license}"`);
    if (options.reference.revision) metadata.push(`  reference-revision: "${options.reference.revision}"`);
  }
  const skillPath = path.join(root, 'skills', name, 'SKILL.md');
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, [
    '---',
    `name: ${name}`,
    `description: ${options.description || `Fixture for ${name}.`}`,
    `license: ${options.license || 'Apache-2.0'}`,
    'metadata:',
    ...metadata,
    '---',
    '',
    `# ${name}`,
    ''
  ].join('\n'), 'utf8');
  return skillPath;
}

function baseConfig() {
  return {
    version: '2.0.0',
    updated: '2026-07-15T00:00:00Z',
    categories: [
      { id: 'agent-tooling', name: 'Agent Tooling', description: 'Agent workflows.' },
      { id: 'testing-quality', name: 'Testing & Quality', description: 'Quality workflows.' }
    ],
    skills: {
      'alpha-skill': { category: 'agent-tooling', tags: ['agents', 'workflow'] },
      'beta-skill': { category: 'testing-quality', tags: ['testing', 'quality'] }
    },
    routingGroups: [
      {
        id: 'workflow-selection',
        title: 'Workflow selection',
        decision: 'Choose the narrowest workflow that owns the requested outcome.',
        skills: [
          { name: 'alpha-skill', when: 'Use for agent workflow design.' },
          { name: 'beta-skill', when: 'Use for validation and testing.' }
        ]
      }
    ]
  };
}

function createFixture(name) {
  const root = path.join(tempRoot, name);
  writeSkill(root, 'beta-skill');
  writeSkill(root, 'alpha-skill', {
    reference: {
      source: 'example/upstream',
      license: 'MIT',
      revision: '0123456789abcdef0123456789abcdef01234567'
    }
  });
  writeJson(path.join(root, 'scripts', 'data', 'skill-catalog.json'), baseConfig());
  return root;
}

function test(name, callback) {
  callback();
  passed += 1;
  console.log(`PASS ${name}`);
}

function expectError(name, callback, expected) {
  assert.throws(callback, (error) => {
    assert(error.message.includes(expected), `${name}: unexpected message ${error.message}`);
    return true;
  });
  passed += 1;
  console.log(`PASS ${name}`);
}

function safeCleanup() {
  const resolvedTemp = path.resolve(os.tmpdir());
  const resolvedTarget = path.resolve(tempRoot);
  const relative = path.relative(resolvedTemp, resolvedTarget);
  if (
    relative === ''
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
    || !path.basename(resolvedTarget).startsWith('craftroster-skill-catalog-')
  ) {
    throw new Error(`Refusing to clean unexpected test path: ${resolvedTarget}`);
  }
  fs.rmSync(resolvedTarget, { recursive: true, force: true });
}

try {
  test('builds a deterministic catalog from Skill metadata and catalog config', () => {
    const root = createFixture('build');
    const catalog = buildCatalog(root);
    assert.deepStrictEqual(catalog.skills.map((skill) => skill.name), ['alpha-skill', 'beta-skill']);
    assert.strictEqual(catalog.total, 2);
    assert.strictEqual(catalog.skills[0].author, 'HsinPu');
    assert.strictEqual(catalog.skills[0].category, 'agent-tooling');
    assert.strictEqual(
      catalog.skills[0].reference.revision,
      '0123456789abcdef0123456789abcdef01234567'
    );
    assert.strictEqual(catalog.routingGroups[0].skills.length, 2);
  });

  test('writes the catalog and accepts an exact generation check', () => {
    const root = createFixture('roundtrip');
    run([], root);
    const expected = renderCatalog(buildCatalog(root));
    assert.strictEqual(fs.readFileSync(path.join(root, 'skills.json'), 'utf8'), expected);
    run(['--check'], root);
  });

  test('catalog generation preserves optional declarations without converting them to required edges', () => {
    const root = createFixture('optional-dependency-roundtrip');
    const config = baseConfig();
    config.skills['alpha-skill'].dependencies = [{ name: 'beta-skill', kind: 'optional' }];
    config.skills['beta-skill'].dependencies = [{ name: 'alpha-skill', kind: 'required' }];
    writeJson(path.join(root, 'scripts', 'data', 'skill-catalog.json'), config);
    run([], root);
    const generated = JSON.parse(fs.readFileSync(path.join(root, 'skills.json'), 'utf8'));
    assert.deepStrictEqual(generated.skills.find(skill => skill.name === 'alpha-skill').dependencies,
      [{ name: 'beta-skill', kind: 'optional' }]);
    assert.deepStrictEqual(generated.skills.find(skill => skill.name === 'beta-skill').dependencies,
      [{ name: 'alpha-skill', kind: 'required' }]);
    run(['--check'], root);
  });

  test('parses quoted scalars and inline comments without truncating quoted hashes', () => {
    const root = createFixture('quoted-scalars');
    const skillPath = path.join(root, 'skills', 'alpha-skill', 'SKILL.md');
    const source = fs.readFileSync(skillPath, 'utf8')
      .replace('name: alpha-skill', "name: 'alpha-skill' # canonical name")
      .replace('description: Fixture for alpha-skill.', 'description: "Fixture # alpha." # catalog description')
      .replace('license: Apache-2.0', "license: 'Apache-2.0' # SPDX identifier")
      .replace('  author: "HsinPu"', '  author: "HsinPu" # repository owner');
    fs.writeFileSync(skillPath, source, 'utf8');

    const fields = parseSkillFrontmatter(skillPath);
    assert.strictEqual(fields.name, 'alpha-skill');
    assert.strictEqual(fields.description, 'Fixture # alpha.');
    assert.strictEqual(fields.license, 'Apache-2.0');
    assert.strictEqual(fields.metadata.author, 'HsinPu');
    assert.strictEqual(buildCatalog(root).skills[0].description, 'Fixture # alpha.');
  });

  expectError('detects stale generated output', () => {
    const root = createFixture('stale');
    run([], root);
    const configPath = path.join(root, 'scripts', 'data', 'skill-catalog.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.skills['alpha-skill'].tags.push('routing');
    writeJson(configPath, config);
    run(['--check'], root);
  }, 'skills.json is out of date');

  expectError('rejects missing classifications', () => {
    const config = baseConfig();
    delete config.skills['beta-skill'];
    validateConfig(config, new Set(['alpha-skill', 'beta-skill']));
  }, 'Skill catalog config is missing: beta-skill');

  expectError('rejects unknown routed Skills', () => {
    const config = baseConfig();
    config.routingGroups[0].skills[1].name = 'missing-skill';
    validateConfig(config, new Set(['alpha-skill', 'beta-skill']));
  }, 'unknown routed Skill missing-skill');

  expectError('rejects duplicate nested metadata keys', () => {
    const root = createFixture('duplicate-metadata');
    const skillPath = path.join(root, 'skills', 'alpha-skill', 'SKILL.md');
    fs.appendFileSync(skillPath, '', 'utf8');
    const source = fs.readFileSync(skillPath, 'utf8');
    fs.writeFileSync(
      skillPath,
      source.replace(
        '  reference-revision: "0123456789abcdef0123456789abcdef01234567"',
        '  reference-revision: "0123456789abcdef0123456789abcdef01234567"\n' +
          '  reference-revision: "0123456789abcdef0123456789abcdef01234567"'
      ),
      'utf8'
    );
    parseSkillFrontmatter(skillPath);
  }, 'duplicate metadata field: reference-revision');

  expectError('rejects incomplete reference metadata', () => {
    const root = createFixture('incomplete-reference');
    const skillPath = path.join(root, 'skills', 'alpha-skill', 'SKILL.md');
    const source = fs.readFileSync(skillPath, 'utf8');
    fs.writeFileSync(skillPath, source.replace(/^\s+reference-license:.*\n/m, ''), 'utf8');
    buildCatalog(root);
  }, 'reference-source and reference-license must be declared together');

  expectError('rejects unterminated quoted scalars', () => {
    const root = createFixture('unterminated-quote');
    const skillPath = path.join(root, 'skills', 'alpha-skill', 'SKILL.md');
    const source = fs.readFileSync(skillPath, 'utf8');
    fs.writeFileSync(skillPath, source.replace('  author: "HsinPu"', '  author: "HsinPu'), 'utf8');
    parseSkillFrontmatter(skillPath);
  }, 'unterminated double-quoted scalar');

  expectError('rejects unsupported YAML instead of silently skipping it', () => {
    const root = createFixture('unsupported-yaml');
    const skillPath = path.join(root, 'skills', 'alpha-skill', 'SKILL.md');
    const source = fs.readFileSync(skillPath, 'utf8');
    fs.writeFileSync(skillPath, source.replace('  author: "HsinPu"', '   author: "HsinPu"'), 'utf8');
    parseSkillFrontmatter(skillPath);
  }, 'unsupported YAML syntax');

  expectError('rejects unsupported inline collections', () => {
    const root = createFixture('inline-collection');
    const skillPath = path.join(root, 'skills', 'alpha-skill', 'SKILL.md');
    const source = fs.readFileSync(skillPath, 'utf8');
    fs.writeFileSync(skillPath, source.replace('license: Apache-2.0', 'license: [Apache-2.0]'), 'utf8');
    parseSkillFrontmatter(skillPath);
  }, 'unsupported YAML scalar');

  expectError('rejects unknown generator arguments', () => {
    const root = createFixture('arguments');
    run(['--unknown'], root);
  }, 'Unknown argument: --unknown');

  console.log(`Skill catalog generation tests passed: ${passed}`);
} finally {
  safeCleanup();
}
