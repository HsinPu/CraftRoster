'use strict';
function validateRequest(input) {
  if (!input || typeof input.requestId !== 'string' || input.requestId.length === 0 || input.requestId.length > 80 || typeof input.attendeeName !== 'string' || input.attendeeName.length === 0 || input.attendeeName.length > 80) return false;
  return Number.isInteger(input.seats) && input.seats >= 0 && input.seats <= 4;
}

function createBookingService({ eventId = 'synthetic-event-1', capacity = 6 } = {}) {
  if (!Number.isSafeInteger(capacity) || capacity < 0) throw new RangeError('capacity must be a nonnegative integer');
  let remaining = capacity;
  let nextId = 1;
  const receipts = new Map();
  function reserve(input) {
    if (!validateRequest(input)) return { status: 400, error: 'Invalid booking request' };
    if (input.eventId !== eventId) return { status: 404, error: 'Event not found' };
    const fingerprint = JSON.stringify([input.eventId, input.seats, input.attendeeName]);
    const previous = receipts.get(input.requestId);
    if (previous && previous.fingerprint !== fingerprint) return { status: 409, error: 'Request ID already belongs to a different payload' };
    if (input.seats > remaining) return { status: 409, error: 'Insufficient capacity' };
    remaining -= input.seats;
    if (previous) return { status: 200, booking: { ...previous.booking }, replayed: true };
    const booking = { id: `synthetic-booking-${nextId++}`, eventId, seats: input.seats, attendeeName: input.attendeeName };
    receipts.set(input.requestId, { fingerprint, booking });
    return { status: 201, booking: { ...booking }, replayed: false };
  }
  return { reserve, snapshot: () => ({ eventId, remaining, receiptCount: receipts.size }) };
}

module.exports = { createBookingService };
