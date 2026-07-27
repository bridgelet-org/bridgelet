# Ephemeral Account in the Product Narrative

`docs/GLOSSARY.md` defines the pieces individually. This entry strings them
together into the story a user actually lives through.

## Starting definitions

Paraphrasing the existing glossary:

- **Bridgelet** — an open-source infrastructure layer for sending blockchain
  payments to people who don't have wallets yet, by creating ephemeral accounts
  that can later be claimed and swept.
- **Ephemeral Account** — a temporary Stellar account created for a recipient who
  does not yet have a wallet.
- **Claim Token / Claim URL** — the token, and the link carrying it, that let a
  recipient claim the funds.
- **Expiration** — the point after which an unclaimed account or token is invalid.

The ephemeral account is the hinge the whole product turns on: it is what lets a
sender send *before* the recipient has anywhere to receive.

## The narrative arc

1. **Sender creates a payment intent.** Alice connects a wallet on `/send` and
   says how much to send — critically, without needing Bob's wallet address.
2. **An ephemeral account is created.** Bridgelet provisions a temporary Stellar
   account and funds it. Nobody has claimed it; it is a parking place with a
   deadline.
3. **Recipient receives a claim link.** Bob gets a `/claim/[token]` URL through
   whatever channel Alice uses — chat, email, SMS.
4. **Recipient claims.** Bob opens the link. He does not need a pre-existing
   wallet; if he has none, a keypair can be generated for him.
5. **Funds sweep.** The ephemeral account's balance moves to Bob's destination
   wallet, and the temporary account has served its purpose.

If step 4 never happens, **Expiration** governs what becomes of the funds.

## Where the technical detail lives

This is deliberately the *product* view. The on-chain mechanics — how the
ephemeral account is created and funded, what the sweep transaction looks like,
and the already-swept guard preventing a double claim — are documented in the
`bridgelet-audit/` initiative's `ephemeral-account.md` entry for `bridgelet-core`.
Read that for what actually happens on-ledger.
