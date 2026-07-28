# Freighter SDK/Extension Version Compatibility Not Independently Verified

**Issue:** [#325](https://github.com/bridgelet-org/bridgelet/issues/325)
**Category:** Open verification task
**Severity:** Medium — runtime failures possible if package and extension drift apart

## Summary

The `@stellar/freighter-api` npm package version pinned in `frontend/package.json`
was not independently verified for compatibility against the Freighter browser
extension versions that real users are likely running. This is a coupling risk
unique to browser-extension SDKs: the package version is locked by the lockfile,
but the extension version is controlled entirely by the end user.

## Why This Matters

Most npm dependencies are self-contained — the installed version is the code that
runs. `@stellar/freighter-api` is different. It is a **client library for a
browser extension** the user installs and updates independently. Nothing in the
build pipeline keeps the two aligned.

When package and extension drift apart, failures surface **at runtime, on the
user's machine** — not at build time. A method the package expects may be missing
from an older extension; a response shape it relies on may have changed in a
newer one. Neither `tsc` nor CI catches this, because the extension isn't present
in either environment.

### Evidence of real drift in the codebase

The codebase already contains defensive code that proves this drift is real, not
theoretical. `signFreighterTransaction()` accepts three different keys for the
same value:

```ts
signResult['signedTxXdr'] || signResult['signedTxXDR'] || signResult['xdr']
```

And `isFreighterTransactionSigningAvailable()` feature-detects `signTransaction`
at runtime rather than assuming it exists. These are not over-engineered
defenses — they reflect actual variation across extension versions.

## What Was and Wasn't Checked

| Aspect | Status |
|--------|--------|
| Package version range (`^6.0.1`) | ✅ Noted |
| Lockfile-resolved version | ❌ Not traced |
| Minimum extension version required | ❌ Not determined |
| Maximum extension version tested | ❌ Not determined |
| Fallback code paths exercised | ❌ Not verified |

## Recommended Follow-up

1. **Document the compatibility matrix:** Record which `@stellar/freighter-api`
   versions are known to work with which Freighter extension versions.
2. **Test against multiple extension versions:** Manually install different
   Freighter extension builds and run the claim/send flows.
3. **Consider pinning more precisely:** The `^6.0.1` range allows minor-version
   drift. If the API surface changed between 6.0 and 6.x, this is a live risk.
4. **Treat fallback removal as a compatibility decision:** The three-key
   fallback in `signFreighterTransaction()` is load-bearing. Removing it requires
   confirming all supported extension versions use a single key.

## Related Documents

- [`integration-notes/freighter-api-version-pinning.md`](../integration-notes/freighter-api-version-pinning.md) — detailed analysis of the coupling risk
- [`checklists/dependency-version-review-checklist.md`](../checklists/dependency-version-review-checklist.md) — review checklist for dependency versions
- [`glossary/wallet-connection-types.md`](../glossary/wallet-connection-types.md) — how Freighter connection works
