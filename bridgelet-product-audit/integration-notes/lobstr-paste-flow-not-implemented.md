# LOBSTR Paste Flow — Documented but Not Wired Up

A discrepancy between `docs/sender-auth-model.md` and the code it describes.

## What the doc claims

The Security Notes section of `sender-auth-model.md` states, in effect, that
LOBSTR — the mobile wallet — **is supported** via a paste-your-public-key
fallback, and that this fallback is *already wired in* `lib/wallet.ts`.

Read plainly, that tells a reader LOBSTR is a working, if manual, option today.

## What the code actually does

`connectLobstr()` in `frontend/lib/wallet.ts` has exactly one behaviour — it
throws:

```ts
export async function connectLobstr(): Promise<ConnectedWallet> {
  // ...comments describing the intended paste flow...
  throw new Error('USE_PASTE_FLOW');
}
```

`USE_PASTE_FLOW` is a **sentinel** — a marker the UI is evidently meant to catch
in order to render a paste-your-address step. The comment directly above it says
as much: "This function returns a placeholder — the UI handles the paste step."

The problem is the other half never landed. Searching the repository for that
sentinel returns **exactly one hit: the `throw` itself.** No component, hook, or
error boundary catches it. `connectLobstr()` also has **no callers anywhere** in
`frontend/`, so nothing is positioned to catch it even in principle.

So the doc's "already wired in `lib/wallet.ts`" is half-true in a misleading way:
the *function* exists in `lib/wallet.ts`, but it implements no paste flow — it
implements a request for one.

## Practical consequence

If a user were routed to the LOBSTR option today, `connectLobstr()` would reject
with the literal message `USE_PASTE_FLOW`. With no handler mapping that sentinel
to a paste UI, the user would hit whatever generic error path exists — very
plausibly seeing the raw string `USE_PASTE_FLOW`, which is meaningless to them,
rather than "paste your LOBSTR address here." The one mitigation is that no UI
appears to call it, so the failure may be unreachable in practice rather than
actively broken.

**Related:** [`sender-auth-model-doc-accuracy.md`](./sender-auth-model-doc-accuracy.md) ·
[`../runbooks/diagnose-lobstr-connection-confusion.md`](../runbooks/diagnose-lobstr-connection-confusion.md)
