'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { runTaskTrial, DEFAULT_LIMITS } = require('../scripts/lib/skill-task-driver');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const SECRET = 'PRIVATE-GRADER-SENTINEL-NOT-TRANSPORTED';
let passed = 0;
const tool = (name, args) => JSON.stringify({ type: 'tool_call', request: { tool: name, arguments: args } });
const final = text => JSON.stringify({ type: 'final', text });
const fixture = () => [
  { path:'task.txt', bytes:Buffer.from('Inspect the public input and write a bounded JSON result.') },
  { path:'skill-catalog.json', bytes:Buffer.from('{"skills":[{"name":"alpha"}]}') },
  { path:'skills/alpha/SKILL.md', bytes:Buffer.from('Public alpha guidance.') },
  { path:'workspace/input.json', bytes:Buffer.from('{"amount":7,"note":"PUBLIC-CONTENT-NOT-A-REPORT-LOG"}') },
];
const policy = () => ({ writable_paths:['workspace/result.json'] });
function sequence(responses, inspect = () => {}) {
  let index = 0;
  return async args => { inspect(args, index); assert.ok(index < responses.length, 'No automatic adapter retry'); return responses[index++]; };
}
function artifact(result, name) { return result.artifacts.find(file => file.path === name)?.bytes.toString('utf8'); }
function assertHonest(report) {
  assert.equal(report.status,'not_run'); assert.equal(report.evaluation_kind,'transport_neutral_task_driver');
  assert.equal(report.model_execution,null); assert.equal(report.activation_observed,false); assert.equal(report.host_isolation_enforced,false);
  assert.equal(report.usage,null); assert.equal(report.cost,null); assert.equal(report.usage_complete,false);
}
async function test(name, fn) { await fn(); passed += 1; console.log('PASS ' + name); }
const settle = () => new Promise(resolve => setImmediate(resolve));

async function main() {
  await test('cached driver and preloaded broker sources cannot be relabeled with changed disk hashes', async () => {
    for (const scenario of ['driver-changed', 'broker-preloaded-then-changed', 'broker-unavailable']) {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-driver-provenance-'));
      const driverFile = path.join(root, 'skill-task-driver.js'), brokerFile = path.join(root, 'skill-eval-broker.js');
      try {
        fs.copyFileSync(require.resolve('../scripts/lib/skill-task-driver'), driverFile);
        fs.copyFileSync(require.resolve('../scripts/lib/skill-eval-broker'), brokerFile);
        const driverHash = hash(fs.readFileSync(driverFile)), brokerHash = hash(fs.readFileSync(brokerFile));
        let loaded;
        if (scenario === 'broker-preloaded-then-changed') {
          const cached = require(brokerFile);
          assert.equal(cached.LOADED_PROVENANCE.source_sha256, brokerHash);
          fs.appendFileSync(brokerFile, '\n// Changed after the broker module was cached.\n');
          loaded = require(driverFile); // Must use cached broker metadata, not its new disk bytes.
        } else {
          loaded = require(driverFile);
          if (scenario === 'driver-changed') fs.appendFileSync(driverFile, '\n// Changed after the driver module was cached.\n');
          else fs.unlinkSync(brokerFile);
        }
        let calls = 0;
        const result = await loaded.runTaskTrial({ publicFiles: fixture(), adapter: async () => { calls++; return final('unexpected'); } });
        assert.equal(calls, 0); assert.equal(result.report.run_status, 'error');
        assert.deepEqual(result.report.error, { category: 'provenance', code: 'loaded_source_changed' });
        assert.equal(result.report.implementation_sha256.driver, driverHash);
        assert.equal(result.report.implementation_sha256.broker, brokerHash);
        assert.equal(result.report.artifact_grading.status, 'not_run'); assert.equal(result.report.broker_trace.length, 0);
        assert.equal(result.artifacts.length, fixture().length);
      } finally {
        for (const filename of Object.keys(require.cache)) if (filename.startsWith(root + path.sep)) delete require.cache[filename];
        const resolved = path.resolve(root);
        assert.equal(path.dirname(resolved), path.resolve(os.tmpdir())); assert.ok(path.basename(resolved).startsWith('craftroster-driver-provenance-'));
        fs.rmSync(resolved, { recursive: true, force: true });
      }
    }
  });
  await test('progressive public reads, bounded write and final use complete history and grade only final artifacts', async () => {
    const requests = [], checks = [{id:'result',type:'json_value',path:'workspace/result.json',keys:['amount'],equals:14}];
    const replies = [tool('read_file',{path:'workspace/input.json'}), tool('read_file',{path:'skills/alpha/SKILL.md'}),
      tool('write_file',{path:'workspace/result.json',content:'{"amount":14}'}), final('Prepared result.')];
    const result = await runTaskTrial({publicFiles:fixture(),policy:policy(),checks,adapter:sequence(replies,({requestJson,signal}) => {
      assert.ok(signal instanceof AbortSignal); requests.push(requestJson);
    })});
    assertHonest(result.report); assert.equal(result.report.run_status,'completed'); assert.equal(result.report.artifact_grading.status,'passed');
    assert.equal(result.report.final_text,'Prepared result.'); assert.equal(artifact(result,'workspace/result.json'),'{"amount":14}');
    assert.deepEqual(result.report.loaded_skill_entries,['skills/alpha/SKILL.md']);
    assert.deepEqual(requests.map(text => JSON.parse(text).messages.length),[1,3,5,7]);
    const last = JSON.parse(requests[3]); assert.equal(last.messages[2].role,'tool'); assert.match(last.messages[2].content.content,/PUBLIC-CONTENT/);
    assert.equal(last.messages[4].content.content,'Public alpha guidance.');
    assert.equal(last.messages[6].content.ok,true);
    requests.forEach((text,index) => { assert.equal(result.report.turns[index].request_sha256,hash(text)); assert.equal(result.report.turns[index].response_sha256,hash(replies[index])); });
    assert.ok(!JSON.stringify(result.report).includes('PUBLIC-CONTENT-NOT-A-REPORT-LOG'));
    assert.equal(result.report.turns.length,4); assert.equal(result.report.broker_trace.length,3);
  });
  await test('adapter receives only public bootstrap and signal, never private checks or broker inspectors', async () => {
    const observed = [], checks = [{id:SECRET,type:'manual',rubric:SECRET}];
    const result = await runTaskTrial({publicFiles:fixture(),policy:policy(),checks,privateRecord:{secret:SECRET},hostOptions:{secret:SECRET},adapter:async args => {
      assert.deepEqual(Object.keys(args).sort(),['requestJson','signal']);
      const request = JSON.parse(args.requestJson); observed.push(args.requestJson);
      assert.deepEqual(Object.keys(request).sort(),['messages','protocol','response_schema','tool_schema','turn','write_grants']);
      assert.deepEqual(Object.keys(request.messages[0].content).sort(),['skill_catalog','task']);
      assert.equal(request.messages.length,1); assert.ok(!args.requestJson.includes('Public alpha guidance.')); assert.ok(!args.requestJson.includes(SECRET));
      return final('Manual verification still required.');
    }});
    assert.equal(observed.length,1); assert.equal(result.report.artifact_grading.status,'unverified');
    assert.ok(!JSON.stringify(result.report).includes(SECRET)); assert.equal(result.report.artifact_grading.checks[0].id_sha256,hash(SECRET));
  });
  await test('caller mutations cannot change copied public bytes, policy, checks or serialized history', async () => {
    const files = fixture(), grants = policy(), checks = [{id:'result',type:'json_value',path:'workspace/result.json',keys:['amount'],equals:14}];
    let turn = 0;
    const result = await runTaskTrial({publicFiles:files,policy:grants,checks,adapter:async ({requestJson}) => {
      const request = JSON.parse(requestJson);
      if (++turn === 1) {
        files.find(file => file.path==='workspace/input.json').bytes.fill(88); grants.writable_paths.push('workspace/forbidden.json'); checks[0].equals=999;
        request.messages[0].content.task=SECRET;
        return tool('read_file',{path:'workspace/input.json'});
      }
      assert.ok(!requestJson.includes(SECRET));
      if (turn === 2) { assert.match(request.messages.at(-1).content.content,/"amount":7/); return tool('write_file',{path:'workspace/forbidden.json',content:'bad'}); }
      if (turn === 3) { assert.equal(request.messages.at(-1).content.reason,'write_not_granted'); return tool('write_file',{path:'workspace/result.json',content:'{"amount":14}'}); }
      return final('Done');
    }});
    assert.equal(result.report.artifact_grading.status,'passed'); assert.equal(artifact(result,'workspace/forbidden.json'),undefined);
  });
  await test('invalid checks, policy, limits and missing or non-UTF8 public bootstrap fail before adapter invocation', async () => {
    const scenarios = [
      { checks:[{id:SECRET,type:'unsupported'}] }, { checks:[{id:SECRET,type:'file_sha256',path:'workspace/input.json',sha256:SECRET}] },
      { checks:[{id:'duplicate',type:'manual'},{id:'duplicate',type:'manual'}] }, { policy:{host:SECRET} },
      { limits:{unknown:1} }, { limits:{timeout_ms:0} }, { limits:{max_adapter_turns:1000} },
      { publicFiles:fixture().filter(file=>file.path!=='task.txt') }, { publicFiles:fixture().filter(file=>file.path!=='skill-catalog.json') },
      { publicFiles:fixture().map(file=>file.path==='task.txt'?{...file,bytes:Buffer.from([0xff])}:file) },
    ];
    for (const scenario of scenarios) {
      let calls=0; const result=await runTaskTrial({publicFiles:fixture(),...scenario,adapter:async()=>{calls++;return final('unexpected');}});
      assert.equal(calls,0); assert.equal(result.report.run_status,'error'); assert.equal(result.report.error.category,'configuration');
      assert.equal(result.report.artifact_grading.status,'not_run'); assert.ok(!JSON.stringify(result.report).includes(SECRET));
    }
  });
  await test('strict response envelopes reject batches, unknown keys and malformed final/tool shapes', async () => {
    const responses = ['{broken', JSON.stringify([{type:'final',text:'done'}]), JSON.stringify({type:'final',text:'done',usage:SECRET}),
      JSON.stringify({type:'final',text:{secret:SECRET}}), JSON.stringify({type:'tool_call',request:{tool:'read_file',arguments:{path:'task.txt'},extra:true}}),
      JSON.stringify({type:'tool_call',request:{tool:'read_file'}}), JSON.stringify({type:'tool_call',request:{tool:'read_file',arguments:[]}}),
      JSON.stringify({type:'final',request:{tool:'write_file',arguments:{}},text:'done'})];
    for(const response of responses) {
      const result=await runTaskTrial({publicFiles:fixture(),adapter:sequence([response])});
      assert.equal(result.report.run_status,'error'); assert.equal(result.report.error.code,'invalid_response'); assert.equal(result.report.broker_trace.length,0);
      assert.equal(result.report.final_text,null); assert.ok(!JSON.stringify(result.report).includes(SECRET));
    }
  });
  await test('non-string transport results are rejected without serializing provider payloads', async () => {
    const result=await runTaskTrial({publicFiles:fixture(),adapter:async()=>({text:SECRET,toJSON(){throw Error(SECRET);}})});
    assert.equal(result.report.run_status,'error'); assert.equal(result.report.error.code,'non_string_response');
    assert.equal(result.report.turns[0].response_sha256,null); assert.ok(!JSON.stringify(result.report).includes(SECRET));
  });
  await test('denied private reads, unauthorized writes and unknown tools retain auditable decisions', async () => {
    const result=await runTaskTrial({publicFiles:fixture(),adapter:sequence([
      tool('read_file',{path:'private/record.json'}),tool('write_file',{path:'workspace/input.json',content:'denied'}),
      tool('shell',{command:'not executed'}),final('Denied actions observed')])});
    assert.equal(result.report.run_status,'completed'); assert.equal(result.report.artifact_grading.status,'not_run');
    assert.deepEqual(result.report.broker_trace.map(event=>event.reason),['invalid_or_private_path','write_not_granted','unknown_tool']);
    assert.ok(result.report.broker_trace.every(event=>event.decision==='denied')); assert.match(artifact(result,'workspace/input.json'),/"amount":7/);
  });
  await test('completed manual and absent checks cannot become automatic task passes', async () => {
    for(const checks of [[],[{id:'human',type:'manual'}]]) {
      const result=await runTaskTrial({publicFiles:fixture(),checks,adapter:sequence([final('')])});
      assertHonest(result.report); assert.equal(result.report.run_status,'completed');
      assert.equal(result.report.artifact_grading.status,checks.length?'unverified':'not_run');
    }
  });
  await test('a final response with a failed artifact check remains a failed grade despite completed transport', async () => {
    const result=await runTaskTrial({publicFiles:fixture(),checks:[{id:'wrong',type:'json_value',path:'workspace/input.json',keys:['amount'],equals:999}],adapter:sequence([final('I succeeded')])});
    assertHonest(result.report); assert.equal(result.report.run_status,'completed'); assert.equal(result.report.artifact_grading.status,'failed');
  });
  await test('adapter turn exhaustion preserves accepted writes without grading or automatic retries', async () => {
    const result=await runTaskTrial({publicFiles:fixture(),policy:policy(),limits:{max_adapter_turns:1},checks:[{id:'out',type:'json_value',path:'workspace/result.json',keys:[],equals:{ok:true}}],
      adapter:sequence([tool('write_file',{path:'workspace/result.json',content:'{"ok":true}'})])});
    assert.equal(result.report.run_status,'limit_exceeded'); assert.equal(result.report.error.code,'adapter_turns');
    assert.equal(result.report.artifact_grading.status,'not_run'); assert.equal(artifact(result,'workspace/result.json'),'{"ok":true}'); assert.equal(result.report.turns.length,1);
  });
  await test('broker trace overflow terminates the driver and cannot be hidden by otherwise passing artifacts', async () => {
    const result=await runTaskTrial({publicFiles:fixture(),policy:{limits:{max_calls:1}},checks:[{id:'intact',type:'file_unchanged',path:'workspace/input.json'}],
      adapter:sequence([tool('read_file',{path:'task.txt'}),tool('read_file',{path:'skill-catalog.json'})])});
    assert.equal(result.report.run_status,'limit_exceeded'); assert.equal(result.report.error.code,'broker_call_limit'); assert.equal(result.report.trace_complete,false);
    assert.equal(result.report.calls_attempted,2); assert.equal(result.report.calls_not_recorded,1); assert.equal(result.report.broker_trace.length,1); assert.equal(result.report.artifact_grading.status,'not_run');
  });
  await test('response bounds count UTF8 bytes and do not hash or retain oversized payloads', async () => {
    const response=final('測'.repeat(30)); assert.ok(response.length<=80); assert.ok(Buffer.byteLength(response)>80);
    const result=await runTaskTrial({publicFiles:fixture(),limits:{max_response_bytes:80},adapter:sequence([response])});
    assert.equal(result.report.run_status,'limit_exceeded'); assert.equal(result.report.error.code,'response_bytes'); assert.equal(result.report.turns[0].response_sha256,null); assert.equal(result.report.final_text,null);
    const huge=await runTaskTrial({publicFiles:fixture(),limits:{max_response_bytes:20},adapter:sequence(['X'.repeat(100)])});
    assert.equal(huge.report.error.code,'response_bytes'); assert.equal(huge.report.turns[0].response_bytes,null);
  });
  await test('request and cumulative public-history limits stop rather than truncate or dispatch further tools', async () => {
    for(const limits of [{max_request_bytes:1},{max_history_bytes:1}]) {
      let calls=0; const result=await runTaskTrial({publicFiles:fixture(),limits,adapter:async()=>{calls++;return final('unexpected');}});
      assert.equal(calls,0); assert.equal(result.report.run_status,'limit_exceeded'); assert.equal(result.report.artifact_grading.status,'not_run');
    }
    const files=fixture(); files.push({path:'workspace/large.txt',bytes:Buffer.from('L'.repeat(6000))});
    const result=await runTaskTrial({publicFiles:files,limits:{max_history_bytes:5000},adapter:sequence([tool('read_file',{path:'workspace/large.txt'})])});
    assert.equal(result.report.error.code,'history_bytes'); assert.equal(result.report.broker_trace.length,1); assert.equal(result.report.turns.length,1);
    assert.ok(!JSON.stringify(result.report).includes('L'.repeat(100)));
  });
  await test('final text has an independent byte bound and counts toward retained public history', async () => {
    const result=await runTaskTrial({publicFiles:fixture(),limits:{max_final_text_bytes:4},adapter:sequence([final('hello')])});
    assert.equal(result.report.error.code,'final_text_bytes'); assert.equal(result.report.final_text,null); assert.equal(result.report.artifact_grading.status,'not_run');
    const history=await runTaskTrial({publicFiles:fixture(),limits:{max_history_bytes:300},adapter:sequence([final('F'.repeat(200))])});
    assert.equal(history.report.error.code,'history_bytes'); assert.equal(history.report.final_text,null);
  });
  await test('pre-aborted requests preserve initial artifacts and never invoke the adapter or expose abort reasons', async () => {
    const abort=new AbortController(); abort.abort(SECRET); let calls=0;
    const result=await runTaskTrial({publicFiles:fixture(),signal:abort.signal,adapter:async()=>{calls++;return final('unexpected');}});
    assert.equal(calls,0); assert.equal(result.report.run_status,'cancelled'); assert.equal(result.report.turns.length,0);
    assert.equal(result.artifacts.length,4); assert.ok(!JSON.stringify(result.report).includes(SECRET));
  });
  await test('abort during a later call preserves prior writes and ignores late tool replies', async () => {
    const abort=new AbortController(); let release, turns=0, adapterSignal;
    const running=runTaskTrial({publicFiles:fixture(),policy:policy(),signal:abort.signal,adapter:async({signal})=>{
      adapterSignal=signal;
      if(++turns===1)return tool('write_file',{path:'workspace/result.json',content:'partial'});
      return new Promise(resolve=>{release=resolve;});
    }});
    while(!release)await settle(); abort.abort(SECRET);
    const result=await running; const trace=JSON.stringify(result.report.broker_trace);
    assert.equal(result.report.run_status,'cancelled'); assert.equal(adapterSignal.aborted,true); assert.notEqual(adapterSignal.reason,SECRET);
    assert.equal(artifact(result,'workspace/result.json'),'partial'); assert.equal(result.report.artifact_grading.status,'not_run');
    release(tool('delete_file',{path:'workspace/result.json'})); await settle(); await settle();
    assert.equal(JSON.stringify(result.report.broker_trace),trace); assert.equal(artifact(result,'workspace/result.json'),'partial');
  });
  await test('total timeout signals a pending adapter and a late write cannot reach the broker', async () => {
    let release, signal;
    const result=await runTaskTrial({publicFiles:fixture(),policy:policy(),limits:{timeout_ms:25},adapter:async args=>{signal=args.signal;return new Promise(resolve=>{release=resolve;});}});
    assert.equal(result.report.run_status,'timed_out'); assert.equal(result.report.artifact_grading.status,'not_run'); assert.equal(signal.aborted,true);
    release(tool('write_file',{path:'workspace/result.json',content:'late'})); await settle();
    assert.equal(result.report.broker_trace.length,0); assert.equal(artifact(result,'workspace/result.json'),undefined);
  });
  await test('deadline is checked after synchronous callback work, not only by event-loop timers', async () => {
    const result=await runTaskTrial({publicFiles:fixture(),policy:policy(),limits:{timeout_ms:15},adapter:async()=>{
      const end=performance.now()+25; while(performance.now()<end) { /* Fixed bounded author-only CPU work. */ }
      return tool('write_file',{path:'workspace/result.json',content:'too late'});
    }});
    assert.equal(result.report.run_status,'timed_out'); assert.equal(result.report.broker_trace.length,0); assert.equal(artifact(result,'workspace/result.json'),undefined);
  });
  await test('adapter exceptions are redacted, not retried, and leave partial artifacts ungraded', async () => {
    let calls=0; const result=await runTaskTrial({publicFiles:fixture(),policy:policy(),checks:[{id:SECRET,type:'file_unchanged',path:'task.txt'}],adapter:async()=>{
      if(++calls===1)return tool('write_file',{path:'workspace/result.json',content:'partial'});
      throw new Error(SECRET);
    }});
    assert.equal(calls,2); assert.equal(result.report.run_status,'error'); assert.deepEqual(result.report.error,{category:'transport',code:'adapter_threw'});
    assert.equal(result.report.artifact_grading.status,'not_run'); assert.equal(artifact(result,'workspace/result.json'),'partial'); assert.ok(!JSON.stringify(result.report).includes(SECRET));
  });
  await test('source inputs stay unchanged and configuration/implementation hashes bind the evaluator setup', async () => {
    const files=fixture(), checks=[{id:'manual',type:'manual'}], grants=policy();
    const beforeFiles=files.map(file=>({path:file.path,bytes:Buffer.from(file.bytes)})), beforeChecks=structuredClone(checks), beforePolicy=structuredClone(grants);
    const run=()=>runTaskTrial({publicFiles:files,checks,policy:grants,adapter:sequence([final('done')])});
    const first=await run(), second=await run();
    assert.deepEqual(files,beforeFiles); assert.deepEqual(checks,beforeChecks); assert.deepEqual(grants,beforePolicy);
    assert.equal(first.report.configuration_sha256,second.report.configuration_sha256);
    for(const digest of Object.values(first.report.implementation_sha256))assert.match(digest,/^[a-f0-9]{64}$/);
    assert.deepEqual(first.report.limits,DEFAULT_LIMITS); assert.match(first.report.private_checks_sha256,/^[a-f0-9]{64}$/);
    first.artifacts[0].bytes.fill(88); assert.deepEqual(files,beforeFiles); assert.notDeepEqual(first.artifacts[0].bytes,second.artifacts[0].bytes);
    checks[0].id='different'; const changed=await run(); assert.notEqual(changed.report.configuration_sha256,second.report.configuration_sha256);
    assertHonest(first.report);
  });
  console.log('Skill task driver tests passed: '+passed+'; fixed local adapters only, no model/network/shell execution.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
