#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const { githubJson, verifyRemote } = require('../scripts/verify-agent-references');

const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const licenseBlob = 'c'.repeat(40);
const repo = 'example/moved-repository';
const referencePath = 'agents/reviewer.md';
let passed = 0;

async function test(name, run) {
  await run();
  passed += 1;
  console.log(`PASS ${name}`);
}

async function withResponses(replies, run) {
  const originalGet = https.get;
  const originalToken = process.env.GITHUB_TOKEN;
  const calls = [];
  process.env.GITHUB_TOKEN = 'fixture-token';
  https.get = (options, callback) => {
    const call = { ...options, headers: { ...options.headers }, resumed: false };
    const reply = replies[calls.length];
    assert(reply, `Unexpected GitHub request: ${options.path}`);
    calls.push(call);
    const request = new EventEmitter();
    let timeout;
    request.setTimeout = (milliseconds, handler) => {
      call.timeoutMs = milliseconds;
      timeout = handler;
      return request;
    };
    request.destroy = (error) => request.emit('error', error);
    queueMicrotask(() => {
      if (reply.requestError) {
        request.emit('error', new Error(reply.requestError));
        return;
      }
      if (reply.timeout) {
        timeout();
        return;
      }
      const response = new EventEmitter();
      response.statusCode = reply.status ?? 200;
      response.headers = reply.headers || {};
      response.setEncoding = () => response;
      response.resume = () => { call.resumed = true; };
      callback(response);
      if (reply.responseError) response.emit('error', new Error(reply.responseError));
      else if (reply.aborted) response.emit('aborted');
      else {
        response.emit('data', reply.raw ?? JSON.stringify(reply.body ?? {}));
        response.emit('end');
      }
    });
    return request;
  };
  try {
    await run(calls);
  } finally {
    https.get = originalGet;
    if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = originalToken;
  }
}

function remoteFixture() {
  return {
    manifest: { repositories: [{ repo, commit, tree, license: 'MIT', licensePath: 'LICENSE' }] },
    paths: new Map([[repo, new Set([referencePath])]]),
    replies: [
      { status: 301, headers: { location: `https://api.github.com/repositories/123/git/commits/${commit}` } },
      { body: { sha: commit, tree: { sha: tree } } },
      { status: 301, headers: { location: `/repositories/123/git/trees/${tree}?recursive=1` } },
      { body: { sha: tree, truncated: false, tree: [
        { path: referencePath, type: 'blob', sha: 'd'.repeat(40) },
        { path: 'LICENSE', type: 'blob', sha: licenseBlob },
      ] } },
      { status: 301, headers: { location: `/repositories/123/git/blobs/${licenseBlob}` } },
      { body: { encoding: 'base64', content: Buffer.from('MIT License\nPermission is hereby granted, free of charge.').toString('base64') } },
    ],
  };
}

async function main() {
  await test('preserves ordinary JSON requests and GitHub API authentication', async () => {
    await withResponses([{ body: { sha: commit } }], async (calls) => {
      assert.deepEqual(await githubJson(`/repos/${repo}/git/commits/${commit}`), { sha: commit });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].hostname, 'api.github.com');
      assert.equal(calls[0].headers.Authorization, 'Bearer fixture-token');
      assert.equal(calls[0].headers['X-GitHub-Api-Version'], '2022-11-28');
      assert.equal(calls[0].timeoutMs, 30000);
    });
  });

  for (const status of [301, 302, 303, 307, 308]) {
    await test(`follows HTTP ${status} repository redirects without changing the pinned request`, async () => {
      const destination = `/repositories/123/git/commits/${commit}`;
      await withResponses([
        { status, headers: { location: `https://api.github.com${destination}` } },
        { body: { sha: commit } },
      ], async (calls) => {
        assert.deepEqual(await githubJson(`/repos/${repo}/git/commits/${commit}`), { sha: commit });
        assert.equal(calls.length, 2);
        assert.equal(calls[1].hostname, 'api.github.com');
        assert.equal(calls[1].path, destination);
        assert.equal(calls[1].headers.Authorization, 'Bearer fixture-token');
        assert.equal(calls[0].resumed, true);
      });
    });
  }

  await test('resolves relative Location values and preserves query parameters', async () => {
    await withResponses([
      { status: 301, headers: { location: `${tree}?recursive=1` } },
      { body: { sha: tree } },
    ], async (calls) => {
      await githubJson('/repositories/123/git/trees/old');
      assert.equal(calls[1].path, `/repositories/123/git/trees/${tree}?recursive=1`);
    });
  });

  await test('verifies commit, tree, reference paths and license after real-shaped redirects', async () => {
    const fixture = remoteFixture();
    await withResponses(fixture.replies, async (calls) => {
      await verifyRemote(fixture.manifest, fixture.paths);
      assert.equal(calls.length, 6);
      assert(calls.every((call) => call.hostname === 'api.github.com'));
    });
  });

  await test('rejects redirect loops before sending a duplicate request', async () => {
    await withResponses([
      { status: 301, headers: { location: '/repositories/123' } },
      { status: 301, headers: { location: '/repos/example/moved' } },
    ], async (calls) => {
      await assert.rejects(githubJson('/repos/example/moved'), /redirect loop/);
      assert.equal(calls.length, 2);
    });
  });

  await test('limits non-cyclic redirects to five hops', async () => {
    const replies = Array.from({ length: 6 }, (_, index) => ({
      status: 301, headers: { location: `/repositories/${index + 1}` },
    }));
    await withResponses(replies, async (calls) => {
      await assert.rejects(githubJson('/repositories/0'), /exceeded 5 redirects/);
      assert.equal(calls.length, 6);
    });
  });

  await test('rejects missing and malformed redirect destinations', async () => {
    for (const location of [undefined, '', ' ', 'https://[invalid']) {
      await withResponses([{ status: 301, headers: { location } }], async (calls) => {
        await assert.rejects(githubJson('/repos/example/moved'), /Location/);
        assert.equal(calls.length, 1);
      });
    }
  });

  await test('refuses unsafe redirects before forwarding authentication', async () => {
    for (const location of [
      'https://untrusted.invalid/collect', '//untrusted.invalid/collect',
      'http://api.github.com/repositories/123', 'https://api.github.com.untrusted.invalid/',
      'https://api.github.com:444/repositories/123', 'https://user:password@api.github.com/',
      'file:///tmp/redirect', 'https://api.github.com/repositories/123#fragment',
    ]) {
      await withResponses([{ status: 301, headers: { location } }], async (calls) => {
        await assert.rejects(githubJson('/repos/example/moved'), /must stay on https:\/\/api\.github\.com/);
        assert.equal(calls.length, 1);
      });
    }
  });

  await test('retains HTTP errors and rate-limit diagnostics', async () => {
    for (const status of [304, 403, 404, 429, 500]) {
      await withResponses([{ status, headers: { 'x-ratelimit-remaining': '0' } }], async () => {
        await assert.rejects(githubJson('/repos/example/missing'), new RegExp(`returned ${status}.*rate limit exhausted`));
      });
    }
  });

  await test('rejects malformed JSON instead of accepting a successful status alone', async () => {
    await withResponses([{ raw: '{invalid' }], async () => {
      await assert.rejects(githubJson('/repos/example/moved'), /invalid JSON/);
    });
  });

  await test('retains request timeout and transport failure behavior', async () => {
    for (const [reply, message] of [
      [{ requestError: 'connection reset' }, /connection reset/],
      [{ responseError: 'response failed' }, /response failed/],
      [{ timeout: true }, /request timed out/],
      [{ aborted: true }, /response was aborted/],
    ]) {
      await withResponses([reply], async () => {
        await assert.rejects(githubJson('/repos/example/moved'), message);
      });
    }
  });

  for (const [name, mutate, message] of [
    ['unexpected commit', (fixture) => { fixture.replies[1].body.sha = 'e'.repeat(40); }, /unexpected commit SHA/],
    ['wrong commit tree', (fixture) => { fixture.replies[1].body.tree.sha = 'e'.repeat(40); }, /pinned commit does not resolve/],
    ['wrong tree response', (fixture) => { fixture.replies[3].body.sha = 'e'.repeat(40); }, /unexpected tree SHA/],
    ['truncated tree', (fixture) => { fixture.replies[3].body.truncated = true; }, /truncated tree/],
    ['missing reference file', (fixture) => { fixture.replies[3].body.tree.shift(); }, /missing reference file/],
    ['missing license', (fixture) => { fixture.replies[3].body.tree.pop(); }, /missing license file/],
    ['wrong license', (fixture) => { fixture.replies[5].body.content = Buffer.from('Different terms').toString('base64'); }, /does not match declared license/],
  ]) {
    await test(`still rejects ${name} after following redirects`, async () => {
      const fixture = remoteFixture();
      mutate(fixture);
      await withResponses(fixture.replies, async () => {
        await assert.rejects(verifyRemote(fixture.manifest, fixture.paths), message);
      });
    });
  }

  console.log(`Agent reference request tests passed: ${passed}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
