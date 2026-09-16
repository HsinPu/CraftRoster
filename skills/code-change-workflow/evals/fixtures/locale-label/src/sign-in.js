'use strict';

function createSignInButton(document, locale, onSignIn) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = locale.auth.signIn;
  button.setAttribute('aria-label', locale.auth.signIn);
  button.addEventListener('click', onSignIn);
  return button;
}

module.exports = { createSignInButton };
