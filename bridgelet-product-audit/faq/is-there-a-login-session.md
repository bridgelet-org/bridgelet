# FAQ: Is there a login session or account system for senders?

**Short answer:** No. Bridgelet deliberately has no session tokens, cookies, or
server-side accounts. Wallet ownership is proved at transaction-signing time,
the signature is the credential.

---

## Why there is no session

`docs/sender-auth-model.md` evaluates three options and selects **Option B:
no session token, proof at signing time**:

> No session token or JWT is created. Wallet ownership is proven at
> transaction-signing time. The public key identifies the sender; the
> transaction signature is the implicit proof of auth.

The alternatives were rejected explicitly:

| Option | Rejected because |
|--------|-----------------|
| A: Static `X-API-Key` | Key would leak in the JS bundle shipped to the browser. |
| C: No auth (open send) | Unmitigated spam/abuse risk. |

This design maps naturally to Stellar's mental model: you own a key, you prove
ownership by signing. There is no separate auth step because signing *is* the
auth step.

For the full design rationale, see
[`postmortems/sender-auth-relies-on-transaction-signing-not-session.md`](../postmortems/sender-auth-relies-on-transaction-signing-not-session.md).

---

## What wallet connection persistence actually is

When you connect Freighter in the `/send` flow, the frontend writes your public
key and wallet type to `localStorage` under the key `bridgelet_wallet`. This is
a **UI convenience**: it lets the form pre-populate on reload so you don't have
to reconnect every time.

It is **not** an authenticated session:

- No token is issued to the server.
- No server-side record is created.
- Clearing `localStorage` (or clicking "Disconnect") removes only the
  auto-reconnect shortcut: it does not "log you out" of anything.

See [`glossary/connected-wallet-persistence.md`](../glossary/connected-wallet-persistence.md)
for the exact storage key, shape, and what is (and is not) stored.

---

## Practical takeaway

> Proof of wallet ownership happens at **transaction-signing time, every time.**

Each time you create a payment, Freighter prompts you to sign the transaction
XDR. That signature is the server's proof that you control the funding wallet.
There is nothing to "stay logged in to" and nothing to "log out of" between
payment creations.

---

## Related documents

- [`docs/sender-auth-model.md`](../../docs/sender-auth-model.md): decision
  record for Option B
- [`postmortems/sender-auth-relies-on-transaction-signing-not-session.md`](../postmortems/sender-auth-relies-on-transaction-signing-not-session.md)
  - full design analysis, tradeoffs, and implications
- [`glossary/sender-vs-recipient-auth-models.md`](../glossary/sender-vs-recipient-auth-models.md)
  - how sender auth (wallet-based) differs from recipient auth (claim-token
  bearer model)
- [`glossary/connected-wallet-persistence.md`](../glossary/connected-wallet-persistence.md)
  - what is actually stored in `localStorage`

---

*Part of the bridgelet-product-audit/ knowledge-base initiative.*
