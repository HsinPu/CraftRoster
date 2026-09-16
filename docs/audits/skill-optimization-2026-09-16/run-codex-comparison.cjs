'use strict';

// A fixed four-trial owner-entry smoke, not a general evaluation framework.
// Importing or running the CLI never sends a request. Only runComparison with
// the fixed ChatGPT-login executor can dispatch; it grants no consent.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const ROOT = path.resolve(__dirname, '../../..');
const PROPOSAL = 'docs/audits/skill-optimization-2026-09-16/driver-comparison-proposal.json';
const PROPOSAL_SHA256 = '2383b3cdf3c06da83690af1d2862f1d3bcdb1d755247f0041daef48232d02b80';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const copy = value => JSON.parse(JSON.stringify(value));
const sort = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const SELF = path.relative(ROOT, __filename).replaceAll('\\', '/');
const loadedSelfHash = hash(fs.readFileSync(__filename));
const ORDER = [
  { case_id: 'code-change-workflow:4', variant: 'baseline', trial: 1 },
  { case_id: 'code-change-workflow:4', variant: 'candidate', trial: 1 },
  { case_id: 'verified-software-delivery:5', variant: 'candidate', trial: 1 },
  { case_id: 'verified-software-delivery:5', variant: 'baseline', trial: 1 }
];
const DRIVER_LIMITS = Object.freeze({ max_adapter_turns: 12, timeout_ms: 60000, max_request_bytes: 2097152,
  max_response_bytes: 262144, max_history_bytes: 4194304, max_final_text_bytes: 65536 });
const TRANSPORT_LIMITS = Object.freeze({ max_processes: 48, timeout_ms: 60000, max_request_bytes: 2097152,
  max_stdout_bytes: 2097152, max_stderr_bytes: 262144, max_action_bytes: 262144 });
class ComparisonError extends Error {
  constructor(code) { super(`Codex comparison: ${code}`); this.name = 'ComparisonError'; this.code = code; }
}
const fail = code => { throw new ComparisonError(code); };
const equal = (actual, expected, code = 'source_drift') => { if (digest(actual) !== digest(expected)) fail(code); };
function optionsFor(options, allowed) {
  if (!options || typeof options !== 'object' || Array.isArray(options)
    || Object.keys(options).some(key => !allowed.includes(key))) fail('invalid_options');
  if (typeof options.model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(options.model)
    || typeof options.effort !== 'string' || !['none','minimal','low','medium','high','xhigh','max'].includes(options.effort)) fail('explicit_model_and_effort_required');
  for (const name of ['sourceRoot', 'proposalPath', 'executable', 'executableSha256', 'codexHome']) if (options[name] !== undefined && typeof options[name] !== 'string') fail('invalid_options');
  if (options.model !== 'gpt-6-astra' || options.effort !== 'low') fail('fixed_model_configuration');
  if (typeof options.executable !== 'string' || !path.isAbsolute(options.executable) || typeof options.codexHome !== 'string' || !path.isAbsolute(options.codexHome) || !/^[a-f0-9]{64}$/.test(options.executableSha256 || '')) fail('explicit_executor_required');
  return { executable:options.executable, executableSha256:options.executableSha256, codexHome:options.codexHome, model: options.model, effort: options.effort, sourceRoot: path.resolve(options.sourceRoot || ROOT),
    proposalPath: path.resolve(options.proposalPath || path.join(ROOT, PROPOSAL)) };
}
function readProposal(filename) {
  const bytes = fs.readFileSync(filename);
  if (hash(bytes) !== PROPOSAL_SHA256) fail('proposal_drift');
  return JSON.parse(bytes);
}
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 1048576 });
  if (result.error || result.status !== 0) fail('baseline_unavailable');
  return Buffer.from(result.stdout);
}
// Compile only these three fixed trusted repository modules from the exact bytes
// hashed here. Never compile an artifact or model response; never replace entries
// in the global require cache. This avoids stale cached transport/preparer code.
function freshAuthorModule(relative) {
  if (!['scripts/prepare-skill-pilot.js', 'scripts/lib/skill-codex-transport.js', 'scripts/lib/skill-codex-executor.js'].includes(relative)) fail('invalid_author_module');
  const filename = path.join(ROOT, relative), bytes = fs.readFileSync(filename);
  const instance = new Module(filename, module);
  instance.filename = filename; instance.paths = Module._nodeModulePaths(path.dirname(filename));
  instance._compile(bytes.toString('utf8'), filename);
  return { exports: instance.exports, source: { path: relative, sha256: hash(bytes) } };
}
const preparer = freshAuthorModule('scripts/prepare-skill-pilot.js');
const transportModule = freshAuthorModule('scripts/lib/skill-codex-transport.js');
const executorModule = freshAuthorModule('scripts/lib/skill-codex-executor.js');
function executorFor(settings, spawnImpl) { return executorModule.exports.createCodexExecutor({ executable:settings.executable, executableSha256:settings.executableSha256, codexHome:settings.codexHome, model:settings.model, effort:settings.effort, ...(spawnImpl === undefined ? {} : {spawnImpl}) }); }
const { runTaskTrial } = require(path.join(ROOT, 'scripts/lib/skill-task-driver'));
const { createBroker, LOADED_PROVENANCE } = require(path.join(ROOT, 'scripts/lib/skill-eval-broker'));
const manifestFor = files => files.map(file => ({ path: file.path, sha256: hash(file.bytes), bytes: file.bytes.length })).sort((a, b) => sort(a.path, b.path));

function checksFor(item, publicFiles) {
  const locale = item.case_id === 'code-change-workflow:4';
  const checks = publicFiles.filter(file => !locale || file.path !== 'workspace/locales/en.json')
    .map(file => ({ id: `unchanged:${file.path}`, type: 'file_unchanged', path: file.path }));
  if (locale) checks.push({ id: 'exact-locale-data', type: 'json_value', path: 'workspace/locales/en.json', keys: [], equals: { auth: { signIn: 'Log in' } } });
  // All semantic rubric items remain manual, including the trusted component
  // behavior check. Nothing here executes returned code or claims a browser run.
  item.private_rubric.forEach((_, index) => checks.push({ id: `PRIVATE-COMPARISON-RUBRIC:${item.case_id}:${index}`, type: 'manual' }));
  return checks;
}

function implementationSnapshot(proposal) {
  for (const entry of proposal.implementation) {
    if (hash(fs.readFileSync(path.join(ROOT, entry.path))) !== entry.sha256) fail('implementation_drift');
  }
  if (hash(fs.readFileSync(__filename)) !== loadedSelfHash
    || hash(fs.readFileSync(path.join(ROOT, transportModule.source.path))) !== transportModule.source.sha256
    || hash(fs.readFileSync(path.join(ROOT, executorModule.source.path))) !== executorModule.source.sha256
    || preparer.source.sha256 !== proposal.implementation.find(entry => entry.path === preparer.source.path)?.sha256
    || LOADED_PROVENANCE.source_sha256 !== proposal.implementation.find(entry => entry.path === 'scripts/lib/skill-eval-broker.js')?.sha256) fail('implementation_drift');
  return [...proposal.implementation, { path: SELF, sha256: loadedSelfHash }, transportModule.source, executorModule.source,
    { path: 'loaded-private-grader-function', sha256: LOADED_PROVENANCE.private_grader_sha256 }];
}

function buildInputs(settings, baselineBytes) {
  const proposal = readProposal(settings.proposalPath);
  equal(proposal.proposed_order, ORDER, 'proposal_drift');
  const implementations = implementationSnapshot(proposal);
  const cases = [], inputs = new Map(), sourceFiles = new Map();
  for (const item of proposal.cases) {
    const [skill, caseId] = item.case_id.split(':');
    const bundle = preparer.exports.buildBundle({ root: settings.sourceRoot, sourceRoot: settings.sourceRoot, skill, caseId: Number(caseId) });
    const owner = `skills/${skill}/SKILL.md`, record = bundle.privateRecord;
    equal(bundle.publicFiles.filter(file => file.path.startsWith(`skills/${skill}/`)).map(file => file.path), [owner]);
    for (const key of ['case_id','split','locale','corpus_case_sha256','prompt_sha256','fixture_sha256','fixture_manifest','runtime_catalog_sha256']) equal(record[key], item[key]);
    const corpusPath = `skills/${skill}/evals/evals.json`;
    const corpusBytes = preparer.exports.safeRead(settings.sourceRoot, corpusPath);
    const evaluation = JSON.parse(corpusBytes).evals.find(value => value.id === Number(caseId));
    sourceFiles.set(corpusPath, corpusBytes);
    sourceFiles.set('skills.json', preparer.exports.safeRead(settings.sourceRoot, 'skills.json'));
    for (const file of evaluation.files) sourceFiles.set(`skills/${skill}/${file}`, preparer.exports.safeRead(settings.sourceRoot, `skills/${skill}/${file}`));
    for (const file of bundle.publicFiles) if (file.path.startsWith('skills/')) sourceFiles.set(file.path, file.bytes);
    const shared = manifestFor(bundle.publicFiles.filter(file => file.path !== owner));
    equal(shared.length, item.shared_public_files);
    equal(digest(shared), item.shared_public_manifest_sha256);
    const oldBytes = baselineBytes.get(owner);
    if (!oldBytes) fail('baseline_unavailable');
    const candidate = bundle.publicFiles.find(file => file.path === owner).bytes;
    const header = bytes => bytes.toString('utf8').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n/)?.[1];
    if (!header(oldBytes) || header(oldBytes) !== header(candidate)) fail('source_drift');
    const variants = [];
    for (const variant of item.variants) {
      const bytes = variant.variant === 'baseline' ? oldBytes : candidate;
      equal({ path: owner, sha256: hash(bytes), bytes: bytes.length }, variant.owner);
      const publicFiles = bundle.publicFiles.map(file => ({ path: file.path, bytes: Buffer.from(file.path === owner ? bytes : file.bytes) }));
      const inspected = createBroker(publicFiles, item.policy).inspect();
      equal(inspected.public_bundle_sha256, variant.public_bundle_sha256);
      equal(digest(inspected.policy), variant.tool_policy_sha256);
      equal(inspected.toolset_sha256, variant.toolset_sha256);
      equal(record.skill_packages.length, variant.expected_runtime_packages);
      const checks = checksFor(item, publicFiles);
      variants.push({ variant: variant.variant, owner: variant.owner, public_bundle_sha256: inspected.public_bundle_sha256,
        tool_policy_sha256: digest(inspected.policy), toolset_sha256: inspected.toolset_sha256,
        private_checks_sha256: digest(checks), public_manifest: manifestFor(publicFiles) });
      inputs.set(`${item.case_id}/${variant.variant}`, { publicFiles, policy: copy(item.policy), checks });
    }
    cases.push({ case_id: item.case_id, private_record_sha256: digest(record), rubric_sha256: digest(item.private_rubric),
      fixture_sha256: item.fixture_sha256, corpus_case_sha256: item.corpus_case_sha256,
      runtime_catalog_sha256: item.runtime_catalog_sha256, shared_public_manifest_sha256: item.shared_public_manifest_sha256,
      policy: copy(item.policy), variants });
  }
  const sources = manifestFor([...sourceFiles].map(([path, bytes]) => ({ path, bytes })));
  const binding = { runtime: { node: process.version, platform: process.platform, arch: process.arch },
    proposal_sha256: PROPOSAL_SHA256, baseline_commit: proposal.baseline_commit, implementations,
    executor_configuration_sha256: settings.executorConfigurationSha256, model_requested: settings.model, effort_requested: settings.effort, cases, sources, order: copy(ORDER),
    driver_limits: { ...DRIVER_LIMITS }, transport_limits: { ...TRANSPORT_LIMITS }, automatic_retries: 0, provider_requests_enforced: false, provider_requests: null, max_output_tokens: null, currency_amount: null };
  return { proposal, inputs, binding };
}

async function prepare(settings) {
  const descriptor = executorFor(settings);
  try { settings.executorConfigurationSha256 = descriptor.inspect().configuration_sha256;
    if (!/^[a-f0-9]{64}$/.test(settings.executorConfigurationSha256 || '')) fail('invalid_executor_binding');
  } finally { await descriptor.close(); }
  const proposal = readProposal(settings.proposalPath), baselines = new Map();
  implementationSnapshot(proposal);
  for (const item of proposal.cases) {
    const owner = item.variants.find(value => value.variant === 'baseline').owner.path;
    const prefix = owner.slice(0, -'SKILL.md'.length);
    const paths = git(['ls-tree', '-r', '--name-only', proposal.baseline_commit, '--', prefix]).toString('utf8').trim().split(/\r?\n/)
      .filter(file => !file.startsWith(`${prefix}evals/`));
    equal(paths, [owner], 'baseline_drift');
    baselines.set(owner, git(['show', `${proposal.baseline_commit}:${owner}`]));
  }
  const prepared = buildInputs(settings, baselines);
  // The driver publishes its actual loaded provenance in reports. A pre-aborted
  // local initialization gets that metadata without invoking any adapter.
  const controller = new AbortController(); controller.abort();
  const { report } = await runTaskTrial({ publicFiles: [{ path: 'task.txt', bytes: Buffer.from('local provenance check') },
    { path: 'skill-catalog.json', bytes: Buffer.from('{"skills":[]}') }], adapter: async () => fail('unexpected_adapter'), signal: controller.signal });
  equal(report.implementation_sha256, { driver: proposal.implementation.find(value => value.path === 'scripts/lib/skill-task-driver.js').sha256,
    broker: LOADED_PROVENANCE.source_sha256, private_grader: LOADED_PROVENANCE.private_grader_sha256 }, 'implementation_drift');
  const manifest = { schema_version: 1, kind: 'codex_owner_entry_comparison_preflight', status: 'not_run', execution_authorized: false,
    binding: prepared.binding, binding_sha256: digest(prepared.binding), manual_rubric_status: 'unverified', cost: null,
    limitations: ['This concrete input/configuration freeze is not authorization to send requests.',
      'Requested gpt-6-astra/low and ChatGPT-only authentication are configuration choices, not verified account access or effective model evidence. No credentials are read by this runner.',
      'One development trial per owner variant is a feasibility smoke, not statistical or held-out evidence.',
      'The original frozen proposal uses raw source bytes and a fixed Git commit; changed sources, line endings, or missing history must fail preflight.',
      'No artifact code is executed. Semantic/manual rubric checks require subsequent evidence-based review.',
      'The earlier dataset proposal required a provider request ceiling. This Codex proposal cannot meet that condition: 48 executor launches and four 60-second trial limits replace it only if explicitly accepted; provider requests, output-token count and monetary cost are not hard-capped.',
      'The CLI reuses existing login itself and may update normal account/cache/log state. No global configuration or new login is configured by the runner.',
      'Local fake-provider evidence does not certify authenticated provider tools, automatic context, OS isolation or actual Skill activation.'] };
  return { ...prepared, baselines, manifest };
}

async function preflightComparison(options) {
  const settings = optionsFor(options, ['model','effort','sourceRoot','proposalPath','executable','executableSha256','codexHome']);
  try { return copy((await prepare(settings)).manifest); }
  catch (error) { if (error instanceof ComparisonError) throw error; fail('preflight_failed'); }
}
async function freezeComparison(options) {
  const settings = optionsFor(options, ['model','effort','sourceRoot','proposalPath','outputPath','executable','executableSha256','codexHome']);
  if (typeof options.outputPath !== 'string' || !options.outputPath) fail('new_output_path_required');
  const target = path.resolve(options.outputPath), parent = path.dirname(target);
  if (fs.existsSync(target) || !fs.statSync(parent).isDirectory() || path.resolve(fs.realpathSync(parent)) !== parent) fail('new_output_path_required');
  const manifest = await preflightComparison(settings);
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return manifest;
}
function encodeArtifacts(files) {
  return files.map(file => {
    const text = file.bytes.toString('utf8');
    const utf8 = Buffer.from(text).equals(file.bytes) && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text);
    return { path: file.path, sha256: hash(file.bytes), bytes: file.bytes.length, encoding: utf8 ? 'utf8' : 'base64', content: utf8 ? text : file.bytes.toString('base64') };
  });
}

async function runComparison(options) {
  const settings = optionsFor(options, ['model','effort','sourceRoot','proposalPath','manifest','executable','executableSha256','codexHome','spawnImpl','signal']);
  if (!options.manifest || (options.spawnImpl !== undefined && typeof options.spawnImpl !== 'function')
    || (options.signal !== undefined && !(options.signal instanceof AbortSignal))) fail('explicit_transport_required');
  const frozen = copy(options.manifest), prepared = await prepare(settings);
  equal(frozen, prepared.manifest, 'manifest_drift');
  const external = options.signal, injected = options.spawnImpl !== undefined;
  const executor = executorFor(settings, options.spawnImpl);
  try { equal(executor.inspect().configuration_sha256, frozen.binding.executor_configuration_sha256, 'executor_configuration_drift'); }
  catch (error) { await executor.close(); throw error; }
  const result = { report: { schema_version: 1, evaluation_kind: 'codex_owner_entry_comparison_smoke', status:'not_run',
    run_status:'running', model_execution:injected ? false : null, model_calls:injected ? 0 : null,
    execution_backend:injected ? 'injected_process' : 'codex_cli_chatgpt', activation_observed:false, host_isolation_enforced:false,
    task_outcome:'unverified', manifest_sha256:digest(frozen), binding_sha256:frozen.binding_sha256,
    model_requested:settings.model, effort_requested:settings.effort, cost:null, usage_complete:false,
    provider_requests:null, provider_requests_enforced:false, executor_invocations:0, stopped_reason:null, transport:null, executor:null,
    trials:ORDER.map(item=>({...item,status:'not_run',run_status:'not_run',driver_report:null,
      visible_actions:[],attempt_numbers:[],provenance_valid:null,artifact_grading_eligible:false,
      manual_rubric:{status:'unverified',rubric_sha256:prepared.manifest.binding.cases.find(value=>value.case_id===item.case_id).rubric_sha256}})),
    limitations:[
      'This module API is executable only when explicitly called; it does not establish user authorization. There is no live CLI command.',
      'The native executor is configured for saved ChatGPT login and built-in openai only. The runner never reads or copies credentials or configures a new login.',
      'The shared transport bounds 48 executor invocations, not internal provider requests, generated tokens, or monetary cost. Four trials each have a 60-second driver deadline.',
      'CLI-reported known usage is retained on failed attempts; unknown usage is not counted as zero. Cancellation cannot prove service-side computation stopped.',
      'Only visible structured actions cross to a virtual file broker. Model-produced code, shell commands, browser actions and deployments are not executed by this runner.',
      'Native CLI process controls and local fake-provider evidence do not certify authenticated tools, all implicit context, filesystem isolation or real Skill activation.',
      'Injected spawn is a trusted author-test seam, not a sandbox. Such runs are explicitly non-model and cannot establish account behavior.',
      'This historical development comparison requires its frozen raw bytes and Git baseline. Manual rubric remains unverified; completed is not task passed.'
    ] },artifacts:[] };
  let active=null;
  const validateSources=()=>{
    try { equal(buildInputs(settings,prepared.baselines).binding,frozen.binding); }
    catch(error){throw error instanceof ComparisonError?error:new ComparisonError('source_drift');}
  };
  const transport=transportModule.exports.createCodexTransport({model:settings.model,effort:settings.effort,limits:TRANSPORT_LIMITS,
    executeTurn:async invocation=>{
      try {
        validateSources();
        if(!active||active.closed||invocation.signal.aborted||external?.aborted)fail('cancelled');
        if(performance.now()>=active.deadline)fail('timed_out');
        if(result.report.executor_invocations>=TRANSPORT_LIMITS.max_processes)fail('process_limit');
      } catch(error){if(active)active.failure ||= error instanceof ComparisonError?error.code:'source_drift';throw new ComparisonError('dispatch_refused');}
      result.report.executor_invocations++;
      return executor.executeTurn(invocation);
    }});
  try {
    for(const trial of result.report.trials){
      if(result.report.stopped_reason)break;
      if(external?.aborted){result.report.stopped_reason='cancelled';break;}
      try{validateSources();}catch(error){result.report.stopped_reason=error.code||'source_drift';break;}
      const input=prepared.inputs.get(`${trial.case_id}/${trial.variant}`),before=transport.inspect().processes_reserved;
      active={closed:false,failure:null,deadline:performance.now()+DRIVER_LIMITS.timeout_ms};const current=active;
      const execution=await runTaskTrial({...input,limits:DRIVER_LIMITS,signal:external,adapter:async request=>{
        const text=await transport.adapter(request);
        if(current.closed||request.signal.aborted)throw new ComparisonError('cancelled');
        try{validateSources();}catch(error){current.failure ||= error.code||'source_drift';throw new ComparisonError('source_drift');}
        trial.visible_actions.push({turn:JSON.parse(request.requestJson).turn,action:JSON.parse(text)});return text;
      }});
      current.closed=true;trial.driver_report=execution.report;
      trial.visible_actions.forEach(action=>{action.driver_turn_status=execution.report.turns.find(turn=>turn.turn===action.turn)?.status||'not_dispatched';});
      trial.run_status=execution.report.run_status;
      result.artifacts.push({case_id:trial.case_id,variant:trial.variant,trial:trial.trial,files:encodeArtifacts(execution.artifacts)});
      const inspected=transport.inspect();trial.attempt_numbers=inspected.attempts.slice(before).map(attempt=>attempt.attempt);
      try{validateSources();trial.provenance_valid=true;}catch(error){current.failure ||= error.code||'source_drift';trial.provenance_valid=false;}
      const failedAttempt=inspected.attempts.slice(before).find(attempt=>attempt.status!=='completed');
      if(current.failure||failedAttempt||trial.run_status!=='completed'){
        result.report.stopped_reason=current.failure||failedAttempt?.error_code||execution.report.error?.code||trial.run_status;
        if(current.failure)trial.run_status=current.failure==='timed_out'?'timed_out':'error';
      }
      trial.artifact_grading_eligible=trial.provenance_valid&&trial.run_status==='completed'&&!failedAttempt;
      if(!trial.artifact_grading_eligible)trial.driver_report.artifact_grading={status:'not_run',checks:[]};
    }
  }catch{result.report.stopped_reason ||= 'comparison_error';}
  finally{
    if(active)active.closed=true;
    try{await executor.close();}catch{result.report.stopped_reason ||= 'executor_cleanup_failed';}
    result.report.executor=executor.inspect();
    if(result.report.executor.in_flight)result.report.stopped_reason ||= 'executor_still_running';
  }
  try{validateSources();}catch(error){result.report.stopped_reason ||= error.code||'source_drift';}
  result.report.transport=transport.inspect();
  result.report.usage_complete=result.report.transport.attempts.length>0&&result.report.transport.attempts.every(attempt=>attempt.usage_complete);
  result.report.run_status=result.report.stopped_reason?'stopped':'completed';return result;
}

async function cli(argv){
  if(argv.length===1&&argv[0]==='--help'){
    console.log('Local preflight only: node run-codex-comparison.cjs --preflight --model gpt-6-astra --effort low --executable <absolute-codex.exe> --executable-sha256 <sha256> --codex-home <existing-home> --output <new-file>\nNo live CLI command. Module API: preflightComparison, freezeComparison, runComparison.');return;
  }
  if(argv[0]!=='--preflight'||argv.length!==13)fail('local_preflight_only');
  const parsed={},names={'--model':'model','--effort':'effort','--executable':'executable','--executable-sha256':'executableSha256','--codex-home':'codexHome','--output':'outputPath'};
  for(let i=1;i<argv.length;i+=2){const k=argv[i];if(!Object.hasOwn(names,k)||Object.hasOwn(parsed,names[k])||!argv[i+1]||argv[i+1].startsWith('--'))fail('invalid_options');parsed[names[k]]=argv[i+1];}
  const manifest=await freezeComparison(parsed);
  console.log(JSON.stringify({status:manifest.status,execution_authorized:false,binding_sha256:manifest.binding_sha256,trials:4,model_calls:0,max_executor_invocations:48,provider_requests_enforced:false}));
}
if(require.main===module)cli(process.argv.slice(2)).catch(error=>{console.error(error instanceof ComparisonError?error.message:'Codex comparison: local_preflight_failed');process.exitCode=1;});
module.exports={preflightComparison,freezeComparison,runComparison};
