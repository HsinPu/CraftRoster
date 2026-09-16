import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { releaseRoute } from './lifecycle.cjs';
import { validateContainer } from './asset-policy.cjs';

const canvas = document.querySelector('#viewer');
const status = document.querySelector('#status');
const output = document.querySelector('#diagnostics');
const buttons = [...document.querySelectorAll('button')];
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (error) { status.textContent = 'WebGL unavailable: ' + error.message; buttons.forEach(button => { button.disabled = true; }); }

if (renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#17212d');
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  const controls = new OrbitControls(camera, canvas);
  const events = [], phases = [], transitions = [];
  const created = { shared: {}, route: {} };
  let route = null, frames = 0, busy = false, lastDiagnostic = 0;
  function observe(resource, owner, kind) {
    created[owner][kind] = (created[owner][kind] || 0) + 1;
    resource.addEventListener('dispose', () => events.push({ owner, kind, atCpuMs: Number(performance.now().toFixed(3)) }));
    return resource;
  }
  const sharedGeometry = observe(new THREE.BoxGeometry(0.7, 0.7, 0.7), 'shared', 'geometry');
  const sharedTexture = observe(new THREE.DataTexture(new Uint8Array([40, 130, 245, 255]), 1, 1), 'shared', 'texture');
  sharedTexture.needsUpdate = true;
  const sharedMaterial = observe(new THREE.MeshBasicMaterial({ map: sharedTexture }), 'shared', 'material');
  const reference = new THREE.Mesh(sharedGeometry, sharedMaterial);
  reference.position.x = -1.1;
  scene.add(reference, new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(2, 3, 4); scene.add(light);
  function memory() {
    return { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs.length };
  }
  function paint() {
    if (route) { renderer.setRenderTarget(route.target); renderer.render(scene, camera); }
    renderer.setRenderTarget(null); renderer.render(scene, camera); frames += 1;
  }
  function diagnose() {
    output.textContent = JSON.stringify({ threeRevision: THREE.REVISION, webglVersion: renderer.getContext().getParameter(renderer.getContext().VERSION),
      routeMounted: Boolean(route), busy, frames, renderer: memory(), resourcesCreated: created,
      actualDisposeEvents: events, recentPhases: phases.slice(-12), transitions: transitions.slice(-14),
      metricLimits: 'Object counts, not GPU bytes. performance.now CPU wall-time, not GPU timer. Shared resources must stay alive.' }, null, 2);
  }
  function recordPhase(name, started, extra = {}) {
    const cpuWallMs = Number((performance.now() - started).toFixed(3));
    phases.push({ name, cpuWallMs, observedBudgetMs: 50, overObservedBudget: cpuWallMs > 50, ...extra });
  }
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); status.textContent = 'WebGL context lost; no successful resource verdict is claimed.'; });
  function tick(now) {
    paint();
    if (now - lastDiagnostic > 200) { diagnose(); lastDiagnostic = now; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  function unmount() {
    if (!route) return;
    releaseRoute(route, scene);
    route = null;
    paint();
    transitions.push({ action: 'unmount', ...memory() });
    status.textContent = 'Route unmounted; shared reference stays visible.';
  }
  async function mount(corrupt = false) {
    unmount();
    status.textContent = 'Loading local GLB…';
    const response = await fetch(corrupt ? './assets/corrupt-texture.glb' : './assets/triangle.glb');
    if (!response.ok) throw new Error('Local asset unavailable');
    const bytes = validateContainer(await response.arrayBuffer());
    const manager = new THREE.LoadingManager();
    const failures = [];
    manager.onError = () => failures.push('embedded image decode failed');
    const started = performance.now();
    const gltf = await new GLTFLoader(manager).parseAsync(bytes, '');
    recordPhase('GLTF parse/decode await', started, { boundedCorruptSample: corrupt, embeddedImageErrors: failures.length });
    if (failures.length) throw new Error('Bounded texture decode failed; no route was mounted. This is not a tab-crash reproduction.');
    const owned = new Set();
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      if (!owned.has(object.geometry)) { owned.add(object.geometry); observe(object.geometry, 'route', 'geometry'); }
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
        if (!owned.has(material)) { owned.add(material); observe(material, 'route', 'material'); }
        for (const value of Object.values(material)) if (value?.isTexture && !owned.has(value)) { owned.add(value); observe(value, 'route', 'texture'); }
      }
    });
    const target = observe(new THREE.WebGLRenderTarget(128, 128), 'route', 'renderTarget');
    owned.add(target);
    gltf.scene.position.x = 0.8;
    route = { group: gltf.scene, target, ownedResources: [...owned] };
    scene.add(route.group);
    const first = performance.now(); paint(); recordPhase('first route render: offscreen plus onscreen', first);
    transitions.push({ action: 'mount', ...memory() });
    status.textContent = 'Route mounted with real GLTF geometry, PNG texture and render target.';
  }
  function action(fn) {
    return async () => {
      if (busy) return; busy = true; buttons.forEach(button => { button.disabled = true; });
      try { await fn(); } catch (error) { status.textContent = 'Asset/action error: ' + error.message; }
      finally { busy = false; buttons.forEach(button => { button.disabled = false; }); diagnose(); }
    };
  }
  document.querySelector('#mount').onclick = action(() => mount());
  document.querySelector('#unmount').onclick = action(() => unmount());
  document.querySelector('#corrupt').onclick = action(() => mount(true));
  document.querySelector('#repeat').onclick = action(async () => {
    for (let i = 0; i < 6; i++) { await mount(); await nextFrame(); unmount(); await nextFrame(); }
    status.textContent = 'Completed six actual route load/render/unmount cycles.';
  });
  document.querySelector('#measure').onclick = action(() => {
    if (!route) throw new Error('Mount a route before measuring its shader variant');
    for (const resource of route.ownedResources) if (resource.isMaterial) { resource.flatShading = !resource.flatShading; resource.needsUpdate = true; }
    const compile = performance.now(); renderer.compile(scene, camera); recordPhase('variant renderer.compile CPU wall-time', compile);
    const render = performance.now(); paint(); recordPhase('variant first render CPU wall-time', render);
    status.textContent = 'Recorded actual synchronous compile/render wall-time; inspect cold/warm context, not GPU timing.';
  });
  status.textContent = 'Shared reference ready. Mount the existing route to begin.';
  diagnose();
}
