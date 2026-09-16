'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadCatalog } = require('../src/catalog-client.cjs');
function runPackageChecks(root, variant) {
  const catalog = loadCatalog(root, variant);
  assert.equal(catalog.listDepots().length, 9999);
  assert.equal(catalog.listDepots()[0].depotId, 'D0001');
  assert.equal(catalog.getDepot('D9999').depotId, 'D9999');
  assert.equal(catalog.getDepot('D10000'), null);
  return { checks: 4, variant, status: 'passed' };
}
module.exports = { runPackageChecks };
if (require.main === module) console.log(JSON.stringify(runPackageChecks(path.resolve(__dirname, '../..'), process.argv[2] || 'head')));
