'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../.build'), port = Number(process.argv[2] || 4174);
if (!fs.existsSync(root) || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Build first and provide a valid local port');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.map': 'application/json' };
http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (name.endsWith('/')) name += 'index.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep) || !fs.realpathSync(file).startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw new Error('Unavailable');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
}).listen(port, '127.0.0.1', () => console.log('Local GLB fixture http://127.0.0.1:' + port + '/'));

