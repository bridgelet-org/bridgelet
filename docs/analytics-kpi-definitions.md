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

Status markers: `⬜ blocked` — a constituent event does not fire from
production code yet, so the formula has no inputs. `⏳ unverified` — every
constituent event does fire, but the query below has never been run against a
real event export, so readiness gate 2 is still open and the number may not be
reported anywhere yet. Neither marker means "ready".

| KPI | Spec | Formula | Constituent events | Status |
|-----|------|---------|--------------------|--------|
| Claim Conversion Rate (CCR) | §8.1 | `Claim Succeeded ÷ Claim Verified × 100` | `Claim Verified` (implemented, PR #713), `Claim Succeeded` (#585) | ⬜ blocked on `Claim Succeeded` |
| Time to Claim (TTC) | §8.1 | `median(Claim Succeeded.timestamp − Payment Created.timestamp)` matched on `claim_id` | `Payment Created` (#567), `Claim Succeeded` (#585) | ⬜ blocked |
| Expiry Rate | §8.1 | `payments status "expired" with no Claim Succeeded ÷ Payment Created × 100` | `Payment Created` (#567), `Claim Succeeded` (#585), expiry-watch | ⬜ blocked |
| End-to-end conversion (§7.3) | §7.3 | `Claim Succeeded ÷ Page Viewed (homepage) × 100` | `Page Viewed` (#558), `Claim Succeeded` (#585) | ⬜ blocked |
| Claim Failure Rate | §8.2 | `Claim Failed ÷ Claim Submitted × 100` | `Claim Submitted`, `Claim Failed` (both implemented) | ⏳ unverified — query written, export check outstanding |
| Asset Distribution | §8.2 | `count(Payment Created) grouped by asset_type ÷ total Payment Created × 100` | `Payment Created` (implemented) | ⏳ unverified — query written, export check outstanding |

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

## Claim Failure Rate

**Formula (§8.2):** `(Claim Failed events) / (Claim Submitted events) × 100`,
broken down further by `error_type`.

**Events, verified against the implementation (not the spec prose):**

- `Claim Submitted` — emitter `analytics.claimSubmitted`
  (`frontend/lib/analytics.ts`), fired from
  `frontend/app/claim/[token]/claim-page-client.tsx:174` once per
  user-initiated submission, before the request is sent.
- `Claim Failed` — emitter `analytics.claimFailed`, fired from the same file
  at `:222` (`network_error`, safe-to-retry) and `:261` (`transaction_failed`,
  terminal rejection).

**Join key:** none — the spec formula counts both sides as raw event rows.
Both events do carry `claim_id`, so a per-claim variant is available, but the
§8.2 formula does not use it.

**Query shape (PostgreSQL, matching the dialect used above):**

```sql
SELECT
  count(*) FILTER (WHERE name = 'Claim Failed')    AS failures,
  count(*) FILTER (WHERE name = 'Claim Submitted') AS submissions,
  ROUND(
    (count(*) FILTER (WHERE name = 'Claim Failed'))::numeric
    / NULLIF(count(*) FILTER (WHERE name = 'Claim Submitted'), 0)
    * 100,
    2
  ) AS claim_failure_rate_percent
FROM events
WHERE name IN ('Claim Submitted', 'Claim Failed');
```

**`error_type` breakdown (spec: "Broken down further by `error_type`"):**

```sql
SELECT
  props->>'error_type' AS error_type,
  count(*) AS failures,
  ROUND(
    count(*)::numeric
    / NULLIF((SELECT count(*) FROM events WHERE name = 'Claim Failed'), 0)
    * 100,
    2
  ) AS share_of_failures_percent
FROM events
WHERE name = 'Claim Failed'
GROUP BY props->>'error_type'
ORDER BY failures DESC;
```

**Spec-vs-implementation drift found while writing this query — read this
before reporting a number:**

1. **The formula does not measure the prose above it.** §8.2 describes "the
   percentage of claim submissions that result in failure", but
   `Claim Failed` is emitted for only two of the five `SubmitClaimOutcome`
   kinds in `frontend/lib/claim-retry.ts`. `success` emits `Claim Succeeded`;
   `alreadyClaimed` (`claim-page-client.tsx:207`–`:217`) emits **no analytics
   event at all**; `ambiguous` (`:243`–`:255`) emits nothing either and hands
   off to a background poll. A submission that times out therefore sits in
   the denominator without being counted as a failure, so the metric is
   biased low and is blind to exactly the congestion case an operator would
   be looking for. Closing that gap is a tracker change (emit on the
   `ambiguous` and `alreadyClaimed` outcomes, or add an `outcome` property),
   not a query change — recorded here rather than papered over.
2. **The `error_type` breakdown can only ever have two populated buckets.**
   `CLAIM_FAILED_ERROR_TYPES` exports all five §5.3 values, but the only two
   production call sites use `network_error` and `transaction_failed`;
   `token_expired`, `already_claimed` and `unknown` are never emitted by a
   `Claim Failed` call site. Expired and already-claimed tokens surface as
   `Error Displayed` under the §6 taxonomy instead (`expired_token` /
   `already_claimed`, `claim-page-client.tsx:83`–`:98`), so a "why do claims
   fail" report has to union two different error taxonomies.
3. **`attempt_number` is not a retry counter.** `submitClaimWithRetry` retries
   up to three times internally (`claim-retry.ts:70`–`:106`) and emits nothing
   per retry, so `attempt_number` counts user re-submissions, not HTTP
   attempts. Do not chart it as retry depth.
4. **The rest of this table is stale about `Claim Succeeded`.**
   `analytics.claimSucceeded()` exists and is called from
   `claim-page-client.tsx:191` and `:317`, so the "blocked on `Claim
   Succeeded` (#585)" markers above look out of date for the *client-side*
   signal. §9.2 still marks `Claim Succeeded` "server-side preferred", so
   #585's blocker may be the authoritative server emission rather than the
   client one. Left unchanged here because #585's acceptance criteria are
   not visible from this repo — the maintainer should re-check before relying
   on those rows.
5. **Scope:** recipients who never reach the submission screen (expired link,
   malformed link) produce no `Claim Submitted` row at all, so this is a rate
   conditional on reaching submission, not on every claim-link open. Use
   `Claim Page Opened` as the funnel entry point for an end-to-end number.

**Readiness:** gate 1 is met (both events fire from production code); gate 2
is not (this query has never been run against an event export). Status stays
`⏳ unverified`.

## Asset Distribution

**Formula (§8.2):** for each asset,
`(Payment Created events with that asset_type) / (total Payment Created events) × 100`.

**Event and field, verified against the implementation:** `Payment Created`,
property `asset_type` — and `asset_type` holds the asset **code**, not a type.
It is populated from `state.assetCode` in
`frontend/components/send-form/steps/confirm-step.tsx:134`, constrained to
`SUPPORTED_ASSETS = ['XLM', 'USDC']` (`details-step.tsx:8`) and defaulting to
`'XLM'` (`components/send-form/index.tsx:29`). The spec's `{XLM, USDC, ...}`
therefore matches what is actually emitted: **no vocabulary drift.**

**Join key:** none — this is a single-event group-by, not a join.

**Query shape (PostgreSQL):**

```sql
WITH created AS (
  SELECT
    COALESCE(props->>'asset_type', '(missing)') AS asset_type,
    props->>'message_id'                     AS message_id
  FROM events
  WHERE name = 'Payment Created'
)
SELECT
  asset_type,
  count(DISTINCT message_id) AS distinct_payments,
  ROUND(
    count(DISTINCT message_id)::numeric
    / NULLIF(SUM(count(DISTINCT message_id)) OVER (), 0) * 100,
    2
  ) AS share_percent
FROM created
GROUP BY asset_type
ORDER BY distinct_payments DESC;
```

**Drift and caveats:**

1. **`asset_type` is omitted, not nulled, when unavailable.** Every emitter
   writes it conditionally — `...(assetType ? { asset_type: assetType } : {})`
   (e.g. `frontend/lib/analytics.ts:395`). In today's sender flow
   `assetCode` always has a value, so no `Payment Created` is emitted without
   it, but §9.2 marks `Payment Created` "server-side preferred" and a
   server-side emitter would not necessarily set it. The `COALESCE` to
   `'(missing)'` and the all-`Payment Created` denominator are both
   deliberate: adding `WHERE asset_type IS NOT NULL` would silently shrink
   the denominator and inflate every share, and a bare
   `GROUP BY props->>'asset_type'` would drop the missing rows so the shares
   quietly fail to sum to 100 %. **This is the most likely way to get this
   KPI wrong.**
2. **Count distinct `message_id`, not rows.** §9.4 deduplication is
   client-side, in-memory and per-tab, so it reduces but does not eliminate
   double counting — a retry arriving from another process, in another tab,
   or after a reload still lands twice. `message_id` was added to every
   payload for exactly this reason; the warehouse-level guarantee is
   `count(DISTINCT message_id)`.
3. **Count only — this KPI cannot be weighted by value.** `Payment Created`
   carries no `amount_usd_equiv`: `conditional.amountUsdEquiv()` exists in
   `frontend/lib/analytics.ts` but has no call site anywhere in the app. The
   sender form's amount also stays XLM-denominated (`amount: state.amountXlm`
   alongside `asset_code: …`, `confirm-step.tsx:90`–`:91`), so a per-asset
   *amount* analysis would be wrong even after `amount_usd_equiv` is wired
   up. That is a separate fix and out of scope for this KPI.
4. **Readiness:** gate 1 is met (`Payment Created` fires from production code
   at `confirm-step.tsx:132`, after `createEphemeralAccount` resolves); gate 2
   is not. Status stays `⏳ unverified`.

---

## Pipeline prerequisites (§9.4, §9.5)

Two spec requirements change how the numbers above must be read. Both are
implemented in `frontend/lib/analytics.ts` at the single `track()` dispatch
point, so no call site can bypass them:

- **§9.5 Do Not Track.** When the browser reports `DNT: 1`, every event is
  suppressed *before* any identifier is minted: no provider call, and no
  `localStorage`/`sessionStorage` write. For these queries the consequence is
  that event volume is a lower bound — rates look better than they are
  because opted-out visitors' silence is indistinguishable from success. The
  suppressed share is not measurable from the event stream alone; record the
  DNT suppression rate next to any reported KPI.
- **§9.4 Event deduplication.** Every payload now carries a `message_id` UUID,
  and `Payment Created` / `Claim Succeeded` — the only two events §9.4 names —
  are deduplicated on `claim_id` in a bounded store (200 keys, 1-hour TTL,
  least-recently-used eviction, in memory only). Because that store is
  per-tab and lost on reload, it reduces double counting rather than
  eliminating it, which is why the queries above use
  `count(DISTINCT message_id)`. It is deliberately **not** persisted to
  `localStorage`: `claim_id` identifies a payment, and a privacy-respecting
  layer should not create durable cross-session state.
- **Not covered — the `Payment Confirmed` double-click.** That event carries
  no `claim_id` (it fires before the ephemeral account exists), so there is
  nothing stable to key on, and a generic "same event twice within N ms" rule
  would silently swallow legitimate repeats such as two `Page Viewed` events
  in one tick. That guard belongs in the UI: `ConfirmStep` already disables
  its "Confirm & Send" button while `submitting`, and that — not the
  analytics layer — is the place where the double-click is prevented.

---

## Cross-reference

The §7.1 (§7.1/§7.2/§7.3) funnel stage→event→issue maps live in the funnel
trackers. This document is the KPI counterpart: formula → query → readiness
status. Re-check the readiness table whenever a per-event PR merges.

Where a formula and the emitted events disagree, the drift is recorded in the
KPI's own section rather than resolved by adjusting the query — see the
numbered drift notes under *Claim Failure Rate*. Reporting a number that
silently papers over that gap is what the
`analytics-spec-vs-implementation-unverified` postmortem is about.