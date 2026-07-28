# Freighter API Version Pinning

## The factual record

`frontend/package.json` currently declares:

```json
"@stellar/freighter-api": "^6.0.1"
```

The caret means any 6.x release satisfies it, so the version actually installed is
whatever the lockfile resolved — not necessarily 6.0.1.

## The coupling that makes this different

Most dependencies are self-contained: the version you install is the code that
runs. `@stellar/freighter-api` is not. It is a **client for a browser extension
the user installs and updates independently.**

The package version is fixed by this repo's lockfile; the extension version is
controlled entirely by the end user, changing whenever their browser updates it.
Nothing keeps the two aligned — a user can run an extension months newer or older
than the package this app was built against, and the app has no say in it.

## The general risk

When package and extension drift apart, failures surface at the boundary between
them — at runtime, on the user's machine, not at build time. A method the package
exposes may be missing from an older extension; a response shape it expects may
have changed in a newer one. Neither `tsc` nor CI catches this, because the
extension isn't present in either.

There is direct evidence of exactly this in the codebase.
`signFreighterTransaction()` doesn't trust the response shape — it accepts
**three** different keys for the same value:

```ts
signResult['signedTxXdr'] || signResult['signedTxXDR'] || signResult['xdr']
```

and `isFreighterTransactionSigningAvailable()` feature-detects `signTransaction`
at runtime rather than assuming it exists — defensive coding that records real
variation across extension versions.

## Implication

Bumping the pinned version is not routine: it changes which extension versions the
app works with, and the fallbacks are load-bearing. Test against a real extension,
and treat removing any fallback as a compatibility decision. See the checklist
entry on dependency version review.
