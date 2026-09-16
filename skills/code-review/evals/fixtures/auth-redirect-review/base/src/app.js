'use strict';
const { createApplication } = require('../../shared/framework');
const { afterSignIn } = require('./callback');
module.exports = { dispatch: createApplication(afterSignIn) };
