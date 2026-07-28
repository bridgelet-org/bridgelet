# Claim Token and Claim URL

## Canonical definitions

`docs/GLOSSARY.md` holds the canonical short definitions — a **Claim Token** is
the unique token that lets a recipient securely claim funds, and a **Claim URL**
is the web link containing that token. Those entries are the source of truth for
the terms themselves; this page does not restate them, it describes the frontend
flow that produces and consumes them.

## Which route renders the claim experience

The claim UI lives at a dynamic Next.js route keyed on the token itself:

```
frontend/app/claim/[token]/
├── page.tsx                 # route entry
├── loading.tsx              # loading state
└── claim-page-client.tsx    # client component doing the real work
```

The token is therefore a **path segment**, not a query parameter — a claim URL
looks like `/claim/<token>`. The `[token]` segment is what the recipient's link
carries, and `claim-page-client.tsx` is where the claim is actually presented and
attempted.

A separate sandbox page exists at `frontend/app/sandbox/claim-test/` for
exercising the flow without a real token.

## How this ties back on-chain

Opening a claim URL is the product-level entry point to the on-chain sweep. The
token identifies the **ephemeral account** holding the funds (see
`docs/GLOSSARY.md`), and completing a claim is what triggers the sweep of that
account's balance to the recipient's destination wallet.

The on-chain mechanics of ephemeral accounts and sweeping are documented in the
`bridgelet-audit/` initiative for `bridgelet-core`; this repo's concern stops at
rendering the claim and calling the API.

## Related

- [`claim-url-security-properties.md`](../integration-notes/claim-url-security-properties.md)
  — what a claim URL guarantees as a bearer credential.
- [`sender-vs-recipient-auth-models.md`](./sender-vs-recipient-auth-models.md)
