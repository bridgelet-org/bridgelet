# Issue #772 — `Send Form Viewed` already fires (verification + regression test)

> **Status: resolved / stale.** The work requested by issue #772 is already
> present on `main`. This note records the evidence so the issue can be closed
> without another implementation PR. The only addition made alongside this
> document is a component-level regression test locking in the behaviour the
> issue asked for (see §3).
>
> Reviewed against `main` at commit `84e5f2a` (*Docs/683 686 analytics spec
> gaps (#923)*), remote `https://github.com/fikrah-Tech/bridgelet.git`.

---

## 1. What the issue asks for

> `#772 Analytics event Send Form Viewed is defined in the spec but never fires in code`
>
> `frontend/lib/analytics.ts` currently exposes only four tracking calls
> (`claim_page_viewed`, `claim_initiated`, `claim_success`, `claim_error`) —
> none of which correspond to the spec's Title-Case naming convention
> (Noun Verb, §2.1), and a repo-wide search finds
> `analytics.claimPageViewed`/etc. are never actually imported or called from
> any component in `frontend/`. Add a `track()` call for **Send Form Viewed**
> with the payload fields specified in the spec, at the point in the UI where
> the create-claim form is displayed.

The issue text describes a specific old revision of `frontend/lib/analytics.ts`
that had exactly four `snake_case` tracking calls and no component call sites.
That revision exists in history, but current `main` is well past it. This is
the same stale-issue pattern as #775
([`issue-775-send-form-completed-already-implemented.md`](issue-775-send-form-completed-already-implemented.md)).

---

## 2. Evidence that the issue is already resolved

### 2.1 The `track('Send Form Viewed', …)` call exists

`frontend/lib/analytics.ts:712`:

```ts
sendFormViewed: () => track('Send Form Viewed', { journey: 'sender' }),
```

The event name is also registered in the `ClaimEvent` union at
`frontend/lib/analytics.ts:5` (`| 'Send Form Viewed'`), which is the type
contract that keeps every emitter's name exactly equal to the spec's `####`
heading (Noun Verb, §2.1).

The payload matches `docs/analytics-spec.md` §4.2 **exactly**. The spec defines
one property for this event:

| Spec §4.2 property           | Emitted by the code above   |
| ---------------------------- | --------------------------- |
| `journey` = `"sender"`       | `journey: 'sender'`         |

No other fields are specified for `Send Form Viewed`, so none should be sent —
adding more would be a spec deviation, not a fix. The §3.1 base payload
(`app_version`, `user_agent`, `device_type`, `referrer`, `platform`,
`anonymous_id`, `session_id`, `message_id`) is merged into every event centrally
by `track()` (`frontend/lib/analytics.ts:386-394`).

### 2.2 The UI call site exists, where the create-claim form is displayed

`frontend/components/send-form/index.tsx:55-58` — a mount-only effect on the
create-claim form component:

```ts
// Fire on first render of the create-claim form (§4.2 of the analytics spec).
useEffect(() => {
  analytics.sendFormViewed();
}, []);
```

This is exactly the spec's trigger ("Fired when the Create Claim form is
rendered"):

- `frontend/components/send-form/index.tsx:8` imports the analytics layer.
- The empty dependency array means the event fires once per form display, not
  on step transitions — matching a "Viewed" event's semantics.
- The component ships in production — `frontend/app/send/page.tsx:10` renders
  `<SendForm />` as the create-claim form.

### 2.3 An independent repo document already records this emitter

`docs/analytics-server-vs-client-decision.md:52`:

| Event             | Current emitter (verified)                       | §9.2 says | Verdict      |
| ----------------- | ------------------------------------------------ | --------- | ------------ |
| `Send Form Viewed` | client — `components/send-form/index.tsx:57`     | client    | Keep client. |

### 2.4 Git history — when and why it was "fixed"

- `git show a88a910:frontend/lib/analytics.ts` contains **exactly** the four
  `snake_case` calls the issue describes:
  `claimPageViewed: () => track('claim_page_viewed')`,
  `claimInitiated: () => track('claim_initiated')`,
  `claimSuccess: () => track('claim_success')`,
  `claimError: (reason) => track('claim_error', { reason })`.
- Commit `8dea79e` — *Fix/analytics queue and verification (#751)* — rewrote the
  analytics layer to the spec's Title-Case naming and **introduced
  `sendFormViewed`** (the `track('Send Form Viewed', …)` call at
  `frontend/lib/analytics.ts:712`) together with its call site in
  `frontend/components/send-form/index.tsx:55-58`.

**Conclusion:** issue #772 was written against the pre-`#751` revision and was
resolved by PR #751. On today's `main`, the requested emitter and call site
exist and match the spec. No implementation work remains for #772 itself.

---

## 3. What this PR adds anyway: a regression test

The #775 postmortem (§3, item 1) flagged that nothing at component level
asserts these send-form analytics events actually fire — leaving the exact gap
#772 and #775 describe free to silently regress (someone deletes the
`useEffect`, the suite stays green).

`frontend/components/send-form/send-form.test.tsx` now stubs the analytics
layer and asserts, per §4.2:

1. `analytics.sendFormViewed()` fires **exactly once** when `<SendForm />` is
   displayed.
2. It does **not** re-fire across step transitions (connect → expiry → details
   → back), locking in the mount-only `useEffect` dependency array.

The mocked module exposes only the two methods the component calls
(`sendFormViewed`, `sendFormCompleted`), so any future analytics call added to
the send form without updating the mock will fail loudly.

---

## 4. Minor, non-blocking observations (follow-up candidates)

These are *not* what #772 asked for; noted for visibility only.

1. **Lib-level tests existed, component-level ones did not (now fixed here).**
   `frontend/lib/analytics.test.ts:1370-1383` already exercised
   `analytics.sendFormViewed()` for `message_id` behaviour, but nothing
   asserted the UI fires it. Covered by §3 of this change.

2. **Funnel tracker omits `Send Form Viewed`.**
   `docs/analytics-funnel-tracker.md:29-31` models the sender funnel as
   `Page Viewed → Send Form Started → Send Form Completed → …`; `Send Form
   Viewed` is a §4.2 event but is not one of the numbered funnel stages. That
   is internally consistent, but a reader looking for "where is stage 2's
   `Viewed` event" may be briefly confused.

---

## 5. Recommendation

Close #772 as **already implemented** (fixed by PR #751), citing:

- `frontend/lib/analytics.ts:712` — the `track('Send Form Viewed', …)` call
- `frontend/lib/analytics.ts:5` — the `ClaimEvent` union entry
- `frontend/components/send-form/index.tsx:55-58` — the UI call site (mount-only)
- `frontend/app/send/page.tsx:10` — production wiring
- `docs/analytics-spec.md` §4.2 — the payload definition the code matches

and this PR's regression test as the guard against re-introducing the gap.
