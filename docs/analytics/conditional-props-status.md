# Conditional payload properties: status

Spec: `docs/analytics-spec.md` §3.2 and §6. Property builders already exist as `conditional` in
`frontend/lib/analytics.ts`; helpers that feed them live in `frontend/lib/analytics-props-helpers.ts`.

| Property | Builder | Populate with | Remaining work |
|---|---|---|---|
| `expiry_days` | `conditional.expiryDays` | `expiryProps(days)` (normalises to 1/7/30/90/null) | [ ] spread into `Payment Created` and `Claim Verified` call sites |
| `error_code` | `conditional.errorCode` | `errorProps(type, code)` | [ ] pass the real code at each `Error Displayed` call site |
| `error_type` | `conditional.errorType` | `errorProps(type, code)` | [ ] use `ERROR_TYPES` values only |
| `error_type = invalid_token` | n/a | `emitInvalidTokenDisplayed(screen)` | [ ] call it where a malformed/unknown claim link is shown |

`error_code` and `error_type` are required on every `Error Displayed` event; `errorProps()` guarantees both are set.
