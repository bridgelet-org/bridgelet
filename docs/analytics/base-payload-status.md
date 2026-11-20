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
| `network` | Helper added | `analyticsNetwork()` / `withNetwork()` in `frontend/lib/analytics-network.ts`; reads `NEXT_PUBLIC_CRYPTO_NETWORK` |

## Remaining work

- [ ] Add `network: analyticsNetwork()` to `buildBasePayload()` so every event carries it. Left out of this
      change on purpose: `frontend/lib/analytics.test.ts` asserts on the base payload, so the test
      should be updated in the same commit.
- [ ] Add a test that `network` is `mainnet` only for mainnet/public values.
