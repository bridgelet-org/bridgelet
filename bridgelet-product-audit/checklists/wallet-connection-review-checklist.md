# Wallet Connection Review Checklist

This checklist covers end-to-end verification of all three wallet connection types: Freighter, LOBSTR, and generated. It verifies that each connection type's actual implementation matches documented behavior and tracks all required sign-offs.

## Connection Type Implementation Verification

### Freighter Wallet
- [ ] Verify `connectFreighter()` implementation in `frontend/lib/wallet.ts` matches documented behavior in `docs/sender-auth-model.md`
- [ ] Confirm Freighter browser extension connection flow works as described: checks `freighter.isConnected()`, calls `requestAccess()`, and reads address via `getAddress()`
- [ ] Verify "extension not found" error is properly thrown and handled when Freighter is not installed
- [ ] Confirm all integration with Freighter's API is implemented correctly and error handling is in place

### LOBSTR Wallet
- [ ] Verify current `connectLobstr()` implementation status matches what's documented (paste flow not implemented, throws `USE_PASTE_FLOW` sentinel)
- [ ] Confirm that no UI components currently call `connectLobstr()`, preventing the unreachable failure state
- [ ] **EXPLICIT SIGN-OFF: LOBSTR paste-flow gap verification** — Acknowledge that the LOBSTR paste flow documented in `docs/sender-auth-model.md` is not fully implemented in the codebase: while `connectLobstr()` exists in `frontend/lib/wallet.ts`, the UI does not catch the `USE_PASTE_FLOW` sentinel to render a paste-your-public-key step, as detailed in `integration-notes/lobstr-paste-flow-not-implemented.md`
- [ ] Sign-off: _______________ (name and date) for LOBSTR paste flow gap acceptance

### Generated Wallet
- [ ] Verify `generateNewWallet()` implementation in `frontend/lib/wallet.ts` matches documented behavior
- [ ] Confirm client-side keypair generation works correctly: dynamically imports `@stellar/stellar-sdk` and creates a random `Keypair`
- [ ] Verify both publicKey and secretKey are returned properly from the generated wallet function
- [ ] Confirm key custody implications are understood and align with documentation in `integration-notes/generated-wallet-key-custody.md`

## Documentation Accuracy
- [ ] Verify all wallet connection type documentation in `glossary/wallet-connection-types.md` accurately reflects current implementation
- [ ] Confirm `docs/sender-auth-model.md` documentation is either updated to reflect the LOBSTR paste flow limitation or plans to update it are documented
- [ ] Verify that all three wallet types ('freighter', 'lobstr', 'generated') in the `WalletType` union in `frontend/lib/wallet.ts` are properly documented

## Cross-Consistency Checks
- [ ] Confirm error handling across all three wallet connection types is consistent with the project's error surface standards (per `integration-notes/three-repo-error-surface-consistency.md`)
- [ ] Verify wallet connection failure diagnostics work for all implemented connection types (per `runbooks/diagnose-wallet-connection-failure.md`)
- [ ] Confirm LOBSTR connection confusion runbook is up-to-date with current implementation status (per `runbooks/diagnose-lobstr-connection-confusion.md`)