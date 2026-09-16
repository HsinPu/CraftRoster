'use strict';
const policy = require('../config/retention-policy.json');
const records = require('../data/records.json');
console.log(JSON.stringify({ policy, recordCount: records.length, fields: [...new Set(records.flatMap(Object.keys))].sort(), mode: 'read-only inventory; no deletion selection' }, null, 2));
