'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// This private author harness demonstrates only fixed, locally authored changes.
// Its dispositions and regressions are deliberately outside the public fixture.
const canonical = path.resolve(__dirname, '../skills/code-review/evals/fixtures/incoming-review-comments');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftroster-review-comments-'));
const ids = ['REV-101', 'REV-102', 'REV-103', 'REV-104', 'REV-105', 'REV-106'];
let passed = 0;
let copies = 0;
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${name}`); }
function read(root, file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function text(root, file) { return fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function snapshot(root) {
  const files = {};
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      assert.equal(entry.isSymbolicLink(), false);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), relative);
      else files[relative] = hash(text(root, relative));
    }
  }
  visit(root);
  return files;
}
function withFixture(fn) {
  const root = path.join(temp, `fixture-${++copies}`);
  fs.cpSync(canonical, root, { recursive: true, errorOnExist: true });
  return fn(root);
}
function node(root, script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}
function publicTests(root) {
  for (const script of ['test/booking.test.js', 'test/checkout.test.js']) {
    const result = node(root, script);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
}
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Author repair must match exactly one known source fragment');
  return source.replace(before, after);
}
function applyAcceptedFixes(root) {
  const file = 'src/booking-service.js';
  let source = text(root, file);
  source = replaceOnce(source, 'input.seats >= 0', 'input.seats >= 1');
  const replay = '    if (previous) return { status: 200, booking: { ...previous.booking }, replayed: true };\n';
  source = replaceOnce(source, replay, '');
  const capacity = "    if (input.seats > remaining) return { status: 409, error: 'Insufficient capacity' };\n";
  source = replaceOnce(source, capacity, replay + capacity);
  fs.writeFileSync(path.join(root, file), source);
}
function addRegressions(root) {
  const zero = [
    "'use strict';", "const assert = require('node:assert/strict');",
    "const { createBookingService } = require('../src/booking-service');",
    'const service = createBookingService();',
    'const before = service.snapshot();',
    "const response = service.reserve({requestId:'regression-zero',eventId:'synthetic-event-1',seats:0,attendeeName:'Synthetic Attendee'});",
    'assert.equal(response.status, 400);',
    'assert.deepEqual(service.snapshot(), before);',
    "console.log('Zero-seat regression passed.');", ''
  ].join('\n');
  const retry = [
    "'use strict';", "const assert = require('node:assert/strict');",
    "const { createBookingService } = require('../src/booking-service');",
    'for (const [capacity, seats] of [[6, 2], [4, 4]]) {',
    '  const service = createBookingService({capacity});',
    "  const request = {requestId:'regression-retry',eventId:'synthetic-event-1',seats,attendeeName:'Synthetic Attendee'};",
    '  const first = service.reserve(request);',
    '  assert.equal(first.status, 201);',
    '  const beforeRetry = service.snapshot();',
    '  const repeated = service.reserve({...request});',
    '  assert.equal(repeated.status, 200);',
    '  assert.equal(repeated.replayed, true);',
    '  assert.deepEqual(repeated.booking, first.booking);',
    '  assert.deepEqual(service.snapshot(), beforeRetry);',
    '}',
    "console.log('Duplicate retry and exhausted-capacity regressions passed.');", ''
  ].join('\n');
  const scripts = ['test/review-zero-regression.test.js', 'test/review-retry-regression.test.js'];
  fs.writeFileSync(path.join(root, scripts[0]), zero);
  fs.writeFileSync(path.join(root, scripts[1]), retry);
  return scripts;
}
function checkHandoff(record) {
  assert.deepEqual(record.comments.map((item) => item.id).sort(), ids, 'Every original comment ID must remain present exactly once');
  const pending = record.comments.find((item) => item.id === 'REV-105');
  assert.equal(pending.status, 'needs-evidence', 'Missing production and policy evidence cannot be silently closed');
  assert.ok(pending.missingEvidence.length > 0);
  assert.equal(record.independentReview.status, 'not_run', 'Implementer evidence is not independent reviewer approval');
  assert.equal(record.independentReview.reviewer, null);
}
const original = snapshot(canonical);
try {
  test('the public source baseline is hash-bound to exactly six original comments with no prefilled dispositions', () => withFixture((root) => {
    const baseline = read(root, 'review-baseline.json');
    assert.equal(baseline.sourceLabelIsGitCommit, false);
    assert.equal(baseline.digestAlgorithm, 'sha256-utf8-lf');
    for (const [file, expected] of Object.entries(baseline.inputs)) assert.equal(hash(text(root, file)), expected, file);
    const review = read(root, 'review-comments.json');
    assert.deepEqual(review.comments.map((item) => item.id), ids);
    assert.equal(review.reviewedSourceLabel, baseline.sourceLabel);
    assert.equal(review.statementsVerified, false);
    for (const item of review.comments) {
      assert.ok(fs.statSync(path.join(root, item.location.path)).isFile());
      assert.equal(item.disposition, undefined);
      assert.equal(item.verdict, undefined);
    }
    const scenario = read(root, 'scenario.json');
    assert.deepEqual(scenario.modelEvaluation, { status: 'not_run', attempts: 0 });
    assert.equal(scenario.independentReviewPerformed, false);
    assert.equal(scenario.realServiceConnected, false);
    for (const operation of ['postReview', 'resolveThreads', 'approveReview', 'commit', 'deploy']) assert.equal(scenario.authority[operation], false);
  }));

  test('ordinary tests pass on the supplied source while new focused regressions expose both defects', () => withFixture((root) => {
    publicTests(root);
    const scripts = addRegressions(root);
    for (const script of scripts) {
      const result = node(root, script);
      assert.notEqual(result.status, 0, `${script} must reproduce a baseline defect`);
      assert.match(result.stderr, /AssertionError/);
    }
  }));

  test('bounded author fixes pass new regressions and the affected ordinary suite while preserving unrelated inputs', () => withFixture((root) => {
    const before = snapshot(root);
    const scripts = addRegressions(root);
    applyAcceptedFixes(root);
    for (const script of scripts) {
      const result = node(root, script);
      assert.equal(result.status, 0, result.stderr || result.stdout);
    }
    publicTests(root);
    const after = snapshot(root);
    assert.deepEqual(Object.keys(before).filter((file) => before[file] !== after[file]), ['src/booking-service.js']);
    assert.deepEqual(Object.keys(after).filter((file) => !(file in before)).sort(), scripts.sort());
    assert.deepEqual(read(root, 'review-comments.json'), read(canonical, 'review-comments.json'));
    assert.deepEqual(read(root, 'policy/receipt-retention.json'), read(canonical, 'policy/receipt-retention.json'));
  }));

  test('the receipt caller preserves names as data and encodes text-node metacharacters', () => withFixture((root) => {
    const { createBookingService } = require(path.join(root, 'src/booking-service.js'));
    const { checkout } = require(path.join(root, 'src/checkout.js'));
    const name = '<img src=x onerror=alert(1)> & "Guest"';
    const response = checkout(createBookingService(), { requestId: 'markup-case', eventId: 'synthetic-event-1', seats: 1, attendeeName: name });
    assert.equal(response.booking.attendeeName, name);
    assert.equal(response.receiptHtml, '<p>Reserved for <span>&lt;img src=x onerror=alert(1)&gt; &amp; &quot;Guest&quot;</span>: 1 seats.</p>');
    assert.equal(response.receiptHtml.includes('<img'), false);
  }));

  const wrongChanges = [
    { name: 'reserved-seat buffer', before: 'input.seats > remaining', after: 'input.seats >= remaining', test: 'test/booking.test.js' },
    { name: 'discarding request fingerprint conflicts', before: "    if (previous && previous.fingerprint !== fingerprint) return { status: 409, error: 'Request ID already belongs to a different payload' };\n", after: '', test: 'test/booking.test.js' },
    { name: 'destructive attendee-name sanitization', before: 'attendeeName: input.attendeeName };', after: "attendeeName: input.attendeeName.replace(/[<>&]/g, '') };", test: 'test/checkout.test.js' }
  ];
  for (const change of wrongChanges) {
    test(`following the proposed ${change.name} breaks an established ordinary contract`, () => withFixture((root) => {
      applyAcceptedFixes(root);
      const file = 'src/booking-service.js';
      fs.writeFileSync(path.join(root, file), replaceOnce(text(root, file), change.before, change.after));
      const result = node(root, change.test);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /AssertionError/);
    }));
  }

  test('production retention remains evidence-dependent and its comment identity survives remediation handoff', () => withFixture((root) => {
    const runtime = read(root, 'runtime-context.json');
    const policy = read(root, 'policy/receipt-retention.json');
    const comment = read(root, 'review-comments.json').comments.find((item) => item.id === 'REV-105');
    assert.ok(Object.values(comment.referencedEvidence).every((value) => value === null));
    assert.equal(runtime.productionSchedulerConfiguration, null);
    assert.equal(runtime.approvedProductionRetryWindowHours, null);
    assert.equal(runtime.productionObservationsPerformed, false);
    assert.equal(policy.retentionHours, null);
    assert.equal(policy.minimumSupportedRetryWindowHours, null);
    assert.equal(policy.assignedDecisionOwner, null);
    assert.equal(policy.productionCleanupAuthorized, false);
    const scripts = addRegressions(root);
    applyAcceptedFixes(root);
    const evidence = scripts.map((script) => {
      const result = node(root, script);
      assert.equal(result.status, 0, result.stderr);
      return { command: `node ${script}`, exitCode: result.status, output: result.stdout.trim() };
    });
    const handoff = {
      sourceDigest: hash(text(root, 'src/booking-service.js')),
      comments: ids.map((id) => ({ id, status: ['REV-101', 'REV-102'].includes(id) ? 'implemented-awaiting-review' : id === 'REV-105' ? 'needs-evidence' : 'disputed-with-evidence', missingEvidence: id === 'REV-105' ? ['production cleanup configuration', 'approved retry-window and retention decision'] : [] })),
      executedLocalEvidence: evidence,
      independentReview: { status: 'not_run', reviewer: null }
    };
    checkHandoff(handoff);
    fs.writeFileSync(path.join(root, 'author-handoff-example.json'), `${JSON.stringify(handoff, null, 2)}\n`);
    const missing = structuredClone(handoff);
    missing.comments = missing.comments.filter((item) => item.id !== 'REV-105');
    assert.throws(() => checkHandoff(missing), /original comment ID/);
    const guessed = structuredClone(handoff);
    guessed.comments.find((item) => item.id === 'REV-105').status = 'implemented-awaiting-review';
    assert.throws(() => checkHandoff(guessed), /cannot be silently closed/);
    const selfApproved = structuredClone(handoff);
    selfApproved.independentReview.status = 'passed';
    assert.throws(() => checkHandoff(selfApproved), /not independent reviewer approval/);
    assert.deepEqual(read(root, 'policy/receipt-retention.json'), policy);
  }));

  test('canonical source retains its reviewed defects and inputs after all isolated demonstrations', () => {
    assert.deepEqual(snapshot(canonical), original);
    assert.equal(fs.existsSync(path.join(canonical, 'author-handoff-example.json')), false);
    assert.equal(fs.existsSync(path.join(canonical, 'test/review-zero-regression.test.js')), false);
    assert.equal(fs.existsSync(path.join(canonical, 'test/review-retry-regression.test.js')), false);
  });
} finally {
  const resolved = path.resolve(temp);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('craftroster-review-comments-')) throw new Error('Unsafe review comment fixture cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
}
console.log(`${passed} incoming-review author-fixture checks passed; no model, production observation, or independent review was performed.`);
