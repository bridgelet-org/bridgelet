# FAQ: How do I know a claim link someone sent me is legitimate?

**Short answer:** A genuine Bridgelet claim link is a signed, single-use JWT
embedded in the URL path. Knowing what makes a link trustworthy, and what it
cannot protect against, helps you decide whether to act on one.

---

## What a claim URL actually is

A claim URL looks like:

```
https://app.bridgelet.org/claim/<token>
```

The `<token>` segment is a **JWT signed by the Bridgelet backend** using a
secret the frontend never sees. Per `docs/security-model.mdx`:

- **Integrity-protected**: the JWT signature guarantees the token was issued
  by the backend and has not been tampered with.
- **Single-use**: the token is consumed on redemption and cannot be replayed.
- **High-entropy**: derived from a UUID v4 `accountId` (122 bits); brute-force
  enumeration is not feasible, and verify calls are rate-limited.
- **Path segment, not query string**: deliberately, to avoid leaking the token
  in `Referer` headers.

Full technical detail is in
[`integration-notes/claim-url-security-properties.md`](../integration-notes/claim-url-security-properties.md).

---

## The bearer problem: the link is the credential

This is the most important thing to understand:

> **Whoever holds the link can attempt the claim.** There is no identity check
> binding the token to an intended recipient.

The token is a *bearer credential*, like cash in an envelope, not an addressed
letter. If someone else obtains the link before you act on it, they can claim
the funds first. The security model logs this as **threat T-01 (claim token
theft)** and rates it mitigated, but the mitigation is *single-use*, not
*identity-bound*. First valid redemption wins.

### What this means in practice

| Scenario | Outcome |
|----------|---------|
| You receive the link and claim it | ✅ Funds are swept to your wallet |
| A thief intercepts the link and claims it first | ❌ You find a spent token; the real sender must contact support |
| Someone tries the same link again after you claimed | ❌ Already-swept guard rejects it on-chain |

The best protection is how the link is delivered. The security model's
recommendation: **share via end-to-end encrypted channels** (Signal, WhatsApp,
etc.), not unencrypted email, shared tickets, or chat channels where link
previews may fire.

---

## What "safe" actually means here

When assessing a claim link sent to you, consider:

1. **Is the domain correct?** The URL should resolve to the legitimate Bridgelet
   frontend (e.g., `app.bridgelet.org`). A phishing site can copy the UI but
   cannot forge a valid signed JWT for a real backend account.

2. **Did the link come from the expected sender?** The claim-link delivery
   channel is outside Bridgelet's control. If someone you don't recognise sends
   you a claim link, verify with the sender out-of-band before connecting your
   wallet.

3. **Is the link still valid?** Ephemeral accounts expire. If you see an
   "expired" or "already claimed" error, the funds are either reclaimed by the
   sender (expiry) or already swept (claimed by someone).

---

## An open question about sender communication

There is a known open item: whether the `/send` flow adequately communicates
to senders that the claim URL is a bearer token that should be treated as
sensitive. If senders don't understand this, they may share links in unsafe
channels. This is tracked in the audit knowledge base.

---

## Security disclosure

If you discover a vulnerability in how claim links are generated, validated,
or delivered, follow the responsible disclosure process in
[`SECURITY.md`](../../SECURITY.md).

---

## Related documents

- [`integration-notes/claim-url-security-properties.md`](../integration-notes/claim-url-security-properties.md)
  - full technical analysis of claim URL security properties
- [`glossary/claim-token-and-claim-url.md`](../glossary/claim-token-and-claim-url.md)
  - definitions and properties
- [`docs/security-model.mdx`](../../docs/security-model.mdx): broader security
  posture, threat model, and T-01/T-13 threat entries
- [`SECURITY.md`](../../SECURITY.md): responsible disclosure process

---

*Part of the bridgelet-product-audit/ knowledge-base initiative.*
