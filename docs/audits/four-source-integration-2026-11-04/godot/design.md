# First ten minutes: Pocket Courier

Status: proposed design, not observed play. Target: solo-built desktop, top-down, one vehicle, two neighborhoods, capacity three packages, four fixed jobs, no combat. Assumptions: keyboard movement and interact; no time limit, damage, fuel, buying or vehicle upgrades. A 10-minute session is a pacing target, never an enforced failure timer. The separate two-session prototype checks isolation, not a multiplayer feature.

## Experience and choice

A short shift should teach reliable pickup and delivery, then ask which three of four parcels to carry and how to order stops. Capacity is the sole planning constraint. Keeping all four jobs visible avoids a surprise fourth parcel; keeping their destinations visible makes the choice informed. No random jobs, traffic AI or economy are needed to answer whether batching is understandable.

The Depot sits at the west entrance of Courtyard. A readable east-west road links Courtyard to Canal; a bridge with a sign marks the neighborhood boundary. Courtyard has the Bakery and Clinic; Canal has the Library and Workshop. The depot and every stop have a unique text label plus shape marker so color is supplementary. Streets are unobstructed loops with no one-way rules. Proposed blockout: road centerline 600 px between neighborhoods, vehicle speed 160 px/s, 80 px interaction radius. These are prototype starting values, not verified comfortable driving or collision geometry.

| Job | Pickup | Destination | Size | Reward |
| --- | --- | --- | --- | --- |
| J1 | Depot | Courtyard Bakery | 1 slot | 10 shift points |
| J2 | Depot | Courtyard Clinic | 1 slot | 10 shift points |
| J3 | Depot | Canal Library | 1 slot | 10 shift points |
| J4 | Depot | Canal Workshop | 1 slot | 10 shift points |

Equal rewards remove an unneeded optimization axis; points acknowledge completion and cannot be spent. Expected total is exactly 40. The short route back to Depot makes a mistaken load recoverable. First route example: J1/J2/J3, Bakery, Clinic, Library, return for J4, Workshop. Alternative: J1/J3/J4, Bakery, Library, Workshop, return for J2. Neither is claimed optimal without measured blockout distances.

## Proposed session beats

- 0:00–1:00: spawn at Depot, show movement and interact actions. List all four jobs and capacity 0/3. J1 is suggested but optional. Pickup visibly changes state and capacity.
- 1:00–3:00: short safe Bakery delivery. A destination sign and matching parcel label make the connection inspectable. Arrival alone does not complete the job: a fresh interact press commits it.
- 3:00–5:00: choose remaining load and visit Clinic or cross bridge. Capacity rejection explains "Full: deliver a parcel first" and leaves all state unchanged.
- 5:00–8:30: visit Canal, return for any remaining parcel. Neighborhood sign, labels and job list persist. No combat or countdown distracts from route planning.
- 8:30–10:00: finish fourth delivery and show 4/4 and 40 points; offer restart. If incomplete at ten minutes, allow continuation and record remaining jobs during the playtest.

## Rules ready for implementation

Each session owns an inventory of unique job IDs, job states, reward total and completed count. Shared Job Resources contain only immutable definition fields. Each job starts AVAILABLE; pickup at its exact pickup ID, while unpaused with a fresh non-echo press, succeeds only if inventory size is below three. It transitions to CARRIED and adds one ID. Repeated pickup fails with no mutation. The inventory must never exceed three.

Drop-off requires CARRIED, inventory membership and exact destination ID. It atomically removes that ID, marks DELIVERED and adds its definition reward once. Wrong destination, unknown ID, unavailable job and repeated delivery fail without modifying inventory, state or reward. No dropping/discarding or cancellation is offered in this first prototype. Restart creates a fresh session; no cross-session shared progress or saving.

Pause freezes gameplay input eligibility. The pause action is processed while paused. Entering and leaving pause disarms interaction until a release is seen; a held key or stale press cannot collect/deliver on resume. UI feedback should announce each rejection reason and refresh the inventory only on accepted transitions. The headless prototype checks the rule boundary and logical labels, not the proposed driveable map, proximity or visible UI.

## Small playtest protocol (unexecuted)

Use three unfamiliar desktop players as a convenience sample, one fresh session each. Record exact build hash, input device and assistance. Obtain consent for recording; omit personal identifiers. Give neutral task: "Deliver these four parcels; stop whenever you want." Allow ten minutes without instruction, then a two-minute explanation interview. Intervene after 90 seconds without progress or on a blocking defect, and timestamp help. Do not coach the three-parcel strategy.

Observation sheet per player: first pickup time; first valid delivery time; attempted fourth pickup and predicted reason; wrong destination attempts; load chosen and explanation; sign/landmark noticed; pause/resume unintended actions; completion time or remaining jobs at minute ten; help timestamps; one verbatim expectation only if actually spoken. Keep observed action, participant explanation and designer interpretation in separate columns.

Local decision rules before testing: any capacity corruption, duplicate points or pause-triggered action blocks the next test build. If two of three need help identifying a destination, revise labels/sign placement and retest. If two cannot explain the capacity rejection, revise feedback before adding features. If sessions run beyond ten minutes, inspect wrong turns and return distance before shortening routes. Three players cannot establish population success rate, enjoyment or balance. No sessions or outcomes have been observed.
