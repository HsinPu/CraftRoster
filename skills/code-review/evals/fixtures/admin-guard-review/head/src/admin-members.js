'use strict';
function adminMembers(request, store) {
  return { status: 200, body: { members: store.listMembers(request.session.organizationId) } };
}
module.exports = { adminMembers };
