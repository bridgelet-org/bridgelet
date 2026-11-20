# Claim funnels and KPIs: readiness notes

Companion to `docs/analytics-spec.md` §7.2, §7.3, §8.1. Calculation helpers live in
`frontend/lib/analytics-kpis-claim.ts`.

## Funnels

| Funnel | Stages (spec order) | Helper |
|---|---|---|
| Recipient Claim Funnel (§7.2) | Claim Page Opened → Claim Verified → Claim CTA Clicked → Wallet Address Entered → Claim Submitted → Claim Succeeded | `RECIPIENT_FUNNEL_STAGES` + `funnelSteps()` |
| Full End-to-End Funnel (§7.3) | Page Viewed → Payment Created → Claim Page Opened → Claim Succeeded | `END_TO_END_FUNNEL_STAGES` + `funnelSteps()` |

Before building a dashboard, confirm every stage's event is emitted in the app (the names are declared
in `ClaimEvent` in `frontend/lib/analytics.ts`) and report only real counts: an unemitted stage must show
as "not instrumented", not as zero.

## KPIs

- **CCR** (§8.1): `Claim Succeeded ÷ Claim Verified × 100`, via `claimConversionRate()`. The spec's
  denominator is `Claim Verified`, not `Claim Page Opened`; keep dashboards on the spec formula.
- **TTC** (§8.1): median of `Claim Succeeded.timestamp − Payment Created.timestamp` per matched
  `claim_id`, via `medianTimeToClaimMs()`.

## Checklist before reporting a number

- [ ] Underlying events fire in production
- [ ] A query/dashboard uses the exact formula above
- [ ] The query output and the helper agree on a sample
