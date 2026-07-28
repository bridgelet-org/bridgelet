# Custodial Model in Practice

## The starting definition

`docs/GLOSSARY.md` defines the **Custodial Model** as a system where a service
temporarily controls assets on behalf of users.

That is abstract by design. This entry grounds it in the code paths that actually
implement it — and separates it from a nearby concept it is easy to confuse with.

## Where custody actually happens

The custodial mechanism lives in **bridgelet-sdk**, not in this repo. Per
bridgelet-sdk-audit's `two-phase-account-creation.md`, a backend-held **funding
keypair** creates and funds the ephemeral account, and the backend later signs the
sweep that moves funds to the recipient's destination.

Two words in the glossary definition do real work:

- **"temporarily"** — custody spans the window between the sender's payment and
  the recipient's claim. The ephemeral account exists to be emptied.
- **"on behalf of users"** — during that window the recipient cannot move the
  funds themselves. They hold a claim token, not a key. Bridgelet's backend holds
  the only key that can sweep the account.

This is what makes the product work: the recipient doesn't need a wallet at claim
time precisely *because* someone else is holding the asset for them.
`docs/security-model.mdx` reflects this — sweeps are gated on a valid claim token
plus a **server-side signature with the ephemeral private key**, with no
client-supplied authorization credential.

## What this is *not*: the `generated` wallet type

Do not conflate the custodial funding key with the `generated` `WalletType`.

| | Custodial funding key | `generated` wallet |
|---|---|---|
| Created | Backend, per ephemeral account | Browser, via `Keypair.random()` |
| Held by | Bridgelet's backend | The user |
| Purpose | Fund and sweep the ephemeral account | Give a user their own wallet |
| Repo | bridgelet-sdk | This repo (`frontend/lib/wallet.ts`) |

The `generated` path is the **opposite** of custodial: `generateNewWallet()`
returns the secret key to the user's browser, and Bridgelet never sees it — a
user-held key that happens to be created client-side.

Both can appear in one claim: a recipient may generate a wallet (non-custodial) to
receive funds swept from an ephemeral account (custodial). Conflating them
misstates who is trusted with what, in a system whose value proposition is that
boundary. See [`generated-wallet-key-custody.md`](../integration-notes/generated-wallet-key-custody.md).
