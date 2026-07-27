# Mobile App — Contract Awareness

Does the mobile app talk to Stellar/Soroban directly, or is it purely a client of
the bridgelet-sdk API?

## Finding: no direct chain awareness

A search across `mobile/` for `@stellar/`, `stellar-sdk`, `freighter`, `soroban`
and `horizon` returns **no genuine matches**. The only hits are incidental
substring collisions in React Native styling — `paddingHorizontal`, `horizontal`,
`showsHorizontalScrollIndicator` — which are unrelated to Horizon the Stellar API.

`mobile/services/` contains exactly one module, `logger/index.ts`, a
console-backed logger with no network transport. There is no wallet service, no
signing code, and no chain client under `mobile/app` or `mobile/services`.

## Contrast with the frontend

The web frontend is the opposite:

| | `frontend/` | `mobile/` |
|---|---|---|
| Stellar SDK | `@stellar/stellar-sdk` (`Keypair.random()`) | none |
| Wallet integration | `@stellar/freighter-api`, `connectFreighter()` | none |
| Transaction signing | `signFreighterTransaction()`, network passphrases | none |
| Chain concepts in code | `WalletType`, XDR, `G...` addresses | none |

`frontend/lib/wallet.ts` handles extension connection, XDR signing and network
passphrase resolution. Nothing equivalent exists on mobile.

## Implication for the audit

If mobile is purely API-driven, then **its contract-consumption story is entirely
inherited from bridgelet-sdk's behaviour** — there is no independent code path in
this repo to audit for mobile. Any question about how mobile handles a contract
error, a sweep outcome, or a network mismatch resolves to a question about the
SDK's API responses, not about mobile code.

That is a meaningful reduction in audit surface, and worth stating explicitly so
reviewers don't go looking for mobile-side chain handling that doesn't exist.

## Caveat

"No direct chain awareness" is a statement about **imports found during this
review**, not a guarantee. Mobile could still receive chain-derived data as plain
JSON from the API and render it — consumption without awareness. If mobile later
gains wallet or signing support, this note is invalidated and should be rewritten.

See also [`../glossary/mobile-app-services-logger.md`](../glossary/mobile-app-services-logger.md)
and [`../runbooks/onboard-mobile-app-to-ci.md`](../runbooks/onboard-mobile-app-to-ci.md).
