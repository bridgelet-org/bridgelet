# `sender-auth-model.md` — Accuracy Check

A point-in-time verification of `docs/sender-auth-model.md` against
`frontend/lib/wallet.ts` and `frontend/components/wallet-connect.tsx`.

## "How It Works"

| # | Claim | Holds? |
|---|---|---|
| 1 | `/send` renders a `WalletConnect` component | ✅ exists at the stated path |
| 2 | User clicks connect; Freighter popup opens | ✅ `requestAccess()` opens it |
| 3 | On approval the public key is returned | ✅ via `getAddress()`; throws if absent |
| 4 | "The Bridgelet SDK signs the transaction with the connected key" | ⚠️ **Ambiguous** |

Claim 4 needs rewording. It reads either as *the SDK signs using a key it holds*
or *the SDK triggers signing by the connected wallet*. The code supports only the
second — `signFreighterTransaction()` sends XDR to the extension and reads back a
signature, so the secret never leaves Freighter. Since Bridgelet genuinely holds a
funding key elsewhere, loose phrasing risks misdescribing the trust model. See
[`wallet-signing-to-sdk-handoff.md`](./wallet-signing-to-sdk-handoff.md).

## "Security Notes"

| Claim | Holds? |
|---|---|
| No session token or JWT; ownership proven at signing time | ✅ none found |
| **LOBSTR paste fallback "already wired in `lib/wallet.ts`"** | ❌ **primary finding** |
| Option A (env API key) viable for backend integrations | ✅ deferred — see [`org-integration-api-key-model.md`](../glossary/org-integration-api-key-model.md) |

## Primary finding: the LOBSTR claim is not accurate

`connectLobstr()` implements no paste fallback. Its entire body throws the
sentinel `USE_PASTE_FLOW`, intended for a UI handler that was never built — the
sentinel appears exactly once in the repository, at the `throw`. The function also
has no callers.

"Already wired in `lib/wallet.ts`" misleads in a specific way: the *function* is in
that file, but what it contains is a request for a paste flow, not one. A reader
planning around working LOBSTR support would be wrong. Detail in
[`lobstr-paste-flow-not-implemented.md`](./lobstr-paste-flow-not-implemented.md).

The "Files Changed" table describes state at authoring time and will drift by
design; treat it as history, not current inventory.

## Recommendation

Re-run this check after **any** change to `frontend/lib/wallet.ts` or
`wallet-connect.tsx`. Both findings are the kind that appear when code moves on
and prose doesn't — and this document is cited elsewhere as authoritative, so its
inaccuracies propagate.
