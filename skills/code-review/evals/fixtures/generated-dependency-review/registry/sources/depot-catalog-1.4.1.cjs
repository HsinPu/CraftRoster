'use strict';
function listDepots(records) {
  return records.map(record => ({ ...record }));
}
function getDepot(records, depotId) {
  const record = records.filter(candidate => candidate.depotId === depotId)[0];
  return record ? { ...record } : null;
}
module.exports = { listDepots, getDepot };
