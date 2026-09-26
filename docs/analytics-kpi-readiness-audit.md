# Analytics KPI Readiness Audit — §8.2 Engagement Metrics

> A readiness audit of the six `docs/analytics-spec.md` §8.2 engagement KPIs
> against the code as it exists, focused on the two assigned in #628
> (*Wallet Address Validation Failure Rate*) and #624 (*Share Method
> Distribution*). Closes #628 and #624.
>
> This is deliberately **not** a second copy of `docs/analytics-kpi-definitions.md`.
> That document answers "what query computes this KPI". This one answers "can
> this KPI be computed at all", and for #628 the answer is *no, and the reason is
> a missing event, not a missing query*.
>
> Companions: `docs/analytics-kpi-definitions.md`,
> `docs/analytics-funnel-tracker.md`, `docs/analytics-spec.md`,
> `docs/analytics-server-vs-client-decision.md`.

## Status of this document

- Every "implemented" / "absent" claim was read from a call site at commit
  `faeb0b6`, not inferred from an event name.
- **No query in this document has been executed.** There is no event export
  available in this environment, so no number here is verified. The queries are
  written to be run against a real export; their output shape is a prediction,
  not an observation.
- **Nothing was built, type-checked, linted, or tested** for this document.

---

## 1. The honesty gate

`docs/analytics-kpi-definitions.md` blocks reporting until **both** hold:

1. every constituent event fires from production app code, and
2. the query has been run against a real event export and its shape verified.

That gate cites the `analytics-spec-vs-implementation-unverified` postmortem:
*"events exist, a query implements the formula, they agree."*

**Every KPI below fails the gate, including the two with working queries.**
"Composable" in the verdict column means the numerator and denominator events
exist and carry the right payload keys — it is a necessary condition, never a
sufficient one. No KPI in this table may be reported until its row is re-checked
against a live export.

---

## 2. Readiness table — all six §8.2 engagement KPIs

| KPI | Spec formula | Numerator | Denominator | Verdict |
|-----|--------------|-----------|-------------|---------|
| **Wallet Address Validation Failure Rate** *(#628)* | `Wallet Address Validation Failed ÷ Wallet Address Screen Viewed × 100` (§8.2, lines 843–847) | `Wallet Address Validation Failed` — **implemented**, 1 call site `claim-status-card.tsx:188` | `Wallet Address Screen Viewed` (§5.2 line 437) — **absent, zero references in `frontend/`** | ⛔ **Not computable.** Denominator event does not exist. See §3. |
| **Share Method Distribution** *(#624)* | `% per share_method = Claim Link Shared ÷ total sharing actions × 100` (§8.2 line 786) | `Claim Link Shared` — **implemented**, 1 call site `confirm-step.tsx:180` | Same event (the distribution is a self-breakdown) — **implemented** | ⚠️ **Composable, degenerate.** Query works; the only emitted value is `whatsapp`. See §4. |
| Recipient Entry Channel Distribution *(context)* | `% per entry_channel = Claim Page Opened ÷ total Claim Page Opened × 100` (§8.2 line 801) | `Claim Page Opened` — **implemented**, `claim-page-client.tsx:64` | Same event — **implemented** | ⚠️ Composable, gated. `entry_channel` is a client-side guess from URL params/referrer (`claimEntryChannel()`, `claim-page-client.tsx:25`); the `direct`/`unknown` split is heuristic, not measured. |
| Asset Distribution *(context)* | `% per asset_type = Payment Created ÷ total Payment Created × 100` (§8.2 line 816) | `Payment Created` — **implemented**, `confirm-step.tsx:132` | Same event — **implemented** | ⚠️ Composable, gated. `asset_type` is spread conditionally (`analytics.ts:395`), so a row with no `asset_type` is possible and must be reported as its own bucket, not dropped. |
| Claim Failure Rate *(context)* | `Claim Failed ÷ Claim Submitted × 100` (§8.2 line 830) | `Claim Failed` — **implemented but incomplete**, 2 call sites `claim-page-client.tsx:222`, `:261` | `Claim Submitted` — **implemented**, `claim-page-client.tsx:174` | ⚠️ Composable, **numerator under-counts.** See §5.1. |
| Viral K-Factor *(context)* | `Sender Signup CTA Clicked ÷ Claim Succeeded` (§8.2 line 858) | `Sender Signup CTA Clicked` — **implemented**, `claim-status-card.tsx:449` | `Claim Succeeded` — **implemented**, `claim-page-client.tsx:191`, `:317` | ⚠️ Composable, gated. The spec's own note (line 862) says this measures intent only, not a real K-factor. |

Two of the six cannot be computed at all. That is the headline: §8.2 is the
section a dashboard is most likely to be built from, and a third of it has no
valid denominator.

---

## 3. #628 — Wallet Address Validation Failure Rate

### 3.1 Blocking finding

**`Wallet Address Screen Viewed` is specified and not implemented. There is no
denominator, so the ratio cannot be computed, and the numerator alone would
produce a wrong number.**

The event is defined in §5.2 (spec line 437) and used as the KPI denominator at
spec line 845. It has zero references in `frontend/`.

> A correction to the issue as filed, because it changes the remediation: the
> issue describes this KPI as "Wallet Address Validation Failed as a share of
> **Wallet Address Entered**". The spec's own formula (§8.2, line 845) uses
> **`Wallet Address Screen Viewed`**. `Wallet Address Entered` is a *different*
> §5.2 event (line 449), and it is the one that appears in the §7.2 funnel. Both
> are unimplemented, so the blocking finding survives either reading — but the
> spec needs an explicit decision on which denominator it means before the KPI
> can be closed. See §3.4.

### 3.2 Evidence that the denominator has zero references

Verified at commit `faeb0b6`:

```
git grep -n --fixed-strings "Wallet Address Screen Viewed" -- frontend   → 0 matches
git grep -n --fixed-strings "Wallet Address Entered"      -- frontend   → 0 matches
git grep -n --fixed-strings "walletAddressScreenViewed"   -- frontend   → 0 matches
git grep -n --fixed-strings "walletAddressEntered"        -- frontend   → 0 matches
```

Both literal event names and both camelCase method names are absent — the events
are not emitted under a different spelling either.

Repo-wide, the two names appear only in prose:

| Event | Repo-wide matches | All of them |
|-------|-------------------|-------------|
| `Wallet Address Screen Viewed` | 2 | `docs/analytics-spec.md:437` (definition), `:845` (the KPI denominator) |
| `Wallet Address Entered` | 8 | `docs/analytics-spec.md:72`, `:449`, `:665`, `:677`; `docs/analytics-funnel-tracker.md:41`, `:48`, `:53`; `bridgelet-product-audit/runbooks/review-analytics-spec-before-new-event.md:40` |

The numerator, by contrast, is present in `frontend/`:

```
git grep -n --fixed-strings "Wallet Address Validation Failed" -- frontend
  → frontend/lib/analytics.ts:25        (ClaimEvent union)
  → frontend/lib/analytics.ts:486       (track() call)
  → frontend/lib/analytics.test.ts:500
  → frontend/lib/analytics.test.ts:509
```

Corroboration that this was already known: `docs/analytics-funnel-tracker.md:48`
marks funnel stage 4 (`Wallet Address Entered`) as "⬜ blocked (needs tracking
issue)" and line 52 blocks the whole §7.2 funnel on it. The KPI blocker and the
funnel blocker are the same missing event.

### 3.3 The numerator is also not measuring what §5.2 describes

Even once a denominator exists, the current numerator is not the spec's event.
§5.2 line 465 says `Wallet Address Validation Failed` fires "when the recipient
**submits** an address that fails client-side validation". The implementation is
`claim-status-card.tsx:182-195`:

```tsx
useEffect(() => {
  const invalid = destinationAddress.length > 0 && !isValidAddress;
  if (invalid && !wasInvalid.current) { /* … fire … */ }
  wasInvalid.current = invalid;
}, [destinationAddress, isValidAddress, claimId, attemptNumber]);
```

It fires on the **transition into an invalid value while typing**, not on
submit. Consequences for the ratio:

- One recipient who backspaces through a half-typed address produces several
  events. `attempt_number` increments per invalid transition, so the numerator is
  a count of *typing episodes*, not submissions.
- Divided by a screen-impression denominator, the result is not a rate of
  anything: it can exceed 100% for a single recipient, and it scales with typing
  speed rather than with confusion.
- The submit-time failure path is a *different* event today:
  `Error Displayed` with `error_type: 'invalid_wallet_address'`
  (`claim-status-card.tsx:200`), which fires from the `!isValidAddress`
  early-return in `handleClaim()`.

One more detail in the numerator: `deriveValidationError()` (`claim-status-card.tsx:131`)
maps prefix → length → `invalid_checksum`, but the only validator present is
`/^G[A-Z2-7]{55}$/` (line 163). There is no checksum computation anywhere, so
`invalid_checksum` really means "a 56-character `G…` string containing a
character outside the base32 alphabet". The §5.2 value is reachable but
misnamed, which matters because §8.2 says the rate exists to diagnose recipient
confusion about address format.

### 3.4 Remediation options

**Option 1 — implement the event, and move the numerator onto submit. Recommended.**

§5.2 line 449 already defines `Wallet Address Entered` with exactly the semantics
the issue assumes: *"Fired when the recipient submits a wallet address and it
passes client-side validation (length, prefix check)"*, with
`used_previous_address`, and an explicit privacy note that the address itself must
not appear in the payload. The call site is unambiguous:
`AvailablePanel.handleClaim()` in `claim-status-card.tsx:197` has an
`if (!isValidAddress)` early return at line 198; the valid branch beside it is
where `Wallet Address Entered` belongs. Emitting it there, and moving
`walletAddressValidationFailed()` from the `useEffect` to the same handler,
produces numerator and denominator from the same interaction — so the rate is
bounded by 100% and means "share of submissions that failed client-side
validation", which is what §8.2 line 841 describes.

Privacy note for whoever implements it: the §5.2 payload is
`journey` / `claim_id` / `used_previous_address` only. The address must never
enter the payload, and `used_previous_address` is currently unobtainable anyway —
the product has no previously-suggested-address feature (nothing in the repo
persists a recipient address; the only `localStorage` keys are `bridgelet_wallet`,
`bridgelet-theme`, and `bridgelet_anonymous_id`). Either ship it as `false` with
a comment, or raise a separate issue for the suggestion feature.

**Option 2 — redefine the KPI against an event that exists today. Not recommended.**

`Error Displayed` where `error_type = 'invalid_wallet_address'` does fire on
submit, so `count(errorDisplayed/invalid_wallet_address) ÷ count(Claim Submitted)`
is computable immediately. It is a different quantity: the denominator spans the
whole claim page rather than the address screen, and it mixes in the
`§5.2`-adjacent error surfaces. Acceptable as an interim operational signal if it
is labelled as *not* the spec's KPI — it should not silently become the KPI.

**Option 3 — derive a denominator from `claim_id` counts. Rejected.**

There is no denominator event to pair with, so this reduces to Option 1 with more
machinery. It would also invent a denominator the spec does not sanction.

**Recommendation: Option 1**, plus a one-line spec decision on whether the
denominator is `Wallet Address Screen Viewed` (current spec text) or
`Wallet Address Entered` (the issue's reading, and the stronger denominator —
attempts that *passed* validation, which makes the rate a share of real
submissions). `docs/analytics-spec.md` is not edited here.

### 3.5 Explicitly: no query is provided for the current state

A query of the form `count('Wallet Address Validation Failed') ÷ <anything
available>` would compile and return a number. That number would be wrong — it is
a typing-episode rate with no denominator — and a dashboard would display it as a
failure percentage. No such query is written in this document, and none should be
written until a denominator event exists.

---

## 4. #624 — Share Method Distribution

### 4.1 What the implementation actually provides

Read from the code, not the spec prose:

| Thing | Real value | Where |
|-------|-----------|-------|
| Event name | `Claim Link Shared` | `analytics.ts:13` (union), `analytics.ts:412` (`track`) |
| Property key | `share_method` | `analytics.ts:415` |
| Allowed values | `sms`, `email`, `whatsapp`, `qr_code` | `analytics.ts:188` (`export type ShareMethod`) |
| Only value ever emitted | `whatsapp` | `confirm-step.tsx:180` — `analytics.claimLinkShared({ claimId: createdAccountId, shareMethod: 'whatsapp' })`, one call site, on the WhatsApp anchor's `onClick` |
| Related real event | `Claim Link Copied` with `copy_location` (`success_screen` \| `dashboard_detail`) | `analytics.ts:399`; only `success_screen` is emitted, `confirm-step.tsx:172` |

### 4.2 Two mismatches with the spec's formula

1. **`copy_only` does not exist in the implementation.** §8.2 line 787 enumerates
   `{sms, email, whatsapp, qr_code, copy_only}`. `copy_only` appears nowhere in
   `frontend/` — it is not a member of `ShareMethod`, and `analytics.ts` never
   emits it. The real counterpart is the separate `Claim Link Copied` event, so a
   "copied but never shared" bucket cannot be produced by filtering
   `Claim Link Shared`; it requires combining two events.
2. **The sender-side WhatsApp surface is not the only share surface.**
   `SharePrompt` renders a WhatsApp deep link on the *recipient* claim page
   (`app/claim/[token]/page.tsx:35` → `components/share-prompt.tsx:24`) and
   carries no analytics call at all. The NFC "write to tag" affordance
   (`useNfc()` in `confirm-step.tsx:72`, `NfcShareButton` in `share-prompt.tsx:52`)
   also emits nothing, and there is no QR emitter anywhere despite `qr_code` being
   a declared value. So even the `whatsapp` bucket is under-counted.

### 4.3 Query

Run against a real export; **not executed here.**

```sql
-- Share Method Distribution, action basis (§8.2 line 786).
SELECT
  e.props->>'share_method' AS share_method,
  count(*)                 AS share_actions,
  ROUND(
    (count(*)::numeric / NULLIF(sum(count(*)) OVER (), 0)) * 100, 2
  )                        AS pct_of_share_actions
FROM events e
WHERE e.name = 'Claim Link Shared'
GROUP BY e.props->>'share_method'
ORDER BY share_actions DESC;
```

The per-claim basis, for the "how many claims reached this channel" reading:

```sql
WITH shares AS (
  SELECT DISTINCT
    e.props->>'claim_id'    AS claim_id,
    e.props->>'share_method' AS share_method
  FROM events e
  WHERE e.name = 'Claim Link Shared'
)
SELECT
  share_method,
  count(*) AS claims_sharing_via,
  ROUND(
    (count(*)::numeric / NULLIF((SELECT count(DISTINCT claim_id) FROM shares), 0)) * 100, 2
  ) AS pct_of_claims_shared
FROM shares
GROUP BY share_method
ORDER BY claims_sharing_via DESC;
```

### 4.4 Join and filter semantics, stated precisely

- **No join.** The KPI is a self-breakdown of one event; the only relationship is
  the `share_method` property on the event itself. There is no cross-event join
  and no `claim_id` join required for the action basis.
- **Filter:** `name = 'Claim Link Shared'` and nothing else. Do **not** add a
  `journey` filter, a `device_type` filter, or a `session_id` filter — any of
  those silently changes the denominator. If a segment is wanted, apply it to
  numerator and denominator together and label the result as a segment.
- **Denominator:** `sum(count(*)) OVER ()` — every `Claim Link Shared` event in
  the window, so the action-basis rows sum to exactly 100%. `NULLIF(..., 0)`
  guards the empty-export case, which should surface as `NULL` (unknown), never
  as 0%.
- **Grouping is over observed values, not the spec's enumeration.** A
  `share_method` that has never been emitted produces no row. Therefore the
  spec's value set is a **completeness check to run against the result**, not a
  `WHERE`/`IN` filter: if the returned value set is not
  `{sms, email, whatsapp, qr_code}` (plus `copy_only` if §4.5 is adopted), the
  export is missing channels and the distribution is not reportable. Filtering
  `IN ('sms','email','whatsapp','qr_code','copy_only')` would instead produce
  five rows, four of them empty, and hide the very gap worth reporting.
- **The two bases answer different questions and must not be mixed.** The action
  basis counts button presses, so one sender clicking three times contributes
  three. The per-claim basis deduplicates by `claim_id`, so a claim shared by
  both WhatsApp and SMS appears in both buckets and the rows do **not** sum to
  100%. §8.2's phrase "total sharing actions per claim" is ambiguous between
  them; use the action basis for the KPI as written, and report the per-claim
  basis beside it as a sanity check, as counts rather than percentages.
- **Expected shape on today's code:** exactly one row, `whatsapp` at 100%. That
  is a real result, not a bug in the query — it is what a single hard-coded
  emitter produces. Report it as "one channel instrumented", not as "senders
  prefer WhatsApp".

### 4.5 If a `copy_only` bucket is wanted

It has to be a union of two events, and it changes the KPI definition, so it
needs a spec PR first (per
`bridgelet-product-audit/runbooks/review-analytics-spec-before-new-event.md`,
Step 4):

```sql
WITH actions AS (
  SELECT e.props->>'share_method' AS method, e.props->>'claim_id' AS claim_id
  FROM events e
  WHERE e.name = 'Claim Link Shared'
  UNION ALL
  SELECT 'copy_only', e.props->>'claim_id'
  FROM events e
  WHERE e.name = 'Claim Link Copied'
)
SELECT method, count(*) AS share_actions
FROM actions
GROUP BY method
ORDER BY share_actions DESC;
```

Note this double-counts a sender who both copies and shares, and it is
action-based, so the rows still sum to 100%. Documented here as a shape, not
recommended as the default.

### 4.6 Readiness

Composable today, gated like everything else: the query has not been run, and
the instrumentation is one channel wide. Two pieces of work stand between this
KPI and being meaningful — instrument the remaining `ShareMethod` values (or
narrow the type to `whatsapp` and amend the spec), and decide whether
`SharePrompt`'s recipient-side share link counts as a sender share action.

---

## 5. Context-row findings

### 5.1 Claim Failure Rate — the numerator under-counts

`Claim Failed` is in the §5.3 taxonomy with five `error_type` values
(`analytics.ts:256-270`), but only three are reachable from the two call sites:

| §5.3 `error_type` | Fires? | Evidence |
|---|---|---|
| `network_error` | ✅ | `claim-page-client.tsx:222` (`safeToRetry` branch) |
| `transaction_failed` | ✅ | `claim-page-client.tsx:261` (`terminal` branch) |
| `token_expired` | ❌ | no call site passes it |
| `already_claimed` | ❌ | declared at `analytics.ts:259`/`:267`, never passed. The `alreadyClaimed` outcome at `claim-page-client.tsx:207-217` returns silently. |
| `unknown` | ❌ | no call site passes it |

Two further paths reach a terminal state without firing `Claim Failed` at all:
the `ambiguous` outcome (line 243) hands off to the background poll, whose
`FAILED`/`EXPIRED` branch (lines 332-341) updates state and returns. So a claim
that ultimately fails after a timeout contributes a `Claim Submitted` to the
denominator and nothing to the numerator.

A third, subtler problem: the `safeToRetry` path means "the request never reached
the server", so that event is **not** an on-chain failure, yet it is counted as
one. `analytics-events-vs-onchain-outcomes.md` classifies `Claim Failed` as
on-chain-confirmed-negative; the implementation puts a pre-submission network
blip in the same bucket. §8.2 says the rate is broken down "by `error_type` to
diagnose the leading causes", so the breakdown will show `network_error` as a
leading cause of sweep failure when it is really a leading cause of delivery
failure.

Net: the ratio is computable and will understate the failure rate, in a way that
is invisible without a per-`error_type` read.

### 5.2 `Claim Succeeded.entry_channel` is always `"unknown"`

§5.3 line 515 requires `entry_channel` to be the "Same value recorded at
`Claim Page Opened`". Neither `claimSucceeded` call site
(`claim-page-client.tsx:191`, `:317`) passes `entryChannel`, so the default
`entryChannel = 'unknown'` (`analytics.ts:579`) applies every time. The real
channel is known at `claim-page-client.tsx:64` and is discarded. Any cross-check
of *Recipient Entry Channel Distribution* against conversion per channel has to
read `entry_channel` from `Claim Page Opened`, not from `Claim Succeeded`.

Related: `time_to_claim_hours` is never populated by any call site either, so
Time to Claim must be computed by joining `Payment Created` to `Claim Succeeded`
on `claim_id` — which is what `docs/analytics-kpi-definitions.md` already
specifies. No change needed, but the payload property is currently dead weight
and should not be mistaken for a working field.

### 5.3 Sender-side funnel stages

`Send Form Started`, `Wallet Connected`, and `Payment Creation Failed` have zero
references in `frontend/`. The first two are pure client events; the third is
server-side by nature and is discussed in
`docs/analytics-server-vs-client-decision.md` §3.3, where its absence is shown to
make the "signed → settled" step uncomputable.

---

## 6. Summary of blockers

| # | Blocker | Blocks | Where to fix |
|---|---------|--------|--------------|
| 1 | `Wallet Address Screen Viewed` **and** `Wallet Address Entered` both unimplemented | Wallet Address Validation Failure Rate; §7.2 funnel stage 4 | `frontend/components/claim-status-card.tsx` |
| 2 | `Wallet Address Validation Failed` fires on typing, not on submit | the numerator's meaning | same file, `AvailablePanel` |
| 3 | Only `whatsapp` is ever emitted as `share_method`; `copy_only` does not exist | Share Method Distribution is 100% one channel | `confirm-step.tsx:180`, `analytics.ts:188` |
| 4 | `Claim Failed` misses `already_claimed`, `token_expired`, `unknown`, and both background-poll failure paths | Claim Failure Rate understates failures | `claim-page-client.tsx` |
| 5 | `Claim Succeeded.entry_channel` always `"unknown"` | per-channel conversion cross-checks | `claim-page-client.tsx:191`, `:317` |
| 6 | `Payment Creation Failed` unimplemented | sender funnel step 6 → on-chain success | server-side; see the decision doc |

**No KPI in §8.2 is reportable today.** Two of the six are not computable at all.

---

## 7. Cross-references

- `docs/analytics-kpi-definitions.md` — companion query document for the §8.1
  core KPIs, and the source of the readiness gate applied above. Its rows remain
  accurate for §8.1; this document covers §8.2, which it does not.
- `docs/analytics-funnel-tracker.md` — per-event blocking status for the §7.1
  and §7.2 funnels. Its stage-4 row already records the `Wallet Address Entered`
  blocker.
- `docs/analytics-spec.md` — §5.2 event definitions, §8.2 formulas, §9.2
  emission guidance. Not edited by this work.
- `docs/analytics-server-vs-client-decision.md` — which events should move
  server-side, and what client context must travel with them.
- `bridgelet-product-audit/postmortems/analytics-spec-vs-implementation-unverified.md`
  — the postmortem behind the readiness gate.
- `bridgelet-product-audit/runbooks/review-analytics-spec-before-new-event.md` —
  the pre-flight a new or renamed event must pass.
