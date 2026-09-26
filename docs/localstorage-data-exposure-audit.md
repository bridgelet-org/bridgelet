# LocalStorage Data Exposure Audit

> Item-by-item review of
> `bridgelet-product-audit/checklists/localstorage-data-exposure-checklist.md`
> against the frontend at commit `faeb0b6`. Closes the audit deliverable of #633,
> which requires the anonymous-identity implementation to be reviewed against this
> checklist "given localStorage-persisted identifiers are a recurring
> privacy/security review topic in this codebase".
>
> The audit was requested for the `anonymous_id` work landed in #728
> (`faeb0b6`). It is not a rubber stamp: **four items fail or are not satisfied**,
> one is unverifiable by inspection, and the checklist itself is out of date.

## Scope and method

- Every `localStorage` / `sessionStorage` / cookie / `indexedDB` reference in
  `frontend/` was enumerated by grep and each write site read. Files read in
  full: `frontend/lib/analytics.ts`, `frontend/lib/wallet.ts`,
  `frontend/components/theme-provider.tsx`, `frontend/app/layout.tsx`,
  `frontend/components/dev-toolbar.tsx`.
- **This was a static review. Nothing was run.** No build, no typecheck, no lint,
  no test, no browser session, no `node_modules` inspection. Items that cannot be
  settled by reading source are marked as such rather than ticked.
- `bridgelet-product-audit/**` is not modified by this work, so the checklist
  itself still carries the stale inventory described in item 7.

## Complete storage inventory (`frontend/`)

| Store | Key | Written at | Value | Notes |
|-------|-----|-----------|-------|-------|
| `localStorage` | `bridgelet_wallet` | `lib/wallet.ts:30` | `JSON.stringify(ConnectedWallet)` | **No caller.** Never written at runtime today. |
| `localStorage` | `bridgelet-theme` | `components/theme-provider.tsx:40` | `'light'` \| `'dark'` | Read at `theme-provider.tsx:21` and in the inline pre-hydration script, `app/layout.tsx:25` (read-only, `try`/`catch`). |
| `localStorage` | `bridgelet_anonymous_id` | `lib/analytics.ts:108` | UUID v4 string | Added by #728. **Not in the checklist.** |
| `sessionStorage` | `bridgelet_session_id` | `lib/analytics.ts:129` | UUID v4 string | Added by #728. Not covered by the checklist, which is `localStorage`-scoped. |
| `sessionStorage` | `bridgelet_mock_scenario` | `components/dev-toolbar.tsx:48` | `'happy'` \| `'expired'` \| `'already-claimed'` \| `'network-error'` | Dev-only; the toolbar renders only when `NODE_ENV === 'development'` (`app/layout.tsx:46`). |

Not used anywhere in `frontend/`: cookies (no first-party reads or writes; the
only `cookie` matches are transitive entries in `package-lock.json`),
`indexedDB`, `CacheStorage` writes, `document.cookie`.

---

## Core Wallet Storage Verification (`bridgelet_wallet`)

### 1. Only `publicKey` and `type` are stored, never secret key material — ⚠️ PASS on the writer, FAIL on the reader

`ConnectedWallet` is `{ publicKey: string; type: WalletType }` and nothing else
(`lib/wallet.ts:5-8`). `persistWallet()` stringifies exactly that object
(`lib/wallet.ts:30`), so no secret can be written through it.

The reader is the problem. `loadPersistedWallet()` does:

```ts
return JSON.parse(raw) as ConnectedWallet;   // lib/wallet.ts:38
```

An unchecked cast. Whatever shape is in the key is returned and handed to calling
code as a `ConnectedWallet` — extra properties included. Nothing validates
`typeof publicKey === 'string'` or that `type` is one of
`freighter | lobstr | generated`. "Only ever stores `publicKey` and `type`" is
therefore enforced by the writer's type signature, not by anything at read time.
A hand-edited value, a value left by a different build, or a value written by
injected script before app code reads it all flow through untouched.

**Recommendation:** validate the parsed shape and return `null` on mismatch.
This is a one-function change in a file this PR does not touch; raising it here
so it is tracked.

### 2. `persistWallet()` only accepts and stringifies `ConnectedWallet` — ✅ PASS

Signature is `persistWallet(wallet: ConnectedWallet): void` and the body is a
single `JSON.stringify(wallet)` (`lib/wallet.ts:29-31`). No spread, no
normalisation, no merging of caller-supplied extras.

Secondary observation: unlike `loadPersistedWallet()` (`lib/wallet.ts:35-42`) and
`getAnonymousId()` (`lib/analytics.ts:104-114`), `persistWallet()` has **no
`try`/`catch`**, so a blocked or full storage would throw into the caller. This
is currently unreachable because the function has no callers (item 5), so it is
a latent rather than a live defect.

### 3. Generated wallets' secret keys are never persisted — ✅ PASS

`generateNewWallet()` (`lib/wallet.ts:127-138`) returns
`{ wallet: { publicKey, type: 'generated' }, secretKey }` to its caller and
performs no storage write of any kind. There is no `setItem` call anywhere in the
function, and no other function in the repo handles `secretKey` — the only two
occurrences in `frontend/` are the property in the return type and
`keypair.secret()`.

Note the path is also unreachable: `generateNewWallet()` has no callers in
`frontend/`. That matches the existing entry in `docs/security-model.mdx` (T-15):
*"This flow is not presented in the UI by default. ⚠️ Partial — secret handling
requires audit."* The pass is real but the exposure surface is theoretical today.

### 4. No other code writes additional properties to `bridgelet_wallet` — ✅ PASS

The key literal `'bridgelet_wallet'` appears exactly once, as
`STORAGE_KEY` (`lib/wallet.ts:21`), and is used only inside `lib/wallet.ts`
(lines 30, 36, 45). No other module in `frontend/`, `e2e/`, or `mobile/` can be
writing to that key without going through `persistWallet()`.

### 5. `clearPersistedWallet()` removes the entry on disconnect — ❌ NOT SATISFIED

The function itself is correct: `localStorage.removeItem(STORAGE_KEY)`
(`lib/wallet.ts:44-46`).

But it has **no call site anywhere in the repository**, and neither does
`persistWallet()` or `loadPersistedWallet()`. The only import from
`lib/wallet` in application code is `connectFreighter` and the `ConnectedWallet`
type:

```
frontend/components/send-form/steps/connect-step.tsx:4   import { connectFreighter } from '@/lib/wallet';
frontend/components/wallet-connect.tsx:4                  import { connectFreighter, type ConnectedWallet } from '@/lib/wallet';
frontend/lib/freighter-sender-signing.ts:11              (signing helpers, not persistence)
```

There is no disconnect UI, so the behaviour this item asks about — "removes the
entry when a wallet is disconnected" — describes a flow that does not exist. The
connected wallet lives in React state and dies with the tab.

**Finding:** this item cannot be ticked, and the more useful conclusion is that
the entire `bridgelet_wallet` persistence surface is dead code today. Either
delete the three persistence functions until a caller exists, or document the
caller that is planned. Leaving unreferenced persistence code in a security
checklist's primary section invites exactly the review confusion this audit is
meant to prevent.

---

## Other localStorage Usage Inventory

### 6. `bridgelet-theme` stores only the theme selection — ✅ PASS

`STORAGE_KEY = 'bridgelet-theme'` (`components/theme-provider.tsx:14`) is written
in exactly one place, `toggleTheme()`, with `next` typed as `Theme =
'light' | 'dark'` (`theme-provider.tsx:37-42`). No other value can be written
through that path. The pre-hydration script in `app/layout.tsx:22-32` only
*reads* the key inside a `try`/`catch` to set a CSS class. No sensitive data.

### 7. Full scan for undocumented localStorage keys — ❌ FAIL (the checklist is stale)

The complete set of `localStorage` keys in `frontend/` is the three in the
inventory table above. Two are documented by the checklist
(`bridgelet_wallet`, `bridgelet-theme`); **`bridgelet_anonymous_id` is not**, and
neither is the `sessionStorage` key `bridgelet_session_id`.

This is a direct miss against the item's own requirement ("Scan entire frontend
codebase to ensure no other localStorage keys are being used beyond the ones
documented here") and against the re-run item in the maintenance section, which
says the checklist must be completed "after any change to … what data is
persisted to localStorage". PR #728 added a new persistent, cross-session
identifier and the checklist was not updated. The scan itself passes — the surface
is small and fully enumerable — but the *documentation* of it is now wrong, and
the checklist is the artefact a future reviewer will trust.

**Recommendation:** add `bridgelet_anonymous_id` and `bridgelet_session_id` to the
checklist, with the retention question in item 15 answered. Not done in this
change because `bridgelet-product-audit/**` is out of scope here.

### 8. All localStorage usage is intentional and necessary — ⚠️ PASS with one exception

| Key | Intentional? | Necessary today? |
|---|---|---|
| `bridgelet-theme` | Yes — prevents a dark-mode flash (`app/layout.tsx:18-32`) | Yes |
| `bridgelet_anonymous_id` | Yes — §9.3 requires a `localStorage`-persisted primary identifier that is not a cookie | Yes, once analytics identity is used |
| `bridgelet_wallet` | Intended (survives refresh, per the comment at `lib/wallet.ts:28`) | **No** — nothing writes or reads it (item 5) |

The exception is `bridgelet_wallet`: it is the only key in the file with PII
potential, and it is the one that no code path exercises.

### 9. No third-party library writes unexpected data — ⚠️ NOT VERIFIABLE BY INSPECTION

No first-party code writes cookies or `indexedDB`, and the only storage APIs used
are the five writes in the inventory table. Whether any dependency writes to
browser storage cannot be determined by reading `frontend/` source; `node_modules`
was not inspected and the app was not run. This item stays **unverified** — it is
not a pass, and it should not be reported as one.

---

## Security Validation

### 10. No localStorage entries contain PII beyond what is strictly necessary — ⚠️ MIXED

- **`bridgelet-theme`** — not personal data. ✅
- **`bridgelet_wallet.publicKey`** — a Stellar address. Pseudonymous, but
  linkable to a public chain account and therefore personal data under GDPR. It
  is *not* strictly necessary today, because nothing persists or reads it
  (item 5). ⚠️
- **`bridgelet_anonymous_id`** — a random UUID v4 with nothing about the person
  in the value. This is the right shape: no email, no address, no wallet, no
  name. ✅ for the value itself.
  The open question is the *lifetime*, covered in item 15: a stable identifier
  that never expires and is never cleared is a permanent join key, and the spec's
  stated purpose for it ("primary identifier across sessions", §9.3) is exactly
  what makes it a join key. That is a defensible design for a first-party,
  no-PII analytics layer, but it is a decision that should be written down
  somewhere durable rather than living only in a code comment. ⚠️
- **Not in this checklist, but in the same conversation:** `user_agent` is sent
  on *every* event (`lib/analytics.ts:69`). It is not persisted to
  `localStorage`, so it is out of scope for this checklist, but it is the
  strongest fingerprinting signal in the payload. `claim_id` is also in every
  payload and, per
  `bridgelet-product-audit/integration-notes/claim-url-security-properties.md`,
  is a **bearer credential** for the claim. Both are written up in
  `docs/analytics-server-vs-client-decision.md` §4.2.

Data-quality note, not an exposure one: `getAnonymousId()` returns `''` when
`localStorage` is blocked (`lib/analytics.ts:111-114`), so users in that
configuration emit `anonymous_id: ''` on every event and are unjoinable. That is
the correct privacy-first failure mode and the right trade, but dashboards should
expect a non-trivial `''` cohort rather than assuming it away.

### 11. All localStorage data is cleared when the user logs out / disconnects — ❌ FAIL

Two separate gaps:

1. **No disconnect path exists** (item 5), so nothing clears `bridgelet_wallet`.
   Vacuously satisfied today, but only because the write never happens either.
2. **`bridgelet_anonymous_id` is never cleared by anything.** There is no
   `removeItem` for that key anywhere in `frontend/`, no user-facing control, and
   no documented retention period. A recipient who opens a claim link and leaves
   leaves a persistent identifier behind indefinitely.

The obvious fix — clear it on wallet disconnect — would **break the sender
funnel**, because §9.3 makes `anonymous_id` the cross-session primary identifier
and the sender's later steps would land in a new anonymous cohort. That tension is
real and should be decided deliberately by the maintainers, not resolved by
default in either direction. A defensible middle path: a documented maximum
lifetime with a staleness check on read (drop and re-mint an id older than N
days), plus a documented manual erase path.

Related: `docs/GDPR_COMPLIANCE.md` claims *"Data erasure rights: Users can request
deletion of address history records"*. No code path implementing erasure exists
in this repository, and the same file's claim that *"Session Cookies only:
Transient localStorage tokens are encrypted"* is inaccurate on both counts —
there are no cookies in application code, and the `localStorage` values are
plaintext (a UUID and a JSON wallet object), not encrypted. Flagged for the
owner of that document; not edited here.

### 12. No sensitive cryptographic material in any client-side persistent storage — ✅ PASS (by inspection)

No private key, secret key, seed phrase, or mnemonic is written to
`localStorage` or `sessionStorage` anywhere in `frontend/`. The only `secretKey`
handling is the in-memory return from `generateNewWallet()` (item 3), and the two
`sessionStorage` writes hold a session UUID and a dev-only mock scenario name.

Caveat: the claim *token* is a bearer credential and it lives in the URL path
(`app/claim/[token]/`) and in every analytics payload, not in storage. Out of this
checklist's scope; cross-referenced in item 10.

---

## Summary

| # | Checklist item | Verdict |
|---|----------------|---------|
| 1 | `bridgelet_wallet` stores only `publicKey` / `type` | ⚠️ Writer passes; `loadPersistedWallet()` casts without validating |
| 2 | `persistWallet()` accepts only `ConnectedWallet` | ✅ Pass (no `try`/`catch` — latent only) |
| 3 | Generated secret keys never persisted | ✅ Pass (path has no callers) |
| 4 | No other code writes to `bridgelet_wallet` | ✅ Pass |
| 5 | `clearPersistedWallet()` clears on disconnect | ❌ **Not satisfied** — no disconnect path exists; all three persistence functions are dead code |
| 6 | `bridgelet-theme` stores only theme | ✅ Pass |
| 7 | No undocumented localStorage keys | ❌ **Fail** — `bridgelet_anonymous_id` (and `bridgelet_session_id`) are missing from the checklist |
| 8 | All usage intentional and necessary | ⚠️ Pass except `bridgelet_wallet`, which is unnecessary today |
| 9 | No third-party writes | ⚠️ **Unverified** — not determinable without running the app |
| 10 | No PII beyond strict necessity | ⚠️ Mixed — values are clean; the wallet public key is unused-but-PII, the anonymous id's lifetime is undocumented |
| 11 | Data cleared on logout / disconnect | ❌ **Fail** — no disconnect path; `bridgelet_anonymous_id` is never cleared |
| 12 | No key material in persistent storage | ✅ Pass (by inspection) |

Maintenance items 10–13 of the checklist (re-run triggers, PR gates, quarterly
cadence) are process items I cannot attest to. What I can say: the re-run trigger
has already been missed once, by #728. `CONTRIBUTING.md`'s pull request checklist
does not mention localStorage at all, so the "add this checklist to PR review
requirements" item is not met by any file in this repository.

## Recommendations, in priority order

1. **Decide the retention policy for `bridgelet_anonymous_id`.** Either a
   documented maximum lifetime with a staleness check, or a documented manual
   erase path. Whichever it is, it belongs in the checklist and the privacy
   notice, not only in a code comment. Owner decision, not an implementation
   detail.
2. **Update the checklist** with `bridgelet_anonymous_id` and
   `bridgelet_session_id`, and re-date it. Owner of
   `bridgelet-product-audit/**`.
3. **Delete or justify `bridgelet_wallet` persistence.** It is the highest-sensitivity
   key in the file and no code path uses it.
4. **Validate the shape read from `bridgelet_wallet`** instead of casting.
5. **Fix `docs/GDPR_COMPLIANCE.md`** — the "Session Cookies only … encrypted"
   claim is wrong on both counts, and the erasure-rights claim has no
   implementation in this repository.
6. **Add a localStorage line to the `CONTRIBUTING.md` pull request checklist** so
   the re-run trigger has a process anchor.

## What this audit did not verify

- Nothing was executed: no build, typecheck, lint, test run, or browser session.
- `node_modules` was not inspected, so item 9 is open.
- Only `frontend/` was reviewed. `mobile/` and `e2e/` were not audited; the
  checklist is scoped to the frontend, and this audit keeps that scope.
- Whether any analytics pipeline retains `claim_id` or `anonymous_id` beyond the
  client is outside this repository and outside this checklist.
