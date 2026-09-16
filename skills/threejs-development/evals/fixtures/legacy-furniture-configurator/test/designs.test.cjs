'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
async function run(root = path.resolve(__dirname,'..')) {
  const { loadDesign, saveDesign, changeDesign } = await import(pathToFileURL(path.join(root,'src/design.js')));
  const { chairParts } = await import(pathToFileURL(path.join(root,'src/model.js')));
  for (const name of ['oak-chair.v1.json','wide-chair.v1.json']) {
    const original = JSON.parse(fs.readFileSync(path.join(root,'saved-designs',name)));
    assert.deepEqual(loadDesign(saveDesign(original)),original);
    assert.equal(chairParts(original).find(part => part.kind === 'cushion').size[0],original.dimensionsMm.width / 1000);
    const updated = changeDesign(original,'finish','upholstery','sand');
    assert.equal(loadDesign(saveDesign(updated)).finish.upholstery,'sand'); assert.deepEqual(updated.capture,original.capture);
  }
  for (const name of ['invalid-version.json','invalid-units.json','invalid-material.json']) assert.throws(() => loadDesign(fs.readFileSync(path.join(root,'saved-designs',name),'utf8')));
  return 'ordinary v1 roundtrip, geometry and invalid-input checks passed; no browser execution';
}
if (require.main === module) run().then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
