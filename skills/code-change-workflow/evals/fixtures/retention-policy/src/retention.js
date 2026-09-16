'use strict';

function selectExpiredRecords(records, policy, now) {
  const retentionDays = policy.retentionDays ?? 30;
  const cutoff = Date.parse(now) - retentionDays * 86400000;
  return records.filter((record) => Date.parse(record.createdAt) < cutoff).map((record) => record.id);
}

module.exports = { selectExpiredRecords };
