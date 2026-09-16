'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { MAX_ARTIFACT_BYTES, sha256, readInputs } = require('../../tools/generate-artifact.cjs');
function loadCatalog(root, variant) {
  const inputs = readInputs(root, variant);
  const bytes = fs.readFileSync(path.join(root, variant, 'dependency-graph.jsonl'));
  if (bytes.length > MAX_ARTIFACT_BYTES) throw new Error('Artifact too large');
  const lines = bytes.toString('utf8').replace(/\r\n/g, '\n').trimEnd().split('\n');
  if (lines.length !== 20000) throw new Error('Wrong graph record count');
  const [header, adapter, ...records] = lines.map(line => JSON.parse(line));
  if (header.type !== 'header' || header.format !== 'offline-depot-graph-v1' || header.graph !== inputs.graph || header.inputsSha256 !== inputs.inputsSha256) throw new Error('Graph canonical inputs mismatch');
  if (adapter.type !== 'adapter' || adapter.id !== inputs.graph || adapter.version !== inputs.release.version ||
      adapter.source !== inputs.release.source || adapter.sha256 !== inputs.release.sha256 || adapter.apiVersion !== 1) throw new Error('Adapter selection mismatch');
  const data = new Map(), depotIds = new Set(), edges = new Set();
  for (const item of records) {
    if (item.type === 'depot') {
      const record = { depotId: item.depotId, label: item.label, capacity: item.capacity };
      if (typeof item.id !== 'string' || !item.id.startsWith(`${inputs.graph}/depot-`) || data.has(item.id) || depotIds.has(item.depotId) ||
          item.version !== inputs.seed.packageVersion || typeof item.depotId !== 'string' || typeof item.label !== 'string' ||
          !Number.isSafeInteger(item.capacity) || item.capacity < 0 || sha256(JSON.stringify(record)) !== item.sha256) throw new Error('Invalid depot package');
      data.set(item.id, record); depotIds.add(item.depotId);
    } else if (item.type === 'requires') {
      if (item.from !== inputs.graph || edges.has(item.to)) throw new Error('Invalid dependency edge');
      edges.add(item.to);
    } else throw new Error('Unknown graph record');
  }
  if (data.size !== inputs.seed.count || edges.size !== data.size || [...edges].some(id => !data.has(id))) throw new Error('Incomplete dependency closure');
  // This loads fixed, hash-checked author fixture source. It is not a loader for
  // evaluated model code and is not an execution sandbox.
  const implementation = require(path.join(root, inputs.release.source));
  const depots = [...data.values()];
  return {
    listDepots: () => implementation.listDepots(depots),
    getDepot: id => implementation.getDepot(depots, id),
    canReserve(id, units) {
      const depot = implementation.getDepot(depots, id);
      return Boolean(depot && Number.isSafeInteger(units) && units > 0 && units <= depot.capacity);
    }
  };
}
module.exports = { loadCatalog };
