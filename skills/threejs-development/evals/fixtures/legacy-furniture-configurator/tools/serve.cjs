'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.resolve(__dirname,'../dist'), port = Number(process.argv[2] || 4183);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Expected a loopback port 1024..65535');
const names = ['index.html','style.css','src/app.js','src/design.js','src/model.js','src/renderer.js','assets/materials.json','assets/tone-a.wav','vendor/three.module.js','vendor/LICENSE',
  'saved-designs/oak-chair.v1.json','saved-designs/wide-chair.v1.json','saved-designs/invalid-version.json','saved-designs/invalid-units.json','saved-designs/invalid-material.json'];
const routes = new Map(names.map(name => ['/' + name,fs.readFileSync(path.join(root,name))])); routes.set('/',routes.get('/index.html'));
http.createServer((request,response) => {
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  let url; try { url = new URL(request.url,'http://127.0.0.1'); } catch { response.writeHead(400); response.end(); return; }
  const bytes = routes.get(url.pathname); if (!bytes) { response.writeHead(404); response.end(); return; }
  const extension = path.extname(url.pathname), types = { '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.wav':'audio/wav' };
  response.writeHead(200,{'Content-Type':types[extension] || (url.pathname.endsWith('LICENSE') ? 'text/plain' : 'text/html'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); response.end(bytes);
}).listen(port,'127.0.0.1',() => console.log('Legacy configurator http://127.0.0.1:' + port + '/'));
