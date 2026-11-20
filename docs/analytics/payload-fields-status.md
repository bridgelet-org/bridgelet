# Payload fields: `app_version`, `claim_id`, `asset_type`, `amount_usd_equiv`

Spec: `docs/analytics-spec.md` §3.1 and §3.2.

| Field | Where it is produced | Helper added here | Remaining work |
|---|---|---|---|
| `app_version` | `appVersion()` and `buildBasePayload()` in `frontend/lib/analytics.ts` (from `NEXT_PUBLIC_APP_VERSION`) | n/a | [ ] set `NEXT_PUBLIC_APP_VERSION` in the deploy pipeline, otherwise it reports `unknown` |
| `claim_id` | `conditional.claimId` | `isValidClaimId()` | [ ] pass at every claim-related call site |
| `asset_type` | `conditional.assetType` | `normalizeAssetType()` | [ ] normalise before passing |
| `amount_usd_equiv` | `conditional.amountUsdEquiv` | `toUsdEquiv(amount, rate)` | [ ] source a USD rate and pass it on payment events |

Helpers live in `frontend/lib/analytics-payload-utils.ts`.
