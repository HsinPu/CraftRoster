'use strict';

// Real Codex executable, fixed authored SSE replies, loopback only. No model,
// credentials, forwarding, native file actions, or execution of returned code.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { isDeepStrictEqual } = require('node:util');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const { buildBundle } = require(path.join(root, 'scripts/prepare-skill-pilot'));
const { runTaskTrial } = require(path.join(root, 'scripts/lib/skill-task-driver'));
const { createCodexTransport } = require(path.join(root, 'scripts/lib/skill-codex-transport'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const output = path.join(__dirname, 'codex-task-adapter-probe-v3.json');
const model = 'gpt-6-astra', effort = 'low';
const PRIVATE = 'PRIVATE_CODEX_ADAPTER_CHECK_NOT_PUBLIC_20260916';
const disabled = (`apps artifact auth_elicitation browser_use browser_use_external browser_use_full_cdp_access
chronicle code_mode code_mode_host code_mode_interrupt code_mode_only code_mode_prewarm computer_use
current_time_reminder default_mode_request_user_input deferred_executor deferred_tool_world_state
enable_mcp_apps enable_request_compression exec_permission_approvals executor_capability_discovery
external_agent_memory_import fast_mode goals guardian_approval guardian_ext guardianv2 hooks image_generation
in_app_browser in_app_chat in_app_dictation in_app_local_automation in_app_updates memories multi_agent multi_agent_v2
network_proxy plugin_sharing plugins recommended_plugins remote_compaction_v2 remote_plugin request_permissions_tool
runtime_metrics secret_auth_storage shell_snapshot shell_snapshot_v2 shell_tool shell_zsh_fork
skill_mcp_dependency_install skill_search sleep_tool standalone_web_search step_model_switching
tool_call_mcp_elicitation tool_suggest unbounded_connection_retries unified_exec unified_exec_tty view_image
workspace_dependencies worktrees`).split(/\s+/);
const actions = [
  { type: 'tool_call', request: { tool: 'read_file', arguments: { path: 'skills/code-change-workflow/SKILL.md', encoding: 'utf8' } } },
  { type: 'tool_call', request: { tool: 'read_file', arguments: { path: 'workspace/locales/en.json', encoding: 'utf8' } } },
  { type: 'tool_call', request: { tool: 'write_file', arguments: { path: 'workspace/locales/en.json', content: '{"auth":{"signIn":"Log in"}}\n', encoding: 'utf8' } } },
  { type: 'final', text: 'Authored loopback rehearsal: changed only locale data. No model or runtime acceptance executed.' },
];
const manifest = files => files.map(file => ({ path: file.path, bytes: file.bytes.length, sha256: hash(file.bytes) }));
const toml = value => Array.isArray(value) ? `[${value.map(toml).join(', ')}]`
  : value && typeof value === 'object' ? `{ ${Object.entries(value).map(([k,v]) => `${JSON.stringify(k)} = ${toml(v)}`).join(', ')} }` : JSON.stringify(value);
function sse(action, ordinal) {
  const text = JSON.stringify({ action }), id = `msg_author_${ordinal}`;
  const message = { id, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text, annotations: [] }] };
  const response = { id: `resp_author_${ordinal}`, object: 'response', status: 'completed', model, output: [message],
    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } } };
  const events = [
    { type: 'response.created', response: { ...response, status: 'in_progress', output: [] } },
    { type: 'response.output_item.added', output_index: 0, item: { ...message, status: 'in_progress', content: [] } },
    { type: 'response.content_part.added', item_id: id, output_index: 0, content_index: 0, part: { type: 'output_text', text: '', annotations: [] } },
    { type: 'response.output_text.delta', item_id: id, output_index: 0, content_index: 0, delta: text },
    { type: 'response.output_text.done', item_id: id, output_index: 0, content_index: 0, text },
    { type: 'response.content_part.done', item_id: id, output_index: 0, content_index: 0, part: message.content[0] },
    { type: 'response.output_item.done', output_index: 0, item: message },
    { type: 'response.completed', response },
  ];
  return events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('');
}
function implementation() {
  return ['scripts/lib/skill-codex-transport.js', 'scripts/lib/skill-task-driver.js', 'scripts/lib/skill-eval-broker.js',
    'scripts/prepare-skill-pilot.js', path.relative(root, __filename).replaceAll('\\','/')]
    .map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(root,file))) }));
}
async function main() {
  const executable = process.argv[2];
  if (!executable || !path.isAbsolute(executable) || path.basename(executable).toLowerCase() !== 'codex.exe') throw Error('Inspected absolute codex.exe path required');
  if (fs.existsSync(output)) throw Error('Refusing to overwrite or rerun existing probe');
  const executableHash = hash(fs.readFileSync(executable));
  if (executableHash !== '960c111d47afd61669954b9df9e56083e302edbfa3ef6962d81dcc14a30051dc') throw Error('Uninspected executable revision');
  const sources = implementation();
  const bundle = buildBundle({ root, sourceRoot: root, skill: 'code-change-workflow', caseId: 4 });
  const before = manifest(bundle.publicFiles);
  const checks = bundle.publicFiles.filter(file => file.path !== 'workspace/locales/en.json')
    .map(file => ({ id: `${PRIVATE}:${file.path}`, type: 'file_sha256', path: file.path, sha256: hash(file.bytes) }));
  checks.push({ id: PRIVATE + ':locale', type: 'json_value', path: 'workspace/locales/en.json', keys: [], equals: { auth: { signIn: 'Log in' } } });
  checks.push({ id: PRIVATE + ':semantic', type: 'manual' });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-codex-adapter-'));
  const dirs = Object.fromEntries(['codex-home','profile','temp','workspace','appdata','localappdata'].map(name => [name,path.join(scratch,name)]));
  for (const dir of Object.values(dirs)) fs.mkdirSync(dir);
  const report = { schema_version: 1, evaluation_kind: 'authored_codex_loopback_task_adapter', status: 'not_run',
    model_execution: false, model_calls: 0, activation_observed: false, host_isolation_enforced: false,
    previous_probe: { report: 'codex-task-adapter-probe-v2.json', outcome: 'V2 completed its local CLI response but a startup error item invalidated the strict transcript. V3 sets documented suppress_unstable_features_warning=true for this invocation; parser rejection remains unchanged.' },
    started_at: new Date().toISOString(), finished_at: null, run_status: 'starting', error_code: null,
    host: { executable_sha256: executableHash, cli_version: '0.154.0-alpha.6.2', node: process.version, platform: process.platform },
    requested_model: model, requested_effort: effort, effective_model: null, effective_effort: null,
    authored_actions_sha256: hash(JSON.stringify(actions)), synthetic_usage_is_not_model_usage: true,
    implementation: sources, public_bundle_sha256: hash(JSON.stringify(before)), private_checks_sha256: hash(JSON.stringify(checks)),
    public_files: before.length, disabled_features: disabled, enabled_features: ['skip_host_skill_discovery'],
    requests: [], processes: [], transport: null, driver: null, changes: null,
    cleanup: { children_closed: false, server_closed: false, scratch_removed: false }, usage: null, cost: null,
    limitations: ['Fixed authored actions and zero SSE usage are not model outcomes or billing evidence.',
      'The literal model name is sent only to a local fake provider. This does not verify account access, effective model, or authenticated tool parity.',
      'CLI process count does not cap built-in provider requests. The local server alone enforces this rehearsal request cap.',
      'The broker enforces virtual file grants; this is not an OS filesystem sandbox certification or installed-Skill activation test.'] };
  let current = null, server, calls = 0;
  const children = new Set();
  const closures = new Map();
  const sockets = new Set();
  try {
    server = http.createServer(async (req,res) => {
      try {
        if (++calls > 4 || !current || current.seen || req.method !== 'POST' || !/^\/v1\/responses(?:\?.*)?$/.test(req.url)) throw Error('unexpected_request');
        current.seen = true;
        let size = 0; const chunks = [];
        for await (const chunk of req) { size += chunk.length; if (size > 2097152) throw Error('request_bytes'); chunks.push(chunk); }
        const bytes = Buffer.concat(chunks), body = JSON.parse(bytes.toString('utf8'));
        const content = item => typeof item.content === 'string' ? item.content : (item.content || []).map(part => part.text || '').join('\n');
        const inputs = Array.isArray(body.input) ? body.input : [];
        const developers = inputs.filter(item => item.role === 'developer').map(content).join('\n');
        const tools = (body.tools || []).map(tool => ({ type: tool.type, name: tool.name }));
        const observed = { ordinal: calls, bytes: size, sha256: hash(bytes), model_matches: body.model === model,
          effort_matches: body.reasoning?.effort === effort, tools, tools_sha256: hash(JSON.stringify(body.tools || [])),
          public_prompt_matches: inputs.some(item => item.role === 'user' && content(item) === current.prompt),
          private_sentinel_present: bytes.includes(Buffer.from(PRIVATE)),
          known_system_skill_present: /\b(?:openai-docs|skill-creator)\b/.test(developers),
          developer_context_bytes: Buffer.byteLength(developers),
          schema_matches: isDeepStrictEqual(body.text?.format?.schema ?? null,current.schema),
          response_sha256: hash(sse(actions[current.ordinal-1], current.ordinal)) };
        report.requests.push(observed);
        assert.equal(observed.model_matches,true); assert.equal(observed.effort_matches,true);
        assert.equal(observed.public_prompt_matches,true); assert.equal(observed.private_sentinel_present,false);
        assert.equal(observed.known_system_skill_present,false); assert.equal(observed.schema_matches,true);
        assert.deepEqual(tools, []);
        res.writeHead(200, { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache' });
        res.end(sse(actions[current.ordinal-1], current.ordinal));
      } catch { report.error_code ||= 'loopback_request_rejected'; res.writeHead(400, { 'Content-Type':'application/json' }); res.end('{"error":{"message":"Author loopback rejected request"}}'); }
    });
    server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
    server.on('connect', (_req,socket) => { report.error_code ||= 'unexpected_proxy_connect'; socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
    server.on('upgrade', (_req,socket) => { report.error_code ||= 'unexpected_upgrade'; socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
    await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const config = { suppress_unstable_features_warning:true, model_provider:'author_loopback_probe', model, model_reasoning_effort:effort,
      'model_providers.author_loopback_probe.name':'Fixed author loopback', 'model_providers.author_loopback_probe.base_url':origin+'/v1',
      'model_providers.author_loopback_probe.wire_api':'responses', 'model_providers.author_loopback_probe.requires_openai_auth':false,
      'model_providers.author_loopback_probe.request_max_retries':0, 'model_providers.author_loopback_probe.stream_max_retries':0,
      'model_providers.author_loopback_probe.stream_idle_timeout_ms':5000, 'model_providers.author_loopback_probe.supports_websockets':false,
      'model_providers.author_loopback_probe.supports_standalone_web_search':false,
      cli_auth_credentials_store:'file', mcp_oauth_credentials_store:'file', web_search:'disabled', 'agents.enabled':false,
      'analytics.enabled':false, 'feedback.enabled':false, check_for_update_on_startup:false,
      'otel.exporter':'none', 'otel.trace_exporter':'none', 'otel.metrics_exporter':'none', 'otel.log_user_prompt':false,
      'memories.generate_memories':false, 'memories.use_memories':false, project_doc_max_bytes:0, project_root_markers:[],
      allow_login_shell:false, 'shell_environment_policy.inherit':'none', approval_policy:'never',
      'skills.config':['openai-docs','skill-creator'].flatMap(name => {
        const dir=path.join(dirs['codex-home'],'skills','.system',name); return [dir,path.join(dir,'SKILL.md')].map(p=>({path:p,enabled:false}));
      }) };
    const env = { SystemRoot:'C:\\Windows', WINDIR:'C:\\Windows', PATH:'C:\\Windows\\System32',
      CODEX_HOME:dirs['codex-home'], HOME:dirs.profile, USERPROFILE:dirs.profile, APPDATA:dirs.appdata, LOCALAPPDATA:dirs.localappdata,
      TEMP:dirs.temp, TMP:dirs.temp, HTTP_PROXY:origin, HTTPS_PROXY:origin, ALL_PROXY:origin, NO_PROXY:'127.0.0.1,localhost,::1',
      OTEL_SDK_DISABLED:'true', OTEL_TRACES_EXPORTER:'none', OTEL_METRICS_EXPORTER:'none', OTEL_LOGS_EXPORTER:'none',
      DO_NOT_TRACK:'1', TERM:'dumb', NO_COLOR:'1' };
    report.environment_keys = Object.keys(env).sort();
    report.config = { ...config, 'model_providers.author_loopback_probe.base_url':'http://127.0.0.1:<ephemeral>/v1',
      'skills.config':config['skills.config'].map(item=>({...item,path:'<scratch>/'+path.relative(scratch,item.path).replaceAll('\\','/')})) };
    async function executeTurn(input) {
      assert.equal(input.model,model); assert.equal(input.effort,effort); assert.ok(report.processes.length<4);
      const ordinal=report.processes.length+1, schemaPath=path.join(scratch,`schema-${ordinal}.json`);
      fs.writeFileSync(schemaPath,JSON.stringify(input.outputSchema),{flag:'wx'});
      current={ordinal,prompt:input.prompt,schema:input.outputSchema,seen:false};
      const args=['exec','--ignore-user-config','--ignore-rules','--strict-config','--ephemeral','--sandbox','read-only',
        '--skip-git-repo-check','--json','--color','never','--output-schema',schemaPath,'-C',dirs.workspace,
        ...Object.entries(config).flatMap(([k,v])=>['-c',`${k}=${toml(v)}`]),...disabled.flatMap(f=>['--disable',f]),'--enable','skip_host_skill_discovery','-'];
      const record={ordinal,exit_code:null,stdout_bytes:0,stderr_bytes:0,stdout_sha256:null,stderr_sha256:null,error_code:null};
      report.processes.push(record);
      const child=spawn(executable,args,{cwd:dirs.workspace,env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']}); children.add(child);
      const closed=new Promise(resolve=>{
        child.once('error',e=>{record.error_code=['EPERM','EACCES','ENOENT'].includes(e.code)?e.code:'spawn_error';});
        child.once('close',code=>{children.delete(child);resolve(code);});
      });
      closures.set(child,closed);
      const buffers={stdout:[],stderr:[]};
      const stop=()=>{try{child.kill();}catch{}};
      input.signal.addEventListener('abort',stop,{once:true}); if(input.signal.aborted)stop();
      const timer=setTimeout(stop,input.limits.timeout_ms);
      for(const name of ['stdout','stderr'])child[name].on('data',bytes=>{
        record[name+'_bytes']+=bytes.length;
        if(record[name+'_bytes']>input.limits['max_'+name+'_bytes']){record.error_code='output_bytes';stop();}
        else buffers[name].push(bytes);
      });
      child.stdin.on('error',()=>{}); child.stdin.end(input.prompt);
      const result=await closed;
      clearTimeout(timer);input.signal.removeEventListener('abort',stop);
      const stdout=Buffer.concat(buffers.stdout).toString('utf8'),stderr=Buffer.concat(buffers.stderr).toString('utf8');
      record.exit_code=result;record.stdout_sha256=hash(stdout);record.stderr_sha256=hash(stderr);current=null;
      record.stderr_markers={configuration_error:/unknown (?:field|feature|variant)|invalid (?:type|value)|Error loading config/i.test(stderr),
        authentication_error:/authentication|not logged in|missing.*key/i.test(stderr)};
      record.event_types=[...new Set(stdout.split(/\r?\n/).flatMap(line=>{try{const e=JSON.parse(line);return typeof e.type==='string'&&/^[a-z_.]{1,64}$/.test(e.type)?[e.type]:[];}catch{return [];}}))].sort();
      if(record.error_code)throw Error('Bounded local child failed');
      return {stdout,stderr,exit_code:result};
    }
    const transport=createCodexTransport({executeTurn,model,effort,limits:{max_processes:4,timeout_ms:15000}});
    const trial=await runTaskTrial({publicFiles:bundle.publicFiles,policy:{writable_paths:['workspace/locales/en.json']},checks,
      adapter:transport.adapter,limits:{max_adapter_turns:4,timeout_ms:60000}});
    report.transport=transport.inspect();report.driver=trial.report;
    const after=manifest(trial.artifacts), lookup=new Map(before.map(file=>[file.path,file.sha256]));
    report.changes=after.filter(file=>lookup.get(file.path)!==file.sha256).map(file=>file.path);
    assert.equal(trial.report.run_status,'completed');assert.deepEqual(report.changes,['workspace/locales/en.json']);
    assert.equal(trial.report.artifact_grading.checks.filter(check=>check.status==='passed').length,before.length);
    assert.equal(trial.report.artifact_grading.checks.filter(check=>check.status==='unverified').length,1);
    assert.equal(report.requests.length,4);assert.ok(report.processes.every(item=>item.exit_code===0));
    assert.deepEqual(implementation(),sources);assert.deepEqual(manifest(buildBundle({root,sourceRoot:root,skill:'code-change-workflow',caseId:4}).publicFiles),before);
    assert.equal(report.error_code,null);report.run_status='author_rehearsal_completed';
  } catch { report.run_status='error'; report.error_code ||= 'author_rehearsal_failed'; }
  finally {
    for(const child of children){try{child.kill();}catch{}}
    let closeTimer;
    await Promise.race([Promise.all([...closures.values()]),new Promise(resolve=>{closeTimer=setTimeout(resolve,5000);})]);
    clearTimeout(closeTimer);
    report.cleanup.children_closed=children.size===0;
    if(server){for(const socket of sockets)socket.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));report.cleanup.server_closed=true;}
    if(children.size===0 && fs.realpathSync(scratch)===scratch && scratch.startsWith(path.resolve(os.tmpdir())+path.sep)){
      fs.rmSync(scratch,{recursive:true,force:true});report.cleanup.scratch_removed=!fs.existsSync(scratch);
    }
    if(!Object.values(report.cleanup).every(Boolean)){report.run_status='error';report.error_code ||= 'cleanup_incomplete';}
    report.finished_at=new Date().toISOString();
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  }
  console.log(JSON.stringify({report:path.basename(output),run_status:report.run_status,error_code:report.error_code,
    processes:report.processes.length,requests:report.requests.length,cleanup:report.cleanup}));
  process.exitCode=report.run_status==='author_rehearsal_completed'?0:1;
}
main().catch(()=>{console.error('Codex local adapter preflight failed; no live provider is configured.');process.exitCode=1;});
