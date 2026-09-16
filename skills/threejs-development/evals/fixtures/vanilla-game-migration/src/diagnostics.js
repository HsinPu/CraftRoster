export const metrics = {
  variant: 'vanilla', status: 'outside', activeSessions: 0, activeAssetLoads: 0, activeKeyBindings: 0,
  frameCallbacks: 0, renderCalls: 0, renderersCreated: 0, rendererDisposeCalls: 0, contextLossCalls: 0,
  geometriesCreated: 0, geometryDisposalEvents: 0, materialsCreated: 0, materialDisposalEvents: 0,
  lastRendererGeometries: 0, lastRendererTextures: 0, lastDrawCalls: 0, reactCommits: 0, r3fCommits: 0,
  activeGameEffects: 0, game: null, error: null,
  lastMovementFirstDeltaSeconds: null, lastMovementFirstPosition: null, lastMovementElapsedSeconds: null, lastMovementFrameCount: 0
};
const renderers = new WeakSet(), geometries = new WeakSet(), materials = new WeakSet();
export function trackRenderer(renderer) {
  if (renderers.has(renderer)) return renderer;
  renderers.add(renderer); metrics.renderersCreated += 1;
  const render = renderer.render.bind(renderer), dispose = renderer.dispose.bind(renderer), lose = renderer.forceContextLoss.bind(renderer);
  renderer.render = (...args) => {
    render(...args); metrics.renderCalls += 1;
    metrics.lastDrawCalls = renderer.info.render.calls;
    metrics.lastRendererGeometries = renderer.info.memory.geometries;
    metrics.lastRendererTextures = renderer.info.memory.textures;
  };
  renderer.dispose = (...args) => { metrics.rendererDisposeCalls += 1; return dispose(...args); };
  renderer.forceContextLoss = (...args) => { metrics.contextLossCalls += 1; return lose(...args); };
  return renderer;
}
export function trackGeometry(value) {
  if (!geometries.has(value)) { geometries.add(value); metrics.geometriesCreated += 1; value.addEventListener('dispose', () => { metrics.geometryDisposalEvents += 1; }); }
  return value;
}
export function trackMaterial(value) {
  if (!materials.has(value)) { materials.add(value); metrics.materialsCreated += 1; value.addEventListener('dispose', () => { metrics.materialDisposalEvents += 1; }); }
  return value;
}
export function attachDiagnostics(element) {
  const update = () => { element.textContent = JSON.stringify({ ...metrics, liveCanvases: document.querySelectorAll('canvas').length }, null, 2); };
  update(); const timer = setInterval(update, 200);
  return () => clearInterval(timer);
}
export function bindKeys(callback) {
  const pairs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const handler = event => { if (pairs[event.key] && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) { event.preventDefault(); callback(...pairs[event.key]); } };
  window.addEventListener('keydown', handler); metrics.activeKeyBindings += 1;
  return () => { window.removeEventListener('keydown', handler); metrics.activeKeyBindings -= 1; };
}
