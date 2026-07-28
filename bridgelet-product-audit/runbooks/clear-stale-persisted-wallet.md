# Runbook: Clear a Stale or Corrupted Persisted Wallet

For a user whose browser holds a bad `bridgelet_wallet` value — typically reported
as "it shows the wrong wallet" or "it thinks I'm connected when I'm not."

## Background: what is actually stored

`frontend/lib/wallet.ts` persists to `localStorage` under `bridgelet_wallet`,
holding `{ publicKey, type }` and no secret material.

**Malformed JSON is already handled.** `loadPersistedWallet()` wraps its read in
`try`/`catch` and returns `null` on parse failure, so genuinely corrupted text
degrades silently to "no wallet connected" — it does not throw or wedge the UI.

So this runbook is rarely about *corruption*. It is almost always a
**stale-but-valid** value: well-formed JSON pointing at the wrong wallet, which
parses cleanly and is trusted. The cast is also unchecked, so a well-formed value
of the *wrong shape* is returned as-is.

## Steps

**1. Confirm the symptom.** Ask what address the UI shows and whether the user
recognises it. A wrong-but-real address points here; a blank disconnected state
usually means the value was already discarded.

**2. Prefer the in-app path.** If a disconnect control exists, have them click it
— it should call `clearPersistedWallet()`. Only fall back to dev tools otherwise.

**3. Dev-tools fallback.**

- Open dev tools (`F12`, or `Cmd+Option+I` on macOS).
- **Application** → **Local Storage** → the Bridgelet origin.
- Find `bridgelet_wallet`, note its value if useful, then delete just that key.

Console equivalent: `localStorage.removeItem('bridgelet_wallet');`

> Delete the single key. Don't tell users to "clear site data" — unnecessary here,
> and it discards unrelated state.

## 4. Verify

Reload. The wallet-connect UI should show a **clean, disconnected state** — no
address, connect option available. Have the user reconnect and confirm the address
is the one they expect.

If a wrong address reappears after reconnecting, the problem is in the wallet
itself (wrong account selected in Freighter), not persisted state — stop here and
treat it as a wallet-selection issue. Background:
[`connected-wallet-persistence.md`](../glossary/connected-wallet-persistence.md).
