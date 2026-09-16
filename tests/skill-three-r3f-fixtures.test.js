'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// Private author feasibility candidate. Never packaged as a public task input,
// never evaluated model output. Default checks do not install or render React.
const root = path.resolve(__dirname, '../skills/threejs-development/evals/fixtures/vanilla-game-migration');
const reuseStage = process.argv.length === 4 && process.argv[2] === '--stage-from' ? path.resolve(process.argv[3]) : null;
const stageRequested = Boolean(reuseStage) || (process.argv.length === 3 && process.argv[2] === '--stage');
assert.ok(process.argv.length === 2 || stageRequested, 'Use no arguments, --stage, or --stage-from <existing author stage>');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-r3f-author-'));
const { validateLevel, createGame, move, tick, reset, snapshot } = require(path.join(root, 'src/game.cjs'));
const { loadLevel } = require(path.join(root, 'src/level.cjs'));
const level = JSON.parse(fs.readFileSync(path.join(root, 'assets/level.json'), 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
let passed = 0;
function inventory(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1).flatMap(entry => {
    assert.equal(entry.isSymbolicLink(), false);
    const file = prefix + entry.name;
    return entry.isDirectory() ? inventory(path.join(directory, entry.name), file + '/') : [[file, hash(fs.readFileSync(path.join(directory, entry.name)))]];
  });
}
const original = inventory(root);
async function test(name, fn) { await fn(); passed += 1; console.log('PASS ' + name); }

const activeClockSource = String.raw`'use strict';
function createActiveClock(now = () => performance.now()) {
  let previous = now(), started = null, first = false;
  return {
    begin(wasMoving, isMoving) {
      if (wasMoving || !isMoving) return false;
      previous = now(); started = previous; first = true; return true;
    },
    sample() {
      const current = now(), result = { seconds: Math.max(0, (current - previous) / 1000), first, elapsedSeconds: started === null ? null : Math.max(0, (current - started) / 1000) };
      previous = current; first = false; return result;
    },
    reset() { previous = now(); started = null; first = false; }
  };
}
module.exports = { createActiveClock };
`;

// This source is written only into a new author staging directory by --stage.
// Actual R3F useFrame/renderer/resource observations require a real browser.
const candidate = String.raw`import React, { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createGame, move, tick, reset, snapshot } from '../src/game.cjs';
import { loadLevel } from '../src/level.cjs';
import { createActiveClock } from './active-clock.cjs';
import { metrics, attachDiagnostics, bindKeys, trackRenderer, trackGeometry, trackMaterial } from '../src/diagnostics.js';
import '../src/styles.css';

metrics.variant = 'private-author-r3f';
function Scene({ level, apiRef, onUi }) {
  const game = useRef(null); if (!game.current) game.current = createGame(level);
  const clock = useRef(null); if (!clock.current) clock.current = createActiveClock();
  const player = useRef(), target = useRef(), lastUi = useRef('');
  const invalidate = useThree(state => state.invalidate);
  const notify = () => {
    const current = game.current, key = current.score + ':' + current.moving;
    if (lastUi.current !== key) { lastUi.current = key; onUi({ score: current.score, status: current.moving ? 'moving' : 'idle' }); }
  };
  useEffect(() => { metrics.r3fCommits += 1; });
  useEffect(() => {
    metrics.activeGameEffects += 1;
    const controls = {
      move(dx, dz) {
        const wasMoving = game.current.moving; move(game.current, dx, dz);
        if (clock.current.begin(wasMoving, game.current.moving)) {
          metrics.lastMovementFirstDeltaSeconds = null; metrics.lastMovementFirstPosition = null;
          metrics.lastMovementElapsedSeconds = 0; metrics.lastMovementFrameCount = 0;
        }
        notify(); invalidate();
      },
      reset() { reset(game.current); clock.current.reset(); notify(); invalidate(); }
    };
    apiRef.current = controls; invalidate();
    return () => { if (apiRef.current === controls) apiRef.current = null; metrics.activeGameEffects -= 1; };
  }, [apiRef, invalidate]);
  useFrame(() => {
    metrics.frameCallbacks += 1;
    const timing = clock.current.sample(), wasMoving = game.current.moving;
    tick(game.current, timing.seconds);
    const current = snapshot(game.current);
    if (wasMoving) {
      metrics.lastMovementFrameCount += 1; metrics.lastMovementElapsedSeconds = timing.elapsedSeconds;
      if (timing.first) { metrics.lastMovementFirstDeltaSeconds = timing.seconds; metrics.lastMovementFirstPosition = { x: current.x, z: current.z }; }
    }
    player.current.position.set(current.x, 0.25, current.z);
    target.current.position.set(current.target[0], 0.03, current.target[1]);
    metrics.game = current; metrics.status = current.moving ? 'moving' : 'idle';
    notify(); if (current.moving) invalidate();
  });
  return <>
    <color attach="background" args={[level.colors.background]} />
    <mesh position={[0, -0.08, 0]}><boxGeometry args={[5, 0.08, 5]} onUpdate={trackGeometry}/><meshBasicMaterial color={level.colors.board} onUpdate={trackMaterial}/></mesh>
    <mesh ref={player} position={[0, 0.25, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} onUpdate={trackGeometry}/><meshBasicMaterial color={level.colors.player} onUpdate={trackMaterial}/></mesh>
    <mesh ref={target} position={[1, 0.03, 0]}><boxGeometry args={[0.55, 0.06, 0.55]} onUpdate={trackGeometry}/><meshBasicMaterial color={level.colors.target} onUpdate={trackMaterial}/></mesh>
  </>;
}
function GameRoute({ failAsset, apiRef, onUi }) {
  const [level, setLevel] = useState(null), [error, setError] = useState(null);
  useEffect(() => {
    let active = true; const abort = new AbortController();
    metrics.activeSessions += 1; metrics.activeAssetLoads += 1; metrics.status = 'loading'; metrics.error = null;
    const unbind = bindKeys((dx, dz) => apiRef.current?.move(dx, dz));
    loadLevel(failAsset ? './assets/missing-level.json' : './assets/level.json', { signal: abort.signal }).then(value => {
      if (active) setLevel(value);
    }).catch(reason => {
      if (active && reason.name !== 'AbortError') { metrics.status = 'error'; metrics.error = reason.message; setError(reason.message); onUi({ score: 0, status: 'error' }); }
    }).finally(() => { metrics.activeAssetLoads -= 1; });
    return () => { active = false; abort.abort(); unbind(); apiRef.current = null; metrics.activeSessions -= 1; metrics.status = 'outside'; metrics.game = null; };
  }, [failAsset, apiRef, onUi]);
  if (error) return <p role="alert">Level error: {error}</p>;
  if (!level) return <p>Loading level…</p>;
  return <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [4, 5, 6], fov: 45, near: 0.1, far: 100 }} gl={{ antialias: true }} fallback={<p role="alert">WebGL unavailable</p>}
    onCreated={({ gl, camera }) => { trackRenderer(gl); camera.lookAt(0, 0, 0); }}>
    <Scene level={level} apiRef={apiRef} onUi={onUi}/>
  </Canvas>;
}
function App() {
  const [route, setRoute] = useState(null), [fail, setFail] = useState(false), [ui, setUi] = useState({ score: 0, status: 'Outside game' });
  const next = useRef(0), apiRef = useRef(null), diagnostic = useRef(null);
  const onUi = useCallback(value => setUi(value), []);
  useEffect(() => { metrics.reactCommits += 1; });
  useEffect(() => attachDiagnostics(diagnostic.current), []);
  const enter = failure => { setUi({ score: 0, status: 'loading' }); setRoute({ id: ++next.current, failAsset: failure }); setFail(false); };
  return <main><h1>Grid target game — private author R3F</h1><p>Move with arrow keys or direction buttons. Reach the orange target to score.</p>
    <nav><button id="enter" onClick={() => enter(fail)}>Enter game</button><button id="leave" onClick={() => { setRoute(null); setUi({ score: 0, status: 'Outside game' }); }}>Leave game</button><label><input id="fail" type="checkbox" checked={fail} onChange={event => setFail(event.target.checked)}/>Fail next level load</label></nav>
    <p id="state" role="status">{ui.status}</p><div id="stage" className="stage">{route && <GameRoute key={route.id} failAsset={route.failAsset} apiRef={apiRef} onUi={onUi}/>}</div>
    <div className="controls">{[['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]].map(([id, dx, dz]) => <button key={id} id={id} onClick={() => apiRef.current?.move(dx, dz)}>{id[0].toUpperCase() + id.slice(1)}</button>)}
    <button id="reset" onClick={() => apiRef.current?.reset()}>Reset</button><button id="retry" onClick={() => enter(false)}>Retry level</button></div>
    <p id="score">Score: {ui.score}</p><h2>Observed counters</h2><p>Counts, not GPU bytes. Wait for startup to settle before measuring idle.</p><pre id="diagnostics" ref={diagnostic}/>
  </main>;
}
createRoot(document.querySelector('#app')).render(<StrictMode><App/></StrictMode>);
`;

async function stage() {
  const npm = process.env.CRAFTROSTER_NPM_CLI || process.env.npm_execpath;
  if (!reuseStage) assert.ok(npm && fs.statSync(npm).isFile(), 'Set CRAFTROSTER_NPM_CLI to an installed npm-cli.js for --stage');
  const destination = path.join(temp, 'browser-comparison');
  fs.cpSync(root, destination, { recursive: true });
  fs.mkdirSync(path.join(destination, '.author-candidate'));
  fs.writeFileSync(path.join(destination, '.author-candidate/main.jsx'), candidate);
  fs.writeFileSync(path.join(destination, '.author-candidate/active-clock.cjs'), activeClockSource);
  fs.writeFileSync(path.join(destination, 'npm-user-config'), 'registry=https://registry.npmjs.org/\n');
  fs.writeFileSync(path.join(destination, 'npm-global-config'), '');
  function execute(args, timeout = 120000) {
    const result = spawnSync(process.execPath, args, { cwd: destination, encoding: 'utf8', timeout, windowsHide: true });
    assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout.trim();
  }
  const lock = fs.readFileSync(path.join(destination, 'package-lock.json'));
  let install;
  if (reuseStage) {
    const existing = fs.realpathSync(reuseStage);
    assert.equal(path.basename(existing), 'browser-comparison');
    assert.match(path.basename(path.dirname(existing)), /^craftroster-r3f-author-/);
    assert.equal(path.dirname(path.dirname(existing)), fs.realpathSync(os.tmpdir()));
    assert.deepEqual(fs.readFileSync(path.join(existing, 'package-lock.json')), lock, 'Reused dependency installation must have the identical lockfile');
    fs.cpSync(path.join(existing, 'node_modules'), path.join(destination, 'node_modules'), { recursive: true });
    install = 'Reused existing fixed author-stage node_modules; no dependency fetch/install: ' + existing;
  } else install = execute([npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--userconfig', './npm-user-config', '--globalconfig', './npm-global-config', '--cache', './npm-cache']);
  assert.deepEqual(fs.readFileSync(path.join(destination, 'package-lock.json')), lock);
  execute(['tools/build.cjs']);
  const build = String.raw`'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),out=path.join(root,'.build/r3f');fs.mkdirSync(out,{recursive:true});
require('esbuild').buildSync({absWorkingDir:root,entryPoints:['.author-candidate/main.jsx'],outfile:path.join(out,'app.js'),bundle:true,platform:'browser',format:'iife',sourcemap:true,define:{'process.env.NODE_ENV':'"development"'},logLevel:'warning'});
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private R3F author comparison</title><link rel="stylesheet" href="app.css"><div id="app"></div><script src="app.js"></script></html>');
console.log('Built private fixed R3F author candidate; no browser or model execution.');
`;
  fs.writeFileSync(path.join(destination, '.author-candidate/build.cjs'), build);
  execute(['.author-candidate/build.cjs']);
  const versions = {};
  for (const name of ['three', 'react', 'react-dom', '@react-three/fiber']) versions[name] = JSON.parse(fs.readFileSync(path.join(destination, 'node_modules', name, 'package.json'), 'utf8')).version;
  assert.deepEqual(versions, { three: '0.180.0', react: '19.1.1', 'react-dom': '19.1.1', '@react-three/fiber': '9.3.0' });
  const map = JSON.parse(fs.readFileSync(path.join(destination, '.build/r3f/app.js.map'), 'utf8'));
  assert.ok(map.sources.some(source => source.includes('@react-three/fiber')));
  assert.ok(map.sources.some(source => source.includes('react-dom-client')));
  assert.ok(map.sources.some(source => source.includes('three')));
  const result = { kind: 'private_author_staging', root: destination, versions, install, build: 'passed', browser: 'not_run', modelEvaluation: 'not_run', strictMode: true,
    sourceSha256: Object.fromEntries(inventory(root)), candidateSha256: hash(candidate), activeClockSha256: hash(activeClockSource),
    serveCommand: 'node tools/serve.cjs 0', routes: ['/vanilla/', '/r3f/'],
    observationsNeeded: ['canvas and nonzero actual renderer draw calls', 'Right reaches first target and score 1', 'Reset restores state', 'idle frame/render/React counters settle', 'load error then retry', 'leave while asset pending', 'repeated route cycles with no active canvas/keybinding and released tracked resources after cleanup'] };
  fs.writeFileSync(path.join(destination, 'author-staging.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}

async function main() {
  await test('public input pins compatible packages and contains no R3F implementation or private candidate', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    assert.deepEqual(manifest.dependencies, { three: '0.180.0', react: '19.1.1', 'react-dom': '19.1.1', '@react-three/fiber': '9.3.0' });
    for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) assert.equal(lock.packages['node_modules/' + name].version, version);
    assert.equal(lock.packages['node_modules/@react-three/fiber'].peerDependencies.react, '^19.0.0');
    assert.equal(lock.packages['node_modules/@react-three/fiber'].peerDependencies.three, '>=0.156');
    assert.ok(original.every(([file]) => !file.includes('.author-candidate') && !file.includes('node_modules') && !file.endsWith('.jsx')));
    for (const [file] of original.filter(([file]) => file.startsWith('src/'))) assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /from ['"]@react-three\/fiber|<Canvas|useFrame\(/);
  });
  await test('the public game test actually preserves target collection, idle and reset', () => {
    assert.equal(require(path.join(root, 'test/game.test.cjs')).run().status, 'passed');
  });
  await test('movement bounds, delta cap, target sequence and repeated idle steps have deterministic behavior', () => {
    const game = createGame(level); move(game, 1, 0); tick(game, 10);
    assert.equal(game.x, 0.2); assert.equal(game.score, 0);
    for (let index = 0; index < 30; index += 1) tick(game, 0.05);
    assert.equal(game.score, 1); assert.equal(game.moving, false);
    move(game, -1, 0); move(game, -1, 0); move(game, 0, 1);
    for (let index = 0; index < 30; index += 1) tick(game, 0.05);
    assert.equal(game.score, 2); assert.deepEqual(snapshot(game).target, [1, -1]);
    const idle = snapshot(game); for (let index = 0; index < 100; index += 1) tick(game, 0.05);
    assert.deepEqual(snapshot(game), idle);
    for (let index = 0; index < 100; index += 1) move(game, 1, 0);
    assert.equal(game.toX, 2); reset(game); assert.equal(game.score, 0);
    assert.throws(() => move(game, 1, 1), /cardinal/); assert.throws(() => tick(game, -1), /delta/);
  });
  await test('invalid levels and HTTP failures are rejected while cancellation is forwarded to the asset boundary', async () => {
    assert.throws(() => validateLevel({ ...level, targets: [[100, 0]] }), /target/);
    assert.throws(() => validateLevel({ ...level, colors: { ...level.colors, player: 'url(remote)' } }), /colors/);
    const controller = new AbortController(); let received;
    assert.deepEqual(await loadLevel('/level.json', { signal: controller.signal, fetchImpl: async (url, options) => { received = { url, signal: options.signal }; return { ok: true, json: async () => level }; } }), level);
    assert.deepEqual(received, { url: '/level.json', signal: controller.signal });
    await assert.rejects(loadLevel('/missing.json', { fetchImpl: async () => ({ ok: false, status: 404 }) }), /404/);
    controller.abort();
    await assert.rejects(loadLevel('/level.json', { signal: controller.signal, fetchImpl: async (url, { signal }) => { signal.throwIfAborted(); } }), error => error.name === 'AbortError');
  });
  await test('an authored movement-speed regression is distinguishable from the preserved game contract', () => {
    const file = path.join(temp, 'broken-game.cjs');
    const source = fs.readFileSync(path.join(root, 'src/game.cjs'), 'utf8');
    const changed = source.replace('game.level.speed * Math.min(seconds, 0.05)', 'game.level.speed * Math.min(seconds, 0.05) * 100');
    assert.notEqual(changed, source); fs.writeFileSync(file, changed);
    const broken = require(file), game = broken.createGame(level); broken.move(game, 1, 0); broken.tick(game, 0.01);
    assert.notEqual(game.x, 0.04); assert.equal(game.score, 1);
  });
  await test('the private active-time adapter excludes idle time and retains elapsed time during additional movement input', () => {
    const file = path.join(temp, 'active-clock.cjs'); fs.writeFileSync(file, activeClockSource);
    const { createActiveClock } = require(file);
    let now = 0; const clock = createActiveClock(() => now), game = createGame(level);
    now = 1000; move(game, 1, 0); assert.equal(clock.begin(false, game.moving), true);
    now = 1016; const first = clock.sample(); tick(game, first.seconds);
    assert.deepEqual(first, { seconds: 0.016, first: true, elapsedSeconds: 0.016 });
    assert.equal(game.x, 0.064);
    now = 1020; move(game, 1, 0); assert.equal(clock.begin(true, game.moving), false);
    now = 1032; const second = clock.sample(); tick(game, second.seconds);
    assert.equal(second.seconds, 0.016); assert.equal(game.x, 0.128);
    clock.reset(); reset(game); now = 2032; move(game, 0, 1); assert.equal(clock.begin(false, game.moving), true);
    now = 2048; assert.equal(clock.sample().seconds, 0.016);
  });
  if (stageRequested) await test('fixed real React/R3F/Three dependencies compile both isolated browser comparison routes', stage);
  else console.log('NOT RUN dependency installation, build, browser or WebGL; --stage creates a real private browser comparison.');
  await test('canonical fixture remains unchanged with no candidate, dependency or build leakage', () => {
    assert.deepEqual(inventory(root), original);
    for (const name of ['.build', '.author-candidate', 'node_modules']) assert.equal(fs.existsSync(path.join(root, name)), false);
  });
  console.log(JSON.stringify({ authorChecksPassed: passed, stage: stageRequested ? 'built' : 'not_run', browser: 'not_run', modelEvaluation: 'not_run' }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (stageRequested) { console.log('Retained private author staging directory: ' + temp); return; }
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-r3f-author-')) throw new Error('Unsafe author fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
});
