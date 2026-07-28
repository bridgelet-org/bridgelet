# Runbook: LOBSTR Connection "Doesn't Work"

## Step 1 — Confirm this is expected, not a regression

**It is almost certainly expected behaviour.** Do not open a bug report first.

Per [`lobstr-paste-flow-not-implemented.md`](../integration-notes/lobstr-paste-flow-not-implemented.md),
`connectLobstr()` in `frontend/lib/wallet.ts` does exactly one thing — it throws
the sentinel `USE_PASTE_FLOW`. It has never established a connection. LOBSTR ships
no browser JS SDK equivalent to Freighter's, so there is nothing to connect *to*
from a web page.

The intended design was for the UI to catch that sentinel and render a
paste-your-address step. That handling was never built: the sentinel appears
exactly once in the codebase, at the `throw` itself.

**Tell-tale sign:** if the user reports seeing the literal text `USE_PASTE_FLOW`,
that confirms the diagnosis outright — an internal marker leaking to the UI, not a
message written for users.

**Escalate as a regression only if** LOBSTR previously worked for this user, or
they describe a working paste step that has since disappeared. Neither is expected.

## Step 2 — Give the workaround

1. Open the **LOBSTR** app on their phone.
2. Go to the wallet / account view.
3. **Copy the public key** — the `G...` address, 56 characters.
4. Return to Bridgelet and **paste it** into the address field.

Sanity-check the paste: it must begin with `G` and be 56 characters. Address
fields validate against `^G[A-Z2-7]{55}$`, so a truncated paste is rejected — but
that confirms *shape*, not that the address is theirs. Have them read the last few
characters back to you.

> Warn them never to share their **secret** key. Only the public `G...` address is
> needed. No legitimate Bridgelet flow asks for a secret key.

## Step 3 — Set expectations

Tell the user this is the current supported path for LOBSTR, not a temporary
outage — otherwise they will retry the button and report it again.

## Revisit this runbook

If the paste flow is ever wired up — a handler catching `USE_PASTE_FLOW` and
rendering a real paste UI — steps 1 and 2 become wrong and this file should be
rewritten rather than amended.
