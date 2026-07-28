# Postmortem: `tsconfig.tsbuildinfo` Is Committed to the Repository

**Issue:** [#312](https://github.com/northersubair/bridgelet/issues/312)
**Severity:** Low
**Status:** Open

---

## Summary

The file `frontend/tsconfig.tsbuildinfo` is tracked in git. This is a
TypeScript incremental build cache file that should be in `.gitignore` — it is
ephemeral, machine-specific, and provides no value in version control.

## What `.tsbuildinfo` is

When TypeScript's `tsc` is run with `--incremental` or `composite: true` in
`tsconfig.json`, it produces a `.tsbuildinfo` file. This file stores:

- A map of all source files and their output hash
- Dependency relationships between compilation units
- Checkpoint data allowing `tsc` to skip re-checking unchanged files

On subsequent builds, `tsc` reads this file to determine what has changed and
only re-checks the affected subset — a significant speedup for large projects.

## Why it should not be committed

| Problem | Explanation |
|---|---|
| **Goes stale immediately** | The file reflects the build state of whoever last ran `tsc`. On a different machine with different `node_modules`, it is meaningless. |
| **Creates noisy diffs** | Every `tsc` run can update timestamps or hash values, producing diffs that add no semantic value. |
| **Machine-specific content** | Paths and dependency hashes may differ across environments, causing unnecessary merge conflicts. |
| **Rebuilt by CI anyway** | Any CI step running `tsc --noEmit` or `tsc --incremental` regenerates this file from scratch, so the committed version is never used. |
| **Not the only cache file** | If `.tsbuildinfo` is committed, there is no reason not to commit `.turbo/`, `.next/cache/`, or any other build cache — the precedent is corrosive. |

## Current state

The file exists at:

```
frontend/tsconfig.tsbuildinfo
```

It is a single-line JSON blob containing an array of all TypeScript library and
source file paths that `tsc` resolved during its last incremental build. The
file is approximately 1 line (minified JSON), but represents hundreds of
kilobytes of cache data.

The repository's `.gitignore` does **not** include `*.tsbuildinfo` or
`.tsbuildinfo`. The file was likely committed accidentally — a common occurrence
when TypeScript incremental builds are enabled and the developer stages with
`git add .`.

## Practical impact

- **Diff noise:** Any change to `tsconfig.json`, any new source file, or any
  dependency update can cause the `.tsbuildinfo` contents to change, producing
  commits that look significant in `git diff` but carry no intentional changes.
- **Reviewer confusion:** A reviewer seeing a 100KB+ JSON blob in a PR may spend
  time trying to understand it before realizing it is an auto-generated cache.
- **False confidence:** A green CI that "passes the `.tsbuildinfo` check" means
  nothing — the file is always regenerated.

## Recommendations

1. **Add to `.gitignore`:**

   ```
   *.tsbuildinfo
   ```

   This prevents future commits of the file.

2. **Remove from tracking:**

   ```bash
   git rm --cached frontend/tsconfig.tsbuildinfo
   ```

   This stops git from tracking the file without deleting it from the working
   directory.

3. **Commit both changes together** — the `.gitignore` addition and the
   `git rm --cached` — in a single commit. This makes the intent clear.

4. **No functional change.** Removing the file from tracking has zero impact on
   builds. `tsc` will regenerate it locally as needed, and CI runs `tsc --noEmit`
   which does not use incremental cache anyway.

## Related Documents

- [`frontend/tsconfig.tsbuildinfo`](../../../frontend/tsconfig.tsbuildinfo) — the file in question
- [`.gitignore`](../../../.gitignore) — needs the `*.tsbuildinfo` entry added
