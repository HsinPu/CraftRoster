import * as THREE from 'three';
import { boundedSize, comparePixel, expectedPixel } from './pixel-contract.js';
const canvas = document.querySelector('#panel');
const status = document.querySelector('#status');
const diagnostics = document.querySelector('#diagnostics');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true }); }
catch (error) { status.textContent = 'WebGL2 unavailable: ' + error.message; throw error; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.info.autoReset = false;
const makeTarget = () => new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, colorSpace: THREE.LinearSRGBColorSpace });
const sourceTarget = makeTarget(), postTarget = makeTarget();
const geometry = new THREE.PlaneGeometry(2, 2);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const vertexShader = 'varying vec2 uvOut; void main(){uvOut=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
const sourceMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: 'void main(){gl_FragColor=vec4(0.25,0.5,0.75,1.0);}', depthTest: false, depthWrite: false });
const postMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: 'uniform sampler2D inputMap; uniform bool inverted; varying vec2 uvOut; void main(){vec4 c=texture2D(inputMap,uvOut);gl_FragColor=vec4(inverted?vec3(1.0)-c.rgb:c.rgb,c.a);}', uniforms: { inputMap: { value: sourceTarget.texture }, inverted: { value: false } }, depthTest: false, depthWrite: false });
const displayMaterial = new THREE.MeshBasicMaterial({ map: postTarget.texture, toneMapped: false, depthTest: false, depthWrite: false });
const makeScene = material => { const scene = new THREE.Scene(); scene.add(new THREE.Mesh(geometry, material)); return scene; };
const sourceScene = makeScene(sourceMaterial), postScene = makeScene(postMaterial), displayScene = makeScene(displayMaterial);
let lost = false, disposed = false;
const observed = { revision: THREE.REVISION, backend: 'WebGLRenderer', outputColorSpace: renderer.outputColorSpace, renderTargetType: 'UnsignedByteType', renderTargetColorSpace: sourceTarget.texture.colorSpace, inverted: false, context: 'ready', readback: null, cpuSubmissionMs: null, xr: 'not_run', gpuBytes: null, gpuTimeMs: null };
function show() {
  diagnostics.textContent = JSON.stringify({ ...observed, memoryObjects: { ...renderer.info.memory }, programs: renderer.info.programs.length, lastFrameDrawCalls: renderer.info.render.calls, drawingBuffer: { width: canvas.width, height: canvas.height } }, null, 2);
}
function render() {
  if (lost || disposed) return;
  renderer.info.reset();
  renderer.setRenderTarget(sourceTarget); renderer.render(sourceScene, camera);
  renderer.setRenderTarget(postTarget); renderer.render(postScene, camera);
  renderer.setRenderTarget(null); renderer.render(displayScene, camera);
}
async function readPixel() {
  if (lost || disposed) throw Error('Renderer unavailable until context restored');
  render();
  const bytes = new Uint8Array(4);
  renderer.readRenderTargetPixels(postTarget, 1, 1, 1, 1, bytes);
  return bytes;
}
function resize() {
  const size = boundedSize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
  renderer.setPixelRatio(1); renderer.setSize(size.width, size.height, false); render(); show();
}
document.querySelector('#invert').onclick = () => {
  observed.inverted = !observed.inverted; postMaterial.uniforms.inverted.value = observed.inverted;
  observed.readback = null; render(); status.textContent = 'Post pass ' + (observed.inverted ? 'inverted' : 'normal'); show();
};
document.querySelector('#read').onclick = async () => {
  try { const bytes = await readPixel(); observed.readback = { bytes: [...bytes], expected: expectedPixel(observed.inverted), matches: comparePixel(bytes, observed.inverted) }; status.textContent = 'Readback completed'; }
  catch (error) { observed.readback = { error: error.message }; status.textContent = error.message; }
  show();
};
document.querySelector('#sample').onclick = async () => {
  if (lost || disposed) { status.textContent = 'Restore context before sampling'; return; }
  const samples = [];
  for (let i = 0; i < 60 && !lost && !disposed; i++) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const start = performance.now(); render(); samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  observed.cpuSubmissionMs = { count: samples.length, median: samples[Math.floor(samples.length / 2)] ?? null, max: samples.at(-1) ?? null, gpuTimer: false };
  status.textContent = 'CPU submission sample recorded; GPU timing is unavailable'; show();
};
document.querySelector('#lose').onclick = () => {
  if (!renderer.extensions.has('WEBGL_lose_context')) { status.textContent = 'Context-loss extension unavailable'; return; }
  renderer.forceContextLoss();
};
document.querySelector('#restore').onclick = () => renderer.forceContextRestore();
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; observed.context = 'lost'; status.textContent = 'Context lost; controls remain available'; show(); });
canvas.addEventListener('webglcontextrestored', () => { lost = false; observed.context = 'restored'; render(); status.textContent = 'Context restored'; show(); });
document.querySelector('#xr').onclick = async () => {
  try { observed.xr = navigator.xr ? { immersiveVrSupported: await navigator.xr.isSessionSupported('immersive-vr'), sessionRendered: false } : { apiAvailable: false, sessionRendered: false }; }
  catch (error) { observed.xr = { error: error.message, sessionRendered: false }; }
  show();
};
window.addEventListener('resize', resize);
window.addEventListener('pagehide', () => {
  disposed = true; window.removeEventListener('resize', resize);
  sourceTarget.dispose(); postTarget.dispose(); geometry.dispose(); sourceMaterial.dispose(); postMaterial.dispose(); displayMaterial.dispose(); renderer.dispose();
}, { once: true });
resize(); status.textContent = 'WebGL baseline ready'; show();
