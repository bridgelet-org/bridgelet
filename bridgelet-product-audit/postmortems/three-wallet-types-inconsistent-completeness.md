# Three Wallet Types with Inconsistent Completeness

**Issue:** #319
**Severity:** Design inconsistency
**Date:** 2026-07-28

---

## Summary

The `WalletType` union in `frontend/lib/wallet.ts` defines three values:
`freighter`, `lobstr`, and `generated`. Each represents a different wallet
connection approach, but they are at vastly different levels of implementation
maturity. This post documents the completeness gap and its implications.

## The Three Types

```ts
export type WalletType = 'freighter' | 'lobstr' | 'generated';
```

### Completeness Matrix

| Property | `freighter` | `lobstr` | `generated` |
|----------|:-----------:|:--------:|:-----------:|
| Connection function exists | ✅ `connectFreighter()` | ✅ `connectLobstr()` | ✅ `generateNewWallet()` |
| Function does real work | ✅ Calls Freighter API | ❌ Throws sentinel | ✅ Creates keypair |
| Returns `ConnectedWallet` | ✅ Always | ❌ Never (always throws) | ✅ Always |
| Transaction signing | ✅ `signFreighterTransaction()` | ❌ No signing path | ❌ No signing path |
| UI component wired | ✅ `WalletConnect` renders Freighter button | ⚠️ Paste flow referenced but uncaptured | ❌ No UI |
| Called anywhere in `frontend/` | ✅ Yes | ❌ No callers | ❌ No callers |
| Documented as working | ✅ | ⚠️ `sender-auth-model.md` says "already wired" | ⚠️ Documented as threat T-15 |

## Freighter: Fully Implemented

`connectFreighter()` at `frontend/lib/wallet.ts:49` is the only wallet type with
a complete end-to-end flow:

1. Checks `freighter.isConnected()` for extension presence.
2. Calls `freighter.requestAccess()` to open the approval popup.
3. Reads the address via `freighter.getAddress()`.
4. Returns `{ publicKey, type: 'freighter' }`.
5. Transaction signing via `signFreighterTransaction()` delegates to
   `freighter.signTransaction()`.

This is the **only** wallet path that actually works in production. The
`WalletConnect` component (`frontend/components/wallet-connect.tsx`) renders a
"Connect Freighter Wallet" button that calls this function.

## Generated: Implemented but Unused

`generateNewWallet()` at `frontend/lib/wallet.ts:127` is a complete function
that:

- Dynamically imports `@stellar/stellar-sdk` (to avoid SSR issues).
- Calls `Keypair.random()` to create a fresh Stellar keypair.
- Returns `{ wallet: { publicKey, type: 'generated' }, secretKey }`.

**However, it has zero callers anywhere in `frontend/`.** The function is
exported, typed, and documented — but nothing invokes it. The `secretKey` is
returned as a plaintext string to browser JavaScript, raising custody questions
that are documented in `integration-notes/generated-wallet-key-custody.md` but
unresolved.

Key open questions for the `generated` path:

- Where does the secret key live after generation?
- How does the user recover it?
- What is the key's lifetime in browser memory?
- How does signing work without Freighter?

These are not answered because no code path reaches `generateNewWallet()`.

## LOBSTR: Partially Implemented (Sentinel Only)

`connectLobstr()` at `frontend/lib/wallet.ts:119` has exactly one behaviour — it
throws a sentinel:

```ts
export async function connectLobstr(): Promise<ConnectedWallet> {
  throw new Error('USE_PASTE_FLOW');
}
```

The intent is clear from the comments: the UI should catch this sentinel and
render a paste-your-public-key step. But the other half never landed:

- `USE_PASTE_FLOW` appears in exactly one place in the entire codebase: the
  `throw` statement itself.
- No component, hook, or error boundary catches it.
- `connectLobstr()` has **no callers** in `frontend/`.
- `docs/sender-auth-model.md` states LOBSTR "is supported via a paste-your-public-key
  fallback already wired in `lib/wallet.ts`" — this is half-true in a misleading
  way.

If a user were somehow routed to the LOBSTR option, they would see the raw
`USE_PASTE_FLOW` error string, which is meaningless to a non-developer. The
mitigation is that the failure is currently unreachable because nothing calls
`connectLobstr()`.

## The Documentation Mismatch

The inconsistency is not just in code — it extends to documentation:

- `sender-auth-model.md` Security Notes claim LOBSTR "is supported via a
  paste-your-public-key fallback already wired in `lib/wallet.ts`." The function
  exists, but it implements no paste flow — it implements a *request* for one.
- `docs/security-model.mdx` logs `generateNewWallet()` as threat T-15, noting
  the secret handling requires audit. This is accurate but reads as if the flow
  is live, when it is unused.

A reader of the docs alone would conclude all three wallet types are functional.
A reader of the code alone would conclude only Freighter works. Neither picture
is complete without the other.

## Risk Assessment

| Risk | Likelihood | Impact |
|------|-----------|--------|
| User hits `USE_PASTE_FLOW` sentinel | Low (no caller) | Medium (confusing error) |
| `generated` path wired without custody design | Medium (future work) | High (secret key in browser memory) |
| Docs claim LOBSTR support in user-facing materials | Low (internal docs only) | Low (misleads auditors, not users) |

## Recommendations

- **Immediate:** Update `sender-auth-model.md` to reflect that LOBSTR paste flow
  is *planned* but not implemented, not "already wired."
- **Before wiring `generated`:** Resolve the key custody design (storage,
  transmission, recovery, lifetime) — see `generated-wallet-key-custody.md`.
- **Before wiring LOBSTR:** Decide whether the paste flow is the right UX or
  whether a deeplink/QR approach is preferable. If paste, implement the UI
  handler for `USE_PASTE_FLOW`.
- **Long-term:** Consider whether the `WalletType` union should include types
  that are not implemented, or whether they should be introduced only when the
  corresponding flow is complete.

## Related Documents

- [`glossary/wallet-connection-types.md`](../glossary/wallet-connection-types.md)
  — Canonical definition of each `WalletType` value
- [`integration-notes/lobstr-paste-flow-not-implemented.md`](../integration-notes/lobstr-paste-flow-not-implemented.md)
  — Detailed trace of the `USE_PASTE_FLOW` sentinel and its missing handler
- [`integration-notes/generated-wallet-key-custody.md`](../integration-notes/generated-wallet-key-custody.md)
  — Open custody questions for the unused `generated` path
- [`frontend/lib/wallet.ts`](../../frontend/lib/wallet.ts) — All three connection
  functions: `connectFreighter()` (line 49), `connectLobstr()` (line 119),
  `generateNewWallet()` (line 127)
- [`docs/sender-auth-model.md`](../../docs/sender-auth-model.md) — The decision
  record that claims LOBSTR support is "already wired"
