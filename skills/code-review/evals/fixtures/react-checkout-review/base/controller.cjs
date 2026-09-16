'use strict';

function createCheckoutController(loadQuote) {
  let state = { method: 'standard', status: 'idle', quote: null, error: null, order: null };
  let generation = 0;
  let disposed = false;
  const listeners = new Set();
  function publish(patch) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener({ ...state });
  }
  async function select(method) {
    if (disposed) return;
    if (!['standard', 'express'].includes(method)) throw new Error('Unknown shipping method');
    const request = ++generation;
    publish({ method, status: 'loading', quote: null, error: null, order: null });
    try {
      const quote = await loadQuote(method);
      if (disposed || request !== generation) return;
      publish({ status: 'ready', quote });
    } catch (error) {
      if (disposed || request !== generation) return;
      publish({ status: 'error', error: error.message, quote: null });
    }
  }
  function confirm() {
    if (state.status !== 'ready') return null;
    const order = { method: state.method, totalCents: state.quote.totalCents };
    publish({ order });
    return order;
  }
  return {
    select,
    retry: () => select(state.method),
    confirm,
    snapshot: () => ({ ...state }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    dispose() { disposed = true; generation += 1; listeners.clear(); }
  };
}

module.exports = { createCheckoutController };

