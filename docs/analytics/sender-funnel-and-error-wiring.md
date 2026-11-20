# Sender Activation Funnel and network/wallet error wiring

Spec: `docs/analytics-spec.md` §6 and §7.1.

## Sender Activation Funnel (§7.1)

Stages, in order: `Page Viewed` (homepage) → `Send Form Started` → `Send Form Completed` →
`Wallet Connected` → `Payment Confirmed` → `Payment Created` → `Claim Link Shared`.

Do not build the funnel view until every stage's event is confirmed to fire in production. A stage that
is not instrumented must be reported as "not instrumented", never as zero.

## `Error Displayed` for network/wallet errors

Emitter: `emitNetworkErrorDisplayed()` in `frontend/lib/error-displayed-network.ts`.

| `error_type` | Trigger (§6) | Wire-up status |
|---|---|---|
| `network_unavailable` | Cannot reach Stellar network or Bridgelet API | [ ] network failure surfaces call the emitter |
| `wallet_connection_failed` | Sender's wallet refused connection | [ ] wallet connect error surface calls the emitter |
| `unknown` | Unclassified error | [ ] generic fallback error surface calls the emitter |

Tick a box only after the surface is confirmed to emit the event with the exact string value.
