#!/usr/bin/env node
'use strict';

// Optional local preview: read-only, loopback only, no dependency installation.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../../..');
const prefix = '/docs/audits/skill-installability-2026-10-09/';
const server = http.createServer((request, response) => {
  let requested;
  try { requested = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
  catch { response.writeHead(400); response.end('Invalid URL'); return; }
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
  if (requested === '/') requested = prefix + 'skill-installability-report.html';
  if (!requested.startsWith(prefix) && !/^\/skills\/[a-z0-9-]+\/.+\.md$/.test(requested)) {
    response.writeHead(404); response.end('Not found'); return;
  }
  const file = path.resolve(root, '.' + requested);
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404); response.end('Not found'); return;
  }
  const content = fs.readFileSync(file);
  const extension = path.extname(file);
  const mime = extension === '.html' ? 'text/html; charset=utf-8' : extension === '.json' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8';
  response.writeHead(200, { 'Content-Type': mime, 'Content-Length': content.length, 'Cache-Control': 'no-store' });
  response.end(request.method === 'HEAD' ? undefined : content);
});
server.listen(Number(process.argv[2] || 0), '127.0.0.1', () => console.log('http://127.0.0.1:' + server.address().port + prefix + 'skill-installability-report.html'));
