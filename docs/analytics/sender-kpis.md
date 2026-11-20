# Sender KPIs: formulas and readiness

Companion to `docs/analytics-spec.md` §8.1 and §8.2. Helpers: `frontend/lib/analytics-kpis-sender.ts`.

| KPI | Formula (spec) | Helper | Events required |
|---|---|---|---|
| Expiry Rate | expired payments with no `Claim Succeeded` ÷ total `Payment Created` × 100 | `expiryRate()` | `Payment Created`, `Claim Succeeded`, payment status |
| Reclaim Rate | `Funds Reclaimed` ÷ payments with "expired" status × 100 | `reclaimRate()` | `Funds Reclaimed`, payment status |
| Sender Activation Rate | unique `anonymous_id` with ≥1 `Payment Created` ÷ unique `anonymous_id` with homepage `Page Viewed` × 100 | `senderActivationRate()` | `Page Viewed`, `Payment Created` |
| Share Method Distribution | share of `Claim Link Shared` per `share_method` | `shareMethodDistribution()` | `Claim Link Shared` |

All helpers return `null` (not `0`) when the denominator is empty, so an uninstrumented or empty
period is never shown as a real zero.

## Checklist before reporting a number

- [ ] The events above are emitted in production
- [ ] A query/dashboard implements the exact formula
- [ ] The query output and the helper agree on a sample
