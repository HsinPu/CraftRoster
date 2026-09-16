'use strict';
const { redirect } = require('../../shared/framework');
function afterSignIn(request) {
  return redirect('/account');
}
module.exports = { afterSignIn };
