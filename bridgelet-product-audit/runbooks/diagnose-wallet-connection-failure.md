# Runbook: Freighter Connection Failure

## Step 1 — Is the extension installed and unlocked?

`connectFreighter()` checks `freighter.isConnected()` first and, when false,
throws a message written for exactly this case:

> Freighter extension not found. Please install it from freighter.app and refresh.

**If the user reports that message, believe it** — the extension is not
detectable. Check, in order:

- Is Freighter installed in the browser they're using **right now**? Users often
  have it in one browser and hit Bridgelet in another.
- Is it **enabled**? Profile switches and cleanup tools disable extensions.
- Is it **unlocked**? A locked Freighter may not report as available.
- **Did they refresh after installing?** The message says this for a reason — a
  page loaded before installation won't see it. Most common resolution.

Also confirm they aren't in a **private/incognito window**, where extensions are often disabled by default.

## Step 2 — Was the popup blocked or dismissed?

If the extension is detected, connection moves to `requestAccess()`, which opens
the Freighter popup. Two distinct failures look identical to the user: the popup
was **blocked**, or the user **dismissed/ignored** the approval prompt.

The second has its own symptom worth asking about — without approval,
`getAddress()` returns no address and the code throws:

> Freighter did not return a public key. Did you approve the request?

Have them open the console (`F12` → Console) and re-attempt while watching. Look
for popup-blocked warnings and either message above, check for a blocked-popup
icon in the address bar, then have them click the Freighter extension icon
directly — a pending approval often waits there unseen.

## Step 3 — Isolate extension-specific problems

Have the user try **a different browser** with Freighter installed.

- **Works elsewhere** → that browser profile is the problem: a conflicting
  extension, hardened privacy settings, or a corrupted install. Reinstalling
  Freighter there is the usual fix.
- **Fails everywhere** → likely the Freighter install or account, not Bridgelet.
  Version matters: `@stellar/freighter-api` is pinned here while users update the
  extension independently, so a mismatch is possible — see
  [`freighter-api-version-pinning.md`](../integration-notes/freighter-api-version-pinning.md).

**When escalating,** include browser + version, OS, Freighter version, the exact message, console errors, and whether it reproduced in a second browser.
