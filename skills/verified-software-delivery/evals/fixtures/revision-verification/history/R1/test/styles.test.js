'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../styles/ui.css'), 'utf8');
assert.match(css, /\.greeting\s*\{\s*color:\s*#16324f;\s*padding:\s*16px;/);
assert.match(css, /\.greeting:focus-visible\s*\{\s*outline:\s*2px solid #136f63;/);
console.log('Static CSS color, spacing, and focus-rule checks passed; no browser was run.');
