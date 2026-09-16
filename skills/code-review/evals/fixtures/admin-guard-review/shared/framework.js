'use strict';
const configuration = require('./deployment.json');
const sessions = require('./sessions.json');
const memberStore = require('./member-store');

function requireSession(request, handler) {
  const cookie = request.headers && request.headers.cookie;
  const field = typeof cookie === 'string' && cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('fixture_session='));
  const token = field && field.slice('fixture_session='.length);
  if (!token || !Object.hasOwn(sessions, token)) return { status: 401, body: { error: 'Sign in required' } };
  const session = { ...sessions[token] };
  return handler({ ...request, session }, memberStore);
}

function createApplication(handler) {
  return function dispatch(request) {
    if (request.method !== configuration.routeMethod || request.path !== configuration.routePath) return { status: 404, body: { error: 'Not found' } };
    return requireSession(request, handler);
  };
}

module.exports = { createApplication };
