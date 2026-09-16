import { loadDesign, saveDesign, changeDesign } from './design.js';
import { createLegacyRenderer } from './renderer.js';
const status = document.querySelector('#status'), documentArea = document.querySelector('#document');
const fields = [...document.querySelectorAll('[data-section]')];
const quality = document.querySelector('#quality');
let current, view;
async function file(name) { const response = await fetch(name); if (!response.ok) throw new Error('Local input unavailable'); return response.text(); }
function show() {
  for (const field of fields) field.value = current[field.dataset.section][field.dataset.key];
  document.querySelector('#product-label').textContent = current.capture.label;
  const diagnostics = view.draw(current, quality.value);
  document.querySelector('#diagnostics').textContent = JSON.stringify({ designId: current.id, schemaVersion: current.schemaVersion,
    dimensionsMm: current.dimensionsMm, finish: current.finish, capture: current.capture, ...diagnostics,
    notImplemented: ['Boolean cutouts','deformable upholstery','path tracing','encoded labeled/audio video','version upgrade'] }, null, 2);
}
function action(fn) {
  return async () => { try { await fn(); } catch (error) { status.textContent = 'Rejected: ' + error.message; } };
}
try {
  const materials = JSON.parse(await file('./assets/materials.json'));
  current = loadDesign(await file('./saved-designs/oak-chair.v1.json'));
  view = createLegacyRenderer(document.querySelector('#preview'), materials);
  documentArea.value = saveDesign(current); show();
  status.textContent = 'Legacy raster configurator ready. Advanced modernization is not implemented.';
  for (const field of fields) field.onchange = action(() => {
    const next = field.dataset.numeric === 'true' ? Number(field.value) : field.value;
    current = changeDesign(current, field.dataset.section, field.dataset.key, next);
    show(); status.textContent = 'Parameter updated; Save design JSON to serialize current state.';
  });
  document.querySelector('#load-sample').onclick = action(async () => {
    const text = await file('./saved-designs/' + document.querySelector('#sample').value);
    const loaded = loadDesign(text); current = loaded; documentArea.value = text; show(); status.textContent = 'Saved design loaded.';
  });
  document.querySelector('#load-json').onclick = action(() => { const loaded = loadDesign(documentArea.value); current = loaded; show(); status.textContent = 'Document loaded.'; });
  document.querySelector('#save-json').onclick = action(() => { documentArea.value = saveDesign(current); status.textContent = 'Current v1 design serialized locally.'; });
  quality.onchange = action(() => { show(); status.textContent = 'Raster quality tier changed.'; });
  const resize = () => { if (view) show(); }; window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => { window.removeEventListener('resize', resize); view.dispose(); view = null; }, { once: true });
} catch (error) {
  status.textContent = 'Baseline unavailable: ' + error.message;
  document.querySelectorAll('button,input,select').forEach(control => { control.disabled = true; });
}
