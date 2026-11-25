# Base payload fields: status

Spec: `docs/analytics-spec.md` §3.1. `buildBasePayload()` in `frontend/lib/analytics.ts` builds the base payload.

| Field | Status | Notes |
|---|---|---|
| `anonymous_id` | Implemented | `getAnonymousId()` in `analytics.ts`, merged by `track()` |
| `session_id` | Implemented | `getSessionId()` in `analytics.ts`, merged by `track()` |
| `journey` | Implemented | `buildBasePayload(journey)`; sourced from event props, defaults to `"shared"` |
| `timestamp` | Implemented | `new Date().toISOString()` computed per event inside `track()` |
| `platform` | Implemented | Fixed `"web"` value for this frontend |
| `user_agent` | Implemented | `navigator.userAgent`, empty string during SSR |
| `device_type` | Implemented | `detectDeviceType()`: mobile / tablet / desktop |
| `referrer` | Implemented | `document.referrer`, or `null` when empty |
| `network` | Implemented | `network: analyticsNetwork()` in `buildBasePayload()`; `analyticsNetwork()` in `frontend/lib/analytics-network.ts` reads `NEXT_PUBLIC_CRYPTO_NETWORK` per event. `mainnet` only for mainnet/public values, otherwise `testnet` |

## Remaining work

None. All §3.1 base payload fields are emitted on every event.
