'use strict';
const configuration = require('./deployment.json');
const sessions = require('./sessions.json');

function authenticatedSession(request) {
  const cookie = request.headers && request.headers.cookie;
  if (typeof cookie !== 'string') return null;
  const field = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('fixture_session='));
  const token = field && field.slice('fixture_session='.length);
  return token && Object.hasOwn(sessions, token) ? { ...sessions[token] } : null;
}

function redirect(destination) {
  if (typeof destination !== 'string' || destination.length === 0 || destination.length > 2048 || /[\\\u0000-\u0020\u007f]/.test(destination)) {
    return { status: 400, headers: {}, body: 'Invalid redirect destination' };
  }
  let parsed;
  try { parsed = new URL(destination, configuration.publicOrigin); }
  catch { return { status: 400, headers: {}, body: 'Invalid redirect destination' }; }
  if (parsed.protocol !== 'https:' || parsed.origin !== configuration.publicOrigin || parsed.username || parsed.password || parsed.href.includes('?') || parsed.href.includes('#') || !configuration.allowedRedirectPaths.includes(parsed.pathname)) {
    return { status: 400, headers: {}, body: 'Invalid redirect destination' };
  }
  return { status: 303, headers: { location: parsed.href }, body: '' };
}

function createApplication(callback) {
  return function dispatch(request) {
    if (request.method !== configuration.callbackMethod || request.path !== configuration.callbackPath) return { status: 404, headers: {}, body: 'Not found' };
    const session = authenticatedSession(request);
    if (!session) return { status: 401, headers: {}, body: 'Sign in required' };
    return callback({ ...request, session });
  };
}

module.exports = { createApplication, redirect };
