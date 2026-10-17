# Issue #775 — `Send Form Completed` already fires (verification, no code change required)

> **Status: resolved / stale.** The work requested by issue #775 is already
> present on `main`. This note records the evidence so the issue can be closed
> without another implementation PR.
>
> Reviewed against `main` at commit `84e5f2a` (*Docs/683 686 analytics spec
> gaps (#923)*), remote `https://github.com/fikrah-Tech/bridgelet.git`.

---

## 1. What the issue asks for

> `#775 Analytics event Send Form Completed is defined in the spec but never fires in code`
>
> `frontend/lib/analytics.ts` currently exposes only four tracking calls
> (`claim_page_viewed`, `claim_initiated`, `claim_success`, `claim_error`) …
> Add a `track()` call for **Send Form Completed** with the payload fields
> specified in the spec, at the point in the UI where the sender finishes the
> send form (funnel stage 3).

The issue text describes a specific old revision of `frontend/lib/analytics.ts`
that had exactly four `snake_case` tracking calls. That revision exists in
history, but the current `main` is well past it.

---

## 2. Evidence that the issue is already resolved

### 2.1 The `track('Send Form Completed', …)` call exists

`frontend/lib/analytics.ts` — lines **601–618**:

```ts
sendFormCompleted: ({
  assetType,
  expiryDays,
  hasRecipientName,
  hasMessage,
}: {
  assetType?: string;
  expiryDays?: number | null;
  hasRecipientName: boolean;
  hasMessage: boolean;
}) =>
  track('Send Form Completed', {
    journey: 'sender',
    ...(assetType ? { asset_type: assetType } : {}),
    ...(expiryDays != null ? { expiry_days: expiryDays } : {}),
    has_recipient_name: hasRecipientName,
    has_message: hasMessage,
  }),
```

The event name is also registered in the `ClaimEvent` union at
`frontend/lib/analytics.ts:8` (`| 'Send Form Completed'`).

This payload matches `docs/analytics-spec.md` §4.2 **exactly**:

| Spec §4.2 property   | Emitted by the code above              |
| -------------------- | -------------------------------------- |
| `journey` = `sender` | `journey: 'sender'`                    |
| `asset_type`         | `asset_type: assetType`                |
| `expiry_days`        | `expiry_days: expiryDays`              |
| `has_recipient_name` | `has_recipient_name: hasRecipientName` |
| `has_message`        | `has_message: hasMessage`              |

### 2.2 The UI call site exists, at funnel stage 3

`frontend/components/send-form/index.tsx` — lines **69–76**, inside `goNext()`
when the sender leaves the `details` step:

```ts
if (step === 'details') {
  analytics.sendFormCompleted({
    assetType: formState.assetCode,
    expiryDays: formState.expiresInHours / 24,
    hasRecipientName: Boolean(formState.recipientName),
    hasMessage: Boolean(formState.memo),
  });
}
```

This is exactly the spec's trigger ("Fired when the sender clicks 'Continue'
and the form passes client-side validation"):

- `DetailsStep` (`frontend/components/send-form/steps/details-step.tsx:63–76`)
  runs `validateDetails()` and only calls `onNext()` when validation passes.
- `onNext` is wired to `goNext` at `frontend/components/send-form/index.tsx:165`.
- Stage 3 of 4 in this form is the `details` step
  (`frontend/components/send-form/index.tsx:39`).

The component ships in production — `frontend/app/send/page.tsx:10` renders
`<SendForm />`.

### 2.3 An independent repo document already records this emitter

`docs/analytics-server-vs-client-decision.md:53`:

| Event                 | Current emitter (verified)                  | §9.2 says | Verdict      |
| --------------------- | ------------------------------------------- | --------- | ------------ |
| `Send Form Completed` | client — `components/send-form/index.tsx:70` | client    | Keep client. |

### 2.4 Git history — when and why it was fixed

- `git show a88a910:frontend/lib/analytics.ts` contains **exactly** the four
  `snake_case` calls the issue describes:
  `claimPageViewed: () => track('claim_page_viewed')`,
  `claimInitiated: () => track('claim_initiated')`,
  `claimSuccess: () => track('claim_success')`,
  `claimError: (reason) => track('claim_error', { reason })`.
- Commit `8dea79e` — *Fix/analytics queue and verification (#751)* — rewrote the
  analytics layer to the spec's Title-Case naming and **introduced
  `sendFormCompleted`** (the `track('Send Form Completed', …)` call) together
  with its call site in `send-form/index.tsx`.
- A repo-wide search for the old identifiers returns only unrelated substrings
  (for example the value `'claim_success'` used for `source_screen` /
  `copy_location`), never a live `snake_case` tracking call.

**Conclusion:** issue #775 was written against the pre‑#751 revision and was
resolved by PR #751. On today's `main`, no implementation work remains.

---

## 3. Minor, non-blocking inconsistencies (follow-up candidates)

These are *not* what #775 asked for; they are noted for visibility only.

1. **No regression test for the event.** `frontend/lib/analytics.test.ts`
   exercises `analytics.sendFormViewed()` but never `analytics.sendFormCompleted()`,
   and `frontend/components/send-form/send-form.test.tsx` stubs the step
   components without asserting the analytics call. A regression test asserting
   `Send Form Completed` fires with the §4.2 payload would lock in the fix.

2. **Funnel tracker still shows stage 3 as open.**
   `docs/analytics-funnel-tracker.md:31` lists
   `| 3 | Send Form Completed | §4.2 | #562 | ⬜ open |` even though the code
   emits the event. This is only correct if the tracker's "open" status is keyed
   to the feeder issue (#562) rather than to actual emission; otherwise it should
   be reconciled.

---

## 4. Recommendation

Close #775 as **already implemented** (fixed by PR #751), citing:

- `frontend/lib/analytics.ts:601–618` — the `track('Send Form Completed', …)` call
- `frontend/components/send-form/index.tsx:69–76` — the UI call site (funnel stage 3)
- `frontend/app/send/page.tsx:10` — production wiring
- `docs/analytics-server-vs-client-decision.md:53` — independent confirmation

No code change and no implementation PR are needed for #775 itself.
