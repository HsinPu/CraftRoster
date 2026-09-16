'use strict';

function createQuoteApi() {
  let shouldFailNext = false;
  function request(method) {
    const quote = {
      standard: { delay: 700, totalCents: 1200 },
      express: { delay: 80, totalCents: 1800 }
    }[method];
    if (!quote) return Promise.reject(new Error('Unknown shipping method'));
    const fail = shouldFailNext;
    shouldFailNext = false;
    return new Promise((resolve, reject) => setTimeout(() => {
      if (fail) reject(new Error('Quote unavailable. Please retry.'));
      else resolve({ method, totalCents: quote.totalCents });
    }, quote.delay));
  }
  return { request, failNext() { shouldFailNext = true; } };
}

module.exports = { createQuoteApi };

