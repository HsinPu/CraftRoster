'use strict';
function escapeText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function renderReceipt(booking) {
  return `<p>Reserved for <span>${escapeText(booking.attendeeName)}</span>: ${booking.seats} seats.</p>`;
}
module.exports = { renderReceipt };
