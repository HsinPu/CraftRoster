'use strict';
function handleRequest(request) {
  if (request.method !== 'GET' || request.path !== '/greet') return { status: 404, body: 'Not found' };
  const suppliedName = request.query && request.query.name;
  const name = typeof suppliedName === 'string' ? suppliedName : '';
  return { status: 200, body: `Hello ${name || 'Guest'}` };
}
module.exports = { handleRequest };
