# ReliefLoop

ReliefLoop is a browser-based prototype for coordinating perishable surplus, volunteer riders, and changing shelter demand in real time.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Prototype flows included

- Live dispatch board with expiry countdowns, capacity, rider, source, and destination state.
- Donation intake form with handling and compatibility fields.
- Short-lived rider reservations and automatic release when the simulation clock advances.
- Batch splitting simulation for a 180-meal donation into rider-sized loads.
- Mid-route Shelter A closure with safe fallback rerouting.
- Filters for critical, in-transit, and action-needed work.
- Network pulse, attention queue, activity stream, and impact metrics.

The prototype intentionally uses a deterministic simulation clock so the failure cases from the problem statement can be demonstrated without waiting in real time.
