'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { submitOrder } = require('../src/order-service');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/order.json'), 'utf8'));
const inventory = { ...fixture.inventory };
console.log(JSON.stringify({ result: submitOrder(fixture.order, inventory), inventory }));
