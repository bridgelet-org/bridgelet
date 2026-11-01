# Analytics Events vs On-Chain Outcomes

Do the events in `docs/analytics-spec.md` reflect *confirmed on-chain* outcomes,
or optimistic client-side state? The answer differs per event — and the spec is
commendably explicit about it.

## Completion-related events

| Event | Fires when | On-chain confirmed? |
|---|---|---|
| `Payment Confirmed` | Sender clicks "Confirm & Pay" and signs | **No** — intent only |
| `Payment Created` | Transaction succeeds on-chain | **Yes** |
| `Payment Creation Failed` | Blockchain transaction fails after signing | **Yes** (negative) |
| `Claim Submitted` | Recipient submits the claim | **No** |
| `Claim Succeeded` | Sweep transaction confirmed on-chain | **Yes** |
| `Claim Failed` | Sweep fails after recipient confirmed | **Yes** (negative) |

## The naming trap

`Payment Confirmed` is the one to watch. The spec states plainly that it
"indicates user intent; it fires *before* blockchain confirmation." The word
*Confirmed* refers to **the user confirming**, not the **chain** confirming.

Anyone reading a dashboard without the spec in hand will almost certainly read
"Payment Confirmed" as settlement. It isn't — `Payment Created` is. The funnel
section makes the distinction load-bearing: step 5 measures "% who sign the
transaction" and step 6 measures "% confirmed → on-chain success". The gap between
those two steps *is* the on-chain failure rate.

So the spec's own model is sound; the risk is entirely in how the event name reads
out of context.

## Structural consequence

Because signature and settlement are separate events, a payment that is signed and
then fails on-chain produces `Payment Confirmed` with no `Payment Created`. Any
metric counting `Payment Confirmed` as a success will **overcount**. The same shape
applies on the recipient side between `Claim Submitted` and `Claim Succeeded`, where
`sweep_duration_ms` explicitly measures the interval to on-chain confirmation.

## Backend counterpart

This is the frontend-side instance of a question the backend faces too. See
bridgelet-sdk-audit's `webhook-delivery-vs-chain-event-consistency.md`, which asks
whether a delivered webhook reliably corresponds to a settled chain event. Both
reduce to: *does this signal mean "someone asked" or "the ledger agreed"?* Answers
should stay consistent across the two surfaces, or a dashboard and a webhook
consumer will disagree about the same payment.

## Resolution & Cross-Repo Semantic Alignment (#878)

To ensure client-side telemetry dashboards and backend webhook consumers never disagree on payment and sweep states:

- **Canonical Event Alignment**:
  - `Payment Confirmed` (frontend analytics): Intent committed / transaction signed by user. Fires *before* submission to the Stellar network. No corresponding webhook event (uncommitted intent is client-local).
  - `Payment Created` (frontend/server analytics) ↔ `account.created` / `account.funded` (backend webhook): Both require **ledger-confirmed inclusion** (transaction successful on Horizon/Soroban). Neither signal fires if the funding transaction fails or is rejected.
  - `Claim Submitted` (frontend analytics): Recipient destination submitted; sweep transaction pending execution by the custodial backend.
  - `Claim Succeeded` (frontend/server analytics) ↔ `sweep.completed` (backend webhook): Both require **confirmed on-chain sweep execution**. Both surfaces carry the authoritative transaction hash and duration.
- **Cross-Repo Contract Reference**: Aligned with `bridgelet-sdk` webhook specifications and `docs/analytics-spec.md` §9.2.1.
