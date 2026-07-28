# Sender Auth Relies on Transaction Signing, Not Session Tokens

**Issue:** #317
**Severity:** Design observation (not a vulnerability)
**Date:** 2026-07-28

---

## Summary

The Bridgelet sender authentication model (`/send` page) deliberately issues no
session token, no JWT, and no cookie. Wallet ownership is proven at
transaction-signing time — the signature itself is the credential. This post
documents the design choice, its rationale, and its tradeoffs.

## The Design Choice

`docs/sender-auth-model.md` evaluates three options and selects Option B:

> **No session token or JWT is created. Wallet ownership is proven at
> transaction-signing time.**

This is stated plainly under "Security Notes":

- No session token or JWT is created.
- Wallet ownership is proven at transaction-signing time.
- The public key identifies the sender; the transaction signature is the implicit
  proof of auth.

The rejection of alternatives is equally explicit:

| Option | Rejected because |
|--------|-----------------|
| A — Static `X-API-Key` | Key would leak in the JS bundle when shipped as an env var to the browser. |
| C — No auth (open send) | Unmitigated spam/abuse risk without rate-limiting. |

## Why This Is Deliberate

The model maps naturally to Stellar's mental model: you own a key, you prove
ownership by signing. There is no separate auth step because signing *is* the
auth step.

Concretely:

1. The user clicks "Connect Freighter Wallet" in the `WalletConnect` component
   (`frontend/components/wallet-connect.tsx`).
2. Freighter returns the public key via `requestAccess()` / `getAddress()`.
3. When the sender creates a payment intent, the Bridgelet SDK calls
   `signFreighterTransaction()` in `frontend/lib/wallet.ts:73`, which delegates
   to the Freighter extension's `signTransaction` API.
4. The signed XDR is sent to the server. The server verifies the signature — no
   token is checked because there is none.

This means there is **no session to manage, no token to refresh, and no
expiration to enforce**. The auth boundary lives exactly where the money moves.

## Tradeoff: No Session Revocation

The absence of a session token has a direct consequence: **there is no session
to revoke.**

- If a user disconnects Freighter, the public key is cleared from `localStorage`
  (via `clearPersistedWallet()` in `frontend/lib/wallet.ts:44`), but that only
  removes the *UI convenience* of auto-reconnect. It does not prevent the same
  user from reconnecting and signing immediately.
- There is no server-side session record, so a server-side "log out" or
  "revoke token" operation is inapplicable.
- If a signing key is compromised, the attacker can sign transactions until the
  Stellar key itself is rotated on-chain — the Bridgelet layer has no kill
  switch.

This is an acceptable tradeoff for the current scope (a payment link creator),
but should be revisited if the sender role expands to include account management
or sensitive configuration.

## The Flip Side: No Session to Steal

The corollary of "no session token" is that there is **no session token to
steal.** Common session-hijack vectors — cookie theft, token exfiltration from
`localStorage`, JWT replay — are structurally absent. The attacker needs the
actual signing key (held inside the Freighter extension or the Stellar SDK
keypair), not a bearer credential.

For the `generated` wallet path (`generateNewWallet()` at
`frontend/lib/wallet.ts:127`), the secret key is returned to the caller as a
plaintext string. If that path is ever wired into a UI, the custody question
becomes acute — see `integration-notes/generated-wallet-key-custody.md`.

## Implications for Future Work

- **Rate limiting.** Option C was rejected partly because of spam risk. Any
  sender-side rate limiting must be keyed on the Stellar public key, not on a
  session identifier. Consider per-key rate limits tied to on-chain account
  state (e.g., minimum balance, recent transaction count).
- **Backend integrations.** Option A (static `X-API-Key`) remains viable for
  server-to-server calls. The sender-auth-model doc explicitly calls this out.
  Ensure the API key model is documented separately and not conflated with the
  browser auth model.
- **Audit trail.** Because there is no session, logging and audit must rely on
  the public key and the signed transaction XDR. Any logging infrastructure
  should correlate by `signerAddress`, not by session ID.

## Verdict

This is a sound design for the current product scope. The absence of sessions is
a feature, not a gap — but the team should be aware that extending the sender
role beyond "create a payment link" may require revisiting this assumption.

## Related Documents

- [`docs/sender-auth-model.md`](../../docs/sender-auth-model.md) — The decision
  record for Option B
- [`glossary/sender-vs-recipient-auth-models.md`](../glossary/sender-vs-recipient-auth-models.md)
  — How sender auth (wallet-based) differs from recipient auth (claim-token
  bearer model)
- [`frontend/lib/wallet.ts`](../../frontend/lib/wallet.ts) — `connectFreighter()`,
  `signFreighterTransaction()`, `persistWallet()` implementations
- [`integration-notes/generated-wallet-key-custody.md`](../integration-notes/generated-wallet-key-custody.md)
  — Key custody concerns for the unused `generated` wallet path
