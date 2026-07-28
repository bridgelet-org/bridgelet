# Freighter vs LOBSTR vs Generated — Tradeoffs

The practical tradeoffs behind the three `WalletType` values. For what each value
*is*, see [`wallet-connection-types.md`](./wallet-connection-types.md).

## Freighter

**Requires** the user to have installed the Freighter browser extension. That is
a real drop-off point: `connectFreighter()` throws
`"Freighter extension not found. Please install it from freighter.app and refresh."`
for anyone who hasn't.

In exchange it has the strongest security model of the three. The secret key
never leaves the extension — the app calls `signTransaction()` and receives back
signed XDR, so Bridgelet code never handles key material. `signFreighterTransaction()`
tolerates several response shapes (`signedTxXdr`, `signedTxXDR`, `xdr`), which
suggests the extension's response format has varied across versions.

**Best for:** crypto-literate senders on desktop.

## LOBSTR

Currently a **manual paste flow**, not a live connection — LOBSTR ships no
browser JS SDK comparable to Freighter's. The user copies their public key out of
the LOBSTR app and pastes it in.

The tradeoff is a manual-entry error surface: a mistyped or truncated key is only
caught by format validation, and the app never gets signing capability — it learns
an address, nothing more. It also can't prove the user controls that address.

**Best for:** mobile-first users, accepting reduced assurance.

## Generated

Maximum convenience — one call to `generateNewWallet()` and the user has a
keypair, no install and no existing wallet needed. This is the path that serves
Bridgelet's core "recipient has no wallet" use case.

The cost is key custody. The function returns a raw `secretKey` string, and
whoever receives it becomes responsible for storing it and for the user's ability
to recover funds. Lose it and the funds are unrecoverable. See
[`generated-wallet-key-custody.md`](../integration-notes/generated-wallet-key-custody.md)
— this path has no caller yet, and the custody question is unresolved.

**Best for:** first-time recipients — once custody is specified.
