'use strict';
const { redirect } = require('../../shared/framework');
function afterSignIn(request) {
  const destination = request.query && request.query.next;
  return redirect(destination ?? '/account');
}
module.exports = { afterSignIn };
