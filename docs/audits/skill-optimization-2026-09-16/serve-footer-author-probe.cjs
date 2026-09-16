'use strict';
// Serves fixed author fixture copies on loopback. No model output is executed.
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../..');
const fixture = path.join(root, 'skills/threejs-development/evals/fixtures/unrelated-footer');
if (process.argv.length !== 3) throw new Error('Pass the isolated npm prefix containing three@0.180.0');
const dependencyRoot = fs.realpathSync(process.argv[2]);
const packageRoot = path.join(dependencyRoot, 'node_modules/three');
if (JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'))).version !== '0.180.0') throw new Error('Expected exact three@0.180.0');
const probeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-footer-probe-'));
const files = ['index.html', 'privacy.html', 'styles/page.css', 'styles/viewer.css', 'styles/footer.css', 'src/viewer.js'];
const routes = new Map();
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifests = {};
for (const variant of ['baseline', 'candidate']) {
  manifests[variant] = [];
  for (const file of files) {
    let bytes = fs.readFileSync(path.join(fixture, file));
    if (variant === 'candidate' && file === 'index.html') bytes = Buffer.from(bytes.toString('utf8').replace('>聯絡我們</a>', '>聯絡支援</a>'));
    if (variant === 'candidate' && file === 'styles/footer.css') bytes = Buffer.from(bytes.toString('utf8').replace('gap: 8px;', 'gap: 16px;').replace('padding: 12px 24px;', 'padding: 24px 24px;'));
    routes.set(`/${variant}/${file}`, bytes);
    manifests[variant].push({ path: file, sha256: hash(bytes) });
    const destination = path.join(probeRoot, variant, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes);
  }
  for (const name of ['three.module.js', 'three.core.js']) routes.set(`/${variant}/node_modules/three/build/${name}`, fs.readFileSync(path.join(packageRoot, 'build', name)));
  routes.set(`/${variant}-narrow.html`, Buffer.from(`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>${variant} 375px viewport</title><body style="margin:0;background:#e6ebf4"><iframe title="375px fixture viewport" src="/${variant}/index.html" style="display:block;width:375px;height:720px;border:0"></iframe></body></html>`));
}
const changed = files.filter(file => manifests.baseline.find(item => item.path === file).sha256 !== manifests.candidate.find(item => item.path === file).sha256);
if (JSON.stringify(changed) !== JSON.stringify(['index.html', 'styles/footer.css'])) throw new Error('Author probe changed unrelated files');
const provenance = { kind: 'author_browser_probe_setup', model_execution: false, node: process.version, platform: process.platform,
  created_at: new Date().toISOString(), dependency_version: '0.180.0',
  lockfile_sha256: hash(fs.readFileSync(path.join(fixture, 'package-lock.json'))),
  runtime_sha256: Object.fromEntries(['three.module.js', 'three.core.js'].map(name => [name, hash(fs.readFileSync(path.join(packageRoot, 'build', name)))])),
  manifests, changed_paths: changed, browser_observations: 'not_run',
  limitation: 'Authored local comparison, not a model task outcome; browser observations must be recorded separately.' };
fs.writeFileSync(path.join(probeRoot, 'setup.json'), JSON.stringify(provenance, null, 2) + '\n');
const server = http.createServer((request, response) => {
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const bytes = routes.get(pathname);
  if (!bytes) { response.writeHead(404); response.end('Not found'); return; }
  const contentType = pathname.endsWith('.html') ? 'text/html; charset=utf-8' : pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
  response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'self'" });
  response.end(bytes);
});
server.listen(0, '127.0.0.1', () => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log(JSON.stringify({ origin, baseline: `${origin}/baseline/index.html`, candidate: `${origin}/candidate/index.html`,
    baseline_narrow: `${origin}/baseline-narrow.html`, candidate_narrow: `${origin}/candidate-narrow.html`, probe_root: probeRoot }));
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
