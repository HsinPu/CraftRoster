#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-npm-pack-cache-'));
const stageBase = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-npm-package-stage-'));
const stageRoot = path.join(stageBase, 'package');
const token = `${process.pid}-${Date.now()}`;
const sentinelPaths = [
  path.join(root, `.env.craftroster-package-${token}`),
  path.join(root, `craftroster-package-${token}.tmp`),
  path.join(root, 'scripts', 'data', `craftroster-package-secret-${token}.json`)
];
const expectedRuntimeManifests = runtimeManifests();
const expectedTarball = `${packageJson.name.replace(/^@/, '').replace(/\//g, '-')}-${packageJson.version}.tgz`;
const expectedTarballPath = path.join(root, expectedTarball);
const tarballExistedBefore = fs.existsSync(expectedTarballPath);

function toPackagePath(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function runNpm(args, cwd, label) {
  const bundledNpm = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const npmExecPath = process.env.npm_execpath || (fs.existsSync(bundledNpm) ? bundledNpm : undefined);
  const command = npmExecPath || (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  if (!npmExecPath && process.platform === 'win32') {
    throw new Error('Cannot locate npm-cli.js; run this test through npm run test:package');
  }
  const result = spawnSync(npmExecPath ? process.execPath : command, commandArgs, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false'
    },
    shell: false
  });

  if (result.status !== 0) {
    throw new Error(
      `${label} failed with status ${result.status}\n${result.stdout || ''}${result.stderr || ''}`
    );
  }
  return result;
}

function runPack() {
  const result = runNpm([
    'pack',
    '--dry-run',
    '--json',
    '--ignore-scripts',
    '--cache',
    cacheRoot
  ], root, 'npm pack --dry-run');

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`npm pack did not return valid JSON: ${error.message}\n${result.stdout || ''}`);
  }
  assert(Array.isArray(report) && report.length === 1, 'npm pack must report exactly one package');
  assert(Array.isArray(report[0].files), 'npm pack report must include a files inventory');
  return report[0].files.map((file) => file.path.replace(/\\/g, '/'));
}

function assertIncluded(files, requiredPath) {
  assert(files.has(requiredPath), `package is missing required file: ${requiredPath}`);
}

function assertHasPrefix(files, prefix) {
  assert(
    [...files].some((file) => file.startsWith(prefix)),
    `package is missing required content under: ${prefix}`
  );
}

function normalizeDeclaredPath(value, label) {
  assert.strictEqual(typeof value, 'string', `${label} must be a string path`);
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  assert(
    normalized !== '' &&
      !normalized.startsWith('/') &&
      !/^[A-Za-z]:\//.test(normalized) &&
      !normalized.split('/').includes('..'),
    `${label} must stay inside the package: ${value}`
  );
  return normalized;
}

function declaredRuntimeEntrypoints(document) {
  const entrypoints = new Set();
  const bins = typeof document.bin === 'string' ? { [document.name]: document.bin } : (document.bin || {});
  for (const [name, value] of Object.entries(bins)) {
    entrypoints.add(normalizeDeclaredPath(value, `package.json bin.${name}`));
  }

  const commandPathPattern = /(?:^|[\s"'=])((?:scripts|tests)\/[A-Za-z0-9._/-]+\.(?:js|cjs|mjs|ps1|sh|cmd))(?=$|[\s"'&|;])/g;
  for (const [name, command] of Object.entries(document.scripts || {})) {
    assert.strictEqual(typeof command, 'string', `package.json scripts.${name} must be a string`);
    const normalizedCommand = command.replace(/\\/g, '/');
    for (const match of normalizedCommand.matchAll(commandPathPattern)) {
      entrypoints.add(normalizeDeclaredPath(match[1], `package.json scripts.${name}`));
    }
  }
  return [...entrypoints].sort();
}

function runtimeManifests() {
  return fs.readdirSync(path.join(root, 'scripts', 'data'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.tsv')))
    .map((entry) => `scripts/data/${entry.name}`)
    .sort();
}

function assertRuntimeClosure(files, document = packageJson) {
  for (const entrypoint of declaredRuntimeEntrypoints(document)) {
    assert(files.has(entrypoint), `package is missing declared runtime entrypoint: ${entrypoint}`);
  }
  for (const manifest of expectedRuntimeManifests) {
    assert(files.has(manifest), `package is missing runtime manifest: ${manifest}`);
  }
}

function materializePackage(inventory) {
  fs.mkdirSync(stageRoot, { recursive: true });
  for (const packagePath of inventory) {
    const segments = packagePath.split('/');
    assert(
      packagePath !== '' &&
        !packagePath.startsWith('/') &&
        !segments.includes('..') &&
        !segments.includes('.'),
      `npm pack returned an unsafe path: ${packagePath}`
    );
    const source = path.join(root, ...segments);
    assert(fs.statSync(source).isFile(), `npm pack inventory path is not a regular file: ${packagePath}`);
    const destination = path.join(stageRoot, ...segments);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}

function runProcess(command, args, cwd, label) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with status ${result.status}\n${result.stdout || ''}${result.stderr || ''}`);
  }
}

function verifyStagedPackage() {
  runProcess(process.execPath, ['craftroster-cli.js', '--help'], stageRoot, 'packed craftroster --help');
  for (const scriptName of [
    'validate',
    'test:skill-catalog',
    'test:skill-evals',
    'test:skill-routing',
    'test:skill-originality',
    'test:skill-sources'
  ]) {
    runNpm(['run', '--silent', scriptName], stageRoot, `packed npm run ${scriptName}`);
  }
}

try {
  assert.strictEqual(packageJson.name, 'craftroster', 'package name must match the public brand');
  assert.deepStrictEqual(
    packageJson.bin,
    { craftroster: './craftroster-cli.js' },
    'package must expose only the craftroster CLI'
  );
  for (const sentinelPath of sentinelPaths) {
    assert(!fs.existsSync(sentinelPath), `refusing to overwrite package test sentinel: ${sentinelPath}`);
    fs.writeFileSync(sentinelPath, 'CRAFTROSTER PACKAGE INVENTORY TEST SENTINEL\n', 'utf8');
  }

  const inventory = runPack();
  const files = new Set(inventory);
  assert.strictEqual(files.size, inventory.length, 'package inventory contains duplicate paths');
  assertRuntimeClosure(files);

  const missingEntrypoint = new Set(files);
  missingEntrypoint.delete('scripts/generate-skill-catalog.js');
  assert.throws(
    () => assertRuntimeClosure(missingEntrypoint),
    /package is missing declared runtime entrypoint: scripts\/generate-skill-catalog\.js/,
    'runtime entrypoint mutation must be rejected'
  );

  const missingManifest = new Set(files);
  missingManifest.delete('scripts/data/skill-eval-coverage.json');
  assert.throws(
    () => assertRuntimeClosure(missingManifest),
    /package is missing runtime manifest: scripts\/data\/skill-eval-coverage\.json/,
    'runtime manifest mutation must be rejected'
  );

  for (const requiredPath of [
    'package.json',
    'craftroster-cli.js',
    'agents.json',
    'skills.json',
    'README.md',
    'LICENSE',
    'scripts/install.cmd',
    'scripts/install.ps1',
    'scripts/install.sh',
    'scripts/setup.ps1',
    'scripts/setup.sh',
    'scripts/data/agent-reference-sources.json',
    'scripts/data/agent-coverage-matrix.json',
    'scripts/data/skill-catalog.json',
    'scripts/data/skill-eval-coverage.json',
    'scripts/data/skill-reference-lock.json',
    'scripts/data/skill-reference-sources.json',
    'scripts/data/wshobson-agent-inventory.json'
  ]) {
    assertIncluded(files, requiredPath);
  }

  assertHasPrefix(files, 'agents/');
  assertHasPrefix(files, 'skills/');
  for (const adapter of fs.readdirSync(path.join(root, 'adapters'), { withFileTypes: true })) {
    if (adapter.isDirectory()) assertHasPrefix(files, `adapters/${adapter.name}/`);
  }

  for (const sentinelPath of sentinelPaths) {
    assert(!files.has(toPackagePath(sentinelPath)), `package includes test sentinel: ${toPackagePath(sentinelPath)}`);
  }

  const forbiddenPaths = inventory.filter((file) => {
    const segments = file.split('/');
    const basename = segments[segments.length - 1];
    return file.startsWith('.git/') ||
      file.startsWith('.github/') ||
      file.startsWith('.codex/') ||
      file.startsWith('.agents/') ||
      file.startsWith('node_modules/') ||
      basename.startsWith('.env') ||
      basename === '.npmrc' ||
      basename === '.DS_Store' ||
      basename === 'Thumbs.db' ||
      /(?:^|\.)(?:tmp|temp|bak|tgz|pem|key)$/i.test(basename) ||
      /~$/.test(basename);
  });
  assert.deepStrictEqual(forbiddenPaths, [], `package includes temporary or sensitive paths: ${forbiddenPaths.join(', ')}`);
  assert.strictEqual(
    fs.existsSync(expectedTarballPath),
    tarballExistedBefore,
    `npm pack --dry-run changed tarball presence: ${expectedTarball}`
  );

  materializePackage(inventory);
  verifyStagedPackage();

  console.log(
    `Package inventory test passed: ${inventory.length} files, ` +
      `${declaredRuntimeEntrypoints(packageJson).length} declared entrypoints, ${expectedRuntimeManifests.length} manifests`
  );
} finally {
  for (const sentinelPath of sentinelPaths) {
    fs.rmSync(sentinelPath, { force: true });
  }
  if (!tarballExistedBefore) fs.rmSync(expectedTarballPath, { force: true });
  fs.rmSync(cacheRoot, { recursive: true, force: true });
  fs.rmSync(stageBase, { recursive: true, force: true });
}
