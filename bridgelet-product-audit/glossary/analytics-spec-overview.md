# Analytics Spec — Overview

A short orientation to `docs/analytics-spec.md` (Bridgelet Analytics & Product
Event Tracking Specification), which runs to roughly 28KB. This page is the gist;
**all detail stays in the source document.**

## Categories it defines

The spec is organised in nine sections:

1. **Overview** — purpose and scope.
2. **Event naming conventions** — how events are named and why consistently.
3. **Standard payload structure** — properties every event carries.
4. **Sender journey events** — the send flow, from intent through settlement.
5. **Recipient journey events** — opening a claim link through a completed sweep.
6. **Error & edge case events** — failure paths as first-class events.
7. **Conversion funnel definitions** — how the events compose into funnels.
8. **Business metrics & KPI definitions** — the derived measures.
9. **Implementation notes.**

So it covers three broad kinds of thing: **event definitions** (sections 4–6),
**structural conventions** (2–3), and **derived measurement** (7–8).

## Two things worth knowing before reading

**Journeys are separated.** Sender and recipient events are defined apart and
tagged with a `journey` property (`"sender"` / `"recipient"`), reflecting that the
two are usually different people on different devices.

**Failures are events, not absences.** Section 6 gives errors their own events, so
a failed payment is something you can *count* rather than infer from a missing
success.

## The one trap

Do not read event names as settlement status. `Payment Confirmed` fires when the
**user** confirms and signs, explicitly before blockchain confirmation;
`Payment Created` is the on-chain success. The spec is clear about this, but the
names invite misreading, and the distinction is load-bearing in the funnel — the
gap between those two steps is the on-chain failure rate.

Whether each event reflects confirmed on-chain state or optimistic client state is
worked through in
[`../integration-notes/analytics-events-vs-onchain-outcomes.md`](../integration-notes/analytics-events-vs-onchain-outcomes.md).

**For any actual implementation work, read the spec itself** — event names,
payload fields and trigger conditions are precise there and deliberately not
duplicated here, so this page cannot drift into contradicting it.
