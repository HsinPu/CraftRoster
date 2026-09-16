'use strict';
const path = require('node:path');
function load(root, relative) {
  const file = path.join(root, relative);
  delete require.cache[require.resolve(file)];
  return require(file);
}
function exchange(root, producer, consumer, stock) {
  if (!['legacy', 'current'].includes(producer) || !['allocation', 'planning'].includes(consumer)) throw new Error('Unknown local service selector');
  const publisher = load(root, `services/inventory-api/${producer}.cjs`);
  const subscriber = load(root, `services/${consumer}-worker/current.cjs`);
  const payload = JSON.parse(JSON.stringify(publisher.publishStock(stock)));
  return { payload, result: subscriber.readStock(payload) };
}
module.exports = { exchange };
