# Runbook: Investigate a Missing Analytics Event

For "event X should have fired for this flow, and it didn't."

## Step 1 — Check the expected trigger condition

Read the event's definition in `docs/analytics-spec.md` before assuming anything
is broken. Events fire on a **specific** condition, and names don't always mean
what a dashboard reader assumes.

The classic case is `Payment Confirmed`, which the spec says fires when the sender
clicks "Confirm & Pay" and signs — explicitly *before* blockchain confirmation.
"Confirmed" refers to the **user** confirming, not the chain. Anyone expecting
settlement will report a gap that isn't one.

Confirm: the exact trigger condition, which journey it belongs to (`sender` vs
`recipient`), and whether the flow actually reached that trigger point.

## Step 2 — Is the event waiting on on-chain state?

Some events cannot fire until the ledger settles. Per
[`analytics-events-vs-onchain-outcomes.md`](../integration-notes/analytics-events-vs-onchain-outcomes.md):

| Event | Waits on chain? |
|---|---|
| `Payment Confirmed` | No — intent only |
| `Payment Created` | **Yes** |
| `Claim Submitted` | No |
| `Claim Succeeded` | **Yes** |

A missing `Payment Created` or `Claim Succeeded` may be a **correct** report of a
transaction that never settled. Check for the paired failure event first —
`Payment Creation Failed` or `Claim Failed`. If one is present, analytics worked
as designed and the real story is the failed transaction.

Check latency too: `sweep_duration_ms` exists because confirmation takes time. An
event queried too early is simply not there yet.

## Step 3 — Reproduce with verbose logging

Reproduce in a lower environment. The mobile logger (`mobile/services/logger`)
gates on environment — `isProd ? 'warn' : 'debug'` — so non-production builds emit
`debug`/`info` lines production suppresses. Confirm the payload too: an event with
the wrong `journey` or a missing `claim_id` looks like a gap on a dashboard.

## Step 4 — Classify before escalating

- **Spec mismatch** — event fired correctly; expectation was wrong.
- **Transaction never settled** — not an analytics bug.
- **Genuinely not emitted** at a reached trigger — escalate with the flow, timestamps, environment, and which events did fire.
