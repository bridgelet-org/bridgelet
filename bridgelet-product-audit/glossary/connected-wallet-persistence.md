# Connected Wallet Persistence

How a connected wallet survives a page reload, per `frontend/lib/wallet.ts`.

## The storage key and shape

Persistence is plain `localStorage` under a single key:

```ts
const STORAGE_KEY = 'bridgelet_wallet';
```

`persistWallet()` writes `JSON.stringify(wallet)`, where `wallet` is a
`ConnectedWallet`. That type has exactly two fields:

| Field | Type | Example |
|---|---|---|
| `publicKey` | `string` | `G...` (Stellar public key) |
| `type` | `WalletType` | `'freighter' \| 'lobstr' \| 'generated'` |

## What is *not* stored

**No secret key material is written to `localStorage` by this path.** The
`ConnectedWallet` type has no field for it. Note that `generateNewWallet()` does
return a `secretKey` alongside the wallet, but that secret is returned to the
caller only — `persistWallet()` never receives it and therefore cannot store it.
This is a factual record of current behaviour, not a guarantee about future
callers.

## Corrupted or missing values

`loadPersistedWallet()` wraps the read in `try`/`catch` and returns `null` on any
failure:

```ts
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ConnectedWallet;
} catch {
  return null;
}
```

So a malformed JSON value degrades silently to "no wallet connected" rather than
throwing — the user sees a disconnected state with no error explaining why.
`clearPersistedWallet()` removes the key outright. Note the cast is unchecked: a
*well-formed* JSON value of the wrong shape is returned as-is rather than
rejected. See
[`../runbooks/clear-stale-persisted-wallet.md`](../runbooks/clear-stale-persisted-wallet.md).
