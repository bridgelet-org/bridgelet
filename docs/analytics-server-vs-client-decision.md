# Analytics: Client-Side vs. Server-Side Emission Decision

> Resolves the guidance in `docs/analytics-spec.md` §9.2 against the code as it
> actually exists, and records the `Payment Confirmed` / `Payment Created`
> resolution. Closes #632.
>
> Companions: `docs/analytics-kpi-readiness-audit.md` (#628, #624),
> `docs/analytics-funnel-tracker.md`, and
> `bridgelet-product-audit/integration-notes/analytics-events-vs-onchain-outcomes.md`.

## Status of this document

This is a **decision record, not an implementation**. No emitter was moved, no
event was renamed, no spec was edited. Every "current emitter" claim below was
read from the call site at commit `faeb0b6`, not inferred from the event name —
several events in this table would be misclassified by their name alone.

**Nothing here has been built, type-checked, linted, or executed.** No query was
run against an event export. The maintainer owns all of that.

---

## 1. What §9.2 asks for

`docs/analytics-spec.md` §9.2 (lines 893–903) recommends:

| Event | Recommended source | Reason given |
|-------|--------------------|--------------|
| `Page Viewed`, UI interactions | Client-side | UI state is only known client-side |
| `Payment Created` | **Server-side preferred** | Authoritative confirmation from blockchain |
| `Claim Verified` | **Server-side preferred** | Authoritative token validation |
| `Claim Succeeded` | **Server-side preferred** | Authoritative sweep confirmation |
| `Claim Failed` | **Server-side preferred** | Authoritative error source |

Plus one sentence that carries most of the engineering weight:

> Where server-side events are used, they should be enriched with client context
> (session ID, device type) passed from the frontend.

§9.2 is explicitly labelled implementation guidance ("This section is guidance
for the engineering team… It does not constitute part of the spec definition",
line 883), so deviating from it is legitimate — but deviating *silently* is what
produced the naming trap, so the deviation and its cost are recorded below.

---

## 2. What the code does today (verified call sites)

| Event | Current emitter (verified) | §9.2 says | Verdict |
|-------|----------------------------|-----------|---------|
| `Page Viewed` | client — `components/page-view-tracker.tsx:37` (`useEffect`), rendered only on the homepage (`app/page.tsx:15`, `page="homepage"`) | client | **Keep client.** Correct as-is. See the coverage note below. |
| `Send Form Viewed` | client — `components/send-form/index.tsx:57` | client | Keep client. |
| `Send Form Completed` | client — `components/send-form/index.tsx:70` | client | Keep client. |
| `Payment Confirmation Viewed` | client — `components/send-form/steps/confirm-step.tsx:80` | client | Keep client. |
| `Payment Confirmed` | client — `confirm-step.tsx:154`, inside `handleConfirm()` before any request is sent | client (as "UI interaction") | **Keep client, rename** — see §3. |
| `Claim Link Copied` | client — `confirm-step.tsx:172` | client | Keep client. |
| `Claim Link Shared` | client — `confirm-step.tsx:180` | client | Keep client. |
| `Payment Details Viewed` | client — `confirm-step.tsx:138` | client | Keep client. |
| `Claim Page Opened` | client — `app/claim/[token]/claim-page-client.tsx:64` | client | Keep client. |
| `Claim Confirmation Viewed` | client — `claim-page-client.tsx:80` | client | Keep client. |
| `Claim CTA Clicked` | client — `claim-page-client.tsx:165` | client | Keep client. |
| `Claim Submitted` | client — `claim-page-client.tsx:174` | client (intent) | Keep client. |
| `Claim Success Viewed` | client — `components/claim-status-card.tsx:390` | client | Keep client. |
| `Sender Signup CTA Clicked` | client — `claim-status-card.tsx:449` | client | Keep client. |
| `Explorer Link Clicked` | client — `claim-status-card.tsx:435` | client | Keep client. |
| `Retry Clicked` | client — `claim-status-card.tsx:213` | client | Keep client. |
| `Wallet Address Validation Failed` | client — `claim-status-card.tsx:188` (inside a `useEffect` on the address field) | client | Keep client, but see the #628 finding — it does not fire on submit. |
| **`Payment Created`** | **client** — `confirm-step.tsx:132`, immediately after `createEphemeralAccount()` resolves | **server preferred** | **Move server-side.** See §3. |
| **`Claim Verified`** | **client** — `claim-page-client.tsx:73`, after `loadClaimView()` resolves with `PENDING_CLAIM` | **server preferred** | **Move server-side**; keep a client UX-latency proxy under a distinct name if the UX number is still wanted. |
| **`Claim Succeeded`** | **client** — `claim-page-client.tsx:191` (direct submit) and `:317` (background poll) | **server preferred** | **Move server-side.** See §4 for the client-context cost. |
| **`Claim Failed`** | **client** — `claim-page-client.tsx:222` (`safeToRetry`) and `:261` (`terminal`) | **server preferred** | **Move server-side**, and close the coverage gap in §3.3. |
| `Payment Creation Failed` | **absent** — zero references in `frontend/` | not in the §9.2 table | **Implement server-side.** Without it the sender funnel has no failure stage. |
| `Wallet Connected` / `Wallet Connection Failed` | **absent** — zero references each in `frontend/` | client | Client by nature; unimplemented. §8.3 derives a rate from them. |
| `Send Form Started` | **absent** — zero references in `frontend/` | client | Client by nature; unimplemented (funnel stage 2). |

Three of the four §9.2 "server-side preferred" events are emitted **only** by the
client today, so the §9.2 table describes an intent the codebase has not
adopted, not a drift that has crept in. Nothing has regressed; the migration was
never done.

**Coverage caveat on `Page Viewed`:** the tracker is mounted only on the homepage
(`app/page.tsx:15`), and `analytics.pageViewed()` hardcodes
`journey: 'sender'` (`analytics.ts:442`). The recipient claim page fires
`Claim Page Opened` but no `Page Viewed`. That is consistent with §7.3, which
uses the *homepage* `Page Viewed` as its end-to-end denominator, but it means
`journey` on this event describes the funnel it belongs to rather than whose
screen was viewed. Worth knowing before anyone segments `Page Viewed` by
`journey`.

---

## 3. The `Payment Confirmed` / `Payment Created` trap

### 3.1 What the spec already gets right

§4.3 is unambiguous. `Payment Confirmed` (line 245): *"Fired when the sender
clicks 'Confirm & Pay' and signs the transaction. This indicates user intent; it
fires **before** blockchain confirmation."* `Payment Created` (line 258): *"Fired
when the blockchain confirms the funding transaction and a claim ID is returned.
This is the definitive 'payment exists' event."* §7.1 then makes the pair
load-bearing: stage 5 measures "% who sign the transaction", stage 6 measures
"% confirmed → on-chain success".

`analytics-events-vs-onchain-outcomes.md` calls `Payment Confirmed` "the one to
watch" and concludes that the spec's model is sound and "the risk is entirely in
how the event name reads out of context".

### 3.2 What the code does, and the part the integration note does not cover

The code matches the spec's *ordering*: `handleConfirm()` (`confirm-step.tsx:152`)
stamps `confirmedAt` and fires `Payment Confirmed`, then `executeCreateAccount(1)`
runs; on success `Payment Created` fires at line 132. The hazard is different
from, and sharper than, the one the note describes.

**The client cannot observe settlement at all.** `Payment Created` fires when the
`POST` to the account-creation endpoint *resolves without throwing*. That is an
HTTP round-trip result, not a chain confirmation. Nothing in the browser waits
for Stellar to finalise the funding transaction, so the event named "the
definitive 'payment exists' event" is really "the API accepted the request".

The same applies to the two sibling events in the §9.2 table:

- `Claim Verified` fires after `loadClaimView()` returns `PENDING_CLAIM` — the
  client is reporting the backend's verdict, not validating a token.
- `Claim Succeeded` fires when a poll returns `CLAIMED` / `PARTIAL_SWEEP` — again
  a backend-reported status, not a chain read.

This is not necessarily *wrong*: a backend that only reports `CLAIMED` after its
own sweep confirms is a legitimate authority, and this repo's concern stops at
the HTTP boundary (`claim-token-and-claim-url.md` line 39). But the emission point
is the client, which means it is lost whenever the tab closes mid-flight, is
blocked by an ad blocker, or the recipient never finishes the page that fires it.
An authoritative conversion event that a user can suppress by closing a tab is
not authoritative.

### 3.3 The gap that makes the trap live rather than theoretical

`Payment Creation Failed` (§4.3, line 270) has **zero references in `frontend/`**.
The `catch` block at `confirm-step.tsx:139` records the error into component state
and stops. So a sender who signs and then fails produces `Payment Confirmed` with
no successor event at all.

That collapses a three-way distinction into a two-way one. A dashboard cannot
separate:

1. signed, settled on-chain → `Payment Confirmed` + `Payment Created`
2. signed, failed on-chain → `Payment Confirmed`, silence
3. signed, abandoned (closed the tab) → `Payment Confirmed`, silence

Cases 2 and 3 are indistinguishable, so "% confirmed → on-chain success" (§7.1
stage 6) cannot be computed even in principle, and computing it naively would
report every abandonment as a chain failure. The same shape already exists on the
recipient side, in a milder form: `Claim Failed` never fires with
`error_type: 'already_claimed'` even though that value is in the §5.3 taxonomy
and in `CLAIM_FAILED_ERROR_TYPES` (`analytics.ts:259`, `:267`), and the
background-poll failure branch at `claim-page-client.tsx:332-341` sets
`FAILED`/`EXPIRED` state without firing `Claim Failed` either.

### 3.4 Recommendation

**Recommended: server owns settlement, client keeps intent under a name that
cannot be misread.**

1. **`Payment Created` and `Payment Creation Failed` become server-emitted**,
   emitted where the funding transaction actually settles. The server is the only
   place that can say "the ledger agreed". This is §9.2's recommendation and the
   integration note's model, applied.
2. **The client intent event is renamed `Payment Confirmed` → `Payment Signed`.**
   This is the fix the `analytics-spec-vs-implementation-unverified` postmortem
   already recommends (line 125: *"rename the event to `Payment Signed` (matching
   its actual semantics)"*). It is the smallest change that makes the funnel
   unambiguous to anyone reading a dashboard without the spec in hand. The
   frontend already computes exactly the right timestamp for it
   (`confirmedAt.current`, `confirm-step.tsx:153`), so no signal is lost.
3. **The new name is a §4.3 spec change**, and the pre-flight runbook
   (`runbooks/review-analytics-spec-before-new-event.md`, Step 4) requires the
   spec to be updated *before* the code. So this is a two-PR change, spec first.
   That ordering is a feature here: it forces the naming question to be settled
   deliberately rather than by a dashboard author.
4. **Do not add a second client-side "submitted" event alongside
   `Payment Confirmed`.** Two client events for one click is the ambiguity the
   rename removes. A rename achieves the same separation with one event instead of
   two.

**Trade-off, named explicitly:** the client-side latency signal disappears. Today
`confirmation_time_ms` is computed in the browser as
`Date.now() - confirmedAt.current` (`confirm-step.tsx:136`) and §8.3 reads it as
"Median payment confirmation time… Monitor Stellar network performance". That
number is an HTTP round-trip, so it does not measure what §8.3 claims and never
did. Moving the event server-side forces the property to be measured where the
chain is actually observed. If the UX number is still wanted, keep it as a
separate, honestly-named client property on `Payment Signed` (for example
`submit_to_response_ms`) rather than as `confirmation_time_ms` on `Payment
Created`. Nothing is lost by the move; the mislabelled version is what should go.

**Rejected alternative:** dual-emit `Payment Created` from both sides. It
guarantees duplicate conversion events for every successful payment, and §9.4
already requires `Payment Created` to be idempotent on `claim_id` with
deduplication at the pipeline. Asking the pipeline to dedupe a duplication we chose
to create is avoidable work.

---

## 4. Client context that has to travel with server-side events

§9.2 says server-side events "should be enriched with client context (session ID,
device type) passed from the frontend". Concretely, if the four events above move
server-side, these §3.1 base fields must be attached to the **API request** that
causes the event, and echoed by the server onto the emitted event:

| Field | Source in this repo | Required? |
|-------|--------------------|-----------|
| `session_id` | `sessionStorage` via `getSessionId()` (`analytics.ts:123`); the 30-minute inactivity window in `lib/analytics-session.ts` is **not yet wired in** | Yes — §9.2 names it. Without it, server events cannot be attributed to a visit. |
| `device_type` | `detectDeviceType()` (`analytics.ts:51`), `mobile`/`tablet`/`desktop` | Yes — §9.2 names it. |
| `anonymous_id` | `localStorage` via `getAnonymousId()` (`analytics.ts:102`) | Strongly recommended — it is the only identifier that stitches a server event to a sender's earlier client events across sessions. Without it, the sender funnel breaks at the first server-side step. |
| `claim_id` | Account id on the sender, route token on the recipient | Required as the join key, and see the privacy note below. |
| `app_version` | `appVersion()` (`analytics.ts:40`), from `NEXT_PUBLIC_APP_VERSION` | Recommended — needed to attribute server events to a release. |
| `referrer`, `platform` | `buildBasePayload()` (`analytics.ts:65`) | Optional. `referrer` is `null` on most direct claim-link opens, so it adds little here. |
| `user_agent` | `buildBasePayload()` (`analytics.ts:69`) | **Recommend not forwarding.** `device_type` is the field dashboards actually use; forwarding the raw UA string to a server-side collector widens the fingerprinting surface for no analytical gain. If a spec change (§3.1) is in scope, drop `user_agent` from server-emitted events rather than mirroring it. |

### 4.1 Where the context has to be attached

This is not a frontend-only change, and pretending otherwise would be the easy
mistake:

- `Payment Created` / `Payment Creation Failed` are caused by the
  `createEphemeralAccount()` call in `lib/bridgelet.ts` — the context would ride
  on that request, so `bridgelet-sdk` has to read it and re-emit.
- `Claim Verified` is caused by `loadClaimView()` in `lib/claim-view.ts`.
- `Claim Succeeded` / `Claim Failed` are caused by `submitClaimWithRetry()` and
  `pollClaimStatus()` in `lib/claim-retry.ts`.

So the frontend sends context, the SDK re-emits. That is a cross-repo dependency
and it should be tracked as its own issue, not folded into a frontend PR.

### 4.2 Privacy constraint on the join key

`claim_id` is not an opaque correlation id. On the recipient side it is the claim
token from the URL path (`claimId={token}`, `claim-page-client.tsx:383`), and
`claim-url-security-properties.md` is explicit that the token is a **bearer
credential** — "the token is the sole proof of entitlement" — and that it is
"readable by anyone holding the token, including link-preview services and
analytics pipelines".

Every event that carries `claim_id` therefore hands a claim credential to the
analytics store. That is already true today and this decision does not make it
worse, but moving emission server-side makes it *more* durable: server-side
emission implies a persistent backend-side event log, so the log becomes a list
of live claim tokens. If §9.2's migration happens, the event store needs an
explicit retention limit, and redaction of `claim_id` after the claim is spent
should be considered. This is flagged here so it is decided deliberately; it is
not resolved by this document.

---

## 5. What this document does not decide

- No emitter is moved by this change. The table in §2 is the plan.
- The `Payment Confirmed` → `Payment Signed` rename requires a §4.3 spec PR
  first, per the pre-flight runbook. `docs/analytics-spec.md` is not edited here.
- Whether the SDK can emit these events at all is a `bridgelet-sdk` question.
- No KPI in `docs/analytics-kpi-readiness-audit.md` changes status because of
  this document. `Claim Succeeded` moving server-side does not unblock anything
  until the event actually fires from production code and a query has been run
  against a real export.
- `Wallet Address Validation Failed` firing from a `useEffect` rather than from
  the submit handler is a #628 finding, not a §9.2 finding; it is written up in
  `docs/analytics-kpi-readiness-audit.md`.
