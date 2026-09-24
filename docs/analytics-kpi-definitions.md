# Analytics KPI Query Definitions

> Companion to `analytics-spec.md` §7.3 and §8.1.
> Closes the "defined in the spec but undefined in practice" gap for the
> core KPI formulas. Each KPI below states the exact events, join keys, and
> query that will compute it **once its constituent events fire**.

## Readiness gate

None of these query definitions may be reported anywhere until both:

1. every constituent event fires from production app code (see per-event
   issues tracked by the per-journey funnel trackers), and
2. the query below has been run against a real event export and its shape
   verified (the `analytics-spec-vs-implementation-unverified` postmortem
   requirement: events exist, a query implements the formula, they agree).

While any constituent event is unimplemented, the corresponding KPI row in
the table below stays `blocked`; a dashboard claiming these numbers would be
showing zeros or stale data.

| KPI | Spec | Formula | Constituent events | Status |
|-----|------|---------|--------------------|--------|
| Claim Conversion Rate (CCR) | §8.1 | `Claim Succeeded ÷ Claim Verified × 100` | `Claim Verified` (implemented, PR #713), `Claim Succeeded` (#585) | ⬜ blocked on `Claim Succeeded` |
| Time to Claim (TTC) | §8.1 | `median(Claim Succeeded.timestamp − Payment Created.timestamp)` matched on `claim_id` | `Payment Created` (#567), `Claim Succeeded` (#585) | ⬜ blocked |
| Expiry Rate | §8.1 | `payments status "expired" with no Claim Succeeded ÷ Payment Created × 100` | `Payment Created` (#567), `Claim Succeeded` (#585), expiry-watch | ⬜ blocked |
| End-to-end conversion (§7.3) | §7.3 | `Claim Succeeded ÷ Page Viewed (homepage) × 100` | `Page Viewed` (#558), `Claim Succeeded` (#585) | ⬜ blocked |

---

## CCR — Claim Conversion Rate

**Formula (§8.1):** `(Claim Succeeded events) / (Claim Verified events) × 100`

**Query shape (post-export, event-level):**

```sql
SELECT
  (SELECT count(*) FROM events WHERE name = 'Claim Succeeded') AS numerators,
  (SELECT count(*) FROM events WHERE name = 'Claim Verified')  AS denominators,
  ROUND(
    ((SELECT count(*) FROM events WHERE name = 'Claim Succeeded')::numeric
      / NULLIF((SELECT count(*) FROM events WHERE name = 'Claim Verified'), 0)) * 100,
    2
  ) AS ccr_percent
```

**Notes:** Both events carry `claim_id`; deduplicate repeated `Claim Verified`
emissions of the same `claim_id` per session before counting denominators
(§5.1 treats repeated opens as a single claim attempt for conversion
purposes). Report per-channel and per `days_remaining` band where useful.

## TTC — Time to Claim

**Formula (§8.1):** `median(Claim Succeeded.timestamp − Payment Created.timestamp)`
for all matched `claim_id` pairs.

**Query shape:**

```sql
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ttc_days) AS median_ttc_days
FROM (
  SELECT
    (s.timestamp - c.timestamp) AS ttc_days
  FROM events s
  JOIN events c ON c.name = 'Payment Created' AND c.props->>'claim_id' = s.props->>'claim_id'
  WHERE s.name = 'Claim Succeeded'
) t
```

**Requirement ahead of this query:** `Payment Created` (#567) must be
implemented with its `claim_id` payload property, and `Claim Succeeded`
(#585) must emit a matching `claim_id`. Until both fire, TTC is
undefined-in-practice (blocked).

## Expiry Rate

**Formula (§8.1):** `(payments with status "expired" and no Claim Succeeded) / (total Payment Created) × 100`.

**Query shape:**

```sql
SELECT
  ROUND(
    (count(*) FILTER (
      WHERE status = 'expired'
        AND NOT EXISTS (
          SELECT 1 FROM events s
          WHERE s.name = 'Claim Succeeded'
            AND s.props->>'claim_id' = e.props->>'claim_id'
        )
    ))::numeric / NULLIF(count(*), 0) * 100,
    2
  ) AS expiry_rate_percent
FROM events e
WHERE e.name = 'Payment Created';
```

**Requirement ahead of this query:** the expiry source of truth is the
payment record's backend `status` (`expired`), not an analytics event, so
the numerator must be computed against payment records joined on `claim_id`
to `Claim Succeeded`. Until `Payment Created` (#567) emits naming-compatible
`claim_id`s and `Claim Succeeded` (#585) exists, this KPI is
undefined-in-practice (blocked).

## End-to-end conversion (§7.3)

**Formula (§7.3):** `Claim Succeeded ÷ Page Viewed (homepage) × 100`.

This is the collapsed view of the full sender→recipient funnel:

```
Page Viewed (sender) → Payment Created → Claim Page Opened → Claim Succeeded
```

**Query shape:** ratio of the `Claim Succeeded` count to the homepage
`Page Viewed` count, filtered to a shared attribution window (e.g. day/week),
with no `claim_id` join available across journeys — the sender and recipient
events are linked only through the invite/referrer chain. Because of this,
§7.3 treats end-to-end conversion as an approximate census ratio, not a
per-claim join, unless a cross-journey `referrer`/`utm` join is added.

**Blocked on:** `Page Viewed` (#558), `Payment Created` (#567), and
`Claim Succeeded` (#585) — plus the sender-journey events documented in the
Sender Activation Funnel tracker.

---

## Cross-reference

The §7.1 (§7.1/§7.2/§7.3) funnel stage→event→issue maps live in the funnel
trackers. This document is the KPI counterpart: formula → query → readiness
status. Re-check the readiness table whenever a per-event PR merges.