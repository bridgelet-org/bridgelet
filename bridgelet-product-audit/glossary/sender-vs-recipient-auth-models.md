# Sender vs Recipient Auth Models

Bridgelet runs **two distinct authentication models** at once. They are easy to
conflate because both are described loosely as "connecting a wallet", but they
answer different questions and use different credentials.

## Sender side — wallet-based

The canonical record is `docs/sender-auth-model.md`, which selects **Option B,
wallet-based auth via Freighter** for the `/send` page.

Key properties of that decision:

- The sender's Stellar **public key is the identity**.
- **No JWT and no session token** is issued or stored. Per that document, "wallet
  ownership is proven at transaction-signing time" — the signature *is* the proof.
- Option A (a static `X-API-Key`) was rejected for the browser UI specifically
  because the key would leak in the JS bundle. It remains viable for backend
  integrations — see
  [`org-integration-api-key-model.md`](./org-integration-api-key-model.md).

## Recipient side — claim-token-based

The recipient side works on a completely different credential. A recipient does
not authenticate as an identity at all; they present a **claim token**, delivered
as a URL (`/claim/[token]`). Possession of the link is the credential.

This is a **bearer** model: it answers "does this person hold a valid claim
token?" rather than "who is this person?". Nothing about it proves wallet
ownership, and no signature is involved in reaching the claim page.

## Where the two intersect

The separation is not absolute. A claim token gets the recipient *to* the funds,
but sweeping those funds into a permanent account eventually requires a
destination wallet — at which point the recipient acquires a wallet too (possibly
via the `generated` path, if they have none).

So the models meet at the moment of sweep: **token-as-credential** for access,
**wallet-as-destination** for settlement. Whether the current claim UI actually
requires a connected wallet is traced in
[`claim-flow-wallet-requirement.md`](../integration-notes/claim-flow-wallet-requirement.md).
