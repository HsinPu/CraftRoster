'use strict';
function adminMembers(request, store) {
  if (request.session.role !== 'admin') {
    return { status: 403, body: { error: 'Administrator role required' } };
  }
  return { status: 200, body: { members: store.listMembers(request.session.organizationId) } };
}
module.exports = { adminMembers };
