# Connected Wallet Persistence Scope

**Issue:** #318
**Severity:** Design observation (scope clarification)
**Date:** 2026-07-28

---

## Summary

`persistWallet()` in `frontend/lib/wallet.ts` stores exactly two fields —
`publicKey` and `type` — in `localStorage`. This post documents what that
persistence does and does not protect against, and clarifies that persistence is
a UI convenience, not a security boundary.

## What Is Persisted

The storage key is `bridgelet_wallet` and the shape is:

```ts
interface ConnectedWallet {
  publicKey: string;   // e.g. "G..."
  type: WalletType;    // 'freighter' | 'lobstr' | 'generated'
}
```

Written by `persistWallet()` at `frontend/lib/wallet.ts:29`:

```ts
export function persistWallet(wallet: ConnectedWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}
```

Read back by `loadPersistedWallet()` at `frontend/lib/wallet.ts:34`, which
returns `null` on any parse failure or missing key. Cleared by
`clearPersistedWallet()` at `frontend/lib/wallet.ts:44`.

## What Is Not Persisted

**No secret key material is written to `localStorage` by this path.**

The `ConnectedWallet` type has no field for a secret key. Even in the
`generated` wallet path — where `generateNewWallet()` returns a `secretKey`
alongside the wallet — `persistWallet()` never receives the secret. It only
receives `{ publicKey, type }`.

This means:

- A `freighter`-type persisted wallet records which Freighter account was
  connected, but signing still requires the Freighter extension.
- A `lobstr`-type persisted wallet records a public key, but there is no
  signing capability stored.
- A `generated`-type persisted wallet records a public key, but the secret key
  (if it was ever returned) is not in `localStorage`.

## Shared Computer Scenario

On a shared or public computer, persisting the public key means the **next
browser session will show the previously-connected wallet as "connected"** in
the UI. This is because `loadPersistedWallet()` runs on page load and returns
the stored `{ publicKey, type }`.

However:

- The UI showing "connected" does not grant signing capability. A Freighter
  connection still requires the Freighter extension to approve the transaction.
- For a `generated` wallet, the public key display is cosmetic — without the
  secret key, no transaction can be signed.
- For a `lobstr` wallet, the public key is display-only — there is no signing
  path at all.

**Bottom line:** The persisted public key is a UX hint, not an authorization
token. It answers "which account did I last use?" — not "can I act on behalf of
this account?"

## Clearing Browser Data

Clearing `localStorage` (or just the `bridgelet_wallet` key) removes the public
key association entirely. The user sees a disconnected state with no error
explaining why.

`loadPersistedWallet()` handles this gracefully — it returns `null` and the UI
shows the connect button again. But the silent degradation is worth noting: a
user who clears browser data may be confused about why their wallet "disappeared"
without an error message.

## The Unchecked Cast

`loadPersistedWallet()` uses an unchecked type assertion:

```ts
return JSON.parse(raw) as ConnectedWallet;
```

A well-formed JSON value of the wrong shape (e.g., `{ "foo": "bar" }`) will be
returned as-is rather than rejected. This is unlikely in practice since only
`persistWallet()` writes to this key, but it is a theoretical integrity gap if
the storage is tampered with (e.g., by a browser extension or shared profile
sync).

## Persistence Is Not a Security Boundary

The key takeaway: `persistWallet()` provides **UI convenience** (surviving page
reloads), not **security** (authorizing actions). The actual security boundary
lives in:

- The Freighter extension (for `freighter` type) — which gates signing behind
  its own approval popup.
- The server-side signature verification (for all types) — which checks that the
  transaction was signed by the claimed public key.

Persisting the public key in `localStorage` does not weaken or strengthen the
security model. It is orthogonal to it.

## Recommendations

- Document the `bridgelet_wallet` storage key in the security model so auditors
  know it exists and what it contains.
- Consider adding a brief user-facing note when a wallet is shown as "connected"
  from persistence — e.g., a subtle indicator that reconnection was automatic
  rather than explicitly approved in this session.
- The unchecked cast in `loadPersistedWallet()` is low-risk but should be
  validated if the storage key is ever written to by other code paths.

## Related Documents

- [`glossary/connected-wallet-persistence.md`](../glossary/connected-wallet-persistence.md)
  — The canonical glossary entry for this persistence mechanism
- [`frontend/lib/wallet.ts`](../../frontend/lib/wallet.ts) — `persistWallet()`,
  `loadPersistedWallet()`, `clearPersistedWallet()` at lines 29, 34, 44
- [`postmortems/sender-auth-relies-on-transaction-signing-not-session.md`](./sender-auth-relies-on-transaction-signing-not-session.md)
  — Why there is no session token to persist in the first place
- [`glossary/wallet-connection-types.md`](../glossary/wallet-connection-types.md)
  — What each `WalletType` value means in practice
