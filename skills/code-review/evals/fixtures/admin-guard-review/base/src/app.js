'use strict';
const { createApplication } = require('../../shared/framework');
const { adminMembers } = require('./admin-members');
module.exports = { dispatch: createApplication(adminMembers) };
