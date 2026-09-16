# Local event booking contract

The service manages a single synthetic event. A request contains a nonempty `requestId`, the configured `eventId`, an integer `seats` count from 1 through 4, and a nonempty attendee name. Names are ordinary strings of at most 80 characters. Request IDs are at most 80 characters. Negative counts, zero, fractions, and counts above four are invalid and must return status 400 without changing capacity or receipts. An unknown event returns 404.

Every advertised seat may be reserved: a request equal to the remaining capacity is permitted. Insufficient capacity returns 409 and makes no state change. A new accepted request returns status 201, a booking, and `replayed: false`.

A successful request ID binds the event, seat count, and exact attendee-name string. Retrying the same ID with the same payload returns the same booking with status 200 and `replayed: true`, does not consume seats again, and succeeds even when the first booking used all available seats. For this event, reusing the ID with a changed seat count or attendee name returns 409 without applying any part of the changed request. Requests naming an unknown event return 404 before receipt lookup. Clients must use a new request ID to request a different booking.

The local checkout caller renders the attendee name inside an HTML text node, never as HTML markup or a URL. The renderer must encode text metacharacters while preserving the attendee's name as data; it must not strip names down to ASCII or delete characters. These source tests do not establish browser layout or assistive-technology behavior.

The fixture's receipt store is process-local memory for reproducible tests. Production receipt retention, production retry windows, and cleanup scheduling have not been supplied or decided here; consult the runtime and policy inputs before changing that boundary. Product booking rules above do not supply a production retention duration.
