'use strict';
const fs = require('node:fs');
const path = require('node:path');

function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.paths) || plan.paths.length === 0) throw new Error('paths must be a nonempty array');
  for (const entry of plan.paths) {
    if (typeof entry !== 'string' || !entry || entry.includes('\0') || path.posix.isAbsolute(entry) || path.win32.isAbsolute(entry) || /^[A-Za-z]:/.test(entry) || entry.split(/[\\/]/).some((part) => !part || part === '.' || part === '..')) {
      throw new Error('each path must be a nonempty relative path without traversal');
    }
  }
  return plan.paths;
}

function main(args) {
  try {
    if (args.length !== 1) throw new Error('provide exactly one local JSON plan');
    const plan = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const paths = validatePlan(plan);
    console.log(JSON.stringify({ mode: 'dry-run', paths, deleted: 0 }));
  } catch (error) {
    console.error(`Invalid cleanup plan: ${error.message}`);
  }
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { main, validatePlan };
