# Wallet Connection Types

The `WalletType` union in `frontend/lib/wallet.ts` has three values. Each means
something quite different in practice today.

```ts
export type WalletType = 'freighter' | 'lobstr' | 'generated';
```

A connected wallet is represented as `ConnectedWallet { publicKey, type }`.

## `freighter`

A live connection to the [Freighter](https://freighter.app) browser extension,
established by `connectFreighter()`. The function checks `freighter.isConnected()`
first and throws a descriptive "extension not found" error if the extension is
absent, then calls `requestAccess()` (which opens the extension popup) and reads
the address back via `getAddress()`.

## `lobstr`

Not a live SDK connection. LOBSTR has no browser-extension JS SDK equivalent to
Freighter's, so `connectLobstr()` immediately throws the sentinel string
`USE_PASTE_FLOW`. The intent is that the UI catches this and renders a
paste-your-public-key step instead. See
[`lobstr-paste-flow-not-implemented.md`](../integration-notes/lobstr-paste-flow-not-implemented.md)
for whether that handling actually exists.

## `generated`

A brand-new Stellar keypair created client-side by `generateNewWallet()`, which
dynamically imports `@stellar/stellar-sdk` (to avoid SSR issues) and calls
`Keypair.random()`. It returns both the wallet and a raw `secretKey` string.
Key-custody implications are covered in
[`generated-wallet-key-custody.md`](../integration-notes/generated-wallet-key-custody.md).

## Relationship to the existing glossary

This entry **extends** rather than replaces `docs/GLOSSARY.md`, which defines the
broader Stellar and product vocabulary (Account, Ephemeral Account, Custodial
Model). Read that first for the domain terms; read this for what the three
connection values concretely mean in the frontend code.

For the decision record behind choosing wallet-based auth at all, see
`docs/sender-auth-model.md` (Option B).
