'use strict';
const members = require('./members.json');
function listMembers(organizationId) {
  return members.filter((member) => member.organizationId === organizationId).map((member) => ({ ...member }));
}
module.exports = { listMembers };
