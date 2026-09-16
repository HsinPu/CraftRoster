# Sign-in label

`locales/en.json` owns the English sign-in text at the stable key `auth.signIn`. The button uses that value for both visible text and its accessible name. Clicking it calls the existing `onSignIn` callback; preserve that behavior and the locale key while changing the requested wording.

`src/sign-in.js` accepts a DOM document and creates the button without a framework or network request. `node test/sign-in.test.js` uses a small local document stub to check text ownership, the accessible name, and callback behavior. These are component contract checks, not a claim that a browser or screen reader was exercised.
