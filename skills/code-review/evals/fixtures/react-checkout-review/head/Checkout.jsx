import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createCheckoutController } from './controller.cjs';
import { createQuoteApi } from '../shared/fake-quotes.cjs';
import './checkout.css';

export function Checkout() {
  const api = useMemo(() => createQuoteApi(), []);
  const controller = useMemo(() => createCheckoutController(api.request), [api]);
  const [view, setView] = useState(() => controller.snapshot());
  const errorRef = useRef(null);
  useEffect(() => {
    const unsubscribe = controller.subscribe(setView);
    controller.select('standard');
    return () => { unsubscribe(); controller.dispose(); };
  }, [controller]);
  const total = view.quote ? (view.quote.totalCents / 100).toFixed(2) : '—';
  return (
    <main>
      <h1>Local checkout preview</h1>
      <p className="notice">Synthetic order preview. No real charges or orders.</p>
      <div className="checkout-grid">
        <section aria-labelledby="shipping-heading">
          <h2 id="shipping-heading">Shipping</h2>
          <label htmlFor="shipping">Shipping method</label>
          <select id="shipping" value={view.method} onChange={event => controller.select(event.target.value)}>
            <option value="standard">Standard</option>
            <option value="express">Express</option>
          </select>
          <p>Standard: $12.00 · Express: $18.00</p>
          <button type="button" onClick={() => { controller.select('standard'); controller.select('express'); }}>Quick switch: Standard then Express</button>
          <button type="button" onClick={() => { api.failNext(); controller.retry(); }}>Simulate quote error</button>
        </section>
        <section aria-labelledby="summary-heading">
          <h2 id="summary-heading">Order summary</h2>
          <p role="status" aria-live="polite">{view.status === 'loading' ? 'Updating total…' : view.status === 'ready' ? 'Quote ready' : ''}</p>
          {view.status === 'error' && (
            <div className="error" role="alert" tabIndex={-1} ref={errorRef}>
              <p>{view.error}</p>
              <div className="retry-control" role="button" tabIndex={0} onClick={() => controller.retry()}>Retry quote</div>
            </div>
          )}
          <p data-testid="quoted-method">Quote method: {view.quote?.method || 'pending'}</p>
          <p data-testid="total">Total: $ {total}</p>
          <button type="button" disabled={view.status !== 'ready'} onClick={() => controller.confirm()}>Confirm local order</button>
          {view.order && <p data-testid="confirmation" role="status">Confirmed {view.order.method}: $ {(view.order.totalCents / 100).toFixed(2)}</p>}
        </section>
      </div>
    </main>
  );
}
