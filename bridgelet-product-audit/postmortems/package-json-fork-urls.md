# Postmortem: Root `package.json` Points to Personal Fork

**Issue:** [#313](https://github.com/amberly-d/bridgelet/issues/313)
**Severity:** Low (cosmetic / registry metadata)
**Status:** Open

## Summary

The root `package.json` contains `repository`, `bugs`, and `homepage` URLs that
point to `https://github.com/okekefrancis112/bridgelet` — a personal fork —
rather than the canonical `amberly-d/bridgelet` repository.

## Evidence

From `package.json` (lines 13–23):

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/okekefrancis112/bridgelet.git"
},
"bugs": {
  "url": "https://github.com/okekefrancis112/bridgelet/issues"
},
"homepage": "https://github.com/okekefrancis112/bridgelet#readme"
```

All three metadata fields reference the same fork origin. No other `package.json`
in the repo (e.g. `frontend/package.json`) was checked for the same issue, but
the root file is the one exposed to npm tooling.

## Impact

### Direct npm command effects

- **`npm home`** opens the fork's GitHub page, not the canonical repo.
- **`npm repo`** opens the fork repository.
- **`npm bugs`** opens the fork's issue tracker, where maintainers will not see
  filed issues.

### Registry metadata

If this package were published to npm (even under a private registry), the
registry listing would display the fork as the homepage, repository, and bug
tracker. Anyone browsing the package page would be directed to the wrong place.

### Scope

Since this is the **root** `package.json`, every `npm` command invoked from the
repo root inherits these incorrect URLs. This includes:

- `npm install` (metadata in `node_modules/.package-lock.json`)
- `npm info bridgelet` (registry lookups)
- `npm repo bridgelet` (opening the repo from the CLI)

This is not a runtime issue — no build or test breaks. But it means the public
metadata surface of the package is misdirected, and any contributor who runs
`npm repo` or `npm home` lands on the wrong fork.

### How this likely happened

The `package.json` was likely initialized or copied from `okekefrancis112`'s
working fork and the URLs were never updated when the code moved to the
canonical `amberly-d/bridgelet` repository. This is a common oversight in
repos that originated as forks.

## Recommended Fix

Update the three URL fields in `package.json` to reference `amberly-d/bridgelet`:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/amberly-d/bridgelet.git"
},
"bugs": {
  "url": "https://github.com/amberly-d/bridgelet/issues"
},
"homepage": "https://github.com/amberly-d/bridgelet#readme"
```

Verification steps:

1. Run `npm repo` from the root to confirm it opens the correct repository.
2. Run `npm bugs` to confirm it opens the correct issue tracker.
3. Grep all `package.json` files for `okekefrancis112` to ensure no other
   copies carry the same fork URLs.

## Related Documents

- [`package.json`](../../package.json) — the file containing the fork URLs
- [`glossary/governance-and-roadmap-cross-reference.md`](../glossary/governance-and-roadmap-cross-reference.md)
