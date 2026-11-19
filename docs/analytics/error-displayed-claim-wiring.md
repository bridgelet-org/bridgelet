# `Error Displayed` wiring: recipient error types

Spec: `docs/analytics-spec.md` §6. Emitter: `emitClaimErrorDisplayed()` in
`frontend/lib/error-displayed-claim.ts` (wraps `analytics.errorDisplayed`).

| `error_type` | Trigger (§6) | Wire-up status |
|---|---|---|
| `expired_token` | Claim token is past its expiration date | [ ] every UI surface that shows an expired-link message calls the emitter |
| `already_claimed` | Token is valid but funds were already swept | [ ] every "already claimed" surface calls the emitter |
| `invalid_wallet_address` | Wallet address fails validation | [ ] address-entry validation error calls the emitter |
| `transaction_failed` | Stellar transaction rejected | [ ] claim submission failure calls the emitter |

Rules: pass the exact string value, a real `sourceScreen`, and `claimId` when known. Each box is ticked
only after the surface is confirmed to emit the event.
