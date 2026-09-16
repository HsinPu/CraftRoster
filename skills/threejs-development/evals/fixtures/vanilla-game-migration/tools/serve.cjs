'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.resolve(__dirname, '../.build'), port = Number(process.argv[2] || 0);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid local port');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8' };
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    const send = () => {
      try {
        if (!file.startsWith(root + path.sep) || !fs.realpathSync(file).startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw new Error('Not found');
        response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(request.method === 'HEAD' ? undefined : fs.readFileSync(file));
      } catch { response.writeHead(404); response.end('Not found'); }
    };
    if (pathname.includes('/assets/')) setTimeout(send, 300); else send();
  } catch { response.writeHead(404); response.end(); }
});
server.listen(port, '127.0.0.1', () => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const links = { origin, vanilla_url: `${origin}/vanilla/`, source: root, runtime: 'fixed local author fixture; no model output' };
  if (fs.existsSync(path.join(root, 'r3f/index.html'))) links.author_r3f_url = `${origin}/r3f/`;
  console.log(JSON.stringify(links));
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
