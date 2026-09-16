'use strict';
function listDepots(records) {
  return records.map(record => ({ ...record }));
}
function getDepot(records, depotId) {
  const record = records.find(candidate => candidate.depotId === depotId);
  return record ? { ...record } : null;
}
module.exports = { listDepots, getDepot };
