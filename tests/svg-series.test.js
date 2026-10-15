#!/usr/bin/env node
'use strict';

// Exercise the published catalog and real installers rather than synthetic
// dependency fixtures. Every install is confined to a private temporary project.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const names = ['svg-development', 'svg-design', 'svg-illustration', 'svg-vectorization',
  'svg-animation', 'svg-optimization', 'svg-visual-validation'].sort();
const webNames = names.filter(name => !['svg-illustration', 'svg-vectorization'].includes(name));
const options = { shell: process.platform === 'win32' ? 'powershell' : 'bash' };
for (let index = 2; index < process.argv.length; index += 1) {
  const flag = process.argv[index];
  if (flag === '--definitions') options.definitions = true;
  else if (flag === '--helper-only') options.helperOnly = true;
  else if (['--shell', '--powershell', '--python'].includes(flag)) {
    const value = process.argv[++index];
    assert(value && !value.startsWith('--'), `${flag} requires a value`);
    options[flag.slice(2)] = value;
  } else if (flag === '--help') {
    console.log('Usage: node tests/svg-series.test.js [--definitions|--helper-only] [--shell powershell|bash] [--powershell executable] [--python executable]');
    process.exit(0);
  } else throw new Error(`Unknown option: ${flag}`);
}
assert(['powershell', 'bash'].includes(options.shell), 'Unsupported shell');
assert(!(process.platform === 'win32' && options.shell === 'bash'),
  'Run Bash coverage on native Linux/macOS; Windows coverage uses PowerShell');
const parent = fs.realpathSync.native(os.tmpdir());
const temporary = fs.mkdtempSync(path.join(parent, 'craftroster-svg-series-'));
let passed = 0;
function test(name, action) { action(); passed += 1; console.log(`PASS ${name}`); }
function json(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function execute(command, args, settings = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true,
    shell: false, maxBuffer: 8 * 1024 * 1024, timeout: 600000, ...settings });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  assert(!result.error, `${command}: ${result.error && result.error.message}\n${output}`);
  assert.equal(result.signal, null, output);
  return { ...result, output };
}
function files(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap(entry => {
    assert(!entry.isSymbolicLink(), `Unexpected package link: ${entry.name}`);
    const child = path.join(relative, entry.name);
    return entry.isDirectory() ? files(directory, child) : [child];
  }).sort();
}
function svgNames(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('svg-')).map(entry => entry.name).sort();
}
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function snapshot(directory) {
  return files(directory).map(relative => {
    const file = path.join(directory, relative);
    if (/\.json$/.test(relative)) {
      const metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (metadata.component && metadata.updatedAt) {
        delete metadata.updatedAt;
        return [relative, Object.fromEntries(Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b)))];
      }
    }
    return [relative, hash(file)];
  });
}
function packageMatches(name, destination) {
  const source = path.join(root, 'skills', name);
  const expected = files(source);
  assert(expected.includes('SKILL.md'));
  assert(expected.some(file => /(?:license|notice|sources)/i.test(file)), `${name} has no packaged attribution`);
  for (const relative of expected) {
    assert.equal(hash(path.join(destination, name, relative)), hash(path.join(source, relative)), `${name}/${relative} was omitted or changed`);
  }
}

try {
  const catalog = json('scripts/data/skill-catalog.json').skills;
  const registry = json('scripts/data/install-bundles.json');
  const agents = json('agents.json');
  if (!options.helperOnly) {
  test('seven published SVG Skills remain independently installable', () => {
    const published = json('skills.json').skills;
    for (const name of names) {
      assert(catalog[name], `Missing source catalog entry: ${name}`);
      assert(published.some(entry => entry.name === name), `Missing generated catalog entry: ${name}`);
      assert(!(catalog[name].dependencies || []).some(edge => edge.kind === 'required'), `${name} unexpectedly requires another package`);
      assert(fs.statSync(path.join(root, 'skills', name, 'SKILL.md')).isFile());
    }
  });
  test('image and web purpose bundles expose the intended SVG subsets', () => {
    for (const [id, expected] of [['image-graphics', names], ['web-interface', webNames]]) {
      const bundle = registry.bundles.find(entry => entry.id === id);
      assert(bundle, `Missing bundle ${id}`);
      assert.deepEqual(bundle.skills.filter(name => name.startsWith('svg-')).sort(), expected);
      assert(bundle.agents.length > 0, `${id} must include related Agents`);
      for (const role of bundle.agents) assert(agents.agents.some(entry => entry.id === role), `Unknown Agent ${role}`);
    }
  });
  }
  if (!options.definitions) {
    const helper = path.join(root, 'skills/svg-visual-validation/scripts/inspect_svg.py');
    const python = options.python || (process.platform === 'win32' ? 'python' : 'python3');
    const helperEnvironment = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };
    let fixture = 0;
    function inspect(content, profile = 'static', expected = 0) {
      const input = path.join(temporary, `input-${++fixture}.svg`);
      fs.writeFileSync(input, content);
      const digest = hash(input);
      const result = execute(python, [helper, '--profile', profile, input], {
        timeout: 30000, env: helperEnvironment
      });
      assert.equal(result.status, expected, result.output);
      const report = JSON.parse(result.stdout);
      assert.equal(report.schema_version, 1);
      assert.equal(report.profile, profile);
      assert.equal(report.input_sha256, digest);
      assert.equal(hash(input), digest, 'Inspector mutated its source');
      assert(Array.isArray(report.errors) && Array.isArray(report.warnings));
      return report;
    }
    const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">${body}</svg>`;
    test('local defs, reused geometry and meaningful static paths pass without mutation', () => {
      inspect(wrap('<defs><path id="line" d="M1 1 L19 19"/></defs><use href="#line"/>'));
    });
    test('profile distinction preserves web animation while rejecting it as static art', () => {
      const content = wrap('<style>path{fill:red}</style><path d="M1 1L19 19"><animate attributeName="opacity" values="0;1" dur="1s"/></path>');
      inspect(content, 'static', 1);
      const report = inspect(content, 'web');
      assert(report.warnings.length > 0, 'Web-only features require a visual/browser warning');
    });
    test('XML stylesheet processing instructions are identified across both profiles', () => {
      const content = '<?xml-stylesheet href="https://example.invalid/art.css" type="text/css"?>' + wrap('<path d="M1 1L19 19"/>');
      const staticReport = inspect(content, 'static', 1);
      assert(staticReport.features.includes('processing-instruction'));
      const webReport = inspect(content, 'web');
      assert(webReport.features.includes('processing-instruction'));
      assert(webReport.warnings.length > 0);
    });
    test('URL-like accessible text stays literal while real paint and style references are checked', () => {
      inspect(wrap('<path aria-label="url(#missing)" data-example="url(#missing)" d="M1 1L19 19"/>'));
      for (const attribute of ['fill', 'stroke', 'style']) {
        const value = attribute === 'style' ? 'fill:url(#missing)' : 'url(#missing)';
        const report = inspect(wrap(`<path ${attribute}="${value}" d="M1 1L19 19"/>`), 'web', 1);
        assert(report.errors.some(error => /Missing local reference/.test(error)), `${attribute} skipped local-reference checking`);
      }
    });
    test('CSS comments and ordinary quoted strings do not invent local references', () => {
      const report = inspect(wrap(`<style>
        /* url(#missing-comment) */
        path { fill: red; --example: "url(#missing-string)"; }
        text::before { content: 'url(#missing-content)'; }
      </style><path style="/* url(#missing-inline) */ fill:red"/>`), 'web');
      assert(!report.errors.some(error => /Missing local reference/.test(error)));
      assert(!report.features.includes('external-reference'));
    });
    test('CSS escaped URL function names and fragment IDs resolve actual references', () => {
      const style = String.raw`path { fill: u\72l(#\67 radient); stroke: URL("#gradient"); }`;
      inspect(wrap(`<defs><linearGradient id="gradient"/></defs><style>${style}</style><path/>`), 'web');
      const missing = inspect(wrap(`<style>${style}</style><path/>`), 'web', 1);
      assert(missing.errors.some(error => /Missing local reference: gradient/.test(error)));
    });
    test('CSS imports and unsupported URL syntax request host review without guessed references', () => {
      for (const css of ['@import "https://example.invalid/art.css";',
        String.raw`@\69mport url("https://example.invalid/art.css");`]) {
        const report = inspect(wrap(`<style>${css}</style>`), 'web');
        assert(report.features.includes('external-reference'), 'A stylesheet import was overlooked');
        assert(report.warnings.length > 0);
        inspect(wrap(`<style>${css}</style>`), 'static', 1);
      }
      for (const css of ['path { fill: url(#missing; }', 'path { fill: url("#missing" junk); }']) {
        const report = inspect(wrap(`<style>${css}</style>`), 'web');
        assert(report.warnings.some(warning => /url|syntax|unsupported/i.test(warning)),
          'Malformed CSS URL must be identified for host review');
        assert(!report.errors.some(error => /Missing local reference/.test(error)),
          'Malformed CSS must not fabricate a fragment reference');
      }
    });
    test('custom namespace attributes remain metadata rather than SVG behavior', () => {
      const body = '<path xmlns:meta="urn:craftroster:test-metadata" meta:oncall="support" ' +
        'meta:href="#missing-href" meta:style="fill:url(#missing-style)" ' +
        'meta:fill="url(#missing-fill)" meta:aria-labelledby="missing-label" d="M1 1L19 19"/>';
      for (const profile of ['static', 'web']) {
        const report = inspect(wrap(body), profile);
        assert.deepEqual(report.features, [], 'Metadata attributes activated SVG feature detection');
      }
      const editorMetadata = '<metadata xmlns:editor="urn:craftroster:editor">' +
        '<editor:style href="#missing-editor" onclick="saved-handler">' +
        'path { fill: url(#not-svg); }</editor:style></metadata>';
      const webReport = inspect(wrap(editorMetadata), 'web');
      assert.deepEqual(webReport.errors, [], 'Foreign editor metadata was interpreted as SVG content');
      assert.deepEqual(webReport.features, ['foreign-content']);
      const staticReport = inspect(wrap(editorMetadata), 'static', 1);
      assert.deepEqual(staticReport.features, ['foreign-content']);
      assert(staticReport.errors.every(error => /foreign-content/.test(error)),
        'Static metadata rejection invented executable behavior or missing references');
      inspect(wrap('<path onclick="alert(1)"/>'), 'static', 1);
    });
    test('SVG2 href takes precedence while xlink-only targets are still checked', () => {
      const declaration = 'xmlns:xlink="http://www.w3.org/1999/xlink"';
      for (const profile of ['static', 'web']) {
        inspect(wrap(`<defs><path id="real"/></defs><use ${declaration} href="#real" xlink:href="#missing"/>`), profile);
        inspect(wrap(`<defs><path id="real"/></defs><use ${declaration} href="#real" xlink:href="https://example.invalid/art.svg"/>`), profile);
        inspect(wrap(`<defs><path id="real"/></defs><use ${declaration} xlink:href="#real"/>`), profile);
        const missing = inspect(wrap(`<use ${declaration} xlink:href="#missing"/>`), profile, 1);
        assert(missing.errors.some(error => /Missing local reference: missing/.test(error)));
        inspect(wrap(`<defs><path id="real"/></defs><use ${declaration} href="" xlink:href="#missing"/>`), profile);
      }
    });
    test('viewBox follows SVG numeric and separator grammar rather than Python float syntax', () => {
      const valid = ['0 0 20 20', '0,0,20,20', ' +0 , -0 , .5 , 2. ',
        '0\t0\n2e1\r2E+1', '-1.5 +2.5 2e-1 3.0E+2'];
      const invalid = ['0 0 2_0 20', '0,,0,20,20', ',0 0 20 20', '0 0 20 20,',
        '0 0 1.2.3', '0 0 20+20', '0 0 + 20', '0 0 NaN 20', '0 0 1e999 20',
        '0 0 0 20', '0 0 -1 20', '0\u00a00 20 20'];
      for (const viewBox of valid) {
        inspect(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"/>`);
      }
      for (const viewBox of invalid) {
        for (const profile of ['static', 'web']) {
          const report = inspect(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"/>`, profile, 1);
          assert(report.errors.some(error => /viewBox/.test(error)));
        }
      }
    });
    test('broken local references, duplicate IDs and malformed viewBox fail both profiles', () => {
      for (const profile of ['static', 'web']) {
        inspect(wrap('<path id="same"/><g id="same"/>'), profile, 1);
        inspect(wrap('<use href="#absent"/>'), profile, 1);
        inspect('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 nope 20"/>', profile, 1);
      }
    });
    test('DTD and entity declarations never enter the XML parser as ordinary SVG', () => {
      inspect('<!DOCTYPE svg [<!ENTITY x "expanded">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>', 'static', 1);
    });
    test('raster, executable content and external references are rejected for static SVG', () => {
      for (const body of ['<image href="data:image/png;base64,AA=="/>', '<script>alert(1)</script>',
        '<path onclick="alert(1)"/>', '<use href="https://example.invalid/art.svg#path"/>']) inspect(wrap(body), 'static', 1);
    });
    test('missing input returns a structured input error without producing output artifacts', () => {
      const missing = path.join(temporary, 'missing.svg');
      const result = execute(python, [helper, '--profile', 'static', missing], { timeout: 30000, env: helperEnvironment });
      assert.equal(result.status, 2, result.output);
      assert(JSON.parse(result.stdout).errors.length > 0);
      assert(!fs.existsSync(missing));
    });
    test('oversized and excessively nested SVG inputs fail within the documented bounds', () => {
      const oversized = path.join(temporary, 'oversized.svg');
      fs.writeFileSync(oversized, Buffer.alloc(5 * 1024 * 1024 + 1, 32));
      const result = execute(python, [helper, oversized], { timeout: 30000, env: helperEnvironment });
      assert.equal(result.status, 1, result.output);
      const report = JSON.parse(result.stdout);
      assert.equal(report.input_sha256, null, 'A bounded prefix must not be advertised as the full input hash');
      assert(report.errors.length > 0);
      inspect(wrap('<g>'.repeat(130) + '</g>'.repeat(130)), 'static', 1);
    });
    if (!options.helperOnly) {
    const executable = options.shell === 'powershell' ? options.powershell || 'powershell.exe' : 'bash';
    const script = path.join(root, 'scripts', options.shell === 'powershell' ? 'install.ps1' : 'install.sh');
    const home = path.join(temporary, 'isolated-home');
    fs.mkdirSync(home);
    const runtimeTemp = path.join(temporary, 'runtime-temp');
    fs.mkdirSync(runtimeTemp);
    const environment = { ...process.env, HOME: home, USERPROFILE: home, CODEX_HOME: path.join(home, '.codex'),
      XDG_CONFIG_HOME: path.join(home, '.config'), OPENCODE_CONFIG_DIR: path.join(home, '.config/opencode'),
      APPDATA: path.join(home, 'AppData/Roaming'), LOCALAPPDATA: path.join(home, 'AppData/Local'),
      TMPDIR: runtimeTemp, TEMP: runtimeTemp, TMP: runtimeTemp,
      POWERSHELL_TELEMETRY_OPTOUT: '1' };
    delete environment.PSModulePath;
    function install(project, type, selection) {
      const args = options.shell === 'powershell'
        ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-SourceDir', root,
          '-Target', 'project', '-ProjectPlatform', 'codex', '-InstallDir', project, '-Type', type,
          type === 'skill' ? '-Name' : '-Bundle', selection]
        : [script, '--source-dir', root, '--target', 'project', '--project-platform', 'codex', '--dir', project,
          '--type', type, type === 'skill' ? '--name' : '--bundle', selection];
      const result = execute(executable, args, { env: environment });
      assert.equal(result.status, 0, result.output);
    }
    for (const name of names) {
      test(`${options.shell}: ${name} installs alone with all of its packaged resources`, () => {
        const project = path.join(temporary, name);
        install(project, 'skill', name);
        const destination = path.join(project, '.agents/skills');
        assert.deepEqual(fs.readdirSync(destination).sort(), [name]);
        packageMatches(name, destination);
        assert(!fs.existsSync(path.join(project, '.codex')), 'A Skill-only install unexpectedly installed Agents');
      });
    }
    for (const [id, expected] of [['image-graphics', names], ['web-interface', webNames]]) {
      test(`${options.shell}: ${id} installs related Agents and SVG resources; update preserves unrelated files`, () => {
        const project = path.join(temporary, id);
        fs.mkdirSync(project);
        const marker = path.join(project, 'user-notes.txt');
        fs.writeFileSync(marker, 'Keep this user-owned file.\n');
        install(project, 'bundle', id);
        const destination = path.join(project, '.agents/skills');
        assert.deepEqual(svgNames(destination), expected);
        for (const name of expected) packageMatches(name, destination);
        const bundle = registry.bundles.find(entry => entry.id === id);
        const installedAgents = fs.readdirSync(path.join(project, '.codex/agents'));
        assert.deepEqual(installedAgents.filter(file => file.endsWith('.toml')).sort(),
          bundle.agents.map(role => `${role}.toml`).sort(), 'Bundled Agents differ from the selected purpose');
        const before = snapshot(project);
        install(project, 'bundle', id);
        assert.deepEqual(snapshot(project), before, 'Repeating an unchanged install changed installed payloads or ownership');
        assert.equal(fs.readFileSync(marker, 'utf8'), 'Keep this user-owned file.\n');
      });
    }
    test('explicit project installs never create global Skill or Agent directories', () => {
      for (const relative of ['.codex/skills', '.codex/agents', '.agents/skills', '.config/opencode/skills'])
        assert(!fs.existsSync(path.join(home, relative)), `Unexpected global installation: ${relative}`);
    });
    }
  }
  console.log(`SVG series checks passed (${passed}).`);
} finally {
  // Never remove a shell-provided or computed project root: only our own exact
  // mkdtemp result, checked against its verified system temporary parent.
  assert.equal(path.dirname(temporary), parent);
  assert(path.basename(temporary).startsWith('craftroster-svg-series-'));
  assert(!fs.lstatSync(temporary).isSymbolicLink());
  fs.rmSync(temporary, { recursive: true, force: true });
}
