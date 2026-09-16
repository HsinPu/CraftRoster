'use strict';
const assert = require('node:assert/strict');
const { createSignInButton } = require('../src/sign-in');
const locale = require('../locales/en.json');
let clicks = 0;
const document = {
  createElement(tag) {
    const attributes = {};
    const listeners = {};
    return { tag, attributes, setAttribute: (key, value) => { attributes[key] = value; }, addEventListener: (type, fn) => { listeners[type] = fn; }, click: () => listeners.click() };
  }
};
const button = createSignInButton(document, locale, () => { clicks += 1; });
assert.equal(button.tag, 'button');
assert.equal(button.type, 'button');
assert.equal(button.textContent, locale.auth.signIn);
assert.equal(button.attributes['aria-label'], button.textContent);
button.click();
assert.equal(clicks, 1);
console.log('Locale, accessible-name, and click contract checks passed.');
