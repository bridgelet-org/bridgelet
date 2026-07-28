# Analytics Spec vs Implementation: Unverified

**Issue:** #320
**Severity:** Process gap (spec compliance unverified)
**Date:** 2026-07-28

---

## Summary

`docs/analytics-spec.md` is a 919-line, 28KB document defining event naming
conventions, payload structures, funnel definitions, and KPIs for Bridgelet.
However, compliance between this spec and the actual frontend implementation has
not been verified by tracing each event against the code. This post documents the
gap and its risks.

## The Spec

`docs/analytics-spec.md` defines:

- **Event naming convention:** `Noun Verb` in Title Case (e.g., `Payment
  Created`, `Claim Link Copied`).
- **Standard payload structure:** Common fields across all events.
- **Sender journey events:** From wallet connection through payment creation.
- **Recipient journey events:** From claim link opening through sweep
  confirmation.
- **Error & edge case events:** Failure paths and boundary conditions.
- **Conversion funnel definitions:** Step-by-step funnel from landing to
  settlement.
- **Business metrics & KPI definitions:** Derived metrics and how they are
  calculated.

The spec is well-structured and internally consistent. It explicitly scopes
itself as defining *what* to track and *how to structure it*, not implementing
any tracking code.

## The Verification Gap

During this audit, the spec was reviewed at a high level — checking naming
conventions, payload structure, funnel logic, and the critical distinction
between intent-based events and on-chain confirmation events. That review
confirmed the spec is internally sound.

**What was not done:** A systematic trace of every defined event against the
actual frontend code to verify:

1. Does each event name appear in `frontend/` source?
2. Does each event fire at the point the spec says it fires?
3. Does each payload field get populated with the value the spec specifies?
4. Are the funnel step boundaries correctly implemented?
5. Do the KPI formulas in the spec match any dashboard or query code?

This verification was out of scope for the current audit pass, but the gap
should be acknowledged.

## The Naming Trap

The most concrete risk identified during the high-level review is documented in
`integration-notes/analytics-events-vs-onchain-outcomes.md`: the event named
`Payment Confirmed` fires when the user *confirms* (signs the transaction), not
when the chain *confirms* (transaction succeeds on-chain).

| Event | Fires when | On-chain confirmed? |
|-------|-----------|:-------------------:|
| `Payment Confirmed` | User clicks "Confirm & Pay" and signs | **No** |
| `Payment Created` | Transaction succeeds on-chain | **Yes** |
| `Payment Creation Failed` | Blockchain transaction fails after signing | **Yes** (negative) |
| `Claim Submitted` | Recipient submits the claim | **No** |
| `Claim Succeeded` | Sweep transaction confirmed on-chain | **Yes** |
| `Claim Failed` | Sweep fails after recipient confirmed | **Yes** (negative) |

Anyone reading a dashboard without the spec in hand will almost certainly read
"Payment Confirmed" as settlement. It is not. The funnel section makes the
distinction load-bearing: step 5 measures "% who sign" and step 6 measures
"% confirmed → on-chain success." The gap between those steps *is* the on-chain
failure rate.

## Spec Drift Risk

Without periodic verification, the spec and implementation will inevitably
diverge. Common drift scenarios:

- **Events added to code but not to spec.** A developer adds a tracking call for
  a new UI feature but doesn't update `analytics-spec.md`. The event is invisible
  to anyone relying on the spec for dashboard design.
- **Events renamed in code but not in spec.** A refactor renames
  `Payment Created` to `Payment Settled` in the frontend but the spec still
  says `Payment Created`. Dashboard queries keyed on the spec name break
  silently.
- **Payload fields changed.** A new optional field is added to an event payload
  in code but the spec's payload structure table is not updated. Downstream
  consumers (data pipelines, dashboards) don't know the field exists.
- **Events removed from code.** An event is deprecated in the frontend but still
  listed in the spec. Dashboards that reference it show flat zeros.

None of these are hypothetical — they are the standard failure mode of any spec
that is not mechanically checked against its implementation.

## What Verification Would Look Like

A proper compliance check would:

1. Extract every event name string from `frontend/` source (grep for the naming
   pattern).
2. Extract every event name defined in `analytics-spec.md`.
3. Diff the two lists to find events in the spec but not in code (orphaned spec
   entries) and events in code but not in the spec (undocumented events).
4. For each matched event, verify the payload fields by tracing the tracking
   call through to its data source.
5. Verify funnel step ordering matches the actual user flow in the UI.

This could be partially automated but requires human judgment for step 4
(whether a payload field is *correctly* populated, not just present).

## Recommendations

- **Immediate:** Add a note to `analytics-spec.md` stating that implementation
  compliance has not been verified, so readers treat it as a design document
  rather than a source of truth.
- **Short-term:** Perform the event-name diff (steps 1–3 above) as a lightweight
  compliance check. This is largely automatable.
- **Medium-term:** Establish a process for keeping the spec in sync — either
  require spec updates with every tracking PR, or add a CI check that extracts
  event names from code and compares them to the spec.
- **Ongoing:** The `Payment Confirmed` naming issue should be resolved — either
  rename the event to `Payment Signed` (matching its actual semantics) or add a
   prominent note to the dashboard layer that `Payment Confirmed` ≠ on-chain
   settlement.

## Related Documents

- [`docs/analytics-spec.md`](../../docs/analytics-spec.md) — The full 919-line
  event tracking specification
- [`integration-notes/analytics-events-vs-onchain-outcomes.md`](../integration-notes/analytics-events-vs-onchain-outcomes.md)
  — The `Payment Confirmed` naming trap and on-chain vs intent distinction
- [`postmortems/sender-auth-relies-on-transaction-signing-not-session.md`](./sender-auth-relies-on-transaction-signing-not-session.md)
  — Auth model that determines how sender identity is established (affects
  analytics payload for sender-identifying events)
