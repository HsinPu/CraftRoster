'use strict';
const { renderReceipt } = require('./render-receipt');
function checkout(service, request) {
  const response = service.reserve(request);
  if (response.status >= 400) return { ...response, receiptHtml: null };
  return { ...response, receiptHtml: renderReceipt(response.booking) };
}
module.exports = { checkout };
