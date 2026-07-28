# Claim URL — Security Properties

What makes a claim URL safe (or unsafe) to share, from the frontend's view.

## Stated guarantees

`docs/GLOSSARY.md` defines a **Claim Token** as the token letting a recipient
securely claim funds, and a **Claim URL** as the link carrying it.
`docs/security-model.mdx` is more specific:

- Claim tokens are **JWTs signed by the backend**, using a secret the frontend
  never sees — integrity-protected.
- **Single-use** — consumed on redemption, cannot be replayed.
- **Entropy:** derived from a UUID v4 `accountId` (122 bits). Brute-force
  enumeration is not feasible, and verify calls are rate-limited (1,000/hour/IP).
- **Path segment, not query string** (`/claim/[token]`) — deliberately, to avoid
  leaking the token in `Referer` headers.
- **Recipients are unauthenticated.** The token "is the sole proof of
  entitlement. No login, no session."

## The bearer problem

That last point is the defining property: **whoever holds the link can attempt the
claim.** There is no identity check binding the token to an intended recipient, so
a forwarded, screenshotted, or intercepted link is as good as the original.

`security-model.mdx` logs this as **T-01 (claim token theft)** and rates it
mitigated — but read the mitigation precisely: single-use means an attacker cannot
replay a *spent* token, and "first valid redemption wins." That protects against
reuse, **not against a thief redeeming first.** If an attacker gets the link
before the recipient acts, they claim the funds and the legitimate recipient finds
a spent token. The document's own recommendation — share via end-to-end encrypted
channels — is the real control.

**The payload is not encrypted.** Signed JWTs are integrity-protected, not
confidential: `accountId`, `amount` and `assetCode` are readable by anyone holding
the token — including link-preview services and analytics pipelines. JWE is future work.

## Practical consequences

- Treat a claim URL as **cash in an envelope**, not an addressed letter; don't
  paste them into shared tickets, logs or chat channels.
- Expiry is not a loss: it lets the sender reclaim via a backend return sweep.

## Double claims

A second claim is caught on-chain by the already-swept guard (bridgelet-audit's
`account-status-state-machine.md`); whether that reason reaches the user is traced
in [`three-repo-error-surface-consistency.md`](./three-repo-error-surface-consistency.md).
**T-13** (sweep authorization) is also an MVP stub there.
