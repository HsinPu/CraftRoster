#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const options = {};
for (let i = 2; i < process.argv.length; i++) {
  assert(['--powershell', '--bash'].includes(process.argv[i]), `Unknown option ${process.argv[i]}`);
  const key = process.argv[i].slice(2), value = process.argv[++i];
  assert(value && !value.startsWith('--'), `${key} requires an executable`);
  options[key] = value;
}
// Windows CI can expose TEMP through an 8.3 alias (RUNNER~1). Use the native
// canonical path for both fixtures and cleanup, matching .NET file resolution.
const temporary = fs.realpathSync.native(fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'craftroster-opencode-config-')));
const shell = fs.readFileSync(path.join(root, 'scripts/install.sh'), 'utf8').replace(/\r\n/g, '\n');
let passed = 0, skipped = 0, sequence = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
function execute(command, args, env) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 120000,
    maxBuffer: 4 * 1024 * 1024, env: env || process.env });
  assert(!result.error, `${command}: ${result.error && result.error.message}`);
  return result;
}
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
function fixture() { const dir = path.join(temporary, String(++sequence)); fs.mkdirSync(dir); return dir; }

// A separate, small JSONC reader for assertions: lex comments, then remove only
// commas outside strings immediately before a container terminator.
function parse(text) {
  text = text.replace(/^\uFEFF/, '');
  let out = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { out += c; if (c === '\\') out += text[++i]; else if (c === '"') quoted = false; continue; }
    if (c === '"') { quoted = true; out += c; continue; }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && text[i + 1] === '*') { const end = text.indexOf('*/', i + 2); assert(end >= 0); i = end + 1; out += ' '; continue; }
    out += c;
  }
  let clean = ''; quoted = false;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (quoted) { clean += c; if (c === '\\') clean += out[++i]; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    if (c === ',' && /^[\s]*[}\]]/.test(out.slice(i + 1))) continue;
    clean += c;
  }
  return JSON.parse(clean);
}

const guidance = '/fixture/技能/global-auto-delegation.md';
const valid = [
  ['strict object', '{}', [], []],
  ['strict instructions', '{"instructions":["user.md"],"model":"old"}', [], ['user.md']],
  ['comments and trailing commas', '{/* note */"instructions":["user.md", // keep\n],"large":900719925474099312345,}', [], ['user.md']],
  ['line comment after final value', '{"instructions":["user.md" // final\n] // object\n}', [], ['user.md']],
  ['empty commented array', '{"instructions":[/*empty*/],}', [], []],
  ['comment-only object', '{// note\n}', [], []],
  ['strings are not comments', '{"url":"https://example.test/a//b", "quote":"a\\\"/*b",}', [], []],
  ['BOM Unicode CRLF', '\uFEFF{\r\n// 中文\r\n"model":"模型",\r\n"number":1.00e+20,\r\n}', [], []],
  ['inherit lower instructions', '{"model":"higher",}', ['{"instructions":["lower.md"]}'], ['lower.md']],
  ['highest fallback wins', '{}', ['{"instructions":["legacy.md"]}', '{"instructions":["lower.md"]}'], ['lower.md']],
  ['own instructions override lower', '{"instructions":["own.md"]}', ['{"instructions":["lower.md"]}'], ['own.md']],
  ['own empty instructions override lower', '{"instructions":[]}', ['{"instructions":["lower.md"]}'], []],
  ['inherited guidance is not duplicated', '{}', [JSON.stringify({instructions:[guidance]})], []],
];
const invalid = ['{"instructions":null}', '{"instructions":"x"}', '{"instructions":[1]}',
  '{"instructions":[],"instructions":[]}', '{"Instructions":[]}', '{"x":{"a":1,"a":2}}',
  '{"x":1,,}', '{/* unterminated', '{"x":01}', '{"x":NaN}', '{"x":"unfinished}',
  '{"instructions":[],"\\u0069nstructions":[]}'];

function mergerTests(kind, executable) {
  const marker = kind === 'node' ? 'JS' : 'PY';
  const section = shell.slice(shell.indexOf(`merge_opencode_config_with_${kind}()`));
  const match = new RegExp(`<<'${marker}'\\n([\\s\\S]*?)\\n${marker}\\n`).exec(section);
  assert(match, `Missing ${kind} merger`);
  const program = path.join(temporary, `merger.${kind === 'node' ? 'js' : 'py'}`);
  write(program, match[1]);
  for (const [name, text, lower, expected] of valid) test(`${kind}: ${name}, original bytes and idempotency`, () => {
    const dir = fixture(), input = path.join(dir, 'input'), output = path.join(dir, 'output');
    write(input, text);
    const files = lower.map((content, i) => { const file = path.join(dir, `lower-${i}`); write(file, content); return file; });
    let result = execute(executable, [program, input, guidance, output, ...files]);
    assert([0, 3].includes(result.status), result.stderr);
    const actual = fs.readFileSync(output, 'utf8');
    assert.deepEqual(parse(actual).instructions, [...expected, guidance]);
    assert.equal(fs.readFileSync(input, 'utf8'), text);
    for (const literal of ['/* note */', '// keep', '// final', '// object', '// 中文', '900719925474099312345', '1.00e+20'])
      if (text.includes(literal)) assert(actual.includes(literal), `Lost literal ${literal}`);
    if (text.startsWith('\uFEFF')) assert(actual.startsWith('\uFEFF'));
    if (text.includes('\r\n')) assert(!actual.replace(/\r\n/g, '').includes('\n'));
    const second = path.join(dir, 'second');
    result = execute(executable, [program, output, guidance, second, ...files]);
    assert.equal(result.status, 3, result.stderr);
    assert.deepEqual(fs.readFileSync(second), fs.readFileSync(output));
  });
  for (const [i, text] of invalid.entries()) test(`${kind}: rejects malformed or ambiguous config ${i + 1}`, () => {
    const dir = fixture(), input = path.join(dir, 'input'), output = path.join(dir, 'output'); write(input, text);
    const result = execute(executable, [program, input, guidance, output]);
    assert.equal(result.status, 4, result.stderr);
    assert(!fs.existsSync(output)); assert.equal(fs.readFileSync(input, 'utf8'), text);
  });
  test(`${kind}: validates fallback even when target owns instructions`, () => {
    const dir = fixture(), input = path.join(dir, 'input'), output = path.join(dir, 'output'), lower = path.join(dir, 'lower');
    write(input, '{"instructions":[]}'); write(lower, '{"instructions":null}');
    assert.equal(execute(executable, [program, input, guidance, output, lower]).status, 4);
    assert(!fs.existsSync(output));
  });
}

function powershellTests(executable) {
  const driver = path.join(temporary, 'driver.ps1');
  write(driver, `param([string]$Backend,[string]$Request)\n$ErrorActionPreference='Stop'\n$tokens=$null;$errors=$null\n$ast=[System.Management.Automation.Language.Parser]::ParseFile($Backend,[ref]$tokens,[ref]$errors)\nif($errors.Count){throw $errors[0]}\n$names=@('Get-HomeDir','Get-ConfigHome','Get-OpenCodeConfigRoot','Read-StrictUtf8Text','Assert-RegularConfigFile','Get-FileSha256','Get-OpenCodeConfigLayout','Assert-StrictJsonText','Add-OpenCodeInstructionToJsonText','Get-OpenCodeAutoDelegationPlan','Assert-AutoDelegationConfigInputs','Invoke-AutoDelegationPlan')\nforeach($definition in $ast.FindAll({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $names -contains $node.Name},$true)){Invoke-Expression $definition.Extent.Text}\nfunction Write-Info {param($Message)}\nfunction Write-Success {param($Message)}\n$JsonStringOptions=@{}\nif((Get-Command ConvertFrom-Json).Parameters.ContainsKey('NoEnumerate')){$JsonStringOptions.NoEnumerate=$true}\nif((Get-Command ConvertFrom-Json).Parameters.ContainsKey('DateKind')){$JsonStringOptions.DateKind='String'}\n$r=Get-Content -Raw -LiteralPath $Request | ConvertFrom-Json\n$env:USERPROFILE=$r.home;$env:XDG_CONFIG_HOME=Join-Path $r.home '.config';$env:OPENCODE_CONFIG_DIR=$r.configRoot\n$DryRun=[bool]$r.dry\ntry {\nif($r.strict){$null=Assert-StrictJsonText -Text $r.strict -Path 'metadata';'STRICT_OK';exit}\n$p=Get-OpenCodeAutoDelegationPlan -InstructionPath $r.guidance\nif($r.mutate){if($r.mutateMode -eq 'delete'){Remove-Item -LiteralPath $r.mutate}else{[IO.File]::WriteAllText($r.mutate,'{"changed":true}')}}\nInvoke-AutoDelegationPlan -Plan $p\n@{action=$p.Action;path=$p.ConfigPath}|ConvertTo-Json -Compress\n}catch{[Console]::Error.WriteLine($_.Exception.Message);exit 1}\n`);
  function invoke(documents, settings={}) {
    const dir=fixture(), home=path.join(dir,'home'), configRoot=settings.custom ? path.join(dir,'custom') : path.join(home,'.config/opencode');
    fs.mkdirSync(configRoot,{recursive:true});
    for(const [name,content] of Object.entries(documents))write(path.join(configRoot,name),content);
    if(settings.directory)fs.mkdirSync(path.join(configRoot,settings.directory));
    const request={home,configRoot,guidance:path.join(dir,'guidance.md'),...settings};
    if(settings.mutateName)request.mutate=path.join(configRoot,settings.mutateName);
    const file=path.join(dir,'request.json');write(file,JSON.stringify(request));
    const result=execute(executable,['-NoProfile','-ExecutionPolicy','Bypass','-File',driver,'-Backend',path.join(root,'scripts/install.ps1'),'-Request',file]);
    return {dir,configRoot,result,request};
  }
  for(const [name,documents,expected,target] of [
    ['dual own',{'opencode.json':'{"instructions":["lower.md"]}','opencode.jsonc':'{/*note*/"instructions":["own.md",],}'},['own.md'],'opencode.jsonc'],
    ['dual inherited',{'opencode.json':'{"instructions":["lower.md"]}','opencode.jsonc':'{//note\n"large":900719925474099312345,}'},['lower.md'],'opencode.jsonc'],
    ['legacy only',{'config.json':'{"instructions":["legacy.md"]}'},['legacy.md'],'opencode.json'],
    ['legacy chain',{'config.json':'{"instructions":["legacy.md"]}','opencode.json':'{}','opencode.jsonc':'{}'},['legacy.md'],'opencode.jsonc'],
    ['BOM CRLF',{'opencode.jsonc':'\uFEFF{\r\n//中文\r\n"instructions":[],\r\n}'},[],'opencode.jsonc'],
  ])test(`PowerShell: ${name} plan/apply preserves lower sources and backs up chosen config`,()=>{
    const f=invoke(documents);assert.equal(f.result.status,0,f.result.stderr);
    const actual=fs.readFileSync(path.join(f.configRoot,target),'utf8');
    assert.deepEqual(parse(actual).instructions,[...expected,f.request.guidance.replace(/\\/g,'/')]);
    for(const [file,content] of Object.entries(documents))if(file!==target)assert.equal(fs.readFileSync(path.join(f.configRoot,file),'utf8'),content);
    if(documents[target])assert(fs.readdirSync(f.configRoot).some(n=>n.startsWith(target+'.craftroster-backup-')));
    if(documents[target]?.startsWith('\uFEFF'))assert(actual.startsWith('\uFEFF'));
    for(const literal of ['/*note*/','//note','//中文','900719925474099312345'])if(documents[target]?.includes(literal))assert(actual.includes(literal));
    const entries=fs.readdirSync(f.configRoot).sort();
    const again=execute(executable,['-NoProfile','-ExecutionPolicy','Bypass','-File',driver,'-Backend',path.join(root,'scripts/install.ps1'),'-Request',path.join(f.dir,'request.json')]);
    assert.equal(again.status,0,again.stderr);assert.equal(JSON.parse(again.stdout).action,'unchanged');
    assert.equal(fs.readFileSync(path.join(f.configRoot,target),'utf8'),actual);
    assert.deepEqual(fs.readdirSync(f.configRoot).sort(),entries);
  });
  test('PowerShell: dry run does not modify either config',()=>{
    const docs={'opencode.json':'{}','opencode.jsonc':'{/*keep*/}'};const f=invoke(docs,{dry:true});
    assert.equal(f.result.status,0,f.result.stderr);for(const [n,t]of Object.entries(docs))assert.equal(fs.readFileSync(path.join(f.configRoot,n),'utf8'),t);
    assert.equal(fs.readdirSync(f.configRoot).length,2);
  });
  for(const [name,mode]of [['opencode.json','change'],['opencode.jsonc','change'],['opencode.json','delete'],['config.json','change']])test(`PowerShell: rejects ${name} ${mode} after planning`,()=>{
    const docs={'opencode.json':'{}','opencode.jsonc':'{}','config.json':'{}'};
    const f=invoke(docs,{mutateName:name,mutateMode:mode});assert.notEqual(f.result.status,0);
    assert.match(f.result.stderr,/changed|appeared|Refusing/);assert(!fs.readdirSync(f.configRoot).some(n=>n.includes('backup')));
  });
  for(const strict of ['{/*comment*/"x":1}','{"x":1,}'])test('PowerShell: ownership metadata remains strict JSON',()=>{
    const f=invoke({}, {strict});assert.notEqual(f.result.status,0,'Metadata parser accepted JSONC');
  });
  test('PowerShell: custom root does not import legacy config',()=>{
    const f=invoke({'config.json':'invalid ignored legacy'},{custom:true});assert.equal(f.result.status,0,f.result.stderr);
    assert.deepEqual(parse(fs.readFileSync(path.join(f.configRoot,'opencode.json'),'utf8')).instructions,[f.request.guidance.replace(/\\/g,'/')]);
  });
  for(const name of ['opencode.jsonc','config.json'])test(`PowerShell: refuses newly appeared ${name}`,()=>{
    const f=invoke({'opencode.json':'{}'},{mutateName:name});assert.notEqual(f.result.status,0);assert.match(f.result.stderr,/changed|appeared|Refusing/);
    assert.equal(fs.readFileSync(path.join(f.configRoot,'opencode.json'),'utf8'),'{}');
  });
  test('PowerShell: refuses a non-regular config',()=>{
    const f=invoke({'opencode.json':'{}'},{directory:'opencode.jsonc'});assert.notEqual(f.result.status,0);assert.match(f.result.stderr,/non-regular|linked/);
  });
}

function bashTests(executable) {
  const convert = value => process.platform === 'win32'
    ? value.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`) : value;
  const quote = value => `'${value.replace(/'/g, `'"'"'`)}'`;
  function extract(name) {
    const start = shell.indexOf(`${name}() {`); assert(start >= 0, name);
    const tail = shell.slice(start);
    const next = /\n[a-z_][a-z0-9_]*\(\) \{/.exec(tail);
    const main = tail.indexOf('\nvalidate_test_fault_config\n');
    const ends = [next?.index, main >= 0 ? main : undefined].filter(n => n !== undefined);
    assert(ends.length, `Missing function boundary for ${name}`);
    return tail.slice(0, Math.min(...ends));
  }
  const prelude = ['opencode_config_root','merge_opencode_config_with_python','merge_opencode_config_with_node',
    'plan_opencode_auto_delegation','assert_auto_config_inputs','apply_auto_delegation_plan'].map(extract).join('\n');
  function invoke(documents, settings={}) {
    const dir=fixture(), home=path.join(dir,'home');
    const configRoot=settings.custom ? path.join(dir,'custom') : path.join(home,'.config/opencode');
    fs.mkdirSync(configRoot,{recursive:true});
    for(const [name,text]of Object.entries(documents))write(path.join(configRoot,name),text);
    const planDir=path.join(dir,'plan');fs.mkdirSync(planDir);
    const instruction=path.join(dir,'guidance.md');
    let mutation='';
    if(settings.mutate){const target=quote(convert(path.join(configRoot,settings.mutate)));
      mutation=settings.remove?`rm -- ${target}`:`printf '%s' '{"changed":true}' > ${target}`;}
    const program=path.join(dir,'driver.sh');
    write(program,`set -e\nlog_error(){ printf '%s\\n' "$*" >&2; }\nlog_success(){ :; }\nlog_info(){ :; }\n${prelude}\nAUTO_PLAN_DIR=${quote(convert(planDir))}\nDRY_RUN=0\nplan_opencode_auto_delegation ${quote(convert(instruction))}\n${mutation}\n${settings.selected?'apply_auto_delegation_plan':'assert_auto_config_inputs'}\nprintf '%s\\n' "$AUTO_CONFIG_PATH" "$AUTO_NEW_TEXT" "$AUTO_ACTION"\n`);
    const result=execute(executable,[convert(program)],{...process.env,HOME:convert(home),
      XDG_CONFIG_HOME:convert(path.join(home,'.config')),OPENCODE_CONFIG_DIR:convert(configRoot)});
    return {result,dir,configRoot,planDir,instruction};
  }
  test('Bash: selected runtime parses installer',()=>assert.equal(execute(executable,['-n',convert(path.join(root,'scripts/install.sh'))]).status,0));
  for(const [name,docs,expected,target,settings]of [
    ['dual inheritance',{'opencode.json':'{"instructions":["user.md"]}','opencode.jsonc':'{/*keep*/}'},['user.md'],'opencode.jsonc',{}],
    ['own override',{'opencode.json':'{"instructions":["lower.md"]}','opencode.jsonc':'{"instructions":["own.md",],}'},['own.md'],'opencode.jsonc',{}],
    ['legacy fallback',{'config.json':'{"instructions":["legacy.md"]}','opencode.json':'{}','opencode.jsonc':'{}'},['legacy.md'],'opencode.jsonc',{}],
    ['custom ignores legacy',{'config.json':'invalid legacy'},[],'opencode.json',{custom:true}],
  ])test(`Bash: planner ${name}`,()=>{
    const f=invoke(docs,settings);assert.equal(f.result.status,0,f.result.stderr);
    assert(f.result.stdout.split(/\r?\n/)[0].endsWith('/'+target));
    const comparable=value=>process.platform==='win32' ? value.replace(/^\/([a-z])\//i,(_,d)=>`${d.toUpperCase()}:/`) : value;
    assert.deepEqual(parse(fs.readFileSync(path.join(f.planDir,'opencode.json'),'utf8')).instructions.map(comparable),[...expected,f.instruction.replace(/\\/g,'/')]);
    for(const[n,t]of Object.entries(docs))assert.equal(fs.readFileSync(path.join(f.configRoot,n),'utf8'),t);
  });
  for(const [name,docs,settings]of [
    ['sibling change',{'opencode.json':'{}','opencode.jsonc':'{}'},{mutate:'opencode.json'}],
    ['sibling removal',{'opencode.json':'{}','opencode.jsonc':'{}'},{mutate:'opencode.json',remove:true}],
    ['sibling appearance',{'opencode.jsonc':'{}'},{mutate:'opencode.json'}],
    ['legacy change',{'config.json':'{}','opencode.jsonc':'{}'},{mutate:'config.json'}],
    ['selected change',{'opencode.json':'{}','opencode.jsonc':'{}'},{mutate:'opencode.jsonc',selected:true}],
  ])test(`Bash: refuses ${name} after planning`,()=>{
    const f=invoke(docs,settings);assert.notEqual(f.result.status,0);assert.match(f.result.stderr,/changed|appeared|Refusing/);
    assert(!fs.readdirSync(f.configRoot).some(n=>n.includes('backup')));
  });
}

try {
  mergerTests('node',process.execPath);
  const candidates=process.platform==='win32'?['C:\\Python312\\python.exe','python3','python']:['python3','python'];
  const python=candidates.find(executable=>{const r=spawnSync(executable,['-c','import sys; assert sys.version_info.major == 3'],{windowsHide:true});return !r.error&&r.status===0;});
  if(python)mergerTests('python',python);else{skipped++;console.log('SKIP Python 3 merger: interpreter unavailable');}
  if(options.powershell)powershellTests(options.powershell);
  if(options.bash)bashTests(options.bash);
  console.log(`OpenCode config tests passed: ${passed}; skipped: ${skipped}`);
} finally {
  const relative=path.relative(fs.realpathSync.native(os.tmpdir()),temporary);
  assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
  fs.rmSync(temporary,{recursive:true,force:true});
}
