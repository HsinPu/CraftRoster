'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../dist');
const port = Number(process.argv[2] || 4181);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Expected port 1024..65535');
const routes = new Map(['index.html', 'style.css', 'src/probe.js', 'src/pixel-contract.js', 'vendor/three.module.js', 'vendor/three.core.js', 'vendor/LICENSE'].map(file => ['/' + file, fs.readFileSync(path.join(root, file))]));
routes.set('/', routes.get('/index.html'));
http.createServer((request, response) => {
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  const url = new URL(request.url, 'http://127.0.0.1');
  const bytes = routes.get(url.pathname);
  if (!bytes) { response.writeHead(404); response.end('Not found'); return; }
  const type = url.pathname.endsWith('.js') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : url.pathname.endsWith('LICENSE') ? 'text/plain' : 'text/html';
  response.writeHead(200, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(bytes);
}).listen(port, '127.0.0.1', () => console.log('Renderer baseline: http://127.0.0.1:' + port + '/'));
