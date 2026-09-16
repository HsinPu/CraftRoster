#!/usr/bin/env node

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const validator = path.join(root, 'scripts', 'validate-skill-evals.js');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-skill-evals-'));
let passed = 0;

function createCase(name) {
  const caseRoot = path.join(tempRoot, name);
  fs.mkdirSync(path.join(caseRoot, 'skills'), { recursive: true });
  return caseRoot;
}

function createSkill(caseRoot, name) {
  const skillDir = path.join(caseRoot, 'skills', name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Test fixture.\n---\n\n# ${name}\n`,
    'utf8'
  );
  return skillDir;
}

function writeCoverageManifest(caseRoot, requiredSkills) {
  const manifestDir = path.join(caseRoot, 'scripts', 'data');
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(
    path.join(manifestDir, 'skill-eval-coverage.json'),
    `${JSON.stringify({ schema_version: 1, required_skills: requiredSkills }, null, 2)}\n`,
    'utf8'
  );
}

function writeEvalDocument(caseRoot, name, document) {
  const skillDir = createSkill(caseRoot, name);
  const evalDir = path.join(skillDir, 'evals');
  fs.mkdirSync(evalDir, { recursive: true });
  fs.writeFileSync(path.join(evalDir, 'evals.json'), `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  return skillDir;
}

function writeValidEvalDocument(caseRoot, name) {
  return writeEvalDocument(caseRoot, name, {
    skill_name: name,
    evals: [
      {
        id: 1,
        prompt: 'Perform the requested task.',
        expected_output: 'An evidence-backed result.',
        assertions: ['The result contains an observable conclusion.'],
      },
    ],
  });
}

function writeRoutingDocument(caseRoot, name, document) {
  const skillDir = createSkill(caseRoot, name);
  const evalDir = path.join(skillDir, 'evals');
  fs.mkdirSync(evalDir, { recursive: true });
  fs.writeFileSync(path.join(evalDir, 'routing.json'), `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  return skillDir;
}

function runValidator(caseRoot) {
  return spawnSync(process.execPath, [validator, '--root', caseRoot], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

function combinedOutput(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

function expectPass(name, setup, expectedMessages = []) {
  const caseRoot = createCase(name);
  setup(caseRoot);
  const result = runValidator(caseRoot);
  const output = combinedOutput(result);
  if (result.status !== 0) {
    throw new Error(`${name}: valid fixture was rejected\n${output}`);
  }
  for (const message of expectedMessages) {
    if (!output.includes(message)) {
      throw new Error(`${name}: missing expected message ${JSON.stringify(message)}\n${output}`);
    }
  }
  passed += 1;
  console.log(`PASS ${name}`);
}

function expectRejected(name, setup, expectedMessages) {
  const caseRoot = createCase(name);
  setup(caseRoot);
  const result = runValidator(caseRoot);
  const output = combinedOutput(result);
  if (result.status !== 1) {
    throw new Error(`${name}: expected exit 1 but received ${result.status}\n${output}`);
  }
  for (const message of expectedMessages) {
    if (!output.includes(message)) {
      throw new Error(`${name}: missing expected message ${JSON.stringify(message)}\n${output}`);
    }
  }
  if (/TypeError|Cannot read properties of/i.test(output)) {
    throw new Error(`${name}: validator crashed instead of reporting a finding\n${output}`);
  }
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
    || !path.basename(resolvedTarget).startsWith('craftroster-skill-evals-')
  ) {
    throw new Error(`Refusing to clean unexpected test path: ${resolvedTarget}`);
  }
  fs.rmSync(resolvedTarget, { recursive: true, force: true });
}

try {
  expectPass('accepts localized public fixture metadata', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    const skillDir = writeEvalDocument(caseRoot, 'alpha-skill', {
      skill_name: 'alpha-skill', evals: [{ id: 1, prompt: '請檢查 local fixture。', locale: 'mixed-zh-TW-en',
        expected_output: 'An observable result.', assertions: ['The file is verified.'],
        fixture_root: 'evals/fixtures/local', files: ['evals/fixtures/local/input.txt'] }],
    });
    fs.mkdirSync(path.join(skillDir, 'evals/fixtures/local'), { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'evals/fixtures/local/input.txt'), 'sample');
  });

  expectRejected('rejects unsupported locale and mislabeled language', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    writeEvalDocument(caseRoot, 'alpha-skill', {
      skill_name: 'alpha-skill', evals: [
        { id: 1, prompt: 'English only.', locale: 'zh-TW', expected_output: 'Result.', assertions: ['Checked.'] },
        { id: 2, prompt: '只有中文。', locale: 'mixed-zh-TW-en', expected_output: 'Result.', assertions: ['Checked.'] },
        { id: 3, prompt: 'Example.', locale: 'unsupported', expected_output: 'Result.', assertions: ['Checked.'] },
      ],
    });
  }, ['Chinese locale needs', 'mixed locale needs English', 'locale must be']);

  expectRejected('rejects fixture files outside declared workspace root', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    writeEvalDocument(caseRoot, 'alpha-skill', {
      skill_name: 'alpha-skill', evals: [{ id: 1, prompt: 'Check fixture.', expected_output: 'Result.',
        assertions: ['Checked.'], fixture_root: 'evals/fixtures/local', files: ['SKILL.md'] }],
    });
  }, ['files must be nonempty and stay below fixture_root']);

  expectPass('accepts valid routing eval cases', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    writeValidEvalDocument(caseRoot, 'alpha-skill');
    createSkill(caseRoot, 'beta-skill');
    writeRoutingDocument(caseRoot, 'alpha-skill', {
      schema_version: 1,
      skill_name: 'alpha-skill',
      cases: [
        {
          id: 'positive-natural-request',
          kind: 'positive',
          prompt: 'Help me plan the best approach before implementation.',
          expected_skills: ['alpha-skill'],
          excluded_skills: [],
        },
        {
          id: 'near-match-other-owner',
          kind: 'near_match',
          prompt: 'The direction is approved; create implementation tickets.',
          expected_skills: ['beta-skill'],
          excluded_skills: ['alpha-skill'],
        },
      ],
    });
  }, ['2 routing cases']);

  expectRejected('rejects invalid routing eval contracts', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    writeValidEvalDocument(caseRoot, 'alpha-skill');
    writeRoutingDocument(caseRoot, 'alpha-skill', {
      schema_version: 2,
      skill_name: 'wrong-skill',
      cases: [
        {
          id: 'duplicate-case',
          kind: 'positive',
          prompt: ' ',
          expected_skills: ['beta-skill'],
          excluded_skills: ['beta-skill'],
        },
        {
          id: 'duplicate-case',
          kind: 'unknown',
          prompt: 'A valid prompt.',
          expected_skills: [],
          excluded_skills: [],
        },
      ],
    });
  }, [
    'routing.json: schema_version must be 1',
    'routing.json: skill_name must match the Skill directory (alpha-skill)',
    'cases[0].prompt must be a non-empty string',
    'cases[0] positive case must expect its owning Skill (alpha-skill)',
    'cases[0] contains Skill in both expected_skills and excluded_skills: beta-skill',
    'routing.json: duplicate case id: duplicate-case',
    'cases[1].kind must be positive, near_match, or negative',
    'cases[0].expected_skills references unknown Skill: beta-skill',
  ]);

  expectPass('accepts required, additional, and optional uncovered Skills', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    const skillDir = writeEvalDocument(caseRoot, 'alpha-skill', {
      skill_name: 'alpha-skill',
      evals: [
        {
          id: 1,
          prompt: 'Analyze the provided fixture.',
          expected_output: 'A concise evidence-backed report.',
          files: ['evals/files/input.txt'],
          assertions: ['The report cites the input file.', 'The report states a conclusion.'],
        },
        {
          id: 2,
          prompt: 'Handle the same task without an input file.',
          expected_output: 'A clear blocked result.',
          assertions: ['The response identifies the missing input.'],
        },
      ],
    });
    fs.mkdirSync(path.join(skillDir, 'evals', 'files'), { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'evals', 'files', 'input.txt'), 'fixture\n', 'utf8');
    writeValidEvalDocument(caseRoot, 'beta-skill');
    createSkill(caseRoot, 'gamma-skill');
  }, ['2/3 skills covered (66.7%), 3 evals, 4 assertions']);

  expectRejected('rejects malformed JSON', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    const skillDir = createSkill(caseRoot, 'alpha-skill');
    fs.mkdirSync(path.join(skillDir, 'evals'), { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'evals', 'evals.json'), '{ invalid', 'utf8');
  }, ['skills/alpha-skill/evals/evals.json: invalid JSON', 'Coverage: 1/1 skills covered']);

  expectRejected('rejects invalid root and collection shapes', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    writeEvalDocument(caseRoot, 'alpha-skill', []);
    writeEvalDocument(caseRoot, 'beta-skill', {
      skill_name: 'wrong-skill',
      evals: [],
    });
  }, [
    'skills/alpha-skill/evals/evals.json: root must be a JSON object',
    'skills/beta-skill/evals/evals.json: skill_name must match the Skill directory (beta-skill)',
    'skills/beta-skill/evals/evals.json: evals must be a non-empty array',
  ]);

  expectRejected('rejects invalid eval fields and duplicate ids', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    writeEvalDocument(caseRoot, 'alpha-skill', {
      skill_name: 'alpha-skill',
      evals: [
        null,
        { id: 0, prompt: ' ', expected_output: '', assertions: [] },
        {
          id: 1,
          prompt: 'Valid prompt.',
          expected_output: 'Valid expected output.',
          assertions: ['Repeated assertion.', 'Repeated assertion.', 42],
        },
        {
          id: 1,
          prompt: 'Another prompt.',
          expected_output: 'Another output.',
          assertions: ['Observable result.'],
          files: 'evals/files/input.txt',
        },
      ],
    });
  }, [
    'evals[0] must be an object',
    'evals[1].id must be a positive integer',
    'evals[1].prompt must be a non-empty string',
    'evals[1].expected_output must be a non-empty string',
    'evals[1].assertions must be a non-empty array',
    'evals[2] contains a duplicate assertion: Repeated assertion.',
    'evals[2].assertions[2] must be a non-empty string',
    'duplicate eval id: 1',
    'evals[3].files must be an array when declared',
  ]);

  expectRejected('rejects unsafe and invalid file references', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    const skillDir = writeEvalDocument(caseRoot, 'alpha-skill', {
      skill_name: 'alpha-skill',
      evals: [
        {
          id: 1,
          prompt: 'Use the declared files.',
          expected_output: 'A report based on valid inputs.',
          assertions: ['Every input is resolved safely.'],
          files: [
            '../outside.txt',
            'C:/outside.txt',
            'evals\\files\\input.txt',
            'evals/files/missing.txt',
            'evals/files',
            'evals/files/input.txt',
            'evals/files/input.txt',
          ],
        },
      ],
    });
    fs.mkdirSync(path.join(skillDir, 'evals', 'files'), { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'evals', 'files', 'input.txt'), 'fixture\n', 'utf8');
    fs.writeFileSync(path.join(caseRoot, 'skills', 'outside.txt'), 'outside\n', 'utf8');
  }, [
    'files[0] must be a normalized relative path without traversal segments',
    'files[1] must be relative to the Skill directory',
    'files[2] must use forward slashes',
    'files[3] does not exist: evals/files/missing.txt',
    'files[4] must reference a regular file: evals/files',
    'contains a duplicate file reference: evals/files/input.txt',
  ]);

  expectRejected('rejects an eval path that is not a file', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    const skillDir = createSkill(caseRoot, 'alpha-skill');
    fs.mkdirSync(path.join(skillDir, 'evals', 'evals.json'), { recursive: true });
  }, ['skills/alpha-skill/evals/evals.json: path must be a regular file']);

  expectRejected('rejects orphan evals without a Skill definition', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['orphan-skill']);
    const evalDir = path.join(caseRoot, 'skills', 'orphan-skill', 'evals');
    fs.mkdirSync(evalDir, { recursive: true });
    fs.writeFileSync(path.join(evalDir, 'evals.json'), '{}\n', 'utf8');
  }, ['skills/orphan-skill/evals/evals.json: evals exist but SKILL.md is missing']);

  expectRejected('rejects a repository without a skills directory', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['alpha-skill']);
    fs.rmdirSync(path.join(caseRoot, 'skills'));
  }, ['skills directory is missing', 'Coverage: 0/0 skills covered']);

  expectRejected('requires a coverage manifest', (caseRoot) => {
    writeValidEvalDocument(caseRoot, 'alpha-skill');
  }, ['scripts/data/skill-eval-coverage.json: file is missing']);

  expectRejected('rejects an empty coverage baseline', (caseRoot) => {
    writeCoverageManifest(caseRoot, []);
    writeValidEvalDocument(caseRoot, 'alpha-skill');
  }, ['scripts/data/skill-eval-coverage.json: required_skills must be a non-empty array']);

  expectRejected('rejects an unsorted or duplicate coverage baseline', (caseRoot) => {
    writeCoverageManifest(caseRoot, ['beta-skill', 'alpha-skill', 'alpha-skill']);
    writeValidEvalDocument(caseRoot, 'alpha-skill');
    writeValidEvalDocument(caseRoot, 'beta-skill');
  }, [
    'scripts/data/skill-eval-coverage.json: required_skills must be sorted in ascending order',
    'scripts/data/skill-eval-coverage.json: duplicate required Skill: alpha-skill',
  ]);

  {
    const caseRoot = createCase('rejects deleting one required eval package');
    writeCoverageManifest(caseRoot, ['alpha-skill', 'beta-skill']);
    writeValidEvalDocument(caseRoot, 'alpha-skill');
    writeValidEvalDocument(caseRoot, 'beta-skill');

    const beforeMutation = runValidator(caseRoot);
    if (beforeMutation.status !== 0) {
      throw new Error(`single-package mutation: baseline fixture was rejected\n${combinedOutput(beforeMutation)}`);
    }
    fs.rmSync(path.join(caseRoot, 'skills', 'alpha-skill', 'evals'), { recursive: true });

    const afterMutation = runValidator(caseRoot);
    const output = combinedOutput(afterMutation);
    if (
      afterMutation.status !== 1
      || !output.includes('skills/alpha-skill/evals/evals.json: required eval package is missing')
    ) {
      throw new Error(`single-package mutation: deleting a required eval package was not rejected\n${output}`);
    }
    passed += 1;
    console.log('PASS rejects deleting one required eval package');
  }

  {
    const caseRoot = createCase('rejects deleting all required eval packages');
    writeCoverageManifest(caseRoot, ['alpha-skill', 'beta-skill']);
    writeValidEvalDocument(caseRoot, 'alpha-skill');
    writeValidEvalDocument(caseRoot, 'beta-skill');

    const beforeMutation = runValidator(caseRoot);
    if (beforeMutation.status !== 0) {
      throw new Error(`all-packages mutation: baseline fixture was rejected\n${combinedOutput(beforeMutation)}`);
    }
    fs.rmSync(path.join(caseRoot, 'skills', 'alpha-skill', 'evals'), { recursive: true });
    fs.rmSync(path.join(caseRoot, 'skills', 'beta-skill', 'evals'), { recursive: true });

    const afterMutation = runValidator(caseRoot);
    const output = combinedOutput(afterMutation);
    if (
      afterMutation.status !== 1
      || !output.includes('skills/alpha-skill/evals/evals.json: required eval package is missing')
      || !output.includes('skills/beta-skill/evals/evals.json: required eval package is missing')
    ) {
      throw new Error(`all-packages mutation: deleting all required eval packages was not rejected\n${output}`);
    }
    passed += 1;
    console.log('PASS rejects deleting all required eval packages');
  }

  const badArgs = spawnSync(process.execPath, [validator, '--unknown'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (badArgs.status !== 2 || !combinedOutput(badArgs).includes('Usage: node scripts/validate-skill-evals.js')) {
    throw new Error(`invalid arguments: expected usage error with exit 2\n${combinedOutput(badArgs)}`);
  }
  passed += 1;
  console.log('PASS invalid arguments use exit 2');

  const repositoryResult = spawnSync(process.execPath, [validator], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  const repositoryOutput = combinedOutput(repositoryResult);
  if (repositoryResult.status !== 0 || !repositoryOutput.includes('Skill eval validation passed:')) {
    throw new Error(`repository seed evals failed validation\n${repositoryOutput}`);
  }
  passed += 1;
  console.log('PASS repository seed evals');

  console.log(`Skill eval tests passed: ${passed}`);
} finally {
  safeCleanup();
}
