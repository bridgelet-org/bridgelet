# Multi-Chain Evaluation — Summary

A high-level pointer to `docs/multi-chain-evaluation.md`. All reasoning and detail
stays in that document; this is orientation only.

## Current direction

The document is an **evaluation**, not a commitment — it scopes what supporting
chains beyond Stellar would require, rather than announcing that Bridgelet is
becoming multi-chain. Read alongside `ROADMAP.md`, whose current status is MVP
implementation focused on Stellar ephemeral accounts, it reads as forward-looking
groundwork.

Its conclusion, at the highest level: multi-chain support is **not a surface-level
change**. It reaches into the send flow, the claim flow, and the data model
simultaneously.

## Areas it identifies

1. **Send flow changes** — chain selection becomes part of the sending decision.
2. **Claim flow changes** — the biggest conceptual jump. Claiming on a chain
   other than the one funds were sent on requires actual cross-chain bridging
   infrastructure, and recipients must connect a wallet compatible with their
   chosen target chain.
3. **Database and API schema** — today's schema is Stellar-specific in ways that
   don't generalise: Stellar-denominated amount fields, and asset identifiers
   that carry no chain qualifier.

## Why this matters to the rest of this folder

This is important background for anyone reading
[`wallet-connection-types.md`](./wallet-connection-types.md). All three
connection types documented there — Freighter, LOBSTR, and generated keypairs —
are **Stellar-specific assumptions baked into the frontend**. Freighter is a
Stellar extension; `generateNewWallet()` calls `Keypair.random()` from
`@stellar/stellar-sdk`; address validation elsewhere in the app assumes the
Stellar `G...` format.

None of that is wrong today. But it means the wallet layer is one of the places
multi-chain work would land hardest, and the entries in this folder describing it
should be read as documenting *the current Stellar-only design*, not a
chain-agnostic one.

**For any actual detail, go to `docs/multi-chain-evaluation.md`.** Nothing here
should be treated as a substitute for it.
